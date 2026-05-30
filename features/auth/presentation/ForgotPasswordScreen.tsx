import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import {
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { z } from "zod";

import { AuthLogo } from "@/components/auth-logo";
import { useAppSafeAreaInsets } from "@/components/app-safe-area";
import { AppScrollView } from "@/components/app-scroll-view";
import {
  PHONE_COUNTRIES,
  PhoneNumberInput,
  type PhoneCountry,
} from "@/components/phone-number-input";
import { PasswordInput } from "@/components/password-input";
import { PasswordStrengthMeter } from "@/components/password-strength-meter";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  mapForgotPasswordError,
  mapResetPasswordError,
} from "@/presentation/lib/passwordResetErrors";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { useLocale } from "@/presentation/providers/LocaleProvider";

import {
  AuthAnimatedCard,
  AuthAnimatedSection,
  AuthPrimaryButton,
  AuthStaggerItem,
} from "./authAnimated";

type Step = "phone" | "reset";

function normalizePhone(raw: string, countryCode: CountryCode): string {
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

function extractApiError(err: unknown): {
  status?: number;
  message?: string;
} {
  const e = err as {
    response?: { status?: number; data?: { message?: unknown } };
  };
  const message = e?.response?.data?.message;
  return {
    status: e?.response?.status,
    message: typeof message === "string" ? message : undefined,
  };
}

export function ForgotPasswordScreen() {
  const router = useRouter();
  const { requestPasswordResetOtp, resetPassword } = useAuth();
  const { t } = useLocale();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];
  const reduceMotion = useReducedMotion();
  const insets = useAppSafeAreaInsets();

  const [step, setStep] = useState<Step>("phone");
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountry>(
    PHONE_COUNTRIES[0]!,
  );
  const [phone, setPhone] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const setBusy = (key: string, value: boolean) =>
    setLoading((prev) => ({ ...prev, [key]: value }));

  const forgotLabels = useMemo(
    () => ({
      deactivated: t("forgotPasswordDeactivated"),
      adminAccount: t("forgotPasswordAdminAccount"),
      phoneNotFound: t("forgotPasswordPhoneNotFound"),
      rateLimit: t("forgotPasswordRateLimit"),
      fallback: t("genericErrorBody"),
    }),
    [t],
  );

  const resetLabels = useMemo(
    () => ({
      mismatch: t("forgotPasswordMismatch"),
      invalidOtp: t("forgotPasswordInvalidOtp"),
      phoneNotFound: t("forgotPasswordPhoneNotFound"),
      rateLimit: t("forgotPasswordRateLimit"),
      fallback: t("genericErrorBody"),
    }),
    [t],
  );

  const phoneSchema = z.object({
    phone: z
      .string()
      .min(1, t("phoneRequired"))
      .refine(
        (value) => isValidPhoneNumber(value),
        t("phoneInvalid"),
      ),
  });

  const resetSchema = z
    .object({
      code: z.string().trim().length(6, t("otpInvalid")),
      newPassword: z.string().min(8, t("passwordRequired")),
      confirmNewPassword: z.string().min(1, t("passwordRequired")),
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
      message: t("passwordMismatch"),
      path: ["confirmNewPassword"],
    });

  const handleBack = () => {
    if (step === "reset") {
      setStep("phone");
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(auth)/login");
  };

  const handleSendOtp = async () => {
    setErrors({});
    const e164 = normalizePhone(phone, phoneCountry.code);
    const parsed = phoneSchema.safeParse({ phone: e164 });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const field = String(issue.path[0] ?? "phone");
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setBusy("sendOtp", true);
    try {
      await requestPasswordResetOtp({ phone: parsed.data.phone });
      setNormalizedPhone(parsed.data.phone);
      setStep("reset");
      Alert.alert(t("forgotPasswordOtpSent"));
    } catch (err) {
      const { status, message } = extractApiError(err);
      Alert.alert(
        t("errorTitle"),
        mapForgotPasswordError(status, message, forgotLabels),
      );
    } finally {
      setBusy("sendOtp", false);
    }
  };

  const handleResendOtp = async () => {
    if (!normalizedPhone) return;
    setBusy("resendOtp", true);
    try {
      await requestPasswordResetOtp({ phone: normalizedPhone });
      Alert.alert(t("forgotPasswordOtpSent"));
    } catch (err) {
      const { status, message } = extractApiError(err);
      Alert.alert(
        t("errorTitle"),
        mapForgotPasswordError(status, message, forgotLabels),
      );
    } finally {
      setBusy("resendOtp", false);
    }
  };

  const handleResetPassword = async () => {
    setErrors({});
    const parsed = resetSchema.safeParse({
      code: otpCode.trim(),
      newPassword,
      confirmNewPassword,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const field = String(issue.path[0] ?? "code");
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setBusy("reset", true);
    try {
      await resetPassword({
        phone: normalizedPhone,
        code: parsed.data.code,
        newPassword: parsed.data.newPassword,
        confirmNewPassword: parsed.data.confirmNewPassword,
      });
      Alert.alert(t("forgotPasswordSuccessTitle"), t("forgotPasswordSuccess"), [
        {
          text: t("signIn"),
          onPress: () => router.replace("/(auth)/login"),
        },
      ]);
    } catch (err) {
      const { status, message } = extractApiError(err);
      Alert.alert(
        t("errorTitle"),
        mapResetPasswordError(status, message, resetLabels),
      );
    } finally {
      setBusy("reset", false);
    }
  };

  const inputStyle = {
    color: colors.text,
    borderColor: colors.icon,
    backgroundColor: colors.background,
  } as const;

  const isBusy = Object.values(loading).some(Boolean);

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <AppScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top, 8),
              paddingBottom: Math.max(insets.bottom, 24) + 40,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AuthAnimatedSection delayMs={0} reduceMotion={reduceMotion}>
            <View style={styles.headerRow}>
              <Pressable
                onPress={handleBack}
                hitSlop={12}
                style={styles.backButton}
                accessibilityRole="button"
              >
                <MaterialIcons name="arrow-back" size={24} color={colors.text} />
              </Pressable>
              <View style={styles.headerCenter}>
                <AuthLogo variant="compact" />
              </View>
              <View style={styles.backButton} />
            </View>
            <ThemedText type="title" style={styles.title}>
              {t("forgotPasswordTitle")}
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {step === "phone"
                ? t("forgotPasswordSubtitle")
                : t("forgotPasswordResetStepHint")}
            </ThemedText>
          </AuthAnimatedSection>

          {step === "phone" ? (
            <AuthAnimatedCard
              scheme={scheme}
              borderColor={colors.icon + "44"}
              index={0}
              reduceMotion={reduceMotion}
            >
              <AuthStaggerItem index={0} reduceMotion={reduceMotion} style={styles.field}>
                <ThemedText style={styles.label}>{t("phone")}</ThemedText>
                <PhoneNumberInput
                  value={phone}
                  onChangeText={setPhone}
                  selectedCountry={phoneCountry}
                  onCountryChange={setPhoneCountry}
                  placeholder={t("phoneNumberPlaceholder")}
                  error={!!errors.phone}
                  editable={!isBusy}
                />
                {errors.phone ? (
                  <ThemedText style={styles.error}>{errors.phone}</ThemedText>
                ) : null}
              </AuthStaggerItem>

              <AuthStaggerItem index={1} reduceMotion={reduceMotion}>
                <AuthPrimaryButton
                  onPress={() => void handleSendOtp()}
                  disabled={isBusy}
                  backgroundColor={colors.tint}
                  style={[styles.button, isBusy && styles.buttonDisabled]}
                >
                  {loading.sendOtp ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.buttonText}>
                      {t("forgotPasswordSendOtp")}
                    </ThemedText>
                  )}
                </AuthPrimaryButton>
              </AuthStaggerItem>
            </AuthAnimatedCard>
          ) : (
            <AuthAnimatedCard
              scheme={scheme}
              borderColor={colors.icon + "44"}
              index={0}
              reduceMotion={reduceMotion}
            >
              <View style={styles.phoneBadge}>
                <MaterialIcons name="phone-iphone" size={16} color={colors.tint} />
                <ThemedText style={[styles.phoneBadgeText, { color: colors.tint }]}>
                  {normalizedPhone}
                </ThemedText>
              </View>

              <AuthStaggerItem index={0} reduceMotion={reduceMotion} style={styles.field}>
                <ThemedText style={styles.label}>{t("otpCode")}</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    inputStyle,
                    errors.code && styles.inputError,
                  ]}
                  value={otpCode}
                  onChangeText={(v) => setOtpCode(v.replace(/\D/g, "").slice(0, 6))}
                  placeholder={t("otpPlaceholder")}
                  placeholderTextColor={colors.icon}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!isBusy}
                />
                {errors.code ? (
                  <ThemedText style={styles.error}>{errors.code}</ThemedText>
                ) : null}
              </AuthStaggerItem>

              <AuthStaggerItem index={1} reduceMotion={reduceMotion} style={styles.field}>
                <ThemedText style={styles.label}>{t("newPassword")}</ThemedText>
                <PasswordInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={t("newPasswordPlaceholder")}
                  editable={!isBusy}
                  inputStyle={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: errors.newPassword ? "#e74c3c" : colors.icon,
                    },
                  ]}
                />
                <PasswordStrengthMeter password={newPassword} />
                {errors.newPassword ? (
                  <ThemedText style={styles.error}>{errors.newPassword}</ThemedText>
                ) : null}
              </AuthStaggerItem>

              <AuthStaggerItem index={2} reduceMotion={reduceMotion} style={styles.field}>
                <ThemedText style={styles.label}>{t("confirmPassword")}</ThemedText>
                <PasswordInput
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  placeholder={t("confirmPasswordPlaceholder")}
                  editable={!isBusy}
                  inputStyle={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: errors.confirmNewPassword
                        ? "#e74c3c"
                        : colors.icon,
                    },
                  ]}
                />
                {errors.confirmNewPassword ? (
                  <ThemedText style={styles.error}>
                    {errors.confirmNewPassword}
                  </ThemedText>
                ) : null}
              </AuthStaggerItem>

              <AuthStaggerItem index={3} reduceMotion={reduceMotion}>
                <AuthPrimaryButton
                  onPress={() => void handleResetPassword()}
                  disabled={isBusy}
                  backgroundColor={colors.tint}
                  style={[styles.button, isBusy && styles.buttonDisabled]}
                >
                  {loading.reset ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.buttonText}>
                      {t("forgotPasswordResetSubmit")}
                    </ThemedText>
                  )}
                </AuthPrimaryButton>
              </AuthStaggerItem>

              <Pressable
                onPress={() => void handleResendOtp()}
                disabled={isBusy}
                style={styles.linkButton}
              >
                {loading.resendOtp ? (
                  <ActivityIndicator color={colors.tint} size="small" />
                ) : (
                  <ThemedText style={{ color: colors.tint, fontWeight: "700" }}>
                    {t("resend")}
                  </ThemedText>
                )}
              </Pressable>
            </AuthAnimatedCard>
          )}

          <AuthStaggerItem index={4} reduceMotion={reduceMotion} style={styles.signInRow}>
            <ThemedText style={styles.signInText}>{t("haveAccount")} </ThemedText>
            <Pressable
              disabled={isBusy}
              onPress={() => router.replace("/(auth)/login")}
            >
              <ThemedText style={[styles.signInLink, { color: colors.tint }]}>
                {t("signIn")}
              </ThemedText>
            </Pressable>
          </AuthStaggerItem>
        </AppScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    gap: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    textAlign: "center",
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  subtitle: {
    textAlign: "center",
    opacity: 0.65,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    paddingHorizontal: 8,
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
  inputError: {
    borderColor: "#e74c3c",
  },
  error: {
    color: "#e74c3c",
    fontSize: 12,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  phoneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(120,120,120,0.12)",
  },
  phoneBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  linkButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  signInRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  signInText: {
    opacity: 0.7,
    fontSize: 14,
  },
  signInLink: {
    fontWeight: "700",
    fontSize: 14,
  },
});





