import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type StyleProp,
  type TextStyle,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { fonts, palette } from '@/constants/theme';

const pillBaseStyle = {
  alignItems: 'center' as const,
  borderRadius: 999,
  justifyContent: 'center' as const,
  minHeight: 46,
  paddingHorizontal: 18,
};

// Mirrors web's q-btn-* color semantics. Keep this list aligned with
// the variants documented in qna-web/src/app/globals.css.
//   primary  — main commit (Submit, Sign in, Post)
//   clay     — warm secondary commit (Join, Create, Start)
//   lake     — tertiary / informational (Edit, Post comment)
//   ghost    — line-only low-emphasis (Cancel, Back)
//   secondary— same as ghost on mobile (kept for back-compat)
//   soft     — quiet primary-soft pill
//   danger   — irreversible destructive (Delete)
type BrandButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'clay'
  | 'lake'
  | 'soft'
  | 'danger';

type BrandButtonSize = 'md' | 'sm';

type BrandButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  href?: Href;
  onPress?: () => void;
  variant?: BrandButtonVariant;
  size?: BrandButtonSize;
  style?: ViewStyle;
};

type PillProps = {
  children: ReactNode;
  tone?: 'primary' | 'soft' | 'clay' | 'lake' | 'warn' | 'neutral' | 'line';
  style?: ViewStyle;
};

type StatePanelProps = {
  children?: ReactNode;
  title: string;
  /** Dashed border + centered text + optional italic accent — matches
   *  web's EmptyState card. Use for "nothing here yet" panels. */
  variant?: 'solid' | 'dashed';
  titleAccent?: string;
};

type BrandBadgeProps = {
  children: ReactNode;
  accessibilityLabel?: string;
  style?: ViewStyle;
};

type ConfirmDialogProps = {
  cancelLabel?: string;
  confirmLabel?: string;
  /** When true, the confirm action uses the danger variant — for
   *  irreversible operations (Delete, Leave, Sign out). */
  destructive?: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  visible: boolean;
};

type CommunityPreviewCardProps = {
  initials: string;
  name: string;
  cadence: string;
  description: string;
  href?: Href;
};

export function Screen({
  children,
  edges = ['top', 'left', 'right', 'bottom'],
  padded = true,
}: {
  children: ReactNode;
  edges?: Edge[];
  padded?: boolean;
}) {
  return (
    <SafeAreaView style={styles.safeArea} edges={edges}>
      <View style={[styles.screen, padded ? styles.paddedScreen : null]}>{children}</View>
    </SafeAreaView>
  );
}

export function BrandLogo() {
  return <Text style={styles.logo}>Quorum</Text>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function Heading({
  children,
  compact = false,
  accent,
}: {
  children: ReactNode;
  compact?: boolean;
  /** Optional italic-serif phrase rendered after the plain title,
   *  mirroring web's "Welcome back." / "No communities yet." accent. */
  accent?: string;
}) {
  if (accent) {
    return (
      <Text style={[styles.heading, compact ? styles.compactHeading : null]}>
        {children}{' '}
        <Text style={[styles.headingAccent, compact ? styles.compactHeadingAccent : null]}>
          {accent}
        </Text>
      </Text>
    );
  }
  return <Text style={[styles.heading, compact ? styles.compactHeading : null]}>{children}</Text>;
}

export function BodyText({ children }: { children: ReactNode }) {
  return <Text style={styles.bodyText}>{children}</Text>;
}

export function StatePanel({
  children,
  title,
  variant = 'solid',
  titleAccent,
}: StatePanelProps) {
  const dashed = variant === 'dashed';
  return (
    <View style={[styles.statePanel, dashed ? styles.statePanelDashed : null]}>
      <Text style={[styles.stateText, dashed ? styles.stateTextDashed : null]}>
        {title}
        {titleAccent ? (
          <>
            {' '}
            <Text style={styles.stateTextAccent}>{titleAccent}</Text>
          </>
        ) : null}
      </Text>
      {children ? (
        <View style={dashed ? styles.statePanelDashedActions : null}>{children}</View>
      ) : null}
    </View>
  );
}

export function SerifAccent({ children }: { children: ReactNode }) {
  return <Text style={styles.serifAccent}>{children}</Text>;
}

/**
 * Renders text with inline `*word*` segments bolded. Bold is reserved for
 * the markdown-style emphasis marker; the surrounding prose stays at its
 * declared weight. Use for question prompts, choice labels, broadcast
 * bodies — any content where authors might emphasize a key term.
 *
 * Pass `style` for the regular run and `boldStyle` for the emphasized run.
 * Unmatched asterisks (odd count, no closing) are rendered literally.
 */
export function EmphasizedText({
  children,
  style,
  boldStyle,
  numberOfLines,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
  boldStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const parts = parseEmphasis(children);
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, index) =>
        part.bold ? (
          <Text key={index} style={[styles.emphasisBold, boldStyle]}>
            {part.text}
          </Text>
        ) : (
          part.text
        ),
      )}
    </Text>
  );
}

