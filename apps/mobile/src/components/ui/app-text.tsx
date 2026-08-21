import { Text, type TextProps } from 'react-native';

import { typography } from '@/constants/theme';

type Variant = keyof typeof typography;

export type AppTextProps = TextProps & {
  variant?: Variant;
};

/**
 * Text with the type scale already applied. Screens pick a role, not a font
 * size, so the whole app moves together when the visual identity is replaced.
 */
export function AppText({ variant = 'body', style, ...rest }: AppTextProps) {
  return <Text style={[typography[variant], style]} {...rest} />;
}
