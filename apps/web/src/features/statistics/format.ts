import { texts } from '@/constants/texts';

/**
 * How a figure is written on the dashboard.
 *
 * Colombian conventions, which is why this exists at all: the decimal mark is a
 * comma and the thousands mark a point, so a survival rate reads "87,8%" and
 * never "87.8%". Getting that wrong on a report handed to the Secretaría de
 * Ambiente makes the panel look foreign to the people who have to sign it.
 */
const LOCALE = 'es-CO';

const integerFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

/**
 * One decimal at most, none when the value is whole. The views already round to
 * one decimal, so this only decides whether to show it: "87,8%" keeps its
 * decimal and "73%" does not grow a hollow ",0".
 */
const rateFormat = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/** A count of trees, guardians or log entries. */
export function formatCount(value: number): string {
  return integerFormat.format(value);
}

/**
 * A percentage the view may not be able to compute yet -- survival before the
 * first planting, punctuality before the first follow up entry. Null renders as
 * the em dash rather than as 0%, because "no hay dato" and "cero por ciento"
 * are different statements about the project.
 */
export function formatRate(value: number | null): string {
  if (value === null) return texts.common.noValue;
  return `${rateFormat.format(value)}%`;
}
