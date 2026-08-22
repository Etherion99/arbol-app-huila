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
