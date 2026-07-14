import { useRouter, type Href } from "expo-router";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { z } from "zod";

import { AppVersionLabel } from "@/components/app-version-label";
import { FlexMarketLoader } from "@/components/flex-market-loader";
import { AuthLogo } from "@/components/auth-logo";
import {
  PHONE_COUNTRIES,
  PhoneNumberInput,
  type PhoneCountry,
} from "@/components/phone-number-input";
import { PasswordInput } from "@/components/password-input";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { useLocale } from "@/presentation/providers/LocaleProvider";

import { AuthKeyboardScreen } from "./AuthKeyboardScreen";
import {
  AuthAnimatedSection,
  AuthLanguageBar,
  AuthPrimaryButton,
  AuthStaggerItem,
} from "./authAnimated";

function normalizePhone(raw: string, countryCode: PhoneCountry["code"]): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return trimmed;

  if (countryCode === "MM") {
    const digits = trimmed.replace(/\D/g, "");
    if (digits.startsWith("09")) return `+959${digits.slice(2)}`;
    if (digits.startsWith("959")) return `+${digits}`;
  }

  const parsed = parsePhoneNumberFromString(trimmed, countryCode);
  return parsed?.number ?? trimmed;
}

export function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];
  const reduceMotion = useReducedMotion();

  const phoneSchema = z.object({
    mode: z.literal("phone"),
    phone: z.string().min(1, t("phoneRequired")),
    password: z.string().min(1, t("passwordRequired")),
  });
  const emailSchema = z.object({
    mode: z.literal("email"),
    email: z.string().trim().email(t("emailInvalid")),
    password: z.string().min(1, t("passwordRequired")),
  });
  const loginSchema = z.union([phoneSchema, emailSchema]);

  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountry>(
    PHONE_COUNTRIES[0]!,
  );
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    phone?: string;
    email?: string;
    password?: string;
  }>({});

  const handleLogin = async () => {
    setErrors({});
    const normalizedPhone = normalizePhone(phone, phoneCountry.code);
    const result = loginSchema.safeParse(
      mode === "phone"
        ? {
            mode,
            phone: normalizedPhone,
            password,
          }
        : {
            mode,
            email: email.trim(),
            password,
          },
    );
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await login(result.data);
      if (!success) {
        Alert.alert(t("loginFailedTitle"), t("loginFailedBody"));
      }
    } catch (e) {
      const status = (
        e as { response?: { status?: number; data?: { message?: unknown } } }
      )?.response?.status;
      const serverMessage = (
        e as { response?: { data?: { message?: unknown } } }
      )?.response?.data?.message;
      if (status === 400) {
        Alert.alert(t("invalidRequestTitle"), t("invalidRequestBody"));
      } else if (status === 401) {
        Alert.alert(t("loginFailedTitle"), t("invalidCredsBody"));
      } else if (status === 403) {
        Alert.alert(
          t("errorTitle"),
          typeof serverMessage === "string"
            ? serverMessage
            : t("forgotPasswordAdminAccount"),
        );
      } else {
        Alert.alert(t("errorTitle"), t("genericErrorBody"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <AuthKeyboardScreen
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: 24,
            paddingBottom: 96,
          },
        ]}
        footer={
          <AuthLanguageBar
            locale={locale}
            onSelect={setLocale}
            scheme={scheme}
            colors={colors}
            disabled={isSubmitting}
            reduceMotion={reduceMotion}
          />
        }
      >
          <AuthAnimatedSection delayMs={0} reduceMotion={reduceMotion} style={styles.header}>
            <AuthLogo variant="compact" />
            <ThemedText numberOfLines={1} type="screenTitle" style={styles.appTitle}>
              {t("appName")}
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {t("signInSubtitle")}
            </ThemedText>
          </AuthAnimatedSection>

          <View style={styles.form}>
            <AuthStaggerItem index={0} reduceMotion={reduceMotion} style={styles.field}>
              <View style={styles.segment}>
                <Pressable
                  disabled={isSubmitting}
                  onPress={() => setMode("phone")}
                  style={[
                    styles.segmentItem,
                    {
                      borderColor: mode === "phone" ? colors.tint : colors.icon,
                      backgroundColor:
                        mode === "phone" ? `${colors.tint}22` : "transparent",
                    },
                  ]}
                >
                  <ThemedText style={styles.segmentText}>{t("phone")}</ThemedText>
                </Pressable>
                <Pressable
                  disabled={isSubmitting}
                  onPress={() => setMode("email")}
                  style={[
                    styles.segmentItem,
                    {
                      borderColor: mode === "email" ? colors.tint : colors.icon,
                      backgroundColor:
                        mode === "email" ? `${colors.tint}22` : "transparent",
                    },
                  ]}
                >
                  <ThemedText style={styles.segmentText}>{t("emailAddress")}</ThemedText>
                </Pressable>
              </View>
            </AuthStaggerItem>

            <AuthStaggerItem index={1} reduceMotion={reduceMotion} style={styles.field}>
              {mode === "phone" ? (
                <>
                  <ThemedText style={styles.label}>{t("phone")}</ThemedText>
                  <PhoneNumberInput
                    value={phone}
                    onChangeText={setPhone}
                    selectedCountry={phoneCountry}
                    onCountryChange={setPhoneCountry}
                    placeholder={t("phoneNumberPlaceholder")}
                    error={!!errors.phone}
                    editable={!isSubmitting}
                  />
                  {errors.phone && (
                    <ThemedText style={styles.error}>{errors.phone}</ThemedText>
                  )}
                </>
              ) : (
                <>
                  <ThemedText style={styles.label}>{t("emailAddress")}</ThemedText>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder={t("emailPlaceholder")}
                    placeholderTextColor={colors.icon}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!isSubmitting}
                    style={[
                      styles.input,
                      {
                        color: colors.text,
                        borderColor: errors.email ? "#e74c3c" : colors.icon,
                      },
                    ]}
                  />
                  {errors.email && (
                    <ThemedText style={styles.error}>{errors.email}</ThemedText>
                  )}
                </>
              )}
            </AuthStaggerItem>

            <AuthStaggerItem index={2} reduceMotion={reduceMotion} style={styles.field}>
              <ThemedText style={styles.label}>{t("loginPasswordLabel")}</ThemedText>
              <PasswordInput
                value={password}
                onChangeText={setPassword}
                placeholder={t("password")}
                editable={!isSubmitting}
                inputStyle={[
                  styles.input,
                  { color: colors.text, borderColor: errors.password ? "#e74c3c" : colors.icon },
                ]}
              />
              {errors.password && (
                <ThemedText style={styles.error}>{errors.password}</ThemedText>
              )}
              <Pressable
                disabled={isSubmitting}
                onPress={() => router.push("/(auth)/forgot-password" as Href)}
                style={styles.forgotRow}
              >
                <ThemedText style={[styles.forgotLink, { color: colors.tint }]}>
                  {t("forgotPassword")}
                </ThemedText>
              </Pressable>
            </AuthStaggerItem>

            <AuthStaggerItem index={3} reduceMotion={reduceMotion}>
              <AuthPrimaryButton
                onPress={handleLogin}
                disabled={isSubmitting}
                backgroundColor={colors.tint}
                style={[styles.button, isSubmitting && styles.buttonDisabled]}
              >
                {isSubmitting ? (
                  <FlexMarketLoader variant="inline" size="xs" showText={false} />
                ) : (
                  <ThemedText style={styles.buttonText}>{t("signIn")}</ThemedText>
                )}
              </AuthPrimaryButton>
            </AuthStaggerItem>

            <AuthStaggerItem index={4} reduceMotion={reduceMotion} style={styles.signUpRow}>
              <ThemedText style={styles.signUpText}>
                {t("noAccount")}{" "}
              </ThemedText>
              <Pressable
                disabled={isSubmitting}
                onPress={() => router.push("/(auth)/register" as Href)}
              >
                <ThemedText style={[styles.signUpLink, { color: colors.tint }]}>
                  {t("signUp")}
                </ThemedText>
              </Pressable>
            </AuthStaggerItem>

            <AuthStaggerItem index={5} reduceMotion={reduceMotion}>
              <AppVersionLabel style={styles.versionLabel} />
            </AuthStaggerItem>
          </View>
      </AuthKeyboardScreen>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingTop: 12,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 24,
    gap: 8,
  },
  appTitle: {
    marginTop: 8,
  },
  subtitle: {
    opacity: 0.6,
  },
  form: {
    gap: 20,
  },
  segment: {
    flexDirection: "row",
    gap: 12,
  },
  segmentItem: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  segmentText: {
    fontWeight: "600",
    fontSize: 14,
  },
  field: {
    gap: 6,
  },
  label: {
    fontWeight: "600",
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: {
    color: "#e74c3c",
    fontSize: 12,
  },
  forgotRow: {
    alignSelf: "flex-end",
    marginTop: 4,
  },
  forgotLink: {
    fontSize: 13,
    fontWeight: "700",
  },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  signUpRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  signUpText: {
    opacity: 0.7,
    fontSize: 14,
  },
  signUpLink: {
    fontWeight: "700",
    fontSize: 14,
  },
  versionLabel: {
    marginTop: 8,
  },
});





