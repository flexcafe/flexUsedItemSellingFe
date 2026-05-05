import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { useLocale } from "@/presentation/providers/LocaleProvider";

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
  const colors = Colors[colorScheme ?? "light"];

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

  const inputStyle = {
    color: colors.text,
    borderColor: colors.icon,
    backgroundColor: colors.background,
  } as const;

  return (
    <ThemedView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="always">
          <View style={styles.headerRow}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={12}
              onPress={handleBack}
              style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color={colors.text} />
            </Pressable>
            <ThemedText type="title" style={styles.title}>
              {t("verification")}
            </ThemedText>
            <View style={styles.backButton} />
          </View>

          {/* Phone OTP */}
          <View style={[styles.card, { borderColor: colors.icon }]}>
            <View style={styles.cardHeader}>
              <ThemedText style={styles.cardTitle}>
                {t("phoneVerification")}
              </ThemedText>
              {phoneVerified && (
                <ThemedText style={[styles.badge, { color: SUCCESS }]}>
                  ✓ {t("otpVerified")}
                </ThemedText>
              )}
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
              <Pressable
                onPress={handleVerifyOtp}
                disabled={loading.verifyOtp || phoneVerified}
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.tint },
                  (loading.verifyOtp || phoneVerified) && { opacity: 0.6 },
                ]}>
                {loading.verifyOtp ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <ThemedText style={styles.primaryButtonText}>
                    {t("verify")}
                  </ThemedText>
                )}
              </Pressable>
            </View>
            <Pressable
              onPress={handleResendOtp}
              disabled={loading.sendOtp || phoneVerified}
              style={styles.linkButton}>
              {loading.sendOtp ? (
                <ActivityIndicator color={colors.tint} size="small" />
              ) : (
                <ThemedText style={{ color: colors.tint, fontWeight: "600" }}>
                  {t("resend")}
                </ThemedText>
              )}
            </Pressable>
          </View>

          {/* Email token */}
          <View style={[styles.card, { borderColor: colors.icon }]}>
            <View style={styles.cardHeader}>
              <ThemedText style={styles.cardTitle}>
                {t("emailVerification")}
              </ThemedText>
              {emailVerified && (
                <ThemedText style={[styles.badge, { color: SUCCESS }]}>
                  ✓ {t("emailVerified")}
                </ThemedText>
              )}
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
            <Pressable
              onPress={handleVerifyEmail}
              disabled={
                loading.verifyEmail ||
                emailVerified ||
                !email.trim() ||
                !emailToken.trim()
              }
              style={[
                styles.primaryButton,
                styles.fullWidthButton,
                { backgroundColor: colors.tint },
                (loading.verifyEmail ||
                  emailVerified ||
                  !email.trim() ||
                  !emailToken.trim()) && { opacity: 0.6 },
              ]}>
              {loading.verifyEmail ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.primaryButtonText}>
                  {t("verifyEmailButton")}
                </ThemedText>
              )}
            </Pressable>
            <Pressable
              onPress={handleResendEmail}
              disabled={loading.sendEmail || emailVerified || !email.trim()}
              style={styles.linkButton}>
              {loading.sendEmail ? (
                <ActivityIndicator color={colors.tint} size="small" />
              ) : (
                <ThemedText style={{ color: colors.tint, fontWeight: "600" }}>
                  {t("resend")}
                </ThemedText>
              )}
            </Pressable>
          </View>



        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
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
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
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
  primaryButton: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 84,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  fullWidthButton: { width: "100%", height: 48 },
  linkButton: { alignItems: "center", paddingVertical: 6 },
});
