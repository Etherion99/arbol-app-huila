/**
 * A small resolver over the TypeScript syntax tree, shared by the two scanners.
 *
 * It exists to answer one question: given an expression a component hands to a
 * style prop or a className, what values can it actually be at runtime? That has
 * to reach across files — a screen writes `styles.card`, `styles` is a
 * `StyleSheet.create` in the same file, its `backgroundColor` is
 * `colors.surfaceCard`, and `colors` is an import from packages/core — and it
 * has to survive the two shapes this codebase uses to vary a colour: a record
 * indexed by a variant, and a conditional entry in a style array.
 *
 * ## Guards
 *
 * Every resolved value carries the conditions under which it applies, as a list
 * of `[name, value]` pairs. `styles[variant]` yields one value per key of
 * `styles`, each guarded by `variant=<key>`; `pressed && styles.pressed` yields
 * one guarded by `pressed=true`. Two values can only be paired when their guards
 * agree, which is what lets a label drawn with `textStyles[variant]` be measured
 * against the fill its own `styles[variant]` paints and against nothing else.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve as resolvePath, sep } from 'node:path';

import ts from 'typescript';

import { NAMESPACES, repoRoot } from './palette.mjs';

const SOURCE_EXTENSIONS = ['.tsx', '.ts'];

/** Directories the project instructions keep scanners out of. */
const SKIPPED = new Set(['node_modules', 'dist', '.expo', '.next', 'android', 'ios', 'build']);

export function listSources(root) {
  const found = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory)) {
      if (entry.startsWith('.') || SKIPPED.has(entry)) continue;
      const full = join(directory, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (SOURCE_EXTENSIONS.some((extension) => entry.endsWith(extension))) {
        found.push(full);
      }
    }
  };
  walk(root);
  return found.sort();
}

export function shortPath(path) {
  return relative(repoRoot, path).split(sep).join('/');
}

export function lineOf(file, node) {
  return file.source.getLineAndCharacterOfPosition(node.getStart(file.source)).line + 1;
}

/** Guards are compatible unless they disagree about the same name. */
export function compatible(a, b) {
  for (const [name, value] of a) {
    for (const [otherName, otherValue] of b) {
      if (name === otherName && value !== otherValue) return false;
    }
  }
  return true;
}

export function mergeGuards(a, b) {
  const merged = [...a];
  for (const [name, value] of b) {
    if (!merged.some(([existing, existingValue]) => existing === name && existingValue === value)) {
      merged.push([name, value]);
    }
  }
  return merged;
}

export function describeGuards(guards) {
  if (guards.length === 0) return '';
  return guards.map(([name, value]) => (value === 'true' ? name : `${name}=${value}`)).join(' & ');
}

export class Project {
  /**
   * @param {string[]} roots directories whose sources take part in resolution
   * @param {Record<string, string>} aliases module prefixes, longest match wins
   */
  constructor(roots, aliases) {
    this.aliases = Object.entries(aliases).sort((a, b) => b[0].length - a[0].length);
    this.files = new Map();
    this.paths = roots.flatMap((root) => listSources(root));
  }

  file(path) {
    const key = resolvePath(path);
    if (this.files.has(key)) return this.files.get(key);

    const text = readFileSync(key, 'utf8');
    const source = ts.createSourceFile(key, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
    const file = { path: key, source, bindings: new Map(), imports: new Map(), project: this };
    this.files.set(key, file);
    indexModule(file);
    return file;
  }

  /** Resolves a module specifier to a file on disk, or nothing for a package. */
  resolveModule(fromPath, specifier) {
    let base;
    if (specifier.startsWith('.')) {
      base = resolvePath(dirname(fromPath), specifier);
    } else {
      const alias = this.aliases.find(
        ([prefix]) => specifier === prefix || specifier.startsWith(prefix),
      );
      if (alias === undefined) return undefined;
      base = resolvePath(alias[1], specifier.slice(alias[0].length));
    }

    const candidates = [
      ...SOURCE_EXTENSIONS.map((extension) => base + extension),
      ...SOURCE_EXTENSIONS.map((extension) => join(base, `index${extension}`)),
      base,
    ];

    for (const candidate of candidates) {
      try {
        if (statSync(candidate).isFile()) return candidate;
      } catch {
        /* not this candidate */
      }
    }
    return undefined;
  }
}

function indexModule(file) {
  for (const statement of file.source.statements) {
    if (ts.isImportDeclaration(statement) && statement.importClause !== undefined) {
      const specifier = statement.moduleSpecifier.text;
      const clause = statement.importClause;
      if (clause.isTypeOnly) continue;
      if (clause.name !== undefined) {
        file.imports.set(clause.name.text, { specifier, exported: 'default' });
      }
      if (clause.namedBindings !== undefined && ts.isNamedImports(clause.namedBindings)) {
        for (const element of clause.namedBindings.elements) {
          if (element.isTypeOnly) continue;
          file.imports.set(element.name.text, {
            specifier,
            exported: (element.propertyName ?? element.name).text,
          });
        }
      }
    }

    if (ts.isVariableStatement(statement)) {
      for (const entry of statement.declarationList.declarations) {
        if (ts.isIdentifier(entry.name) && entry.initializer !== undefined) {
          file.bindings.set(entry.name.text, entry.initializer);
        }
      }
    }

    if (ts.isFunctionDeclaration(statement) && statement.name !== undefined) {
      file.bindings.set(statement.name.text, statement);
    }

    // A barrel re-export, so the chain from a screen to the component it renders
    // does not stop at an index file.
    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier !== undefined) {
      const specifier = statement.moduleSpecifier.text;
      if (statement.exportClause !== undefined && ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) {
          file.imports.set(element.name.text, {
            specifier,
            exported: (element.propertyName ?? element.name).text,
          });
        }
      } else if (statement.exportClause === undefined) {
        file.imports.set('*', { specifier, exported: '*' });
      }
    }
  }
}

