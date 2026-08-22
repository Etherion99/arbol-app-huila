import { Notice } from '@/components/ui/notice';
import { texts } from '@/constants/texts';
import type { DenialReason } from '@/features/auth/session';
import { SignInForm } from '@/features/auth/components/sign-in-form';
import { DENIED_PARAM, REDIRECT_PARAM, safeRedirect } from '@/lib/routes';

/** Only the reasons the gate actually sends, so a hand-typed value shows nothing. */
function denialMessage(value: string | undefined): string | null {
  if (value === 'no-session' || value === 'not-coordinator' || value === 'no-profile') {
    return texts.signIn.denied[value satisfies DenialReason];
  }
  return null;
}

/**
 * D1 · Acceso del coordinador.
 *
 * The layout is the canvas's split screen: the map motif on the left, the
 * credentials on the right.
 */
export default async function SignInPage({ searchParams }: PageProps<'/sign-in'>) {
  const params = await searchParams;
  const denial = denialMessage(
    typeof params[DENIED_PARAM] === 'string' ? params[DENIED_PARAM] : undefined,
  );
  const next =
    typeof params[REDIRECT_PARAM] === 'string' ? safeRedirect(params[REDIRECT_PARAM]) : undefined;

  return (
    <div className="flex min-h-full flex-1 bg-surface-page">
      {/* The map motif. Decorative, so it is hidden from assistive technology
          and dropped entirely on a narrow screen rather than stacked. */}
      <div
        aria-hidden="true"
        className="relative hidden flex-1 overflow-hidden bg-[radial-gradient(ellipse_at_35%_40%,var(--surface-raised),var(--border-subtle))] lg:block"
      >
        <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(var(--border-strong)_1px,transparent_1px),linear-gradient(90deg,var(--border-strong)_1px,transparent_1px)] [background-size:52px_52px]" />
        <span className="absolute top-[30%] left-[24%] size-3 rounded-full bg-state-ok shadow-[0_0_14px_var(--state-ok)]" />
        <span className="absolute top-[48%] left-[52%] size-4 rounded-full bg-state-ok shadow-[0_0_0_6px_var(--accent-soft),0_0_20px_var(--state-ok)]" />
        <span className="absolute top-[64%] left-[38%] size-3 rounded-full bg-state-due shadow-[0_0_14px_var(--state-due)]" />
        <span className="absolute top-[26%] left-[66%] size-3 rounded-full bg-state-ok shadow-[0_0_14px_var(--state-ok)]" />
        <div className="absolute bottom-9 left-10 max-w-[380px]">
          <p className="font-mono text-[11px] tracking-[.12em] text-jil-magenta">
            {texts.signIn.eyebrow}
          </p>
          <p className="mt-2 font-heading text-[34px] leading-tight font-extrabold text-text-primary">
            {texts.signIn.heroTitle}
          </p>
        </div>
      </div>

      <div className="flex w-full shrink-0 flex-col justify-center gap-4 border-l border-border-subtle px-6 sm:px-14 lg:w-[460px]">
        <p className="font-heading text-[19px] font-extrabold text-accent">
          ÁrbolApp <span className="text-accent-2">Huila</span>
        </p>
        <h1 className="mt-2 font-heading text-[28px] font-bold text-text-primary">
          {texts.signIn.title}
        </h1>
        <p className="font-sans text-sm leading-relaxed text-text-secondary">
          {texts.signIn.subtitle}
        </p>

        {denial ? <Notice tone="warning">{denial}</Notice> : null}

        <SignInForm next={next} />

        {/* `text-text-secondary` and not `text-text-muted`: at 13px this is
            small text, and muted measures under 4.5:1 on this surface. */}
        <p className="font-sans text-[13px] leading-relaxed text-text-secondary">
          {texts.signIn.forgotPassword}
        </p>
      </div>
    </div>
  );
}
