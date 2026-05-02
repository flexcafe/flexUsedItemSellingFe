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
    login,
    sendPhoneOtp,
    verifyPhoneOtp,
    sendEmailVerification,
    verifyEmail,
    requestKbzPayVerification,
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
  const [password, setPassword] = useState("");
  const [kbzMessage, setKbzMessage] = useState(
    "Please verify my KBZPay quickly. I already transferred."
  );

  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [kbzRequested, setKbzRequested] = useState(false);

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

  const handleKbzPay = async () => {
    setBusy("kbz", true);
    try {
      await requestKbzPayVerification(
        kbzMessage.trim() ||
          "Please verify my KBZPay quickly. I already transferred."
      );
      setKbzRequested(true);
      Alert.alert(t("kbzPayRequested"));
    } catch (err) {
      handleError(err);
    } finally {
      setBusy("kbz", false);
    }
  };

  const handleFinish = async () => {
    if (!phoneVerified || !emailVerified) return;
    if (!phone.trim() || !password.trim()) {
      Alert.alert(t("errorTitle"), t("passwordRequired"));
      return;
    }

    setBusy("finish", true);
    try {
      const ok = await login({ mode: "phone", phone: phone.trim(), password: password.trim() });
      if (!ok) {
        Alert.alert(t("loginFailedTitle"), t("loginFailedBody"));
        return;
      }
      router.replace("/(tabs)");
    } catch (err) {
      const status = (err as { response?: { status?: number; data?: { message?: unknown } } })
        ?.response?.status;
      const serverMessage = (err as { response?: { data?: { message?: unknown } } })?.response
        ?.data?.message;
      if (status === 403) {
        Alert.alert(
          t("errorTitle"),
          typeof serverMessage === "string"
            ? serverMessage
            : "Phone and email verification are required before login"
        );
      } else if (status === 401) {
        Alert.alert(t("loginFailedTitle"), t("invalidCredsBody"));
      } else {
        Alert.alert(
          t("errorTitle"),
          typeof serverMessage === "string" ? serverMessage : t("genericErrorBody")
        );
      }
    } finally {
      setBusy("finish", false);
    }
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
          <ThemedText type="title" style={styles.title}>
            {t("verification")}
          </ThemedText>

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
            <Pressable
              onPress={handleResendEmail}
              disabled={loading.sendEmail || emailVerified || !email.trim()}
              style={[
                styles.outlineButton,
                { borderColor: colors.tint },
                (loading.sendEmail || emailVerified || !email.trim()) && {
                  opacity: 0.5,
                },
              ]}>
              {loading.sendEmail ? (
                <ActivityIndicator color={colors.tint} />
              ) : (
                <ThemedText style={[styles.outlineButtonText, { color: colors.tint }]}>
                  {t("sendEmailVerificationButton")}
                </ThemedText>
              )}
            </Pressable>
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

          {/* KBZPay */}
          <View style={[styles.card, { borderColor: colors.icon }]}>
            <View style={styles.cardHeader}>
              <ThemedText style={styles.cardTitle}>
                {t("kbzPayVerification")}
              </ThemedText>
              {kbzRequested && (
                <ThemedText style={[styles.badge, { color: SUCCESS }]}>
                  ✓ {t("kbzPayRequested")}
                </ThemedText>
              )}
            </View>
            <TextInput
              style={[
                styles.input,
                inputStyle,
                { minHeight: 90, textAlignVertical: "top" },
              ]}
              value={kbzMessage}
              onChangeText={setKbzMessage}
              placeholder={t("kbzPayMessagePlaceholder")}
              placeholderTextColor={colors.icon}
              multiline
              editable={!kbzRequested}
            />
            <Pressable
              onPress={handleKbzPay}
              disabled={loading.kbz || kbzRequested}
              style={[
                styles.primaryButton,
                styles.fullWidthButton,
                { backgroundColor: colors.tint },
                (loading.kbz || kbzRequested) && { opacity: 0.6 },
              ]}>
              {loading.kbz ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.primaryButtonText}>
                  {t("requestVerification")}
                </ThemedText>
              )}
            </Pressable>
          </View>

          <Pressable
            onPress={handleFinish}
            disabled={!phoneVerified || !emailVerified || loading.finish}
            style={[
              styles.continueButton,
              { borderColor: colors.tint, backgroundColor: colors.tint },
              (!phoneVerified || !emailVerified || loading.finish) && { opacity: 0.6 },
            ]}>
            {loading.finish ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.primaryButtonText}>
                {t("continueToApp")}
              </ThemedText>
            )}
          </Pressable>

          <View style={[styles.card, { borderColor: colors.icon }]}>
            <ThemedText style={styles.cardTitle}>Login to finish</ThemedText>
            <TextInput
              style={[styles.input, inputStyle]}
              value={password}
              onChangeText={setPassword}
              placeholder={t("password")}
              placeholderTextColor={colors.icon}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading.finish}
            />
            <ThemedText style={{ opacity: 0.7, fontSize: 12 }}>
              Enter your password to get an access token after verification.
            </ThemedText>
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
  title: { fontSize: 22, marginBottom: 4 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  badge: { fontSize: 12, fontWeight: "600" },
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
  outlineButton: {
    width: "100%",
    height: 48,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineButtonText: { fontWeight: "700", fontSize: 15 },
  linkButton: { alignItems: "center", paddingVertical: 6 },
  continueButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
});
