/**
 * Walks the mobile app the way React Native paints it and reports every pair of
 * ink and ground it can actually put on screen.
 *
 * Nothing here is declared by hand. The scanner starts at each component, walks
 * its JSX, and keeps a stack of the grounds established along the way; when it
 * meets a piece of text it measures that text's colour against the nearest
 * ground above it. A component the tree renders is stepped into rather than
 * skipped, with its props bound to what the caller passed, so `<AppText
 * variant="caption">` is measured at 13 points and `<Button variant="danger">`
 * is measured on the fill that variant actually paints.
 *
 * ## Why the tree is walked and not the tokens
 *
 * The pairs that go wrong are not pairs of tokens. They are a `backgroundColor`
 * in one style rule and a `color` in another, correct on their own and wrong
 * together. The strip that read at 1.40:1 was exactly that, and a table of
 * tokens said the palette was fine the whole time it was on screen.
 */

import { SURFACES, colors, describeColor } from './palette.mjs';
import {
  Project,
  compatible,
  describeGuards,
  lineOf,
  mergeGuards,
  objectEntries,
  resolveValue,
  shortPath,
  ts,
} from './source-graph.mjs';
import { composite, contrast, describeSize, parseColor, requiredRatio, toHex } from './wcag.mjs';

/** Props whose value is a style object rather than a plain value. */
const STYLE_PROPS = new Set([
  'style',
  'contentStyle',
  'contentContainerStyle',
  'sceneContainerStyle',
  'textStyle',
  'labelStyle',
  'titleStyle',
]);

/** Host elements that render text, so a `color` on them is ink and not decoration. */
const TEXT_HOSTS = new Set(['Text', 'TextInput', 'Animated.Text']);

/** Props that colour a mark rather than a word. SC 1.4.11 judges these at 3:1. */
const GRAPHIC_COLOR_PROPS = new Set(['color', 'tintColor', 'fill', 'stroke']);

/** Props that colour text without going through a style object. */
const TEXT_COLOR_PROPS = new Set(['placeholderTextColor', 'selectionColor']);

const MAX_INLINE_DEPTH = 8;

