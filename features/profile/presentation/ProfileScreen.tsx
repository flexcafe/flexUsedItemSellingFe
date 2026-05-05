import { useEffect, useMemo, useState } from "react";
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

export function ProfileScreen() {
  const {
    user,
    logout,
    refreshProfile,
    sendPhoneOtp,
    verifyPhoneOtp,
    sendEmailVerification,
    verifyEmail,
    requestKbzPayVerification,
  } = useAuth();
  const { t } = useLocale();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const sampleName = user?.name?.trim()
    ? user.name.trim()
    : t("profileMemberFallback");
  const sampleEmail = user?.email?.trim()
    ? user.email.trim()
    : t("profileEmailFallback");
  const sampleRole = user?.role?.toUpperCase() ?? "CUSTOMER";
  const sampleId = user?.id ? String(user.id) : "USR-SAMPLE-1024";

  const [phone, setPhone] = useState(user?.phone?.trim() || "+959123456789");
  const [otpCode, setOtpCode] = useState("");
  const [email, setEmail] = useState(sampleEmail);
  const [emailToken, setEmailToken] = useState("");
  const [kbzMessage, setKbzMessage] = useState(
    "Please verify my KBZPay quickly. I already transferred."
  );

  const [phoneVerified, setPhoneVerified] = useState(Boolean(user?.isPhoneVerified));
  const [emailVerified, setEmailVerified] = useState(Boolean(user?.isEmailVerified));
  const [kbzRequested, setKbzRequested] = useState(
    user?.kbzPayVerificationStatus === "REQUESTED"
  );
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const initials = useMemo(() => {
    const parts = sampleName.split(" ").filter(Boolean);
    if (parts.length === 0) return "FU";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }, [sampleName]);

  const setBusy = (key: string, value: boolean) =>
    setLoading((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    setPhone(user?.phone?.trim() || "+959123456789");
    setEmail(user?.email?.trim() || "member@flexusedmarket.app");
    setPhoneVerified(Boolean(user?.isPhoneVerified));
    setEmailVerified(Boolean(user?.isEmailVerified));
    setKbzRequested(user?.kbzPayVerificationStatus === "REQUESTED");
  }, [user]);

  const normalizePhone = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return trimmed;
    if (trimmed.startsWith("+")) return trimmed.replace(/[\s-]/g, "");
    const digits = trimmed.replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("09")) return `+959${digits.slice(2)}`;
    if (digits.startsWith("959")) return `+${digits}`;
    return `+${digits}`;
  };

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

  const handleSendOtp = async () => {
    const normalized = normalizePhone(phone);
    if (!normalized || normalized.length < 8) {
      Alert.alert(t("errorTitle"), t("phoneRequired"));
      return;
    }
    setBusy("sendOtp", true);
    try {
      await sendPhoneOtp(normalized);
      setPhone(normalized);
      Alert.alert(t("otpSent"));
    } catch (err) {
      handleError(err);
    } finally {
      setBusy("sendOtp", false);
    }
  };

  const handleVerifyOtp = async () => {
    const normalized = normalizePhone(phone);
    if (!normalized || otpCode.trim().length < 4) return;
    setBusy("verifyOtp", true);
    try {
      await verifyPhoneOtp(normalized, otpCode.trim());
      const latest = await refreshProfile();
      setPhoneVerified(Boolean(latest?.isPhoneVerified));
      Alert.alert(t("otpVerified"));
    } catch (err) {
      handleError(err);
    } finally {
      setBusy("verifyOtp", false);
    }
  };

  const handleSendEmail = async () => {
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
      const latest = await refreshProfile();
      setEmailVerified(Boolean(latest?.isEmailVerified));
      Alert.alert(t("emailVerified"));
    } catch (err) {
      handleError(err);
    } finally {
      setBusy("verifyEmail", false);
    }
  };

  const handleRequestKbzPay = async () => {
    setBusy("kbz", true);
    try {
      await requestKbzPayVerification(
        kbzMessage.trim() || "Please verify my KBZPay quickly. I already transferred."
      );
      const latest = await refreshProfile();
      setKbzRequested(
        latest?.kbzPayVerificationStatus === "REQUESTED" || Boolean(latest?.isKbzPayVerified)
      );
      Alert.alert(t("kbzPayRequested"));
    } catch (err) {
      handleError(err);
    } finally {
      setBusy("kbz", false);
    }
  };

  const inputStyle = {
    color: colors.text,
    borderColor: colors.icon,
    backgroundColor: colors.background,
  } as const;

  const phoneStatusText = phoneVerified ? t("profileStatusVerified") : t("profileStatusNotVerified");
  const emailStatusText = emailVerified ? t("profileStatusVerified") : t("profileStatusNotVerified");
  const kbzStatusText = user?.isKbzPayVerified
    ? t("profileStatusVerified")
    : kbzRequested
      ? t("profileStatusRequested")
      : t("profileStatusNotVerified");

  return (
    <ThemedView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <ThemedText type="title" style={styles.title}>
            {t("profileTitle")}
          </ThemedText>

          <View style={[styles.card, { borderColor: colors.icon }]}>
            <View style={styles.profileHeader}>
              <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
                <ThemedText style={styles.avatarText}>{initials}</ThemedText>
              </View>
              <View style={styles.profileInfo}>
                <ThemedText style={styles.profileName}>{sampleName}</ThemedText>
                <ThemedText style={styles.profileSub}>{sampleEmail}</ThemedText>
                <ThemedText style={styles.profileSub}>
                  {sampleRole} | {sampleId}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={[styles.card, { borderColor: colors.icon }]}>
            <View style={styles.cardHeader}>
              <ThemedText style={styles.cardTitle}>{t("phoneVerification")}</ThemedText>
              <ThemedText style={[styles.badge, { color: phoneVerified ? SUCCESS : colors.icon }]}>
                {phoneStatusText}
              </ThemedText>
            </View>
            <TextInput
              style={[styles.input, inputStyle]}
              value={phone}
              onChangeText={setPhone}
              placeholder={t("phoneNumberPlaceholder")}
              placeholderTextColor={colors.icon}
              keyboardType="phone-pad"
              autoCapitalize="none"
              editable={!phoneVerified}
            />
            {!phoneVerified ? (
              <>
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
                      <ThemedText style={styles.primaryButtonText}>{t("verify")}</ThemedText>
                    )}
                  </Pressable>
                </View>
                <Pressable
                  onPress={handleSendOtp}
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
              </>
            ) : (
              <ThemedText style={styles.profileSub}>{t("profileVerifiedHint")}</ThemedText>
            )}
          </View>

          <View style={[styles.card, { borderColor: colors.icon }]}>
            <View style={styles.cardHeader}>
              <ThemedText style={styles.cardTitle}>{t("emailVerification")}</ThemedText>
              <ThemedText style={[styles.badge, { color: emailVerified ? SUCCESS : colors.icon }]}>
                {emailStatusText}
              </ThemedText>
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
            {!emailVerified ? (
              <>
                <Pressable
                  onPress={handleSendEmail}
                  disabled={loading.sendEmail || emailVerified || !email.trim()}
                  style={[
                    styles.outlineButton,
                    { borderColor: colors.tint },
                    (loading.sendEmail || emailVerified || !email.trim()) && { opacity: 0.5 },
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
                    loading.verifyEmail || emailVerified || !email.trim() || !emailToken.trim()
                  }
                  style={[
                    styles.primaryButton,
                    styles.fullWidthButton,
                    { backgroundColor: colors.tint },
                    (loading.verifyEmail || emailVerified || !email.trim() || !emailToken.trim()) && {
                      opacity: 0.6,
                    },
                  ]}>
                  {loading.verifyEmail ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.primaryButtonText}>
                      {t("verifyEmailButton")}
                    </ThemedText>
                  )}
                </Pressable>
              </>
            ) : (
              <ThemedText style={styles.profileSub}>{t("profileVerifiedHint")}</ThemedText>
            )}
          </View>

          <View style={[styles.card, { borderColor: colors.icon }]}>
            <View style={styles.cardHeader}>
              <ThemedText style={styles.cardTitle}>{t("kbzPayVerification")}</ThemedText>
              <ThemedText
                style={[
                  styles.badge,
                  { color: user?.isKbzPayVerified || kbzRequested ? SUCCESS : colors.icon },
                ]}>
                {kbzStatusText}
              </ThemedText>
            </View>
            <TextInput
              style={[
                styles.input,
                inputStyle,
                { minHeight: 92, textAlignVertical: "top" },
              ]}
              value={kbzMessage}
              onChangeText={setKbzMessage}
              placeholder={t("kbzPayMessagePlaceholder")}
              placeholderTextColor={colors.icon}
              multiline
              editable={!kbzRequested}
            />
            <Pressable
              onPress={handleRequestKbzPay}
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
            onPress={logout}
            style={[
              styles.signOutButton,
              { borderColor: colors.tint, backgroundColor: colors.background },
            ]}>
            <ThemedText style={[styles.signOutText, { color: colors.tint }]}>
              {t("signOutButton")}
            </ThemedText>
          </Pressable>
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
    paddingBottom: 42,
    gap: 16,
  },
  title: { fontSize: 24, marginBottom: 4 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  profileHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
  profileInfo: { flex: 1, gap: 2 },
  profileName: { fontSize: 16, fontWeight: "700" },
  profileSub: { fontSize: 13, opacity: 0.72 },
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
    paddingHorizontal: 16,
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
  signOutButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  signOutText: { fontSize: 14, fontWeight: "700" },
});
