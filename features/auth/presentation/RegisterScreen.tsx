import * as Location from "expo-location";
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
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { WebView } from "react-native-webview";
import { z } from "zod";

import { AuthLogo } from "@/components/auth-logo";
import { PhoneNumberInput } from "@/components/phone-number-input";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import type {
  Gender,
  MaritalStatus,
  RegisterInput,
} from "@/core/domain/types/auth";
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

type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Very weak" | "Weak" | "Okay" | "Strong" | "Very strong";
  color: string;
  tips: string[];
};

function getPasswordStrength(password: string): PasswordStrength {
  const value = password ?? "";
  const tips: string[] = [];

  const length = value.length;
  const hasLower = /[a-z]/.test(value);
  const hasUpper = /[A-Z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSymbol = /[^A-Za-z0-9]/.test(value);

  if (length < 8) tips.push("Use at least 8 characters");
  if (!hasUpper) tips.push("Add an uppercase letter");
  if (!hasLower) tips.push("Add a lowercase letter");
  if (!hasNumber) tips.push("Add a number");
  if (!hasSymbol) tips.push("Add a symbol");

  // Simple scoring (0..4): length + character variety.
  let score = 0;
  if (length >= 8) score += 1;
  if (length >= 12) score += 1;
  const variety = [hasLower, hasUpper, hasNumber, hasSymbol].filter(
    Boolean,
  ).length;
  if (variety >= 2) score += 1;
  if (variety >= 3) score += 1;

  const final = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  if (final === 0)
    return { score: 0, label: "Very weak", color: "#ef4444", tips };
  if (final === 1) return { score: 1, label: "Weak", color: "#f97316", tips };
  if (final === 2) return { score: 2, label: "Okay", color: "#eab308", tips };
  if (final === 3) return { score: 3, label: "Strong", color: "#22c55e", tips };
  return { score: 4, label: "Very strong", color: "#16a34a", tips };
}

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
            ]}
          >
            <ThemedText
              style={[styles.segmentText, selected && { color: "#fff" }]}
            >
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
  const { register } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  // Registration method toggle removed for now (phone-only).
  const registrationType = "PHONE_ONLY" as const;
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
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
  const [gender, setGender] = useState<Gender>("MALE");
  const [age, setAge] = useState("");
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus>("SINGLE");
  const [region, setRegion] = useState("");
  const [locationCoords, setLocationCoords] = useState<LocationCoords | null>(
    null,
  );
  const [regionAuto, setRegionAuto] = useState(true);
  const [referralId, setReferralId] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [languageWidth, setLanguageWidth] = useState(0);
  const pw = useMemo(() => getPasswordStrength(password), [password]);
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
      gender: z.enum(["MALE", "FEMALE"]),
      age: z.coerce
        .number()
        .int()
        .min(14, t("ageInvalid"))
        .max(120, t("ageInvalid")),
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

  const applyCoords = async (coords: LocationCoords) => {
    setLocationCoords(coords);
    setErrors((e) => {
      const next = { ...e };
      delete next.region;
      return next;
    });

    if (!regionAuto) return;
    try {
      const list = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      const first = list?.[0];
      const candidate =
        first?.district ||
        first?.city ||
        first?.subregion ||
        first?.region ||
        first?.country;
      if (candidate && candidate.trim().length > 0) {
        setRegion(candidate.trim());
      }
    } catch {
      // ignore reverse geocode failures; user can type region manually
    }
  };

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrors((e) => ({ ...e, region: t("regionVerify") }));
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await applyCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch {
      setErrors((e) => ({ ...e, region: t("regionVerify") }));
      Alert.alert(t("errorTitle"), t("genericErrorBody"));
    } finally {
      setIsLocating(false);
    }
  };
  const leafletHtml = useMemo(() => {
    if (!locationCoords) return "";

    const { latitude, longitude } = locationCoords;
    const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    // Leaflet + OSM tiles in a WebView works in Expo Go (no native map module).
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      html, body { height: 100%; margin: 0; padding: 0; }
      #map { height: 100%; width: 100%; }
      .leaflet-control-attribution { font-size: 10px; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>
    <script>
      (function () {
        var lat = ${latitude};
        var lng = ${longitude};
        var map = L.map('map', { zoomControl: true }).setView([lat, lng], 16);

        L.tileLayer('${tileUrl}', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        var marker = L.marker([lat, lng], { draggable: true }).addTo(map);

        function send(lat, lng) {
          try {
            window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: lat, longitude: lng }));
          } catch (e) {}
        }

        map.on('click', function (e) {
          marker.setLatLng(e.latlng);
          send(e.latlng.lat, e.latlng.lng);
        });

        marker.on('dragend', function () {
          var p = marker.getLatLng();
          send(p.lat, p.lng);
        });
      })();
    </script>
  </body>
</html>`;
  }, [locationCoords]);

  const langIndex = locale === "ko" ? 0 : locale === "my" ? 1 : 2;
  const pillX = useSharedValue(0);
  const pillStyle = useAnimatedStyle(() => {
    const w = languageWidth > 0 ? languageWidth / 3 : 0;
    return {
      width: w,
      transform: [{ translateX: pillX.value }],
    };
  }, [languageWidth]);

  if (languageWidth > 0) {
    const w = languageWidth / 3;
    const target = w * langIndex;
    if (pillX.value !== target) {
      pillX.value = withTiming(target, { duration: 420 });
    }
  }

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

    if (!locationCoords) {
      setErrors({ region: t("regionVerify") });
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
      gender: parsed.data.gender,
      age: parsed.data.age,
      maritalStatus: parsed.data.maritalStatus,
      region: parsed.data.region,
      gpsLatitude: locationCoords.latitude,
      gpsLongitude: locationCoords.longitude,
      referralId: parsed.data.referralId,
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
        Alert.alert(
          t("invalidRequestTitle"),
          serverMessage ?? t("registerFailedBody"),
        );
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

  const handleAgeChange = (value: string) => {
    const digits = value.replace(/[^0-9]/g, "").slice(0, 3);
    setAge(digits);

    setErrors((prev) => {
      const next = { ...prev };
      if (!digits) {
        delete next.age;
        return next;
      }

      const n = Number(digits);
      if (n < 14 || n > 120) {
        next.age = t("ageInvalid");
      } else {
        delete next.age;
      }
      return next;
    });
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
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandArea}>
            <AuthLogo variant="compact" />
          </View>

          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={styles.backButton}
            >
              <ThemedText style={{ fontSize: 22 }}>‹</ThemedText>
            </Pressable>
            <ThemedText type="title" style={styles.title}>
              {t("signUp")}
            </ThemedText>
            <View style={styles.backButton} />
          </View>

          {/* Nickname */}
          <View style={styles.field}>
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
                accessibilityLabel={
                  isPasswordVisible ? t("hidePassword") : t("showPassword")
                }
                style={({ pressed }) => [
                  styles.passwordToggle,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <ThemedText
                  style={[styles.passwordToggleText, { color: colors.tint }]}
                >
                  {isPasswordVisible ? t("hide") : t("show")}
                </ThemedText>
              </Pressable>
            </View>
            {password.length > 0 ? (
              <View style={styles.strengthWrap}>
                <View
                  style={[
                    styles.strengthTrack,
                    { backgroundColor: colors.icon + "20" },
                  ]}
                >
                  <View
                    style={[
                      styles.strengthFill,
                      {
                        width: `${((pw.score + 1) / 5) * 100}%`,
                        backgroundColor: pw.color,
                      },
                    ]}
                  />
                </View>
                <View style={styles.strengthRow}>
                  <ThemedText
                    style={[styles.strengthLabel, { color: pw.color }]}
                  >
                    {pw.label}
                  </ThemedText>
                  <ThemedText style={styles.strengthHint}>
                    {pw.tips.length > 0 ? pw.tips[0] : "Looks good"}
                  </ThemedText>
                </View>
              </View>
            ) : null}
            {errors.password ? (
              <ThemedText style={styles.error}>{errors.password}</ThemedText>
            ) : null}
          </View>

          {/* Confirm Password */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>{t("confirmPassword")}</ThemedText>
            <View style={styles.passwordRow}>
              <TextInput
                style={[
                  inputStyle(!!errors.confirmPassword),
                  styles.passwordInput,
                ]}
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
                  isConfirmPasswordVisible
                    ? t("hidePassword")
                    : t("showPassword")
                }
                style={({ pressed }) => [
                  styles.passwordToggle,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <ThemedText
                  style={[styles.passwordToggleText, { color: colors.tint }]}
                >
                  {isConfirmPasswordVisible ? t("hide") : t("show")}
                </ThemedText>
              </Pressable>
            </View>
            {errors.confirmPassword ? (
              <ThemedText style={styles.error}>
                {errors.confirmPassword}
              </ThemedText>
            ) : null}
          </View>

          {/* Phone */}
          <View style={styles.field}>
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
            {!errors.email && email.trim().length > 0 && !emailOk ? (
              <ThemedText style={styles.error}>{t("emailInvalid")}</ThemedText>
            ) : null}
            {errors.email ? (
              <ThemedText style={styles.error}>{errors.email}</ThemedText>
            ) : null}
          </View>

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
              onChangeText={handleAgeChange}
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
                setRegionAuto(false);
              }}
              placeholder={t("regionPlaceholder")}
              placeholderTextColor={colors.icon}
              editable={!isSubmitting}
            />
            <View style={styles.mapWrap}>
              {locationCoords ? (
                <WebView
                  key={`${locationCoords.latitude},${locationCoords.longitude}`}
                  style={styles.map}
                  originWhitelist={["*"]}
                  source={{ html: leafletHtml }}
                  onMessage={(e) => {
                    if (isSubmitting) return;
                    try {
                      const data = JSON.parse(
                        e.nativeEvent.data,
                      ) as LocationCoords;
                      if (
                        typeof data?.latitude === "number" &&
                        typeof data?.longitude === "number"
                      ) {
                        applyCoords({
                          latitude: data.latitude,
                          longitude: data.longitude,
                        });
                      }
                    } catch {
                      // ignore malformed messages
                    }
                  }}
                />
              ) : (
                <View
                  style={[
                    styles.mapPlaceholder,
                    {
                      borderColor: colors.icon,
                      backgroundColor: colors.background,
                    },
                  ]}
                >
                  <ThemedText style={{ opacity: 0.7, textAlign: "center" }}>
                    {t("regionVerify")}
                  </ThemedText>
                </View>
              )}
            </View>
            <Pressable
              onPress={handleUseCurrentLocation}
              disabled={isSubmitting || isLocating}
              style={[
                styles.regionButton,
                {
                  borderColor: locationCoords ? SUCCESS : colors.tint,
                  backgroundColor: locationCoords ? SUCCESS : "transparent",
                },
              ]}
            >
              <ThemedText
                style={{
                  color: locationCoords ? "#fff" : colors.tint,
                  fontWeight: "600",
                }}
              >
                {locationCoords
                  ? `✓ ${t("regionVerified")}`
                  : isLocating
                    ? "Locating..."
                    : `📍 ${t("regionVerify")}`}
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
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.submitText}>
                {t("signUpCta")}
              </ThemedText>
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
        <View pointerEvents="box-none" style={styles.languageDock}>
          <View
            style={[
              styles.languageBar,
              { backgroundColor: colors.background, borderColor: colors.tint },
            ]}
            onLayout={(e) => setLanguageWidth(e.nativeEvent.layout.width - 16)}
          >
            <Animated.View
              style={[
                styles.languagePill,
                { backgroundColor: colors.tint },
                pillStyle,
              ]}
            />

            <Pressable
              disabled={isSubmitting}
              style={styles.flagButton}
              onPress={() => setLocale("ko")}
            >
              <ThemedText
                style={[styles.flag, locale === "ko" && styles.flagSelected]}
              >
                {"\uD83C\uDDF0\uD83C\uDDF7"}
              </ThemedText>
            </Pressable>
            <Pressable
              disabled={isSubmitting}
              style={styles.flagButton}
              onPress={() => setLocale("my")}
            >
              <ThemedText
                style={[styles.flag, locale === "my" && styles.flagSelected]}
              >
                {"\uD83C\uDDF2\uD83C\uDDF2"}
              </ThemedText>
            </Pressable>
            <Pressable
              disabled={isSubmitting}
              style={styles.flagButton}
              onPress={() => setLocale("zh")}
            >
              <ThemedText
                style={[styles.flag, locale === "zh" && styles.flagSelected]}
              >
                {"\uD83C\uDDE8\uD83C\uDDF3"}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
      </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 42,
    paddingBottom: 96,
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
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    fontSize: 15,
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
  strengthWrap: {
    marginTop: 8,
    gap: 6,
  },
  strengthTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  strengthFill: {
    height: "100%",
    borderRadius: 999,
  },
  strengthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  strengthHint: {
    fontSize: 12,
    opacity: 0.7,
    flex: 1,
    textAlign: "right",
  },
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
  mapWrap: {
    marginTop: 10,
    borderRadius: 12,
    overflow: "hidden",
  },
  map: {
    height: 220,
    width: "100%",
  },
  mapPlaceholder: {
    height: 220,
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
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
  languageDock: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 18,
  },
  languageBar: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  languagePill: {
    position: "absolute",
    left: 8,
    top: 8,
    bottom: 8,
    borderRadius: 12,
  },
  flagButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  flag: {
    fontSize: 22,
    opacity: 0.95,
  },
  flagSelected: {
    color: "#fff",
    opacity: 1,
  },
});