function isColorValue(value) {
  return typeof value === 'string' && /^(#|rgba?\()/i.test(value);
}

function isTransparent(value) {
  if (value === 'transparent') return true;
  try {
    return parseColor(value).alpha === 0;
  } catch {
    return false;
  }
}

/** The weight a loaded font face carries, read from the name the face registers under. */
function weightOfFace(family) {
  const match = /_(\d{3})/.exec(String(family));
  return match === null ? undefined : Number(match[1]);
}

/**
 * Flattens a style expression — an object, an identifier, an array of either,
 * or an arrow that returns one — into `{ property, value, guards }` in the order
 * React Native would apply them.
 */
function flattenStyle(entry, out, depth = 0) {
  if (depth > 12) return;

  if (entry.kind === 'array') {
    for (const element of entry.node.elements) {
      for (const resolved of resolveValue(entry.file, element, entry.guards)) {
        flattenStyle(resolved, out, depth + 1);
      }
    }
    return;
  }

  if (entry.kind === 'object') {
    for (const property of objectEntries(entry)) {
      if (property.value.kind === 'array' || property.value.kind === 'object') {
        // A nested style object, as in `options={{ contentStyle: {...} }}`.
        if (STYLE_PROPS.has(property.key)) flattenStyle(property.value, out, depth + 1);
        continue;
      }
      if (property.value.kind !== 'literal') continue;
      out.push({
        property: property.key,
        value: property.value.value,
        token: property.value.token,
        guards: property.value.guards,
        file: entry.file,
        node: property.node,
      });
    }
  }
}

/**
 * Layers the declarations of one property.
 *
 * An unconditional declaration replaces everything before it, exactly as React
 * Native's style merge does. A conditional one is added instead of replacing,
 * because the declaration it sits on top of is still what paints when the
 * condition is false.
 */
function layer(entries, property) {
  let live = [];
  for (const entry of entries) {
    if (entry.property !== property) continue;
    if (entry.guards.length === 0) live = [entry];
    else live.push(entry);
  }
  return live;
}

/** The smallest size and lightest weight the declarations allow, which is the worst case. */
function typeSize(entries) {
  const sizes = layer(entries, 'fontSize')
    .map((entry) => entry.value)
    .filter((value) => typeof value === 'number');

  const weights = [
    ...layer(entries, 'fontFamily').map((entry) => weightOfFace(entry.value)),
    ...layer(entries, 'fontWeight').map((entry) => Number(entry.value)),
  ].filter((weight) => Number.isFinite(weight));

  return {
    fontSize: sizes.length === 0 ? undefined : Math.min(...sizes),
    fontWeight: weights.length === 0 ? undefined : Math.min(...weights),
  };
}

/** The ground when nothing nearer establishes one: the four surfaces, worst case. */
const AMBIENT = {
  spelling: 'surface',
  guards: [],
  candidates: SURFACES.map((token) => ({ token, rgb: parseColor(colors[token]) })),
};

function groundOf(entry, parents) {
  // A translucent fill shows whatever is under it, so it is composited against
  // every ground it could be sitting on before anything is measured.
  const unders =
    parents.length === 0 ? AMBIENT.candidates : parents.flatMap((parent) => parent.candidates);

  return {
    spelling: describeColor(entry.value, entry.token),
    guards: entry.guards,
    site: entry,
    candidates: unders.map((under) => ({
      token: under.token,
      rgb: composite(entry.value, under.rgb),
    })),
  };
}

class NativeScan {
  constructor(project) {
    this.project = project;
    this.pairs = [];
  }

  /** A file view whose module bindings are extended with a call's local scope. */
  static scoped(file, scope) {
    if (scope.size === 0) return file;
    return { ...file, bindings: new Map([...file.bindings, ...scope]) };
  }

  record(kind, ink, ground, size, site) {
    this.pairs.push({ kind, ink, ground, size, site });
  }

  /**
   * Collects the `const` declarations of a function body into a scope, so a
   * `const tone = TONES[status]` or a `const body = <View …>` is resolvable when
   * the JSX below it is walked.
   */
  static localScope(node, base) {
    const scope = new Map(base);
    const body = node.body;
    if (body === undefined || !ts.isBlock(body)) return scope;

    for (const statement of body.statements) {
      if (!ts.isVariableStatement(statement)) continue;
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.initializer !== undefined) {
          scope.set(declaration.name.text, declaration.initializer);
        }
      }
    }
    return scope;
  }

  /** Binds a component's destructured props to what the caller wrote. */
  static bindProps(callee, attributes, callerFile) {
    const scope = new Map();
    const [parameter] = callee.parameters ?? [];
    if (parameter === undefined) return scope;

    const given = new Map(attributes.map((attribute) => [attribute.name, attribute]));

    if (ts.isObjectBindingPattern(parameter.name)) {
      for (const element of parameter.name.elements) {
        if (!ts.isIdentifier(element.name)) continue;
        const propName = (element.propertyName ?? element.name).getText();
        const passed = given.get(propName);
        if (passed !== undefined) {
          scope.set(element.name.text, { __ref: true, file: callerFile, node: passed.node });
        } else if (element.initializer !== undefined) {
          scope.set(element.name.text, element.initializer);
        }
      }
    }
    return scope;
  }

  walkComponent(file, node, parents, scope, stack) {
    const inner = NativeScan.localScope(node, scope);
    const view = NativeScan.scoped(file, inner);

    const body = node.body;
    if (body === undefined) return;

    const visit = (current) => {
      if (ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current)) {
        this.walkJsx(view, current, parents, inner, stack);
        return;
      }
      if (ts.isJsxFragment(current)) {
        for (const child of current.children) visit(child);
        return;
      }
      // Nested functions are render callbacks and belong to the same tree.
      ts.forEachChild(current, visit);
    };

    if (ts.isBlock(body)) {
      for (const statement of body.statements) visit(statement);
    } else {
      visit(body);
    }
  }

  walkJsx(file, node, parents, scope, stack) {
    const opening = ts.isJsxElement(node) ? node.openingElement : node;
    const tagName = opening.tagName.getText(file.source);
    const attributes = [];

    for (const attribute of opening.attributes.properties) {
      if (!ts.isJsxAttribute(attribute) || attribute.initializer === undefined) continue;
      attributes.push({ name: attribute.name.getText(), node: attribute.initializer, attribute });
    }

    const declarations = [];
    for (const attribute of attributes) {
      if (!STYLE_PROPS.has(attribute.name)) continue;
      for (const resolved of resolveValue(file, attribute.node, [])) {
        flattenStyle(resolved, declarations);
      }
    }

    // The grounds this element establishes for whatever it contains.
    const painted = layer(declarations, 'backgroundColor')
      .filter((entry) => isColorValue(entry.value) && !isTransparent(entry.value))
      .map((entry) => groundOf(entry, parents));

    const solid = painted.some((ground) => ground.guards.length === 0);
    const inherited = solid ? painted : [...parents, ...painted];

    const size = typeSize(declarations);
    const isText = TEXT_HOSTS.has(tagName);

    for (const entry of layer(declarations, 'color')) {
      if (!isColorValue(entry.value)) continue;
      this.emit(isText ? 'text' : 'mark', entry, parents, size, file, opening, tagName);
    }

    for (const entry of layer(declarations, 'borderColor')) {
      if (!isColorValue(entry.value) || isTransparent(entry.value)) continue;
      this.emit('mark', entry, parents, size, file, opening, `${tagName} border`);
    }

    for (const attribute of attributes) {
      const isTextProp = TEXT_COLOR_PROPS.has(attribute.name);
      if (!isTextProp && !GRAPHIC_COLOR_PROPS.has(attribute.name)) continue;
      for (const entry of resolveValue(file, attribute.node, [])) {
        if (entry.kind !== 'literal' || !isColorValue(entry.value)) continue;
        this.emit(
          isTextProp ? 'text' : 'mark',
          { ...entry, node: attribute.attribute, file },
          parents,
          isTextProp ? size : {},
          file,
          opening,
          `${tagName} ${attribute.name}`,
        );
      }
    }

    const children = ts.isJsxElement(node) ? node.children : [];

    // A component of this codebase is stepped into rather than treated as a
    // black box: that is what turns `<Card>` into the white ground its contents
    // are read on, and `variant="danger"` into the fill that variant paints.
    const stepped = this.stepInto(file, tagName, attributes, children, inherited, stack);

    if (!stepped) {
      for (const child of children) this.walkChild(file, child, inherited, scope, stack);
    }
  }

  walkChild(file, child, parents, scope, stack) {
    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
      this.walkJsx(file, child, parents, scope, stack);
      return;
    }
    if (ts.isJsxFragment(child)) {
      for (const nested of child.children) this.walkChild(file, nested, parents, scope, stack);
      return;
    }
    if (ts.isJsxExpression(child) && child.expression !== undefined) {
      for (const entry of resolveValue(file, child.expression, [])) {
        if (entry.kind === 'jsx') {
          this.walkChild(entry.file, entry.node, parents, scope, stack);
        }
      }
      // A `{items.map(item => <Row …/>)}` is a call the resolver hands back as
      // its arguments, so the arrow body above already covers it; anything else
      // is text or a value, and neither paints.
    }
  }

  stepInto(callerFile, tagName, attributes, children, parents, stack) {
    if (!/^[A-Z]/.test(tagName) || stack.length >= MAX_INLINE_DEPTH) return false;

    const bindings = this.lookupComponent(callerFile, tagName);
    if (bindings === undefined) return false;

    const key = `${bindings.file.path}#${tagName}`;
    if (stack.includes(key)) return false;

    const scope = NativeScan.bindProps(bindings.node, attributes, callerFile);
    if (children.length > 0) {
      scope.set('children', { __children: true, file: callerFile, nodes: children });
    }

    this.walkComponent(bindings.file, bindings.node, parents, scope, [...stack, key]);
    return true;
  }

  lookupComponent(file, name) {
    const seen = new Set();
    let current = file;
    let currentName = name;

    while (current !== undefined && !seen.has(`${current.path}#${currentName}`)) {
      seen.add(`${current.path}#${currentName}`);

      const local = current.bindings.get(currentName);
      if (local !== undefined && !local.__ref) {
        const node = ts.isFunctionDeclaration(local)
          ? local
          : ts.isArrowFunction(local) || ts.isFunctionExpression(local)
            ? local
            : undefined;
        if (node !== undefined && node.body !== undefined) return { file: current, node };
        return undefined;
      }

      const imported = current.imports.get(currentName);
      if (imported === undefined) return undefined;
      const path = current.project.resolveModule(current.path, imported.specifier);
      if (path === undefined) return undefined;
      current = current.project.file(path);
      currentName = imported.exported;
    }
    return undefined;
  }

  emit(kind, entry, parents, size, file, opening, label) {
    const grounds = parents.length === 0 ? [AMBIENT] : parents;

    for (const ground of grounds) {
      if (!compatible(entry.guards, ground.guards)) continue;

      const ink = parseColor(entry.value);
      const measured = ground.candidates.map((candidate) => ({
        token: candidate.token,
        ratio: contrast(composite(ink, candidate.rgb), candidate.rgb),
        hex: toHex(candidate.rgb),
      }));
      const worst = measured.reduce((low, one) => (one.ratio < low.ratio ? one : low));

      this.record(
        kind,
        { value: entry.value, spelling: describeColor(entry.value, entry.token) },
        {
          spelling: ground.spelling,
          hex: worst.hex,
          on: ground === AMBIENT ? worst.token : undefined,
        },
        size,
        {
          path: shortPath(file.path),
          line: lineOf(file, entry.node ?? opening),
          label,
          guards: describeGuards(mergeGuards(entry.guards, ground.guards)),
          ratio: worst.ratio,
        },
      );
    }
  }
}

