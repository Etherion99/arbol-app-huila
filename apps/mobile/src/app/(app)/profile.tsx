import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { ScreenState } from '@/components/ui/screen-state';
import { TextField } from '@/components/ui/text-field';
import { texts } from '@/constants/texts';
import { colors, fontFace, radii, spacing } from '@/constants/theme';
import { profileSchema, type ProfileInput, type ProfileValues } from '@/features/auth/auth-schemas';
import { describeMaybeAuthError } from '@/features/auth/auth-messages';
import { useSignOut } from '@/features/auth/use-auth-mutations';
import { useProfile, useUpdateProfile, type GuardianProfile } from '@/features/auth/use-profile';
import { useGuardianTrees } from '@/features/trees/use-guardian-trees';
import { useIsOnline } from '@/hooks/use-is-online';
import { useZodForm } from '@/hooks/use-zod-form';

/** Colombian time, which is how every date in this app is shown. */
const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'long',
  timeZone: 'America/Bogota',
});

/** The distinction pill is dated by year alone, so it needs its own formatter. */
const yearFormatter = new Intl.DateTimeFormat('es-CO', {
  year: 'numeric',
  timeZone: 'America/Bogota',
});

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

function formatYear(value: string): string {
  return yearFormatter.format(new Date(value));
}

/** The height the canvas gives every row of the options list. */
const MENU_ROW_HEIGHT = 52;

/** The drawn side of the avatar circle. */
const AVATAR_SIZE = 84;

/** Stands in for a figure the app cannot compute yet. */
const NO_FIGURE = '—';

/**
 * First and last initial, which is what the avatar circle carries while there
 * is no photograph in the profile. A single word gives a single letter rather
 * than a doubled one, and a name that is only whitespace still has to draw
 * something, so it falls back to a mark.
 */
function initialsOf(fullName: string): string {
  const words = fullName
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  if (words.length === 0) {
    return '·';
  }

  const first = words[0]?.charAt(0) ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.charAt(0) ?? '') : '';

  return (first + last).toLocaleUpperCase('es-CO');
}

export default function ProfileScreen() {
  const profile = useProfile();

  if (profile.isPending) {
    return (
      <Screen isScrollable={false}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <AppText variant="body">{texts.common.loading}</AppText>
        </View>
      </Screen>
    );
  }

  if (profile.isError) {
    const failure = describeMaybeAuthError(profile.error);
    return (
      <ScreenState
        icon="user"
        title={texts.profile.loadErrorTitle}
        detail={failure?.message ?? texts.authErrors.unknown}
        action={{ label: texts.common.retry, onPress: () => void profile.refetch() }}
      />
    );
  }

  if (profile.data === null) {
    return <MissingProfile />;
  }

  return <ProfileCard profile={profile.data} />;
}

/**
 * An identity with no profile row. The provisioning trigger makes this
 * impossible for anybody who signed up through the app, so it means the
 * identity was created some other way. Saying so with a way out beats an empty
 * form that saves nothing.
 *
 * The canvas gives this one running text rather than a framed error: nothing
 * here failed and nothing is worth retrying, so the block that means «something
 * broke, press again» would be the wrong shape. It also strikes the medallion
 * through with a red slash; the ported icon kit has no struck-through user and
 * a screen does not invent a glyph, so the neutral wash carries the difference.
 */
function MissingProfile() {
  const router = useRouter();
  const signOut = useSignOut();

  return (
    <ScreenState
      icon="user"
      tone="neutral"
      title={texts.profile.missingProfileTitle}
      message={texts.profile.missingProfileBody}
      action={{
        label: texts.profile.signOut,
        variant: 'danger',
        isLoading: signOut.isPending,
        onPress: () => {
          signOut.mutate(undefined, { onSettled: () => router.replace('/sign-in') });
        },
      }}
    />
  );
}

