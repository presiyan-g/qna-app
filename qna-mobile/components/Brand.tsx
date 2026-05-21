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

type BrandButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  href?: Href;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: ViewStyle;
};

type StatePanelProps = {
  children?: ReactNode;
  title: string;
};

type BrandBadgeProps = {
  children: ReactNode;
  accessibilityLabel?: string;
  style?: ViewStyle;
};

type ConfirmDialogProps = {
  cancelLabel?: string;
  confirmLabel?: string;
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
  edges = ['left', 'right', 'bottom'],
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
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return <Text style={[styles.heading, compact ? styles.compactHeading : null]}>{children}</Text>;
}

export function BodyText({ children }: { children: ReactNode }) {
  return <Text style={styles.bodyText}>{children}</Text>;
}

export function StatePanel({ children, title }: StatePanelProps) {
  return (
    <View style={styles.statePanel}>
      <Text style={styles.stateText}>{title}</Text>
      {children}
    </View>
  );
}

export function SerifAccent({ children }: { children: ReactNode }) {
  return <Text style={styles.serifAccent}>{children}</Text>;
}

export function BrandButton({
  children,
  disabled = false,
  href,
  onPress,
  variant = 'primary',
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
        styles[`${variant}Button`],
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <Text style={[styles.buttonText, styles[`${variant}ButtonText`]]}>{children}</Text>
    </Pressable>
  );
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
            <BrandButton variant="secondary" style={styles.dialogButton} onPress={onCancel}>
              {cancelLabel}
            </BrandButton>
            <BrandButton style={styles.dialogButton} onPress={onConfirm}>
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
          <Text style={styles.communityBadgeText}>{initials}</Text>
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
    lineHeight: 39,
  },
  compactHeading: {
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
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBase: {
    ...pillBaseStyle,
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
  },
  buttonText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: '800',
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
  badge: {
    alignItems: 'center',
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
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  stateText: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
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
});