function parseEmphasis(input: string): { text: string; bold: boolean }[] {
  const segments: { text: string; bold: boolean }[] = [];
  // Match *non-greedy text* that doesn't span line breaks and has no leading
  // or trailing whitespace inside the markers (matches common markdown).
  const re = /\*([^*\s][^*\n]*?[^*\s]|[^*\s])\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: input.slice(lastIndex, match.index), bold: false });
    }
    segments.push({ text: match[1], bold: true });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < input.length) {
    segments.push({ text: input.slice(lastIndex), bold: false });
  }
  if (segments.length === 0) {
    segments.push({ text: input, bold: false });
  }
  return segments;
}

export function BrandButton({
  children,
  disabled = false,
  href,
  onPress,
  variant = 'primary',
  size = 'md',
  style,
}: BrandButtonProps) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole={href ? 'link' : 'button'}
      disabled={disabled}
      onPress={href ? () => router.push(href) : onPress}
      style={({ pressed }) => [
        styles.button,
        styles.pillBase,
        size === 'sm' ? styles.pillSmall : null,
        styles[`${variant}Button`],
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          size === 'sm' ? styles.buttonTextSmall : null,
          styles[`${variant}ButtonText`],
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

/**
 * Status pill — mirrors web's `q-pill` family. Used for "Joined",
 * "Creator", live counts, and other small stateful indicators.
 */
export function Pill({ children, tone = 'soft', style }: PillProps) {
  return (
    <View style={[styles.pill, styles[`pill_${tone}`], style]}>
      <Text style={[styles.pillText, styles[`pillText_${tone}`]]}>{children}</Text>
    </View>
  );
}

/**
 * Tiny uppercase-tracked tag — mirrors web's `q-chip`. Used inside
 * cards / list rows for state labels (DAILY, LIVE, CLOSED, etc.).
 */
export function Chip({ children, tone = 'line', style }: PillProps) {
  return (
    <View style={[styles.chip, styles[`chip_${tone}`], style]}>
      <Text style={[styles.chipText, styles[`chipText_${tone}`]]}>{children}</Text>
    </View>
  );
}

/**
 * Small "← Back to home" affordance used at the top of auth screens.
 * Mirrors the web `q-link-back` styling — primary-colored, semibold,
 * sits below the brand logo.
 */
export function BackLink({
  children,
  href,
  onPress,
}: {
  children: ReactNode;
  href?: Href;
  onPress?: () => void;
}) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole={href ? 'link' : 'button'}
      onPress={href ? () => router.push(href) : onPress}
      style={({ pressed }) => [styles.backLink, pressed ? styles.pressed : null]}
      hitSlop={6}
    >
      <Text style={styles.backLinkArrow}>←</Text>
      <Text style={styles.backLinkText}>{children}</Text>
    </Pressable>
  );
}

/**
 * Auth card wrapper — paper-bg card with rounded chrome and generous
 * padding, mirroring web's AuthShell. Used by login + register.
 */
export function AuthCard({ children }: { children: ReactNode }) {
  return <View style={styles.authCard}>{children}</View>;
}

export function AuthLink({ children, href }: { children: ReactNode; href: Href }) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.authLink, pressed ? styles.pressed : null]}
    >
      <Text style={styles.authLinkText}>{children}</Text>
    </Pressable>
  );
}

export function BrandBadge({ children, accessibilityLabel, style }: BrandBadgeProps) {
  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={[styles.badge, style]}>
      <Text style={styles.badgeText}>{children}</Text>
    </View>
  );
}

