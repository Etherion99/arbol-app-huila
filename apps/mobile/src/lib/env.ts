/**
 * The two values the app cannot run without.
 *
 * `EXPO_PUBLIC_` variables are inlined by Metro at build time, so they have to
 * be read as static property accesses -- a computed lookup would leave
 * `undefined` in the bundle.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Reported to the root layout, which paints a readable screen naming the
 * missing variables instead of letting the app crash on a red box. A
 * misconfigured build is a developer mistake, but it is one a guardian could
 * meet if a release ever ships without the values.
 */
export const missingEnvVars: string[] = [
  supabaseUrl ? null : 'EXPO_PUBLIC_SUPABASE_URL',
  supabaseAnonKey ? null : 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
].filter((name): name is string => name !== null);

export const isEnvComplete = missingEnvVars.length === 0;

/**
 * Placeholder used only when a variable is missing, so building the client
 * cannot throw during module evaluation -- at that point no component is
 * mounted yet and nothing could catch it. Nothing ever calls through it: the
 * root layout blocks on `isEnvComplete` before any screen renders.
 */
const UNCONFIGURED_URL = 'http://127.0.0.1:1';

export const env = {
  supabaseUrl: supabaseUrl ?? UNCONFIGURED_URL,
  supabaseAnonKey: supabaseAnonKey ?? 'unconfigured',
} as const;