/**
 * The profile as the canvas composes it: an identity block, three figures, a
 * list of options, the sign out and the affiliation footer.
 *
 * ## Why the editor still unfolds in place
 *
 * The canvas puts editing behind an «Editar perfil» row and gives no screen for
 * it, so that row is a disclosure: it unfolds the form under itself, inside the
 * same card, rather than leading to a destination the canvas never drew. The
 * notification switches are the other way round — the canvas does give them a
 * screen, so the row beside them navigates.
 */
function ProfileCard({ profile }: { profile: GuardianProfile }) {
  const router = useRouter();
  const isOnline = useIsOnline();
  const updateProfile = useUpdateProfile();
  const signOut = useSignOut();

  // The same cached query the tree list reads, reused here only to count. The
  // figures are derived during render; nothing new is asked of the server.
  const trees = useGuardianTrees();

  const [isEditorExpanded, setIsEditorExpanded] = useState(false);

  const initialValues: ProfileInput = {
    fullName: profile.fullName,
    institution: profile.institution ?? '',
  };

  const form = useZodForm({
    schema: profileSchema,
    initialValues,
    onSubmit: async (values: ProfileValues) => {
      await updateProfile.mutateAsync(values).catch(() => {
        // Reported from the notice inside the editor panel.
      });
    },
  });

  const failure = describeMaybeAuthError(updateProfile.error);

  // A save that failed must never end up hidden behind a collapsed row, so the
  // panel is forced open while there is something to report inside it.
  const isEditorOpen = isEditorExpanded || updateProfile.isError;

  const roleLabel =
    profile.role === 'coordinator' ? texts.profile.coordinatorRole : texts.profile.guardianRole;

  const treeCount = trees.data === undefined ? null : trees.data.length;
  const upToDateCount =
    trees.data === undefined
      ? null
      : trees.data.filter((tree) => tree.trackingStatus === 'up_to_date').length;

  // Read from the manifest rather than typed here, so the footer cannot go on
  // claiming a version the build stopped being.
  const appVersion = Constants.expoConfig?.version ?? NO_FIGURE;

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
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <AppText
            variant="title"
            style={styles.avatarInitials}
            accessibilityLabel={texts.profile.avatarLabel(profile.fullName)}
          >
            {initialsOf(profile.fullName)}
          </AppText>
        </View>

        <View style={styles.identityNames}>
          <AppText variant="title" style={[styles.boldFace, styles.centeredText]}>
            {profile.fullName}
          </AppText>
          <AppText variant="caption" style={styles.centeredText}>
            {profile.institution === null || profile.institution === ''
              ? roleLabel
              : texts.profile.roleAndInstitution(roleLabel, profile.institution)}
          </AppText>
        </View>

        {/* Naranja Plateño, not the Juventud en línea magenta the canvas fills
            this pill with: that palette is an affiliation mark and does not
            enter the interface. The catalogue's `brand` tone already resolves
            it, so the pill is not deciding anything on its own here. */}
        <Badge
          status="brand"
          label={texts.profile.memberSinceYear(roleLabel, formatYear(profile.createdAt))}
        />

        <View style={styles.stats}>
          <Stat value={treeCount} label={texts.profile.statTreesLabel} />
          <Stat value={upToDateCount} label={texts.profile.statUpToDateLabel} isAccented />
          {/* No source. A cycle count needs the guardian's bitácora entries,
              which no hook reads, and the newest cycle a tree reached is not
              the number of entries behind it. It draws its empty state rather
              than a figure nobody can stand behind. */}
          <Stat value={null} label={texts.profile.statCyclesLabel} />
        </View>
      </View>

      {trees.isError ? (
        <Notice
          tone="warning"
          message={texts.profile.statsErrorMessage}
          onRetry={() => void trees.refetch()}
        />
      ) : null}

      {!isOnline ? <Notice tone="warning" message={texts.common.offlineHint} /> : null}

      <Card padding={0}>
        <MenuRow
          label={texts.profile.editProfile}
          isExpanded={isEditorOpen}
          onPress={() => setIsEditorExpanded((wasExpanded) => !wasExpanded)}
        />

        {isEditorOpen ? (
          <MenuPanel>
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
                the old and the new one, which is not part of this delivery.
                The address is only ever shown to the session that owns it. */}
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
          </MenuPanel>
        ) : null}

        <MenuRow
          label={texts.profile.notificationSettings}
          onPress={() => router.push('/settings/notifications')}
        />

        <MenuRow label={texts.profile.legalLink} onPress={() => router.push('/legal')} isLast />
      </Card>

      <Card padding={0}>
        <MenuRow
          label={texts.profile.signOut}
          onPress={confirmSignOut}
          tone="danger"
          isLoading={signOut.isPending}
          isLast
        />
      </Card>

      <View style={styles.footer}>
        <AppText variant="caption" style={styles.centeredText}>
          {texts.profile.termsAcceptedAt(formatDate(profile.termsAcceptedAt))}
        </AppText>
        {profile.isAdultConfirmed ? (
          <AppText variant="caption" style={styles.centeredText}>
            {texts.profile.adultConfirmed}
          </AppText>
        ) : null}

        {/* The canvas sets this line at 11px and writes «JUVENTUD EN LÍNEA» in
            the affiliation magenta. Both are refused here: 11px is under the
            12px floor of the type scale, and the magenta is a filiation colour
            that does not enter the interface — and at that size it would be
            small text over the page, which no version of that pink can carry. */}
        <AppText variant="caption" style={[styles.version, styles.centeredText]}>
          {texts.profile.versionFooter(appVersion)}
        </AppText>
      </View>
    </Screen>
  );
}

