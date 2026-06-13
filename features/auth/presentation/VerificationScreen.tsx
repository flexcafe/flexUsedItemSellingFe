import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
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

import { useAppSafeAreaInsets } from "@/components/app-safe-area";
import { AppScrollView } from "@/components/app-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { useLocale } from "@/presentation/providers/LocaleProvider";

import {
  AuthAnimatedCard,
  AuthAnimatedSection,
  AuthPrimaryButton,
  AuthStaggerItem,
} from "./authAnimated";

const SUCCESS = "#16a34a";

export function VerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; email?: string }>();
  const {
    sendPhoneOtp,
    verifyPhoneOtp,
    sendEmailVerification,
    verifyEmail,
  } = useAuth();
  const { t } = useLocale();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];
  const reduceMotion = useReducedMotion();
  const insets = useAppSafeAreaInsets();

  const initialPhone = typeof params.phone === "string" ? params.phone : "";
  const initialEmail = typeof params.email === "string" ? params.email : "";

  const [phone, setPhone] = useState(initialPhone);
  const [otpCode, setOtpCode] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [emailToken, setEmailToken] = useState("");

  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const setBusy = (key: string, value: boolean) =>
    setLoading((prev) => ({ ...prev, [key]: value }));

  const handleError = (err: unknown, fallback?: string) => {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 401) {
      Alert.alert(t("errorTitle"), t("invalidCredsBody"));
    } else if (status === 400 || status === 404) {
      Alert.alert(t("errorTitle"), fallback ?? t("registerFailedBody"));
    } else {
      Alert.alert(t("errorTitle"), t("genericErrorBody"));
    }
  };

  const handleResendOtp = async () => {
    if (!phone.trim()) return;
    setBusy("sendOtp", true);
    try {
      await sendPhoneOtp(phone.trim());
      Alert.alert(t("otpSent"));
    } catch (err) {
      handleError(err);
    } finally {
      setBusy("sendOtp", false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!phone.trim() || otpCode.trim().length < 4) return;
    setBusy("verifyOtp", true);
    try {
      await verifyPhoneOtp(phone.trim(), otpCode.trim());
      setPhoneVerified(true);
      Alert.alert(t("otpVerified"));
    } catch (err) {
      handleError(err);
    } finally {
      setBusy("verifyOtp", false);
    }
  };

  const handleResendEmail = async () => {
    if (!email.trim()) return;
    setBusy("sendEmail", true);
    try {
      await sendEmailVerification(email.trim());
      Alert.alert(t("emailSent"));
    } catch (err) {
      handleError(err);
    } finally {
      setBusy("sendEmail", false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!email.trim() || !emailToken.trim()) return;
    setBusy("verifyEmail", true);
    try {
      await verifyEmail(email.trim(), emailToken.trim());
      setEmailVerified(true);
      Alert.alert(t("emailVerified"));
    } catch (err) {
      handleError(err);
    } finally {
      setBusy("verifyEmail", false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(auth)/login");
  };

  const handleSkipVerification = () => {
    router.replace("/(auth)/login");
  };

  const inputStyle = {
    color: colors.text,
    borderColor: colors.icon,
    backgroundColor: colors.background,
  } as const;

  return (
    <ThemedView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <AppScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: Math.max(insets.top, 24),
              paddingBottom: Math.max(insets.bottom, 24) + 40,
            },
          ]}
          keyboardShouldPersistTaps="always"
        >
          <AuthAnimatedSection delayMs={0} reduceMotion={reduceMotion}>
            <View style={styles.headerRow}>
              <Pressable
                accessibilityLabel="Go back"
                accessibilityRole="button"
                hitSlop={12}
                onPress={handleBack}
                style={styles.backButton}
              >
                <MaterialIcons name="arrow-back" size={24} color={colors.text} />
              </Pressable>
              <ThemedText type="title" style={styles.title}>
                {t("verification")}
              </ThemedText>
              <View style={styles.backButton} />
            </View>
          </AuthAnimatedSection>

          <AuthAnimatedCard
            scheme={scheme}
            borderColor={colors.icon + "55"}
            index={0}
            reduceMotion={reduceMotion}
          >
            <View style={styles.cardHeader}>
              <ThemedText style={styles.cardTitle}>
                {t("phoneVerification")}
              </ThemedText>
              {phoneVerified ? (
                <ThemedText style={[styles.badge, { color: SUCCESS }]}>
                  Verified {t("otpVerified")}
                </ThemedText>
              ) : null}
            </View>

            <TextInput
              style={[styles.input, inputStyle]}
              value={phone}
              onChangeText={setPhone}
              placeholder="+959123456789"
              placeholderTextColor={colors.icon}
              keyboardType="phone-pad"
              autoCapitalize="none"
              editable={!phoneVerified}
            />

            <View style={styles.inlineRow}>
              <TextInput
                style={[styles.input, inputStyle, { flex: 1 }]}
                value={otpCode}
                onChangeText={(v) => setOtpCode(v.replace(/\D/g, ""))}
                placeholder={t("otpPlaceholder")}
                placeholderTextColor={colors.icon}
                keyboardType="number-pad"
                maxLength={6}
                editable={!phoneVerified}
              />
              <AuthPrimaryButton
                onPress={handleVerifyOtp}
                disabled={loading.verifyOtp || phoneVerified}
                backgroundColor={colors.tint}
                style={[
                  styles.inlineButton,
                  (loading.verifyOtp || phoneVerified) && { opacity: 0.6 },
                ]}
              >
                {loading.verifyOtp ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <ThemedText style={styles.primaryButtonText}>
                    {t("verify")}
                  </ThemedText>
                )}
              </AuthPrimaryButton>
            </View>
            <Pressable
              onPress={handleResendOtp}
              disabled={loading.sendOtp || phoneVerified}
              style={styles.linkButton}
            >
              {loading.sendOtp ? (
                <ActivityIndicator color={colors.tint} size="small" />
              ) : (
                <ThemedText style={{ color: colors.tint, fontWeight: "600" }}>
                  {t("resend")}
                </ThemedText>
              )}
            </Pressable>
          </AuthAnimatedCard>

          <AuthAnimatedCard
            scheme={scheme}
            borderColor={colors.icon + "55"}
            index={1}
            reduceMotion={reduceMotion}
          >
            <View style={styles.cardHeader}>
              <ThemedText style={styles.cardTitle}>
                {t("emailVerification")}
              </ThemedText>
              {emailVerified ? (
                <ThemedText style={[styles.badge, { color: SUCCESS }]}>
                  Verified {t("emailVerified")}
                </ThemedText>
              ) : null}
            </View>
            <TextInput
              style={[styles.input, inputStyle]}
              value={email}
              onChangeText={setEmail}
              placeholder={t("emailPlaceholder")}
              placeholderTextColor={colors.icon}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!emailVerified}
            />
            <TextInput
              style={[styles.input, inputStyle]}
              value={emailToken}
              onChangeText={setEmailToken}
              placeholder={t("emailTokenPlaceholder")}
              placeholderTextColor={colors.icon}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!emailVerified}
            />
            <AuthStaggerItem index={0} reduceMotion={reduceMotion}>
              <AuthPrimaryButton
                onPress={handleVerifyEmail}
                disabled={
                  loading.verifyEmail ||
                  emailVerified ||
                  !email.trim() ||
                  !emailToken.trim()
                }
                backgroundColor={colors.tint}
                style={[
                  styles.fullWidthButton,
                  (loading.verifyEmail ||
                    emailVerified ||
                    !email.trim() ||
                    !emailToken.trim()) && { opacity: 0.6 },
                ]}
              >
                {loading.verifyEmail ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.primaryButtonText}>
                    {t("verifyEmailButton")}
                  </ThemedText>
                )}
              </AuthPrimaryButton>
            </AuthStaggerItem>
            <Pressable
              onPress={handleResendEmail}
              disabled={loading.sendEmail || emailVerified || !email.trim()}
              style={styles.linkButton}
            >
              {loading.sendEmail ? (
                <ActivityIndicator color={colors.tint} size="small" />
              ) : (
                <ThemedText style={{ color: colors.tint, fontWeight: "600" }}>
                  {t("resend")}
                </ThemedText>
              )}
            </Pressable>
          </AuthAnimatedCard>

          <AuthAnimatedSection delayMs={120} reduceMotion={reduceMotion}>
            <View style={styles.skipSection}>
              <ThemedText style={styles.skipText}>
                {t("skipVerificationText")}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={handleSkipVerification}
                style={[styles.skipButton, { borderColor: colors.tint + "66" }]}
              >
                <ThemedText
                  style={[styles.skipButtonText, { color: colors.tint }]}
                >
                  {t("skipVerification")}
                </ThemedText>
              </Pressable>
            </View>
          </AuthAnimatedSection>
        </AppScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    gap: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22 },
  cardHeader: {
    alignItems: "flex-start",
    gap: 4,
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  badge: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    width: "100%",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    fontSize: 15,
  },
  inlineRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  inlineButton: {
    height: 44,
    paddingHorizontal: 18,
    minWidth: 84,
    borderRadius: 10,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  fullWidthButton: { width: "100%", minHeight: 48, borderRadius: 10 },
  linkButton: { alignItems: "center", paddingVertical: 6 },
  skipSection: {
    gap: 10,
    alignItems: "center",
    paddingTop: 2,
  },
  skipText: {
    textAlign: "center",
    opacity: 0.75,
    fontSize: 13,
    lineHeight: 18,
  },
  skipButton: {
    alignSelf: "stretch",
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  skipButtonText: {
    fontWeight: "700",
    fontSize: 14,
  },
});
