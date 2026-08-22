'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { texts } from '@/constants/texts';
import { signIn, type SignInState } from '@/features/auth/actions';

const initialState: SignInState = { error: null };

function SubmitButton() {
  // `useFormStatus` has to be read from a child of the form, which is the only
  // reason this is a component of its own.
  const { pending } = useFormStatus();

  return (
    <Button type="submit" block disabled={pending} className="mt-1.5">
      {pending ? texts.signIn.submitting : texts.signIn.submit}
    </Button>
  );
}

/**
 * The credentials half of D1.
 *
 * The action runs on the server, so the password never becomes client state and
 * never reaches a React tree that an extension could read. What comes back is a
 * sentence from `texts`, never Supabase's own English message.
 */
export function SignInForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <TextField
        label={texts.signIn.emailLabel}
        name="email"
        type="email"
        autoComplete="email"
        placeholder={texts.signIn.emailPlaceholder}
        required
        error={state.field === 'email' ? state.error : undefined}
      />

      <TextField
        label={texts.signIn.passwordLabel}
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state.field === 'password' ? state.error : undefined}
      />

      {/* A failure with no field of its own still has to be seen and heard. */}
      {state.error && !state.field ? (
        <p role="alert" className="font-sans text-[13px] text-destructive">
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