export function BrandTextInput({
  autoCapitalize = 'none',
  style,
  ...props
}: TextInputProps & { style?: StyleProp<TextStyle> }) {
  return (
    <TextInput
      {...props}
      autoCapitalize={autoCapitalize}
      placeholderTextColor={palette.muted}
      style={[styles.input, style]}
    />
  );
}

export function ConfirmDialog({
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  destructive = false,
  message,
  onCancel,
  onConfirm,
  title,
  visible,
}: ConfirmDialogProps) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.dialog} role="alertdialog">
          <Text style={styles.dialogTitle}>{title}</Text>
          <Text style={styles.dialogMessage}>{message}</Text>
          <View style={styles.dialogActions}>
            <BrandButton variant="ghost" style={styles.dialogButton} onPress={onCancel}>
              {cancelLabel}
            </BrandButton>
            <BrandButton
              variant={destructive ? 'danger' : 'primary'}
              style={styles.dialogButton}
              onPress={onConfirm}
            >
              {confirmLabel}
            </BrandButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;

  return <Text style={styles.fieldError}>{children}</Text>;
}

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;

  return (
    <View accessibilityLiveRegion="polite" style={styles.formError}>
      <Text style={styles.formErrorText}>{children}</Text>
    </View>
  );
}

export function CommunityPreviewCard({
  initials,
  name,
  cadence,
  description,
  href,
}: CommunityPreviewCardProps) {
  const router = useRouter();
  const content = (
    <>
      <View style={styles.communityHeader}>
        <View style={styles.communityBadge}>
          <Text style={styles.communityBadgeText} numberOfLines={1}>
            {initials}
          </Text>
        </View>
        <View style={styles.communityTitleGroup}>
          <Text style={styles.communityName}>{name}</Text>
          <Text style={styles.communityCadence}>{cadence}</Text>
        </View>
      </View>
      <Text style={styles.communityDescription}>{description}</Text>
    </>
  );

  if (href) {
    return (
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push(href)}
        style={({ pressed }) => [styles.communityCard, pressed ? styles.pressed : null]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={styles.communityCard}>
      {content}
    </View>
  );
}

export const brandStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  form: {
    gap: 12,
    marginTop: 24,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.paper,
  },
  screen: {
    alignSelf: 'center',
    flex: 1,
    backgroundColor: palette.paper,
    maxWidth: 760,
    width: '100%',
  },
  paddedScreen: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  logo: {
    color: palette.primary,
    fontFamily: fonts.sans,
    fontSize: 21,
    fontWeight: '800',
  },
  eyebrow: {
    color: palette.primary,
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  heading: {
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 39,
  },
  compactHeading: {
    fontSize: 30,
    lineHeight: 34,
  },
  headingAccent: {
    color: palette.primary,
    fontFamily: fonts.serif,
    fontSize: 36,
    fontStyle: 'italic',
    fontWeight: '400',
    lineHeight: 39,
  },
  compactHeadingAccent: {
    fontSize: 30,
    lineHeight: 34,
  },
  bodyText: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 23,
  },
  serifAccent: {
    color: palette.primary,
    fontFamily: fonts.serif,
    fontStyle: 'italic',
    fontWeight: '400',
  },
  emphasisBold: {
    fontWeight: '700',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBase: {
    ...pillBaseStyle,
  },
  pillSmall: {
    minHeight: 38,
    paddingHorizontal: 14,
  },
  primaryButton: {
    backgroundColor: palette.primary,
  },
  secondaryButton: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderWidth: 1,
  },
  ghostButton: {
    backgroundColor: 'transparent',
    borderColor: palette.line,
    borderWidth: 1,
  },
  clayButton: {
    backgroundColor: palette.actionClay,
  },
  lakeButton: {
    backgroundColor: palette.actionLake,
  },
  softButton: {
    backgroundColor: palette.primarySoft,
  },
  dangerButton: {
    backgroundColor: palette.danger,
  },
  buttonText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: '800',
  },
  buttonTextSmall: {
    fontSize: 12,
  },
  primaryButtonText: {
    color: palette.paper,
  },
  secondaryButtonText: {
    color: palette.ink,
  },
  ghostButtonText: {
    color: palette.ink,
  },
  clayButtonText: {
    color: '#FFFFFF',
  },
  lakeButtonText: {
    color: '#FFFFFF',
  },
  softButtonText: {
    color: palette.primary,
  },
  dangerButtonText: {
    color: '#FFFFFF',
  },
  badge: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderWidth: 1,
    ...pillBaseStyle,
  },
  badgeText: {
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: '800',
  },
  authLink: {
    alignItems: 'center',
    minHeight: 42,
    justifyContent: 'center',
  },
  authLinkText: {
    color: palette.primary,
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: '800',
  },
  input: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 8,
    borderWidth: 1,
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 15,
  },
  fieldError: {
    color: '#9B2C2C',
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '700',
    marginTop: -6,
  },
  formError: {
    backgroundColor: '#FDECEC',
    borderColor: '#F2C4C4',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  formErrorText: {
    color: '#7F1D1D',
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  statePanel: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  statePanelDashed: {
    alignItems: 'center',
    borderStyle: 'dashed',
    paddingHorizontal: 18,
    paddingVertical: 28,
  },
  statePanelDashedActions: {
    alignItems: 'center',
    marginTop: 6,
  },
  stateText: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  stateTextDashed: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
    lineHeight: 23,
    textAlign: 'center',
  },
  stateTextAccent: {
    color: palette.primary,
    fontFamily: fonts.serif,
    fontSize: 17,
    fontStyle: 'italic',
    fontWeight: '400',
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(35, 34, 32, 0.42)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: palette.paper,
    borderColor: palette.line,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    maxWidth: 420,
    padding: 18,
    width: '100%',
  },
  dialogTitle: {
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 20,
    fontWeight: '800',
  },
  dialogMessage: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  dialogButton: {
    flex: 1,
  },
  communityCard: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 15,
  },
  communityHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  communityBadge: {
    alignItems: 'center',
    backgroundColor: palette.primarySoft,
    borderRadius: 9,
    height: 36,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 36,
  },
  communityBadgeText: {
    color: palette.primary,
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '800',
  },
  communityTitleGroup: {
    flex: 1,
    gap: 2,
  },
  communityName: {
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 15,
    fontWeight: '800',
  },
  communityCadence: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  communityDescription: {
    color: palette.ink,
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.52,
  },
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  pill_primary: { backgroundColor: palette.primary },
  pill_soft: { backgroundColor: palette.primarySoft },
  pill_clay: { backgroundColor: palette.actionClaySoft },
  pill_lake: { backgroundColor: palette.actionLakeSoft },
  pill_warn: { backgroundColor: '#FEF3C7' },
  pill_neutral: { backgroundColor: '#E7E5E4' },
  pill_line: { backgroundColor: 'transparent', borderColor: palette.line, borderWidth: 1 },
  pillText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '800',
  },
  pillText_primary: { color: palette.paper },
  pillText_soft: { color: palette.primary },
  pillText_clay: { color: palette.actionClayHover },
  pillText_lake: { color: palette.actionLakeHover },
  pillText_warn: { color: '#92400E' },
  pillText_neutral: { color: '#44403C' },
  pillText_line: { color: palette.muted },
  chip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  chip_primary: { backgroundColor: palette.primarySoft },
  chip_soft: { backgroundColor: palette.primarySoft },
  chip_clay: { backgroundColor: palette.actionClaySoft },
  chip_lake: { backgroundColor: palette.actionLakeSoft },
  chip_warn: { backgroundColor: '#FEF3C7' },
  chip_neutral: { backgroundColor: '#E7E5E4' },
  chip_line: { backgroundColor: 'transparent', borderColor: palette.line, borderWidth: 1 },
  chipText: {
    fontFamily: fonts.sans,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  chipText_primary: { color: palette.primary },
  chipText_soft: { color: palette.primary },
  chipText_clay: { color: palette.actionClayHover },
  chipText_lake: { color: palette.actionLakeHover },
  chipText_warn: { color: '#92400E' },
  chipText_neutral: { color: '#44403C' },
  chipText_line: { color: palette.muted },
  backLink: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    paddingVertical: 6,
  },
  backLinkArrow: {
    color: palette.primary,
    fontFamily: fonts.sans,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
  backLinkText: {
    color: palette.primary,
    fontFamily: fonts.sans,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  authCard: {
    backgroundColor: palette.card,
    borderColor: palette.line,
    borderRadius: 14,
    borderWidth: 1,
    gap: 22,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
});
