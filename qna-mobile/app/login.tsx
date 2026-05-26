import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import {
  AuthCard,
  AuthLink,
  BackLink,
  BrandButton,
  BrandLogo,
  BrandTextInput,
  Eyebrow,
  FieldError,
  FormError,
  Heading,
  Screen,
  brandStyles,
} from '@/components/Brand';
import { fonts, palette } from '@/constants/theme';
import { AuthApiError } from '@/services/auth/api';
import { validateLoginForm, type AuthFieldErrors, hasFieldErrors } from '@/services/auth/forms';
import { useAuth } from '@/services/auth/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const returnToPath = normalizeParam(returnTo);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const nextFieldErrors = validateLoginForm({ email, password });
    setFieldErrors(nextFieldErrors);
    setFormError(null);

    if (hasFieldErrors(nextFieldErrors)) return;

    setSubmitting(true);
    try {
      await login({ email, password }, { returnTo: returnToPath });
    } catch (err) {
      if (err instanceof AuthApiError) {
        setFieldErrors(err.fieldErrors);
        setFormError(err.message);
      } else {
        setFormError('Unable to sign in right now.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen padded={false} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', default: undefined })}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.shell}>
            <View style={styles.brandRow}>
              <BrandLogo />
            </View>
            <BackLink href="/">Back to home</BackLink>

            <AuthCard>
              <View style={styles.copy}>
                <Eyebrow>Sign in</Eyebrow>
                <Heading compact accent="back.">
                  Welcome
                </Heading>
              </View>

              <View style={brandStyles.form}>
                <BrandTextInput
                  accessibilityLabel="Email"
                  inputMode="email"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="Email"
                  textContentType="emailAddress"
                  value={email}
                />
                <FieldError>{fieldErrors.email}</FieldError>
                <BrandTextInput
                  accessibilityLabel="Password"
                  onChangeText={setPassword}
                  placeholder="Password"
                  secureTextEntry
                  textContentType="password"
                  value={password}
                />
                <FieldError>{fieldErrors.password}</FieldError>
                <FormError>{formError}</FormError>
                <BrandButton disabled={submitting} onPress={handleSubmit}>
                  {submitting ? 'Signing in...' : 'Sign in'}
                </BrandButton>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>New here?</Text>
                <AuthLink
                  href={
                    returnToPath
                      ? { pathname: '/register', params: { returnTo: returnToPath } }
                      : '/register'
                  }
                >
                  Create an account
                </AuthLink>
              </View>
            </AuthCard>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function normalizeParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  shell: {
    alignSelf: 'center',
    gap: 12,
    maxWidth: 440,
    width: '100%',
  },
  brandRow: {
    alignItems: 'center',
  },
  copy: {
    gap: 8,
  },
  footer: {
    alignItems: 'center',
    borderTopColor: palette.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 2,
    paddingTop: 18,
  },
  footerText: {
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 13,
  },
});
