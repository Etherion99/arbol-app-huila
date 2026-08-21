import { useCallback, useMemo, useState } from 'react';
import type { z } from 'zod/v4';

/**
 * Form state driven by the same schema the API call parses.
 *
 * Validity is worked out during render from the current values instead of
 * being mirrored into state by an effect, which is what turns a keystroke into
 * a cascade of re-renders.
 *
 * A field only shows its error once its owner has left it or has tried to
 * submit. Marking a password as too short while it is still being typed is
 * noise, and noise is what teaches people to ignore error text.
 */

export type FieldErrors<TInput> = Partial<Record<keyof TInput & string, string>>;

type UseZodFormOptions<TInput extends Record<string, unknown>, TOutput> = {
  schema: z.ZodType<TOutput, TInput>;
  initialValues: TInput;
  onSubmit: (values: TOutput) => void | Promise<void>;
};

export function useZodForm<TInput extends Record<string, unknown>, TOutput>({
  schema,
  initialValues,
  onSubmit,
}: UseZodFormOptions<TInput, TOutput>) {
  const [values, setValues] = useState<TInput>(initialValues);
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const result = useMemo(() => schema.safeParse(values), [schema, values]);

  const allErrors = useMemo<FieldErrors<TInput>>(() => {
    if (result.success) {
      return {};
    }

    const collected: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      // The first issue on a field is the one worth showing: the later ones
      // are usually consequences of the same mistake.
      if (typeof field === 'string' && !(field in collected)) {
        collected[field] = issue.message;
      }
    }
    return collected as FieldErrors<TInput>;
  }, [result]);

  const setValue = useCallback(
    <TField extends keyof TInput & string>(field: TField, value: TInput[TField]) => {
      setValues((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  /** Called on blur: from here on this field may show what is wrong with it. */
  const reveal = useCallback((field: keyof TInput & string) => {
    setRevealed((current) => {
      if (current.has(field)) {
        return current;
      }
      const next = new Set(current);
      next.add(field);
      return next;
    });
  }, []);

  const errorFor = useCallback(
    (field: keyof TInput & string) => (revealed.has(field) ? allErrors[field] : undefined),
    [allErrors, revealed],
  );

  const submit = useCallback(async () => {
    const parsed = schema.safeParse(values);

    if (!parsed.success) {
      // Every field becomes eligible to complain, so the guardian sees all of
      // what is missing at once instead of discovering it one press at a time.
      setRevealed(new Set(Object.keys(values)));
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(parsed.data);
    } finally {
      setIsSubmitting(false);
    }
  }, [schema, values, onSubmit]);

  return {
    values,
    setValue,
    reveal,
    errorFor,
    submit,
    isSubmitting,
    isValid: result.success,
  };
}
