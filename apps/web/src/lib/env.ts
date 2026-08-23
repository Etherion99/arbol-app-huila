/**
 * The two values the panel cannot run without.
 *
 * `NEXT_PUBLIC_` variables are inlined at build time, so they have to be read
 * as static property accesses -- a computed lookup would leave `undefined` in
 * the client bundle.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Reported to the pages that build a client, so a misconfigured deployment
 * shows a readable screen naming the missing variables instead of a stack
 * trace. The panel is run by a coordinator, not a developer: "falta
 * NEXT_PUBLIC_SUPABASE_URL" is something they can forward, a webpack error is
 * not.
 */
export const missingEnvVars: string[] = [
  supabaseUrl ? null : 'NEXT_PUBLIC_SUPABASE_URL',
  supabaseAnonKey ? null : 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
].filter((name): name is string => name !== null);

export const isEnvComplete = missingEnvVars.length === 0;

/**
 * Placeholder used only when a variable is missing, so building the client
 * cannot throw while a module is being evaluated -- at that point no error
 * boundary is mounted and nothing could catch it. Nothing ever calls through
 * it: every entry point checks `isEnvComplete` first.
 */
const UNCONFIGURED_URL = 'http://127.0.0.1:1';

export const env = {
  supabaseUrl: supabaseUrl ?? UNCONFIGURED_URL,
  supabaseAnonKey: supabaseAnonKey ?? 'unconfigured',
} as const;

/**
 * Where a panel crash is reported, when there is somewhere to report it.
 *
 * Deliberately not in `missingEnvVars`. The panel runs perfectly well without
 * it, and a coordinator must never be shown a configuration screen because
 * nobody has created a Sentry project yet. Absent means reporting is off, and
 * `instrumentation.ts` says so rather than pretending to be watching.
 */
const sentryDsnValue = process.env.NEXT_PUBLIC_SENTRY_DSN;

export const sentryDsn: string | null =
  sentryDsnValue !== undefined &&
  sentryDsnValue.trim() !== '' &&
  // The placeholder in `.env.example` is a word, not a DSN. Treating it as one
  // would start a reporter that posts every crash into a 404.
  sentryDsnValue.trim() !== 'PENDIENTE'
    ? sentryDsnValue
    : null;