const UNKNOWN = { kind: 'unknown' };

/**
 * Resolves an expression to the set of values it can take.
 *
 * Entries are `{ kind, file, guards, ... }`, where `kind` is `literal`, `object`,
 * `array`, `jsx`, `callable`, `namespace` or `unknown`. The file travels with the
 * value because an object literal reached through an import has to keep
 * resolving in the module that wrote it.
 */
export function resolveValue(file, node, guards = [], depth = 0) {
  if (node === undefined || depth > 24) return [{ ...UNKNOWN, file, guards }];

  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isNonNullExpression(node) ||
    ts.isJsxExpression(node)
  ) {
    return resolveValue(file, node.expression, guards, depth + 1);
  }

  if (ts.isStringLiteralLike(node)) return [{ kind: 'literal', value: node.text, file, guards }];
  if (ts.isNumericLiteral(node)) {
    return [{ kind: 'literal', value: Number(node.text), file, guards }];
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return [{ kind: 'literal', value: true, file, guards }];
  }

  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) {
    return resolveValue(file, node.operand, guards, depth + 1).map((entry) =>
      entry.kind === 'literal' && typeof entry.value === 'number'
        ? { ...entry, value: -entry.value }
        : { ...UNKNOWN, file, guards },
    );
  }

  if (ts.isObjectLiteralExpression(node)) return [{ kind: 'object', node, file, guards }];
  if (ts.isArrayLiteralExpression(node)) return [{ kind: 'array', node, file, guards }];
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
    return [{ kind: 'jsx', node, file, guards }];
  }
  if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) {
    return [{ kind: 'callable', node, file, guards }];
  }

  if (ts.isArrowFunction(node)) {
    // `style={({ pressed }) => [...]}` is the one arrow whose value matters, and
    // it is always an expression body. A block body is a component instead.
    if (ts.isBlock(node.body)) return [{ kind: 'callable', node, file, guards }];
    return resolveValue(file, node.body, guards, depth + 1);
  }

  if (ts.isConditionalExpression(node)) {
    const name = conditionName(file, node.condition);
    return [
      ...resolveValue(file, node.whenTrue, mergeGuards(guards, [[name, 'true']]), depth + 1),
      ...resolveValue(file, node.whenFalse, mergeGuards(guards, [[name, 'false']]), depth + 1),
    ];
  }

  if (ts.isBinaryExpression(node)) {
    const operator = node.operatorToken.kind;
    if (operator === ts.SyntaxKind.AmpersandAmpersandToken) {
      const name = conditionName(file, node.left);
      return resolveValue(file, node.right, mergeGuards(guards, [[name, 'true']]), depth + 1);
    }
    if (operator === ts.SyntaxKind.QuestionQuestionToken || operator === ts.SyntaxKind.BarBarToken) {
      return [
        ...resolveValue(file, node.left, guards, depth + 1),
        ...resolveValue(file, node.right, guards, depth + 1),
      ];
    }
    return [{ ...UNKNOWN, file, guards }];
  }

  if (ts.isCallExpression(node)) {
    // `StyleSheet.create({...})` is the identity as far as a value is concerned,
    // and `cn(...)` and `cva(...)` hand their arguments through to a class
    // string, so all three are resolved by resolving what they were given.
    return node.arguments.flatMap((argument) => resolveValue(file, argument, guards, depth + 1));
  }

  if (ts.isIdentifier(node)) return resolveIdentifier(file, node.text, guards, depth);

  if (ts.isPropertyAccessExpression(node)) {
    return resolveValue(file, node.expression, guards, depth + 1).flatMap((target) =>
      readMember(target, node.name.text, depth),
    );
  }

  if (ts.isElementAccessExpression(node)) {
    const targets = resolveValue(file, node.expression, guards, depth + 1);
    const argument = node.argumentExpression;

    // An index that does resolve — a literal, or a prop bound to one by the
    // caller — selects a single entry, which is what makes `typography[variant]`
    // read as the one size a call site actually asked for.
    const keys =
      argument === undefined
        ? []
        : resolveValue(file, argument, [], depth + 1)
            .filter((entry) => entry.kind === 'literal' && typeof entry.value === 'string')
            .map((entry) => entry.value);

    if (keys.length > 0 && keys.length === new Set(keys).size) {
      return targets.flatMap((target) => keys.flatMap((key) => readMember(target, key, depth)));
    }

    // An index nobody can evaluate statically: every entry of the record is
    // possible, and each is tagged with the key that would select it, so a
    // sibling lookup through the same index can be matched up with it.
    const name = argument === undefined ? '?' : conditionName(file, argument);
    return targets.flatMap((target) =>
      memberNames(target).flatMap((key) =>
        readMember(target, key, depth).map((entry) => ({
          ...entry,
          guards: mergeGuards(entry.guards, [[name, key]]),
        })),
      ),
    );
  }

  return [{ ...UNKNOWN, file, guards }];
}

