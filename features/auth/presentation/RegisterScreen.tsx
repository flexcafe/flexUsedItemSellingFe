import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import {
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
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
import { PasswordInput } from "@/components/password-input";
import { PasswordStrengthMeter } from "@/components/password-strength-meter";
import { PhoneNumberInput } from "@/components/phone-number-input";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import type { RegisterInput } from "@/core/domain/types/auth";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/presentation/providers/AuthProvider";
import {
  isUuidLike,
  mapRegisterReferralError,
  normalizeReferralCodeInput,
} from "@/presentation/lib/referral";
import { useLegalTerms } from "@/presentation/providers/LegalTermsProvider";
import { useLocale } from "@/presentation/providers/LocaleProvider";

import { AuthKeyboardScreen } from "./AuthKeyboardScreen";
import {
  AuthAnimatedSection,
  AuthLanguageBar,
  AuthPrimaryButton,
  AuthStaggerItem,
} from "./authAnimated";

const DANGER = "#e74c3c";
const WARNING_BG = "#FFF7ED";
const WARNING_BORDER = "#FDBA74";
const WARNING_TEXT = "#C2410C";

type PhoneCountry = {
  code: CountryCode;
  dialCode: string;
  label: string;
  flag: string;
};

const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: "MM", dialCode: "+95", label: "Myanmar", flag: "🇲🇲" },
  { code: "KR", dialCode: "+82", label: "Korea", flag: "🇰🇷" },
  { code: "CN", dialCode: "+86", label: "China", flag: "🇨🇳" },
];
function normalizePhone(raw: string, country: CountryCode): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return trimmed;

  // Handle Myanmar "09..." input as a convenience.
  if (country === "MM") {
    const digits = trimmed.replace(/\D/g, "");
    if (digits.startsWith("09")) return `+959${digits.slice(2)}`;
    if (digits.startsWith("959")) return `+${digits}`;
  }

  const parsed = parsePhoneNumberFromString(trimmed, country);
  if (!parsed) return trimmed;
  return parsed.number; // E.164
}

