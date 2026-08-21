import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { texts } from '@/constants/texts';
import { MIN_TOUCH_TARGET, colors, radii, spacing } from '@/constants/theme';
import { profileSchema, type ProfileInput, type ProfileValues } from '@/features/auth/auth-schemas';
import { describeMaybeAuthError } from '@/features/auth/auth-messages';
import { useSignOut } from '@/features/auth/use-auth-mutations';
import { useProfile, useUpdateProfile, type GuardianProfile } from '@/features/auth/use-profile';
import { useIsOnline } from '@/hooks/use-is-online';
import { useZodForm } from '@/hooks/use-zod-form';

/** Colombian time, which is how every date in this app is shown. */
const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'long',
  timeZone: 'America/Bogota',
});

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

export default function ProfileScreen() {
  const profile = useProfile();

  if (profile.isPending) {
    return (
      <Screen isScrollable={false}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText variant="body">{texts.common.loading}</AppText>
        </View>
      </Screen>
    );
  }

  if (profile.isError) {
    const failure = describeMaybeAuthError(profile.error);
    return (
      <Screen>
        <AppText variant="display">{texts.profile.loadErrorTitle}</AppText>
        <Notice
          tone="error"
          message={failure?.message ?? texts.authErrors.unknown}
          onRetry={() => void profile.refetch()}
        />
      </Screen>
    );
  }

  if (profile.data === null) {
    return <MissingProfile />;
  }

  return <ProfileEditor profile={profile.data} />;
}

/**
 * An identity with no profile row. The provisioning trigger makes this
 * impossible for anybody who signed up through the app, so it means the
 * identity was created some other way. Saying so with a way out beats an empty
 * form that saves nothing.
 */
function MissingProfile() {
  const router = useRouter();
  const signOut = useSignOut();

  return (
    <Screen>
      <AppText variant="display">{texts.profile.missingProfileTitle}</AppText>
      <Notice tone="error" message={texts.profile.missingProfileBody} />
      <Button
        label={texts.profile.signOut}
        variant="danger"
        isLoading={signOut.isPending}
        onPress={() => {
          signOut.mutate(undefined, { onSettled: () => router.replace('/sign-in') });
        }}
      />
    </Screen>
  );
}

function ProfileEditor({ profile }: { profile: GuardianProfile }) {
  const router = useRouter();
  const isOnline = useIsOnline();
  const updateProfile = useUpdateProfile();
  const signOut = useSignOut();

  // Interface only. The reminder engine is a later delivery, so the switches
  // say what they will do and stay disabled rather than pretending to work.
  const [wantsReminders, setWantsReminders] = useState(true);
  const [wantsSummary, setWantsSummary] = useState(false);

  const initialValues: ProfileInput = {
    fullName: profile.fullName,
    institution: profile.institution ?? '',
  };

  const form = useZodForm({
    schema: profileSchema,
    initialValues,
    onSubmit: async (values: ProfileValues) => {
      await updateProfile.mutateAsync(values).catch(() => {
        // Reported from the mutation below.
      });
    },
  });

  const failure = describeMaybeAuthError(updateProfile.error);

  function confirmSignOut() {
    Alert.alert(texts.profile.signOutTitle, texts.profile.signOutBody, [
      { text: texts.common.cancel, style: 'cancel' },
      {
        text: texts.profile.signOutConfirm,
        style: 'destructive',
        onPress: () => {
          signOut.mutate(undefined, { onSettled: () => router.replace('/sign-in') });
        },
      },
    ]);
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="display">{texts.profile.title}</AppText>
        <AppText variant="caption">
          {profile.role === 'coordinator'
            ? texts.profile.coordinatorRole
            : texts.profile.memberSince(formatDate(profile.createdAt))}
        </AppText>
      </View>

      {failure !== null ? (
        <Notice
          tone="error"
          message={failure.message}
          onRetry={failure.isRetryable ? () => void form.submit() : undefined}
        />
      ) : null}

      {updateProfile.isSuccess && failure === null ? (
        <Notice tone="success" message={texts.profile.saved} />
      ) : null}

      {!isOnline ? <Notice tone="warning" message={texts.common.offlineHint} /> : null}

      <View style={styles.section}>
        <TextField
          label={texts.profile.fullNameLabel}
          value={form.values.fullName}
          onChangeText={(value) => form.setValue('fullName', value)}
          onBlur={() => form.reveal('fullName')}
          error={form.errorFor('fullName')}
          textContentType="name"
          autoComplete="name"
          autoCapitalize="words"
        />

        <TextField
          label={texts.profile.institutionLabel}
          placeholder={texts.profile.institutionPlaceholder}
          value={form.values.institution}
          onChangeText={(value) => form.setValue('institution', value)}
          onBlur={() => form.reveal('institution')}
          error={form.errorFor('institution')}
          autoCapitalize="words"
        />

        {/* Read only: changing a login address needs a confirmation on both
            the old and the new one, which is not part of this delivery. */}
        <View style={styles.readOnlyField}>
          <AppText variant="label">{texts.profile.emailLabel}</AppText>
          <AppText
            variant="body"
            accessibilityLabel={`${texts.profile.emailLabel}: ${profile.email}`}
          >
            {profile.email}
          </AppText>
          <AppText variant="caption">{texts.profile.emailHint}</AppText>
        </View>

        <Button
          label={texts.common.save}
          loadingLabel={texts.common.saving}
          onPress={() => void form.submit()}
          isLoading={updateProfile.isPending || form.isSubmitting}
        />
      </View>

      <View style={styles.section}>
        <AppText variant="subtitle">{texts.profile.notificationsTitle}</AppText>
        <AppText variant="caption">{texts.profile.notificationsHint}</AppText>

        <NotificationToggle
          label={texts.profile.remindersLabel}
          value={wantsReminders}
          onChange={setWantsReminders}
        />
        <NotificationToggle
          label={texts.profile.summaryLabel}
          value={wantsSummary}
          onChange={setWantsSummary}
        />
      </View>

      <View style={styles.section}>
        <AppText variant="caption">
          {texts.profile.termsAcceptedAt(formatDate(profile.termsAcceptedAt))}
        </AppText>
        {profile.isAdultConfirmed ? (
          <AppText variant="caption">{texts.profile.adultConfirmed}</AppText>
        ) : null}

        <Button
          label={texts.profile.legalLink}
          onPress={() => router.push('/legal')}
          variant="ghost"
        />

        <Button
          label={texts.profile.signOut}
          onPress={confirmSignOut}
          variant="danger"
          isLoading={signOut.isPending}
        />
      </View>
    </Screen>
  );
}

function NotificationToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleLabel}>
        <AppText variant="body">{label}</AppText>
        <AppText variant="caption">{texts.profile.notificationsComingSoon}</AppText>
      </View>

      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        accessibilityHint={texts.profile.notificationsComingSoon}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor={colors.text}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
  },
  section: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  readOnlyField: {
    gap: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: MIN_TOUCH_TARGET,
  },
  toggleLabel: {
    flex: 1,
  },
});