function conditionName(file, node) {
  return node.getText(file.source).replace(/\s+/g, ' ').trim();
}

function resolveIdentifier(file, name, guards, depth) {
  const local = file.bindings.get(name);
  if (local !== undefined) {
    // A binding put there by a caller: a prop bound to the expression the caller
    // wrote, or the children it passed. Both have to keep resolving in the
    // caller's module, not in the one being stepped into.
    if (local.__children === true) {
      return local.nodes.flatMap((child) => resolveValue(local.file, child, guards, depth + 1));
    }
    if (local.__ref === true) return resolveValue(local.file, local.node, guards, depth + 1);
    return resolveValue(file, local, guards, depth + 1);
  }

  const imported = file.imports.get(name) ?? file.imports.get('*');
  if (imported !== undefined) {
    const path = file.project.resolveModule(file.path, imported.specifier);
    if (path !== undefined) {
      const other = file.project.file(path);
      const exportedName = imported.exported === '*' ? name : imported.exported;
      if (other.bindings.has(exportedName) || other.imports.has(exportedName)) {
        return resolveIdentifier(other, exportedName, guards, depth + 1);
      }
    }
  }

  // The design tokens are read from packages/core directly rather than parsed
  // out of it, so a `colors.accent` anywhere in either app lands on the same
  // object the app itself imports at runtime.
  if (Object.hasOwn(NAMESPACES, name)) {
    return [{ kind: 'namespace', values: NAMESPACES[name], file, guards }];
  }

  return [{ ...UNKNOWN, file, guards, name }];
}

function propertyKey(property, file) {
  const { name } = property;
  if (name === undefined) return undefined;
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) return name.text;
  if (ts.isComputedPropertyName(name)) {
    const literal = resolveValue(file, name.expression, []).find(
      (entry) => entry.kind === 'literal',
    );
    return literal === undefined ? undefined : String(literal.value);
  }
  return undefined;
}

function memberNames(target) {
  if (target.kind === 'namespace') return Object.keys(target.values);
  if (target.kind !== 'object') return [];
  return target.node.properties
    .filter((property) => ts.isPropertyAssignment(property))
    .map((property) => propertyKey(property, target.file))
    .filter((key) => key !== undefined);
}

function readMember(target, key, depth) {
  if (target.kind === 'namespace') {
    const value = target.values[key];
    return value === undefined
      ? [{ ...UNKNOWN, file: target.file, guards: target.guards }]
      : [{ kind: 'literal', value, file: target.file, guards: target.guards, token: key }];
  }

  if (target.kind !== 'object') return [{ ...UNKNOWN, file: target.file, guards: target.guards }];

  const found = target.node.properties.filter(
    (property) => ts.isPropertyAssignment(property) && propertyKey(property, target.file) === key,
  );

  if (found.length === 0) return [{ ...UNKNOWN, file: target.file, guards: target.guards }];

  return found.flatMap((property) =>
    resolveValue(target.file, property.initializer, target.guards, depth + 1),
  );
}

/** Every property of an object value, resolved, in source order. */
export function objectEntries(target, depth = 0) {
  if (target.kind !== 'object') return [];

  const entries = [];
  for (const property of target.node.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const key = propertyKey(property, target.file);
    if (key === undefined) continue;
    for (const value of resolveValue(target.file, property.initializer, target.guards, depth + 1)) {
      entries.push({ key, value, node: property });
    }
  }
  return entries;
}

export { ts };