export function RegisterScreen() {
  const router = useRouter();
  const { ref: refFromLink } = useLocalSearchParams<{ ref?: string | string[] }>();
  const { register } = useAuth();
  const { termsVersion, hasPreAuthAcceptedCurrent } = useLegalTerms();
  const { locale, setLocale, t } = useLocale();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];
  const reduceMotion = useReducedMotion();
  // Registration method toggle removed for now (phone-only).
  const registrationType = "PHONE_ONLY" as const;
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountry>(
    PHONE_COUNTRIES[0]!,
  );
  const [kbzPayPhoneCountry, setKbzPayPhoneCountry] = useState<PhoneCountry>(
    PHONE_COUNTRIES[0]!,
  );
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [kbzPayName, setKbzPayName] = useState("");
  const [kbzPayPhoneNumber, setKbzPayPhoneNumber] = useState("");
  const [referralId, setReferralId] = useState("");

  useEffect(() => {
    const raw = Array.isArray(refFromLink) ? refFromLink[0] : refFromLink;
    const code = normalizeReferralCodeInput(typeof raw === "string" ? raw : "");
    if (code && !isUuidLike(code)) setReferralId(code);
  }, [refFromLink]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const emailOk = useMemo(
    () => z.string().trim().email().safeParse(email).success,
    [email],
  );

  const schema = useMemo(() => {
    const base = z.object({
      registrationType: z.literal("PHONE_ONLY"),
      nickname: z.string().trim().min(2, t("nicknameTooShort")).max(30),
      password: z.string().min(8, t("passwordRequired")),
      confirmPassword: z.string(),
      phone: z.string().trim().min(3, t("phoneRequired")),
      email: z.string().trim().email(t("emailInvalid")),
      kbzPayName: z.string().trim().min(1),
      kbzPayPhoneNumber: z.string().trim().min(3),
      referralId: z.string().trim().optional(),
    });
    return base
      .refine(
        (v) => !v.referralId?.trim() || !isUuidLike(v.referralId),
        { path: ["referralId"], message: t("referralCodeInvalid") },
      )
      .refine((v) => v.password === v.confirmPassword, {
        path: ["confirmPassword"],
        message: t("passwordMismatch"),
      })
      .refine(
        (v) => {
          const normalized = normalizePhone(v.phone, phoneCountry.code);
          return isValidPhoneNumber(normalized, phoneCountry.code);
        },
        { path: ["phone"], message: t("phoneRequired") },
      )
      .refine(
        (v) => {
          const normalized = normalizePhone(
            v.kbzPayPhoneNumber,
            kbzPayPhoneCountry.code,
          );
          return isValidPhoneNumber(normalized, kbzPayPhoneCountry.code);
        },
        { path: ["kbzPayPhoneNumber"], message: t("phoneRequired") },
      );
  }, [t, phoneCountry.code, kbzPayPhoneCountry.code]);

  const handleSubmit = async () => {
    setErrors({});
    const parsed = schema.safeParse({
      registrationType,
      nickname,
      password,
      confirmPassword,
      phone,
      email,
      kbzPayName,
      kbzPayPhoneNumber,
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

    if (!hasPreAuthAcceptedCurrent || !termsVersion) {
      Alert.alert(t("errorTitle"), t("termsRequiredForRegister"));
      router.replace("/(auth)/terms" as Href);
      return;
    }

    const input: RegisterInput = {
      registrationType: parsed.data.registrationType,
      nickname: parsed.data.nickname,
      phone: normalizePhone(parsed.data.phone, phoneCountry.code),
      email: parsed.data.email.trim().toLowerCase(),
      password: parsed.data.password,
      confirmPassword: parsed.data.confirmPassword,
      kbzPayName: parsed.data.kbzPayName,
      kbzPayPhoneNumber: normalizePhone(
        parsed.data.kbzPayPhoneNumber,
        kbzPayPhoneCountry.code,
      ),
      referralId: normalizeReferralCodeInput(parsed.data.referralId ?? ""),
      acceptedTerms: true,
      termsVersion,
    };

    setIsSubmitting(true);
    try {
      await register(input);
      // Go straight to verification so users can complete OTP/email flow.
      router.replace({
        pathname: "/(auth)/verify",
        params: { phone: input.phone, email: input.email },
      });
    } catch (err) {
      const e = err as {
        response?: { status?: number; data?: { message?: unknown } };
      };
      const status = e?.response?.status;
      const serverMessage =
        typeof e?.response?.data?.message === "string"
          ? e.response.data.message
          : undefined;

      if (status === 409) {
        Alert.alert(t("registerFailedTitle"), t("registerConflictBody"));
      } else if (status === 400) {
        const mapped = mapRegisterReferralError(
          serverMessage,
          t("referralCodeInvalid"),
          t("registerFailedBody"),
        );
        if (
          serverMessage &&
          mapped === t("referralCodeInvalid")
        ) {
          setErrors({ referralId: mapped });
        }
        Alert.alert(t("invalidRequestTitle"), mapped);
      } else {
        // Backend can create user, then fail on SMS/email sending. If that happens,
        // send user to verification where they can resend OTP/token.
        Alert.alert(t("errorTitle"), serverMessage ?? t("genericErrorBody"), [
          { text: "Cancel", style: "cancel" },
          {
            text: "Verify",
            onPress: () =>
              router.replace({
                pathname: "/(auth)/verify",
                params: { phone: input.phone, email: input.email },
              }),
          },
        ]);
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
      <AuthKeyboardScreen
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 24 + 42,
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
          <AuthAnimatedSection
            delayMs={0}
            reduceMotion={reduceMotion}
            style={styles.brandArea}
          >
            <AuthLogo variant="compact" />
          </AuthAnimatedSection>

          <AuthStaggerItem
            index={0}
            reduceMotion={reduceMotion}
            style={styles.headerRow}
          >
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={styles.backButton}
            >
              <ThemedText style={{ fontSize: 22 }}>‹</ThemedText>
            </Pressable>
            <ThemedText type="screenTitle" style={styles.title}>
              {t("signUp")}
            </ThemedText>
            <View style={styles.backButton} />
          </AuthStaggerItem>

          {/* Nickname */}
          <AuthStaggerItem
            index={1}
            reduceMotion={reduceMotion}
            style={styles.field}
          >
            <ThemedText style={styles.label}>{t("nickname")}</ThemedText>
            <TextInput
              style={inputStyle(!!errors.nickname)}
              value={nickname}
              onChangeText={setNickname}
              placeholder={t("nicknamePlaceholder")}
              placeholderTextColor={colors.icon}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
            />
            {errors.nickname ? (
              <ThemedText style={styles.error}>{errors.nickname}</ThemedText>
            ) : null}
          </AuthStaggerItem>

          {/* Password */}
          <AuthStaggerItem
            index={2}
            reduceMotion={reduceMotion}
            style={styles.field}
          >
            <ThemedText style={styles.label}>{t("password")}</ThemedText>
            <PasswordInput
              value={password}
              onChangeText={setPassword}
              placeholder={t("password")}
              editable={!isSubmitting}
              inputStyle={inputStyle(!!errors.password)}
            />
            <PasswordStrengthMeter password={password} />
            {errors.password ? (
              <ThemedText style={styles.error}>{errors.password}</ThemedText>
            ) : null}
          </AuthStaggerItem>

          {/* Confirm Password */}
          <AuthStaggerItem
            index={3}
            reduceMotion={reduceMotion}
            style={styles.field}
          >
            <ThemedText style={styles.label}>{t("confirmPassword")}</ThemedText>
            <PasswordInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t("confirmPasswordPlaceholder")}
              editable={!isSubmitting}
              inputStyle={inputStyle(!!errors.confirmPassword)}
            />
            {errors.confirmPassword ? (
              <ThemedText style={styles.error}>
                {errors.confirmPassword}
              </ThemedText>
            ) : null}
          </AuthStaggerItem>

          {/* Phone */}
          <AuthStaggerItem
            index={4}
            reduceMotion={reduceMotion}
            style={styles.field}
          >
            <ThemedText style={styles.label}>{t("phoneNumber")}</ThemedText>
            <PhoneNumberInput
              value={phone}
              onChangeText={setPhone}
              selectedCountry={phoneCountry}
              onCountryChange={setPhoneCountry}
              placeholder={t("phoneNumberPlaceholder")}
              error={!!errors.phone}
              editable={!isSubmitting}
            />
            {errors.phone ? (
              <ThemedText style={styles.error}>{errors.phone}</ThemedText>
            ) : null}
          </AuthStaggerItem>

          {/* Email */}
          <AuthStaggerItem
            index={5}
            reduceMotion={reduceMotion}
            style={styles.field}
          >
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
            {!errors.email && email.trim().length > 0 && !emailOk ? (
              <ThemedText style={styles.error}>{t("emailInvalid")}</ThemedText>
            ) : null}
            {errors.email ? (
              <ThemedText style={styles.error}>{errors.email}</ThemedText>
            ) : null}
          </AuthStaggerItem>

          {/* K-pay section */}
          <AuthStaggerItem index={6} reduceMotion={reduceMotion}>
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
                  <ThemedText style={styles.error}>
                    {errors.kbzPayName}
                  </ThemedText>
                ) : null}
              </View>

              <View style={styles.field}>
                <ThemedText style={styles.label}>{t("kPayPhone")}</ThemedText>
                <PhoneNumberInput
                  value={kbzPayPhoneNumber}
                  onChangeText={setKbzPayPhoneNumber}
                  selectedCountry={kbzPayPhoneCountry}
                  onCountryChange={setKbzPayPhoneCountry}
                  placeholder={t("phoneNumberPlaceholder")}
                  error={!!errors.kbzPayPhoneNumber}
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
                ]}
              >
                <ThemedText
                  style={[styles.warningText, { color: WARNING_TEXT }]}
                >
                  ⚠ {t("kPayWarning")}
                </ThemedText>
              </View>
            </View>
          </AuthStaggerItem>

          {/* Referral */}
          <AuthStaggerItem
            index={7}
            reduceMotion={reduceMotion}
            style={styles.field}
          >
            <ThemedText style={styles.label}>{t("referralCodeLabel")}</ThemedText>
            <TextInput
              style={inputStyle(Boolean(errors.referralId))}
              value={referralId}
              onChangeText={setReferralId}
              placeholder={t("referralPlaceholder")}
              placeholderTextColor={colors.icon}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!isSubmitting}
            />
            {errors.referralId ? (
              <ThemedText style={styles.error}>{errors.referralId}</ThemedText>
            ) : null}
          </AuthStaggerItem>

          {/* Submit */}
          <AuthStaggerItem index={8} reduceMotion={reduceMotion}>
            <AuthPrimaryButton
              onPress={handleSubmit}
              disabled={isSubmitting}
              backgroundColor={colors.tint}
              style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]}
            >
              {isSubmitting ? (
                <FlexMarketLoader variant="inline" size="xs" showText={false} />
              ) : (
                <ThemedText style={styles.submitText}>
                  {t("signUpCta")}
                </ThemedText>
              )}
            </AuthPrimaryButton>
          </AuthStaggerItem>

          <AuthStaggerItem
            index={9}
            reduceMotion={reduceMotion}
            style={styles.footer}
          >
            <ThemedText style={styles.footerText}>
              {t("haveAccount")}{" "}
            </ThemedText>
            <Pressable onPress={() => router.replace("/(auth)/login")}>
              <ThemedText style={[styles.footerLink, { color: colors.tint }]}>
                {t("signIn")}
              </ThemedText>
            </Pressable>
          </AuthStaggerItem>

          <AuthStaggerItem index={10} reduceMotion={reduceMotion}>
            <AppVersionLabel style={styles.versionLabel} />
          </AuthStaggerItem>
      </AuthKeyboardScreen>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 20,
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
  title: {},
  field: { gap: 6 },
  label: { fontWeight: "600", fontSize: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    fontSize: 15,
  },
  phoneRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  dialPicker: {
    height: 48,
    minWidth: 88,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dialText: {
    fontSize: 15,
    fontWeight: "800",
  },
  dialChevron: {
    fontSize: 16,
    opacity: 0.65,
  },
  phoneInput: {
    flex: 1,
  },
  pickerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "flex-end",
  },
  pickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  pickerSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 22,
    gap: 10,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
  },
  pickerRow: {
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pickerDial: {
    fontSize: 15,
    fontWeight: "800",
    width: 68,
  },
  pickerCode: {
    fontSize: 13,
    opacity: 0.7,
    flex: 1,
  },
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
  versionLabel: {
    marginTop: 8,
  },
});





