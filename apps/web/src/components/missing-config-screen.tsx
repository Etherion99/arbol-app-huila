import { texts } from '@/constants/texts';
import { missingEnvVars } from '@/lib/env';

/**
 * Shown instead of the panel when the deployment has no Supabase credentials.
 *
 * It names the variables. Whoever meets this screen is the person setting the
 * panel up, and "falta NEXT_PUBLIC_SUPABASE_URL" is something they can act on,
 * where a failed fetch deep inside a query is not.
 */
export function MissingConfigScreen() {
  return (
    <main className="flex flex-1 items-center justify-center bg-surface-page p-8">
      <div className="flex max-w-lg flex-col gap-3 rounded-lg border border-border-strong bg-surface-card p-6">
        <h1 className="font-heading text-xl font-bold text-text-primary">{texts.config.title}</h1>
        <p className="font-sans text-sm leading-relaxed text-text-secondary">{texts.config.body}</p>
        <p className="font-sans text-[13px] font-semibold text-text-secondary">
          {texts.config.missingLabel}
        </p>
        <ul className="flex flex-col gap-1">
          {missingEnvVars.map((name) => (
            <li key={name} className="font-mono text-[13px] text-destructive">
              {name}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