/** Every module-scope binding that looks like a component, as a starting point. */
function componentsIn(file) {
  const found = [];
  for (const [name, node] of file.bindings) {
    if (!/^[A-Z]/.test(name)) continue;
    if (node.__ref === true) continue;
    if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      if (node.body !== undefined) found.push({ name, node });
    }
  }
  return found;
}

export function scanNative(root, aliases) {
  const project = new Project([root], aliases);
  const scan = new NativeScan(project);

  for (const path of project.paths) {
    const file = project.file(path);
    for (const component of componentsIn(file)) {
      scan.walkComponent(file, component.node, [], new Map(), [
        `${file.path}#${component.name}`,
      ]);
    }
  }

  return finalise(scan.pairs);
}

/**
 * Folds the raw findings into one row per ink, ground and size.
 *
 * Walking every component as a starting point means a component is seen twice:
 * once inside the screen that renders it, where the ground is known, and once on
 * its own, where it is not. When both exist for the same line the known one is
 * the truth and the other is dropped, so a `Card` label is not also reported as
 * text on an unnamed surface.
 */
function finalise(pairs) {
  const bySite = new Map();
  for (const pair of pairs) {
    const site = `${pair.site.path}:${pair.site.line}:${pair.site.label}:${pair.ink.value}`;
    if (!bySite.has(site)) bySite.set(site, []);
    bySite.get(site).push(pair);
  }

  const kept = [];
  for (const group of bySite.values()) {
    const grounded = group.filter((pair) => pair.ground.on === undefined);
    kept.push(...(grounded.length > 0 ? grounded : group));
  }

  const rows = new Map();
  for (const pair of kept) {
    const key = [
      pair.kind,
      pair.ink.spelling,
      pair.ground.spelling,
      pair.ground.hex,
      pair.size.fontSize ?? '?',
      pair.size.fontWeight ?? '?',
    ].join('|');

    if (!rows.has(key)) {
      rows.set(key, {
        kind: pair.kind,
        ink: pair.ink,
        ground: pair.ground,
        size: pair.size,
        ratio: pair.site.ratio,
        required: requiredRatio(pair.size),
        type: describeSize(pair.size),
        sites: [],
      });
    }

    const row = rows.get(key);
    const where = `${pair.site.path}:${pair.site.line}`;
    if (!row.sites.some((existing) => existing.where === where)) {
      row.sites.push({ where, label: pair.site.label, guards: pair.site.guards });
    }
  }

  return [...rows.values()].sort((a, b) => a.ratio - b.ratio);
}
