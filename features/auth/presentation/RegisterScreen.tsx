import { useRouter, type Href } from "expo-router";
import { useMemo, useState } from "react";
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
import { z } from "zod";
import * as Location from "expo-location";

import { AuthLogo } from "@/components/auth-logo";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import type {
  Gender,
  MaritalStatus,
  RegisterInput,
  RegistrationType,
} from "@/core/domain/types/auth";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { useLocale } from "@/presentation/providers/LocaleProvider";

const DANGER = "#e74c3c";
const SUCCESS = "#16a34a";
const WARNING_BG = "#FFF7ED";
const WARNING_BORDER = "#FDBA74";
const WARNING_TEXT = "#C2410C";

type SegmentOption<T extends string> = { value: T; label: string };
type LocationCoords = { latitude: number; longitude: number };

function Segmented<T extends string>({
  options,
  value,
  onChange,
  tint,
  borderColor,
  disabled,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  tint: string;
  borderColor: string;
  disabled?: boolean;
}) {
  return (
    <View style={styles.segment}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            disabled={disabled}
            style={[
              styles.segmentItem,
              { borderColor },
              selected && { backgroundColor: tint, borderColor: tint },
            ]}>
            <ThemedText
              style={[
                styles.segmentText,
                selected && { color: "#fff" },
              ]}>
              {opt.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function RegisterScreen() {
  const router = useRouter();
  const { register, sendPhoneOtp } = useAuth();
  const { t } = useLocale();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [registrationType, setRegistrationType] =
    useState<RegistrationType>("PHONE_ONLY");
  const [nickname, setNickname] = useState("");
  const [nicknameChecked, setNicknameChecked] = useState<null | boolean>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [facebookId, setFacebookId] = useState("");
  const [kbzPayName, setKbzPayName] = useState("");
  const [kbzPayPhoneNumber, setKbzPayPhoneNumber] = useState("");
  const [gender, setGender] = useState<Gender>("MALE");
  const [age, setAge] = useState("");
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus>("SINGLE");
  const [region, setRegion] = useState("");
  const [regionVerified, setRegionVerified] = useState(false);
  const [locationCoords, setLocationCoords] = useState<LocationCoords | null>(
    null
  );
  const [referralId, setReferralId] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const schema = useMemo(() => {
    const base = z.object({
      registrationType: z.enum(["PHONE_AND_FACEBOOK", "PHONE_ONLY"]),
      nickname: z.string().trim().min(2, t("nicknameTooShort")).max(30),
      password: z.string().min(8, t("passwordRequired")),
      confirmPassword: z.string(),
      phone: z
        .string()
        .trim()
        .min(7, t("phoneRequired"))
        .regex(/^[+0-9\-\s]+$/, t("phoneRequired")),
      email: z.string().trim().email(t("emailInvalid")),
      facebookId: z.string().optional(),
      kbzPayName: z.string().trim().min(1),
      kbzPayPhoneNumber: z
        .string()
        .trim()
        .min(7)
        .regex(/^[+0-9\-\s]+$/),
      gender: z.enum(["MALE", "FEMALE"]),
      age: z.coerce.number().int().min(14, t("ageInvalid")).max(120, t("ageInvalid")),
      maritalStatus: z.enum(["SINGLE", "MARRIED"]),
      region: z.string().trim().min(1),
      referralId: z.string().trim().optional(),
    });
    return base
      .refine((v) => v.password === v.confirmPassword, {
        path: ["confirmPassword"],
        message: t("passwordMismatch"),
      })
      .refine(
        (v) =>
          v.registrationType !== "PHONE_AND_FACEBOOK" ||
          (v.facebookId?.trim().length ?? 0) > 0,
        { path: ["facebookId"], message: t("facebookIdRequired") }
      );
  }, [t]);

  // Normalize a Myanmar-style entry (e.g. "09-123-456") into "+9591234567" so
  // it matches the backend's expected format. Falls back to the raw value if
  // it already starts with a "+" or does not begin with a leading "09".
  const normalizeMmPhone = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return trimmed;
    if (trimmed.startsWith("+")) return trimmed.replace(/[\s-]/g, "");
    const digits = trimmed.replace(/\D/g, "");
    if (digits.startsWith("09")) return `+959${digits.slice(2)}`;
    if (digits.startsWith("959")) return `+${digits}`;
    return `+${digits}`;
  };

  const handleCheckNickname = () => {
    const trimmed = nickname.trim();
    if (trimmed.length < 2) {
      setNicknameChecked(false);
      setErrors((e) => ({ ...e, nickname: t("nicknameTooShort") }));
      return;
    }
    setErrors((e) => {
      const next = { ...e };
      delete next.nickname;
      return next;
    });
    setNicknameChecked(true);
  };

  const handleSendOtp = async () => {
    const normalized = normalizeMmPhone(phone);
    if (!normalized || normalized.length < 8) {
      setErrors((e) => ({ ...e, phone: t("phoneRequired") }));
      return;
    }
    setSendingOtp(true);
    try {
      await sendPhoneOtp(normalized);
      Alert.alert(t("otpSent"));
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        Alert.alert(
          t("errorTitle"),
          t("registerFailedBody")
        );
      } else {
        Alert.alert(t("errorTitle"), t("genericErrorBody"));
      }
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyLocation = async () => {
    if (region.trim().length === 0) {
      setErrors((e) => ({ ...e, region: t("regionVerify") }));
      return;
    }

    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setRegionVerified(false);
        setLocationCoords(null);
        setErrors((e) => ({ ...e, region: t("regionVerify") }));
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocationCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setRegionVerified(true);
      setErrors((e) => {
        const next = { ...e };
        delete next.region;
        return next;
      });
    } catch {
      setRegionVerified(false);
      setLocationCoords(null);
      setErrors((e) => ({ ...e, region: t("regionVerify") }));
      Alert.alert(t("errorTitle"), t("genericErrorBody"));
    } finally {
      setIsLocating(false);
    }
  };

  const handleSubmit = async () => {
    setErrors({});
    const parsed = schema.safeParse({
      registrationType,
      nickname,
      password,
      confirmPassword,
      phone,
      email,
      facebookId,
      kbzPayName,
      kbzPayPhoneNumber,
      gender,
      age,
      maritalStatus,
      region,
      referralId,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field) fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!regionVerified || !locationCoords) {
      setErrors({ region: t("regionVerify") });
      return;
    }

    const input: RegisterInput = {
      registrationType: parsed.data.registrationType,
      nickname: parsed.data.nickname,
      phone: normalizeMmPhone(parsed.data.phone),
      email: parsed.data.email,
      password: parsed.data.password,
      confirmPassword: parsed.data.confirmPassword,
      kbzPayName: parsed.data.kbzPayName,
      kbzPayPhoneNumber: normalizeMmPhone(parsed.data.kbzPayPhoneNumber),
      gender: parsed.data.gender,
      age: parsed.data.age,
      maritalStatus: parsed.data.maritalStatus,
      region: parsed.data.region,
      gpsLatitude: locationCoords.latitude,
      gpsLongitude: locationCoords.longitude,
      referralId: parsed.data.referralId,
    };
    if (parsed.data.registrationType === "PHONE_AND_FACEBOOK") {
      input.facebookId = parsed.data.facebookId?.trim();
    }

    setIsSubmitting(true);
    try {
      const ok = await register(input);
      if (!ok) {
        Alert.alert(t("registerFailedTitle"), t("registerFailedBody"));
        return;
      }
      Alert.alert(
        t("registerSuccessTitle"),
        t("registerSuccessBody"),
        [
          {
            text: "OK",
            onPress: () =>
              router.replace({
                pathname: "/verify",
                params: { phone: input.phone, email: input.email },
              } as unknown as Href),
          },
        ]
      );
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        Alert.alert(t("registerFailedTitle"), t("registerConflictBody"));
      } else if (status === 400) {
        Alert.alert(t("invalidRequestTitle"), t("registerFailedBody"));
      } else {
        Alert.alert(t("errorTitle"), t("genericErrorBody"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = (hasError?: boolean) => [
    styles.input,
    {
      color: colors.text,
      borderColor: hasError ? DANGER : colors.icon,
      backgroundColor: colors.background,
    },
  ];

  return (
    <ThemedView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <View style={styles.brandArea}>
            <AuthLogo variant="compact" />
          </View>

          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={styles.backButton}>
              <ThemedText style={{ fontSize: 22 }}>‹</ThemedText>
            </Pressable>
            <ThemedText type="title" style={styles.title}>
              {t("signUp")}
            </ThemedText>
            <View style={styles.backButton} />
          </View>

          {/* Registration method */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>{t("registrationMethod")}</ThemedText>
            <Segmented<RegistrationType>
              options={[
                { value: "PHONE_ONLY", label: t("phoneOnly") },
              ]}
              value={registrationType}
              onChange={setRegistrationType}
              tint={colors.tint}
              borderColor={colors.icon}
              disabled={isSubmitting}
            />
            {registrationType === "PHONE_AND_FACEBOOK" && (
              <View style={styles.hintRow}>
                <ThemedText style={[styles.hint, { color: SUCCESS }]}>
                  ✓ {t("phoneAndFacebook")}
                </ThemedText>
              </View>
            )}
          </View>

          {/* Nickname */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>{t("nickname")}</ThemedText>
            <View style={styles.inlineRow}>
              <TextInput
                style={[inputStyle(!!errors.nickname), { flex: 1 }]}
                value={nickname}
                onChangeText={(v) => {
                  setNickname(v);
                  setNicknameChecked(null);
                }}
                placeholder={t("nicknamePlaceholder")}
                placeholderTextColor={colors.icon}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
              />
              <Pressable
                onPress={handleCheckNickname}
                disabled={isSubmitting}
                style={[styles.inlineButton, { backgroundColor: colors.tint }]}>
                <ThemedText style={styles.inlineButtonText}>
                  {t("check")}
                </ThemedText>
              </Pressable>
            </View>
            {errors.nickname ? (
              <ThemedText style={styles.error}>{errors.nickname}</ThemedText>
            ) : nicknameChecked ? (
              <ThemedText style={[styles.hint, { color: SUCCESS }]}>
                ✓ {t("nicknameAvailable")}
              </ThemedText>
            ) : null}
          </View>

          {/* Password */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>{t("password")}</ThemedText>
            <View style={styles.passwordRow}>
              <TextInput
                style={[inputStyle(!!errors.password), styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder={t("password")}
                placeholderTextColor={colors.icon}
                secureTextEntry={!isPasswordVisible}
                editable={!isSubmitting}
              />
              <Pressable
                onPress={() => setIsPasswordVisible((v) => !v)}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel={isPasswordVisible ? t("hidePassword") : t("showPassword")}
                style={({ pressed }) => [
                  styles.passwordToggle,
                  { opacity: pressed ? 0.7 : 1 },
                ]}>
                <ThemedText style={[styles.passwordToggleText, { color: colors.tint }]}>
                  {isPasswordVisible ? t("hide") : t("show")}
                </ThemedText>
              </Pressable>
            </View>
            {errors.password ? (
              <ThemedText style={styles.error}>{errors.password}</ThemedText>
            ) : null}
          </View>

          {/* Confirm Password */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>{t("confirmPassword")}</ThemedText>
            <View style={styles.passwordRow}>
              <TextInput
                style={[inputStyle(!!errors.confirmPassword), styles.passwordInput]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t("confirmPasswordPlaceholder")}
                placeholderTextColor={colors.icon}
                secureTextEntry={!isConfirmPasswordVisible}
                editable={!isSubmitting}
              />
              <Pressable
                onPress={() => setIsConfirmPasswordVisible((v) => !v)}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel={
                  isConfirmPasswordVisible ? t("hidePassword") : t("showPassword")
                }
                style={({ pressed }) => [
                  styles.passwordToggle,
                  { opacity: pressed ? 0.7 : 1 },
                ]}>
                <ThemedText style={[styles.passwordToggleText, { color: colors.tint }]}>
                  {isConfirmPasswordVisible ? t("hide") : t("show")}
                </ThemedText>
              </Pressable>
            </View>
            {errors.confirmPassword ? (
              <ThemedText style={styles.error}>{errors.confirmPassword}</ThemedText>
            ) : null}
          </View>

          {/* Phone + send code */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>{t("phoneNumber")}</ThemedText>
            <View style={styles.inlineRow}>
              <TextInput
                style={[inputStyle(!!errors.phone), { flex: 1 }]}
                value={phone}
                onChangeText={setPhone}
                placeholder={t("phoneNumberPlaceholder")}
                placeholderTextColor={colors.icon}
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
              />
              <Pressable
                onPress={handleSendOtp}
                disabled={isSubmitting || sendingOtp}
                style={[styles.inlineButton, { backgroundColor: colors.tint }]}>
                {sendingOtp ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <ThemedText style={styles.inlineButtonText}>
                    {t("sendCode")}
                  </ThemedText>
                )}
              </Pressable>
            </View>
            {errors.phone ? (
              <ThemedText style={styles.error}>{errors.phone}</ThemedText>
            ) : null}
          </View>

          {/* Email */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>{t("emailAddress")}</ThemedText>
            <TextInput
              style={inputStyle(!!errors.email)}
              value={email}
              onChangeText={setEmail}
              placeholder={t("emailPlaceholder")}
              placeholderTextColor={colors.icon}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
            />
            {errors.email ? (
              <ThemedText style={styles.error}>{errors.email}</ThemedText>
            ) : null}
          </View>

          {/* Facebook ID (conditional) */}
          {registrationType === "PHONE_AND_FACEBOOK" && (
            <View style={styles.field}>
              <ThemedText style={styles.label}>{t("facebookId")}</ThemedText>
              <TextInput
                style={inputStyle(!!errors.facebookId)}
                value={facebookId}
                onChangeText={setFacebookId}
                placeholder={t("facebookIdPlaceholder")}
                placeholderTextColor={colors.icon}
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
              />
              {errors.facebookId ? (
                <ThemedText style={styles.error}>{errors.facebookId}</ThemedText>
              ) : null}
            </View>
          )}

          {/* K-pay section */}
          <View style={[styles.section, { borderColor: colors.icon }]}>
            <ThemedText style={styles.sectionTitle}>
              {t("kPayRegistration")}
            </ThemedText>

            <View style={styles.field}>
              <ThemedText style={styles.label}>{t("kPayName")}</ThemedText>
              <TextInput
                style={inputStyle(!!errors.kbzPayName)}
                value={kbzPayName}
                onChangeText={setKbzPayName}
                placeholder={t("kPayNamePlaceholder")}
                placeholderTextColor={colors.icon}
                autoCapitalize="words"
                editable={!isSubmitting}
              />
              {errors.kbzPayName ? (
                <ThemedText style={styles.error}>{errors.kbzPayName}</ThemedText>
              ) : null}
            </View>

            <View style={styles.field}>
              <ThemedText style={styles.label}>{t("kPayPhone")}</ThemedText>
              <TextInput
                style={inputStyle(!!errors.kbzPayPhoneNumber)}
                value={kbzPayPhoneNumber}
                onChangeText={setKbzPayPhoneNumber}
                placeholder={t("phoneNumberPlaceholder")}
                placeholderTextColor={colors.icon}
                keyboardType="phone-pad"
                autoCapitalize="none"
                editable={!isSubmitting}
              />
              {errors.kbzPayPhoneNumber ? (
                <ThemedText style={styles.error}>
                  {errors.kbzPayPhoneNumber}
                </ThemedText>
              ) : null}
            </View>

            <View
              style={[
                styles.warningBox,
                { backgroundColor: WARNING_BG, borderColor: WARNING_BORDER },
              ]}>
              <ThemedText style={[styles.warningText, { color: WARNING_TEXT }]}>
                ⚠ {t("kPayWarning")}
              </ThemedText>
            </View>
          </View>

          {/* Gender */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>{t("gender")}</ThemedText>
            <Segmented<Gender>
              options={[
                { value: "MALE", label: t("male") },
                { value: "FEMALE", label: t("female") },
              ]}
              value={gender}
              onChange={setGender}
              tint={colors.tint}
              borderColor={colors.icon}
              disabled={isSubmitting}
            />
          </View>

          {/* Age */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>{t("age")}</ThemedText>
            <TextInput
              style={inputStyle(!!errors.age)}
              value={age}
              onChangeText={(v) => setAge(v.replace(/[^0-9]/g, ""))}
              placeholder={t("agePlaceholder")}
              placeholderTextColor={colors.icon}
              keyboardType="number-pad"
              maxLength={3}
              editable={!isSubmitting}
            />
            {errors.age ? (
              <ThemedText style={styles.error}>{errors.age}</ThemedText>
            ) : null}
          </View>

          {/* Marital status */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>{t("maritalStatus")}</ThemedText>
            <Segmented<MaritalStatus>
              options={[
                { value: "MARRIED", label: t("married") },
                { value: "SINGLE", label: t("single") },
              ]}
              value={maritalStatus}
              onChange={setMaritalStatus}
              tint={colors.tint}
              borderColor={colors.icon}
              disabled={isSubmitting}
            />
          </View>

          {/* Region */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>{t("region")}</ThemedText>
            <TextInput
              style={inputStyle(!!errors.region)}
              value={region}
              onChangeText={(v) => {
                setRegion(v);
                setRegionVerified(false);
                setLocationCoords(null);
              }}
              placeholder={t("regionPlaceholder")}
              placeholderTextColor={colors.icon}
              editable={!isSubmitting}
            />
            <Pressable
              onPress={handleVerifyLocation}
              disabled={isSubmitting || isLocating}
              style={[
                styles.regionButton,
                {
                  borderColor: regionVerified ? SUCCESS : colors.tint,
                  backgroundColor: regionVerified ? SUCCESS : "transparent",
                },
              ]}>
              <ThemedText
                style={{
                  color: regionVerified ? "#fff" : colors.tint,
                  fontWeight: "600",
                }}>
                {regionVerified ? `✓ ${t("regionVerified")}` : `📍 ${t("regionVerify")}`}
              </ThemedText>
            </Pressable>
            {errors.region ? (
              <ThemedText style={styles.error}>{errors.region}</ThemedText>
            ) : null}
          </View>

          {/* Referral */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>
              {t("referralId")}{" "}
              <ThemedText style={styles.optionalText}>
                ({t("optional")})
              </ThemedText>
            </ThemedText>
            <TextInput
              style={inputStyle(false)}
              value={referralId}
              onChangeText={setReferralId}
              placeholder={t("referralPlaceholder")}
              placeholderTextColor={colors.icon}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
            />
          </View>

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={[
              styles.submitButton,
              { backgroundColor: colors.tint },
              isSubmitting && { opacity: 0.7 },
            ]}>
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.submitText}>{t("signUpCta")}</ThemedText>
            )}
          </Pressable>

          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>
              {t("haveAccount")}{" "}
            </ThemedText>
            <Pressable onPress={() => router.replace("/(auth)/login")}>
              <ThemedText style={[styles.footerLink, { color: colors.tint }]}>
                {t("signIn")}
              </ThemedText>
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
    paddingTop: 42,
    paddingBottom: 40,
    gap: 18,
  },
  brandArea: {
    alignItems: "center",
    marginBottom: 2,
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
  field: { gap: 6 },
  label: { fontWeight: "600", fontSize: 14 },
  hintRow: { marginTop: 4 },
  hint: { fontSize: 12 },
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
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  passwordRow: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 80,
  },
  passwordToggle: {
    position: "absolute",
    right: 12,
    height: 44,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  passwordToggleText: {
    fontWeight: "700",
    fontSize: 14,
  },
  inlineButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  segment: { flexDirection: "row", gap: 10 },
  segmentItem: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  segmentText: { fontWeight: "600", fontSize: 14 },
  section: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  warningBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  warningText: { fontSize: 12, lineHeight: 18 },
  regionButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 6,
  },
  optionalText: { opacity: 0.6, fontSize: 12, fontWeight: "400" },
  error: { color: DANGER, fontSize: 12 },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  footerText: { fontSize: 14, opacity: 0.7 },
  footerLink: { fontSize: 14, fontWeight: "700" },
});
