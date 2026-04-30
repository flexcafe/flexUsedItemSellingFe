import { useRouter, type Href } from "expo-router";
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
import { z } from "zod";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { AuthLogo } from "@/components/auth-logo";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { useLocale } from "@/presentation/providers/LocaleProvider";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const phoneSchema = z.object({
    mode: z.literal("phone"),
    phone: z.string().min(1, t("phoneRequired")),
    password: z.string().min(1, t("passwordRequired")),
  });

  const facebookSchema = z.object({
    mode: z.literal("facebook"),
    facebookId: z.string().min(1, t("facebookIdRequired")),
    password: z.string().min(1, t("passwordRequired")),
  });

  const loginSchema = z.discriminatedUnion("mode", [phoneSchema, facebookSchema]);

  const [mode, setMode] = useState<"phone" | "facebook">("phone");
  const [phone, setPhone] = useState("");
  const [facebookId, setFacebookId] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    phone?: string;
    facebookId?: string;
    password?: string;
  }>({});

  const handleLogin = async () => {
    setErrors({});
    const result = loginSchema.safeParse(
      mode === "phone" ? { mode, phone, password } : { mode, facebookId, password }
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
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 400) {
        Alert.alert(
          t("invalidRequestTitle"),
          t("invalidRequestBody")
        );
      } else if (status === 401) {
        Alert.alert(t("loginFailedTitle"), t("invalidCredsBody"));
      } else {
        Alert.alert(t("errorTitle"), t("genericErrorBody"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const [languageWidth, setLanguageWidth] = useState(0);
  const langIndex = locale === "ko" ? 0 : locale === "my" ? 1 : 2;
  const pillX = useSharedValue(0);

  const pillStyle = useAnimatedStyle(() => {
    const w = languageWidth > 0 ? languageWidth / 3 : 0;
    return {
      width: w,
      transform: [{ translateX: pillX.value }],
    };
  }, [languageWidth]);

  // keep animation in sync with state + layout width
  if (languageWidth > 0) {
    const w = languageWidth / 3;
    const target = w * langIndex;
    if (pillX.value !== target) {
      pillX.value = withTiming(target, { duration: 420 });
    }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <AuthLogo variant="compact" />
            <ThemedText type="title" style={styles.appTitle}>
              {t("appName")}
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {t("signInSubtitle")}
            </ThemedText>
          </View>

          <View style={styles.form}>
            <View style={styles.segment}>
              <Pressable
                onPress={() => setMode("phone")}
                disabled={isSubmitting}
                style={[
                  styles.segmentItem,
                  { borderColor: colors.icon },
                  mode === "phone" && { backgroundColor: colors.tint },
                ]}>
                <ThemedText
                  style={[
                    styles.segmentText,
                    mode === "phone" && { color: "#fff" },
                  ]}>
                  Phone
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setMode("facebook")}
                disabled={isSubmitting}
                style={[
                  styles.segmentItem,
                  { borderColor: colors.icon },
                  mode === "facebook" && { backgroundColor: colors.tint },
                ]}>
                <ThemedText
                  style={[
                    styles.segmentText,
                    mode === "facebook" && { color: "#fff" },
                  ]}>
                  Facebook ID
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.field}>
              <ThemedText style={styles.label}>
                {mode === "phone" ? t("phone") : t("facebookId")}
              </ThemedText>
              {mode === "phone" ? (
                <>
                  <TextInput
                    style={[
                      styles.input,
                      { color: colors.text, borderColor: errors.phone ? "#e74c3c" : colors.icon },
                    ]}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+959123456789"
                    placeholderTextColor={colors.icon}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting}
                  />
                  {errors.phone && (
                    <ThemedText style={styles.error}>{errors.phone}</ThemedText>
                  )}
                </>
              ) : (
                <>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: colors.text,
                        borderColor: errors.facebookId ? "#e74c3c" : colors.icon,
                      },
                    ]}
                    value={facebookId}
                    onChangeText={setFacebookId}
                    placeholder="100012345678901"
                    placeholderTextColor={colors.icon}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting}
                  />
                  {errors.facebookId && (
                    <ThemedText style={styles.error}>{errors.facebookId}</ThemedText>
                  )}
                </>
              )}
            </View>

            <View style={styles.field}>
              <ThemedText style={styles.label}>Password</ThemedText>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    { color: colors.text, borderColor: errors.password ? "#e74c3c" : colors.icon },
                  ]}
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
              {errors.password && (
                <ThemedText style={styles.error}>{errors.password}</ThemedText>
              )}
            </View>

            <Pressable
              style={[
                styles.button,
                { backgroundColor: colors.tint },
                isSubmitting && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>{t("signIn")}</ThemedText>
              )}
            </Pressable>

            <View style={styles.signUpRow}>
              <ThemedText style={styles.signUpText}>
                {t("noAccount")}{" "}
              </ThemedText>
              <Pressable
                disabled={isSubmitting}
                onPress={() => router.push("/(auth)/register" as Href)}>
                <ThemedText style={[styles.signUpLink, { color: colors.tint }]}>
                  {t("signUp")}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        {/* Bottom language bar (matches Figma: wide pill with flag buttons) */}
        <View pointerEvents="box-none" style={styles.languageDock}>
          <View
            style={[
              styles.languageBar,
              { backgroundColor: colors.background, borderColor: colors.tint },
            ]}
            onLayout={(e) => setLanguageWidth(e.nativeEvent.layout.width - 16)}>
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
              onPress={() => setLocale("ko")}>
              <ThemedText style={[styles.flag, locale === "ko" && styles.flagSelected]}>
                🇰🇷
              </ThemedText>
            </Pressable>
            <Pressable
              disabled={isSubmitting}
              style={styles.flagButton}
              onPress={() => setLocale("my")}>
              <ThemedText style={[styles.flag, locale === "my" && styles.flagSelected]}>
                🇲🇲
              </ThemedText>
            </Pressable>
            <Pressable
              disabled={isSubmitting}
              style={styles.flagButton}
              onPress={() => setLocale("zh")}>
              <ThemedText style={[styles.flag, locale === "zh" && styles.flagSelected]}>
                🇨🇳
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingTop: 24,
    paddingBottom: 96,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
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
  error: {
    color: "#e74c3c",
    fontSize: 12,
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
});