/**
 * One of the three figures over the identity block.
 *
 * `null` is «there is no source for this», not «zero»: a guardian with no trees
 * has to read 0, and a figure the app cannot compute has to read as absent. The
 * dash is drawn and the screen reader is told in words, because a dash on its
 * own is announced as a hyphen or as nothing at all.
 */
function Stat({
  value,
  label,
  isAccented = false,
}: {
  value: number | null;
  label: string;
  /** The canvas greens the «al día» figure. It is 26pt bold, so `accent` may set it. */
  isAccented?: boolean;
}) {
  const shown = value === null ? NO_FIGURE : String(value);
  const spoken = value === null ? texts.profile.statUnavailable : String(value);

  return (
    <View accessible accessibilityLabel={`${label}: ${spoken}`} style={styles.stat}>
      <AppText
        variant="title"
        style={[styles.boldFace, isAccented ? styles.statAccented : null]}
        accessibilityElementsHidden
      >
        {shown}
      </AppText>
      {/* `overline` rather than the canvas's 10px muted grey: `textMuted` is
          4.43:1 on the page and cannot set small text, and 10px is under the
          floor of the scale. `overline` keeps the uppercase microlabel shape at
          12px in `textSecondary`, which reads 7.04:1. */}
      <AppText variant="overline" accessibilityElementsHidden>
        {label}
      </AppText>
    </View>
  );
}

/**
 * A row of the options list.
 *
 * The chevron is the canvas's `chevL` flipped, because the ported icon kit only
 * carries the left-pointing one and a screen does not add glyphs to the kit. It
 * is drawn in `textMuted`, which is allowed: at 4.43:1 it clears the 3:1 a
 * graphic owes, and it is never the only thing saying the row is a control.
 *
 * A row that discloses a panel turns the same chevron downwards rather than
 * borrowing a second glyph, and announces itself with `expanded` so a reader
 * knows the row opens something instead of leading somewhere.
 */
function MenuRow({
  label,
  onPress,
  isExpanded,
  isLast = false,
  isLoading = false,
  tone = 'default',
}: {
  label: string;
  onPress: () => void;
  /** Present only on rows that unfold a panel in place. */
  isExpanded?: boolean;
  isLast?: boolean;
  isLoading?: boolean;
  tone?: 'default' | 'danger';
}) {
  const isDisclosure = isExpanded !== undefined;
  const isDanger = tone === 'danger';

  return (
    <Pressable
      onPress={onPress}
      disabled={isLoading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{
        busy: isLoading,
        disabled: isLoading,
        ...(isDisclosure ? { expanded: isExpanded } : {}),
      }}
      style={({ pressed }) => [
        styles.menuRow,
        isLast ? null : styles.menuRowDivided,
        isDanger ? styles.menuRowDanger : null,
        pressed && !isLoading
          ? isDanger
            ? styles.menuRowDangerPressed
            : styles.menuRowPressed
          : null,
      ]}
    >
      <AppText
        variant="label"
        style={[styles.menuLabel, isDanger ? styles.menuLabelDanger : null]}
        numberOfLines={2}
      >
        {label}
      </AppText>

      {isLoading ? <ActivityIndicator size="small" color={colors.danger} /> : null}

      {!isLoading && !isDanger ? (
        <View style={isExpanded === true ? styles.chevronDown : styles.chevronRight}>
          <Icon name="chevronLeft" size={18} color={colors.textMuted} />
        </View>
      ) : null}
    </Pressable>
  );
}

/** The body a disclosure row unfolds, inset inside the same card. */
function MenuPanel({ children }: { children: ReactNode }) {
  return <View style={styles.menuPanel}>{children}</View>;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  centeredText: {
    textAlign: 'center',
  },
  identity: {
    alignItems: 'center',
    gap: spacing[2] + 2,
  },
  identityNames: {
    gap: 2,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceOverlay,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /**
   * `accent` on the white circle is 4.29:1. That is under AA for small text and
   * fine here: the initials are 26pt on the bold display face, which is large
   * text, and they repeat a name written in full right underneath.
   */
  avatarInitials: {
    fontFamily: fontFace.displayBold,
    color: colors.accent,
  },
  /** The canvas sets the name and the figures heavier than the display semibold. */
  boldFace: {
    fontFamily: fontFace.displayBold,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[6],
    marginTop: spacing[1],
  },
  stat: {
    alignItems: 'center',
    gap: 2,
  },
  /** `accent` at 4.12:1 on the page: large text only, which 26pt bold is. */
  statAccented: {
    color: colors.accent,
  },
  menuRow: {
    minHeight: MENU_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  menuRowDivided: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  /**
   * The canvas draws no pressed row. It borrows the wash the card already uses
   * for its own press: `accentSoft` over the white card is `#e0f1e9`, which
   * tints the row by 1.17:1 and leaves every ink where it was — `textPrimary`
   * reads 14.86:1 over it and the `textMuted` chevron 3.93:1, over the 3:1 a
   * drawn shape owes.
   */
  menuRowPressed: {
    backgroundColor: colors.accentSoft,
  },
  /**
   * The sign out cannot take that wash. Its label is `danger` at 15 points,
   * which is small text and needs 4.5:1: it holds 4.72:1 on the plain white
   * card and falls to 3.91:1 over any soft fill in the palette, the red one
   * included, because every wash darkens the ground under it.
   *
   * So the press moves off the fill and onto the edge, which is the other
   * mechanism the card documents — `danger` outlines at 4.72:1 against the
   * white, well over the 3:1 a control boundary owes, and the ink never moves.
   * The border is reserved transparent so pressing does not shift the row, and
   * it takes the card's own radius because this row is the whole card.
   */
  menuRowDanger: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: radii.lg,
  },
  menuRowDangerPressed: {
    borderColor: colors.danger,
  },
  menuLabel: {
    flex: 1,
  },
  /** `danger` #E31B23 is 4.72:1 on the white card, so it may set this label. */
  menuLabelDanger: {
    color: colors.danger,
    fontFamily: fontFace.bodyMedium,
  },
  chevronRight: {
    transform: [{ scaleX: -1 }],
  },
  chevronDown: {
    transform: [{ rotate: '-90deg' }],
  },
  menuPanel: {
    gap: spacing[4],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[1],
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  readOnlyField: {
    gap: spacing[1],
  },
  footer: {
    alignItems: 'center',
    gap: spacing[1],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
  },
  version: {
    fontFamily: fontFace.monoMedium,
  },
});
