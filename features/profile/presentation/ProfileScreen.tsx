import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import { Image, type ImageSource } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import {
  Alert,
  Linking,
  NativeModules,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { AccessToken, LoginManager, Settings, type LoginResult } from "react-native-fbsdk-next";

import { useAppliedSafeAreaInsets, useLanguageSwitcherSafeTop } from "@/components/app-safe-area";
import { FlexMarketLoader } from "@/components/flex-market-loader";
import { KeyboardAwareFormScroll } from "@/components/keyboard-aware-form-scroll";
import { PasswordInput } from "@/components/password-input";
import { PasswordStrengthMeter } from "@/components/password-strength-meter";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { mediaUrlSharesApiOrigin } from "@/core/application/mappers/mediaUrl";
import type {
  RankConfig,
  UserRankTier,
  WithdrawalStatus,
} from "@/core/domain/entities/ProfileRewards";
import type { UploadFile } from "@/core/domain/types/profile";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAdminNotifyCooldown } from "@/presentation/hooks/useAdminNotifyCooldown";
import {
  useLatestFacebookFollowSubmission,
  useLinkFacebookAccount,
  useChangePassword,
  useSubmitFacebookFollowSubmission,
  useUploadAvatar,
} from "@/presentation/hooks/useClientProfile";
import {
  useProfilePoints,
  useProfileTransactionStats,
  useRankConfigs,
  useRequestWithdrawal,
  useWithdrawalRequests,
} from "@/presentation/hooks/useProfileRewards";
import { normalizeImagePickerAssetForUpload } from "@/presentation/lib/imageUploadAsset";
import { UI_SECTION_STAGGER_MS } from "@/presentation/lib/uiAnimations";
import { ReferralCodeBlock } from "@/presentation/components/ReferralCodeBlock";
import { DeleteAccountModal } from "@/presentation/components/DeleteAccountModal";
import { MyBlockedUsersSection } from "@/features/moderation/presentation/MyBlockedUsersSection";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { useLocale } from "@/presentation/providers/LocaleProvider";
import { useReducedMotion } from "react-native-reanimated";
import {
  ProfileAnimatedCard,
  ProfileAnimatedSection,
  ProfileFadeIn,
  ProfilePressableScale,
  ProfileStaggerItem,
  ProfileTabButton,
  ProfileTabPanel,
} from "./profileAnimated";

const SUCCESS = "#16a34a";
const WARNING = "#d97706";
const DANGER = "#e74c3c";
const MIN_WITHDRAWAL_POINTS = 5000;
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID?.trim() ?? "";
const FACEBOOK_CLIENT_TOKEN = "c0c7165def84af13fe58bfa0df5bff30";
const FACEBOOK_PAGE_URL =
  process.env.EXPO_PUBLIC_FACEBOOK_PAGE_URL?.trim() ?? "";
const FACEBOOK_NATIVE_MODULES = ["FBSettings", "FBLoginManager", "FBAccessToken"];

const RANK_ACCENTS: Record<UserRankTier, string> = {
  VIP: "#7c3aed",
  GOLD: "#d97706",
  SILVER: "#64748b",
  BRONZE: "#b45309",
  NEWBIE: "#0891b2",
};

/** When rank-config API is unavailable, keep progress math sane. */
const FALLBACK_MIN_POINTS_BY_TIER: Record<UserRankTier, number> = {
  VIP: 30000,
  GOLD: 10000,
  SILVER: 3000,
  BRONZE: 1000,
  NEWBIE: -100,
};

function getWithdrawalStatusColor(
  status: WithdrawalStatus,
  tint: string,
): string {
  switch (status) {
    case "PENDING":
      return WARNING;
    case "APPROVED":
      return tint; // theme color instead of hardcoded blue
    case "REJECTED":
      return DANGER;
    case "TRANSFERRED":
      return SUCCESS;
    default:
      return tint;
  }
}

function formatPoints(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatRankPointsRange(rank: RankConfig): string {
  if (rank.maxPoints == null) {
    return `${formatPoints(rank.minPoints)}+ pts`;
  }
  return `${formatPoints(rank.minPoints)}–${formatPoints(rank.maxPoints)} pts`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function VerificationStepRail({
  labels,
  activeStep,
  colors,
}: {
  labels: string[];
  activeStep: number;
  colors: (typeof Colors)["light"];
}) {
  return (
    <View style={styles.kbzStepRow}>
      {labels.map((label, index) => {
        const done = index < activeStep;
        const active = index === activeStep;
        return (
          <View key={`${label}-${index}`} style={styles.kbzStep}>
            <View
              style={[
                styles.kbzStepCircle,
                {
                  backgroundColor: done
                    ? SUCCESS
                    : active
                      ? colors.tint
                      : colors.icon + "22",
                  borderColor:
                    done || active ? "transparent" : colors.icon + "55",
                },
              ]}
            >
              {done ? (
                <MaterialIcons name="check" size={14} color="#fff" />
              ) : (
                <ThemedText
                  style={[
                    styles.kbzStepNumber,
                    { color: active ? "#fff" : colors.icon },
                  ]}
                >
                  {index + 1}
                </ThemedText>
              )}
            </View>
            <ThemedText
              numberOfLines={3}
              style={[
                styles.kbzStepLabel,
                { color: done || active ? colors.text : colors.icon },
              ]}
            >
              {label}
            </ThemedText>
            {index < labels.length - 1 ? (
              <View
                style={[
                  styles.kbzStepConnector,
                  {
                    backgroundColor:
                      index < activeStep ? SUCCESS : colors.icon + "33",
                  },
                ]}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

type VerificationTone = "done" | "pending" | "todo";

function verificationToneColor(tone: VerificationTone, tint: string) {
  if (tone === "done") return SUCCESS;
  if (tone === "pending") return WARNING;
  return tint;
}

function VerificationStatusPill({
  tone,
  label,
  tint,
}: {
  tone: VerificationTone;
  label: string;
  tint: string;
}) {
  const color = verificationToneColor(tone, tint);
  return (
    <View
      style={[
        styles.verificationStatusPill,
        { backgroundColor: color + "18", borderColor: color + "44" },
      ]}
    >
      <View style={[styles.verificationStatusDot, { backgroundColor: color }]} />
      <ThemedText
        numberOfLines={1}
        style={[styles.verificationStatusPillText, { color }]}
      >
        {label}
      </ThemedText>
    </View>
  );
}

function VerificationItemHeader({
  step,
  icon,
  title,
  tone,
  statusLabel,
  expanded,
  onPress,
  colors,
}: {
  step: number;
  icon: ComponentProps<typeof MaterialIcons>["name"];
  title: string;
  tone: VerificationTone;
  statusLabel: string;
  expanded: boolean;
  onPress: () => void;
  colors: (typeof Colors)["light"];
}) {
  const accent = verificationToneColor(tone, colors.tint);
  return (
    <Pressable onPress={onPress} style={styles.verificationItemHeader}>
      <View style={styles.verificationItemHeaderLeft}>
        <View
          style={[
            styles.kbzHeaderIcon,
            {
              backgroundColor:
                tone === "done" ? SUCCESS + "18" : accent + "18",
            },
          ]}
        >
          {tone === "done" ? (
            <MaterialIcons name="check" color={SUCCESS} size={22} />
          ) : (
            <MaterialIcons name={icon} color={accent} size={22} />
          )}
        </View>
        <View style={styles.verificationHeaderCopy}>
          <View style={styles.verificationHeaderTitleRow}>
            <ThemedText
              style={[
                styles.verificationStepIndex,
                { color: colors.icon },
              ]}
            >
              {step}.
            </ThemedText>
            <ThemedText numberOfLines={2} style={styles.verificationHeaderTitle}>
              {title}
            </ThemedText>
          </View>
          <VerificationStatusPill
            tone={tone}
            label={statusLabel}
            tint={colors.tint}
          />
        </View>
      </View>
      <View
        style={[
          styles.verificationChevron,
          { backgroundColor: colors.icon + "14" },
        ]}
      >
        <MaterialIcons
          name={expanded ? "expand-less" : "expand-more"}
          color={colors.icon}
          size={20}
        />
      </View>
    </Pressable>
  );
}

function cooldownHhMm(ms: number): { hours: string; minutes: string } {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  return { hours: String(hours), minutes: String(minutes) };
}

function imageUploadMimeType(
  fileName: string,
  fallback = "image/jpeg",
): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return fallback;
}

function normalizeFacebookUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

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
    submitKbzPayTransaction,
  } = useAuth();
  const { t, tf } = useLocale();
  const adminCooldown = useAdminNotifyCooldown();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];
  const reduceMotion = useReducedMotion();
  const insets = useAppliedSafeAreaInsets();
  const topInset = useLanguageSwitcherSafeTop();
  const pointsQuery = useProfilePoints();
  const rankConfigsQuery = useRankConfigs();
  const statsQuery = useProfileTransactionStats();
  const withdrawalsQuery = useWithdrawalRequests();
  const requestWithdrawal = useRequestWithdrawal();
  const changePassword = useChangePassword();
  const latestFacebookFollowQuery = useLatestFacebookFollowSubmission();
  const linkFacebookAccount = useLinkFacebookAccount();
  const submitFacebookFollow = useSubmitFacebookFollowSubmission();
  const uploadAvatar = useUploadAvatar();

  const [activeTab, setActiveTab] = useState<
    "rewards" | "verifications" | "password"
  >("rewards");
  const [showRankSystem, setShowRankSystem] = useState(false);
  const [showWithdrawalHistory, setShowWithdrawalHistory] = useState(true);
  const [showPhoneVerification, setShowPhoneVerification] = useState(
    () => !Boolean(user?.isPhoneVerified),
  );
  const [showEmailVerification, setShowEmailVerification] = useState(
    () => !Boolean(user?.isEmailVerified),
  );
  const [showKbzPayVerification, setShowKbzPayVerification] = useState(
    () => !Boolean(user?.isKbzPayVerified),
  );
  const [showFacebookVerification, setShowFacebookVerification] =
    useState(true);
  const [blockedUsersVisible, setBlockedUsersVisible] = useState(false);
  const [deleteAccountVisible, setDeleteAccountVisible] = useState(false);

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
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [kbzTransactionId, setKbzTransactionId] = useState("");
  const [kbzTransactionError, setKbzTransactionError] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalError, setWithdrawalError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [facebookProfileUrl, setFacebookProfileUrl] = useState(
    user?.facebookProfileUrl?.trim() ?? "",
  );
  const [facebookName, setFacebookName] = useState(
    user?.facebookName?.trim() || sampleName,
  );
  const [facebookScreenshot, setFacebookScreenshot] =
    useState<UploadFile | null>(null);

  const [phoneVerified, setPhoneVerified] = useState(
    Boolean(user?.isPhoneVerified),
  );
  const [emailVerified, setEmailVerified] = useState(
    Boolean(user?.isEmailVerified),
  );
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const initials = useMemo(() => {
    const parts = sampleName.split(" ").filter(Boolean);
    if (parts.length === 0) return "FU";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }, [sampleName]);

  const avatarUrl = user?.avatarUrl?.trim() ? user.avatarUrl.trim() : "";
  const myReferralCode = user?.referralCode?.trim() ?? "";

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    const status = latestFacebookFollowQuery.data?.status?.toUpperCase();
    if (status === "APPROVED") setShowFacebookVerification(false);
  }, [latestFacebookFollowQuery.data?.status]);

  const avatarImageSource = useMemo<ImageSource | null>(() => {
    if (!avatarUrl) return null;
    if (user?.accessToken && mediaUrlSharesApiOrigin(avatarUrl)) {
      return {
        uri: avatarUrl,
        headers: { Authorization: `Bearer ${user.accessToken}` },
      };
    }
    return { uri: avatarUrl };
  }, [avatarUrl, user?.accessToken]);

  const handlePickAndUploadAvatar = async () => {
    setBusy("avatar", true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t("errorTitle"), t("mediaLibraryPermissionRequired"));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled) return;
      const asset = await normalizeImagePickerAssetForUpload(
        result.assets?.[0],
        { jpegQuality: 0.85 },
      );
      const uri = asset?.uri;
      if (!uri) return;

      const fileName = asset?.fileName ?? uri.split("/").pop() ?? "avatar.jpg";
      const ext = fileName.split(".").pop()?.toLowerCase();
      const type =
        ext === "png"
          ? "image/png"
          : ext === "webp"
            ? "image/webp"
            : "image/jpeg";

      await uploadAvatar.mutateAsync({ uri, name: fileName, type });
      await refreshProfile();
      Alert.alert(t("profileTitle"), "Avatar updated.");
    } catch (err) {
      handleError(err);
    } finally {
      setBusy("avatar", false);
    }
  };

  const handleChangePassword = async () => {
    if (
      !currentPassword.trim() ||
      !newPassword.trim() ||
      !confirmNewPassword.trim()
    )
      return;
    setBusy("changePassword", true);
    try {
      await changePassword.mutateAsync({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
        confirmNewPassword: confirmNewPassword.trim(),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      Alert.alert(t("profileTitle"), "Password changed successfully");
    } catch (err) {
      handleError(err);
    } finally {
      setBusy("changePassword", false);
    }
  };

  const setBusy = (key: string, value: boolean) =>
    setLoading((prev) => ({ ...prev, [key]: value }));

  const getHttpStatus = (err: unknown) =>
    (err as { response?: { status?: number } })?.response?.status;

  const getServerMessage = (err: unknown) => {
    const serverMessage = (
      err as { response?: { data?: { message?: unknown } } }
    )?.response?.data?.message;
    if (typeof serverMessage === "string" && serverMessage.trim()) {
      return serverMessage.trim();
    }
    const nativeMessage = (err as { message?: unknown })?.message;
    if (typeof nativeMessage === "string" && nativeMessage.trim()) {
      return nativeMessage.trim();
    }
    return undefined;
  };

  useEffect(() => {
    setPhone(user?.phone?.trim() || "+959123456789");
    setEmail(user?.email?.trim() || "member@flexusedmarket.app");
    setPhoneVerified(Boolean(user?.isPhoneVerified));
    setEmailVerified(Boolean(user?.isEmailVerified));
    setFacebookName(user?.facebookName?.trim() || sampleName);
    setFacebookProfileUrl(user?.facebookProfileUrl?.trim() ?? "");
  }, [sampleName, user]);

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
    const status = getHttpStatus(err);
    const detail = getServerMessage(err) ?? fallback;
    if (status === 401) {
      Alert.alert(t("errorTitle"), t("invalidCredsBody"));
    } else if (status === 400 || status === 404 || status === 422) {
      Alert.alert(t("errorTitle"), detail ?? t("registerFailedBody"));
    } else if (status === 409) {
      Alert.alert(t("errorTitle"), detail ?? t("registerFailedBody"));
    } else {
      Alert.alert(t("errorTitle"), detail ?? t("genericErrorBody"));
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
      setPhoneOtpSent(true);
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
      setPhoneOtpSent(false);
      setOtpCode("");
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
      setEmailCodeSent(true);
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
      setEmailCodeSent(false);
      setEmailToken("");
      Alert.alert(t("emailVerified"));
    } catch (err) {
      handleError(err);
    } finally {
      setBusy("verifyEmail", false);
    }
  };

  const handleStartFacebookOAuth = async () => {
    if (!FACEBOOK_APP_ID) {
      Alert.alert(t("errorTitle"), t("facebookMissingAppId"));
      return;
    }
    if (!FACEBOOK_CLIENT_TOKEN) {
      Alert.alert(t("errorTitle"), t("facebookLinkRequired"));
      return;
    }
    const missingFacebookModule = FACEBOOK_NATIVE_MODULES.find(
      (moduleName) => !NativeModules[moduleName],
    );
    if (missingFacebookModule) {
      Alert.alert(
        t("errorTitle"),
        `Facebook native module ${missingFacebookModule} is missing. Rebuild and reinstall the EAS development app after adding react-native-fbsdk-next.`,
      );
      return;
    }
    setBusy("facebookLink", true);
    try {
      Settings.setAppID(FACEBOOK_APP_ID);
      Settings.setClientToken(FACEBOOK_CLIENT_TOKEN);
      Settings.setAppName("Flex Used Market");
      Settings.setAutoLogAppEventsEnabled(false);
      Settings.setAdvertiserIDCollectionEnabled(false);
      Settings.initializeSDK();
      const loginBehavior =
        Platform.OS === "android" ? "native_with_fallback" : "browser";
      LoginManager.setLoginBehavior(loginBehavior);
      let loginResult: LoginResult;
      try {
        loginResult = await LoginManager.logInWithPermissions([
          "public_profile",
          "email",
        ]);
      } catch (firstError) {
        if (Platform.OS !== "android") {
          throw firstError;
        }
        LoginManager.setLoginBehavior("web_only");
        loginResult = await LoginManager.logInWithPermissions([
          "public_profile",
          "email",
        ]);
      }

      if (loginResult.isCancelled) return;

      const accessToken = await AccessToken.getCurrentAccessToken();
      const token = accessToken?.accessToken?.trim() ?? "";

      if (!token) {
        Alert.alert(t("errorTitle"), t("facebookLinkRequired"));
        return;
      }

      const res = await fetch(
        `https://graph.facebook.com/me?fields=id,name&access_token=${encodeURIComponent(
          token,
        )}`,
      );
      const data = (await res.json()) as { id?: unknown; name?: unknown };
      const graphId = typeof data.id === "string" ? data.id.trim() : "";
      const graphName = typeof data.name === "string" ? data.name.trim() : "";
      const profileUrl = graphId ? `https://www.facebook.com/${graphId}` : "";

      if (!profileUrl) {
        Alert.alert(t("errorTitle"), t("facebookLinkRequired"));
        return;
      }

      await linkFacebookAccount.mutateAsync({
        facebookAccessToken: token,
        facebookProfileUrl: profileUrl,
      });
      if (graphName) setFacebookName(graphName);
      setFacebookProfileUrl(profileUrl);
      await refreshProfile();
      Alert.alert(t("profileTitle"), t("facebookLinkedSuccess"));
    } catch (err) {
      console.warn("[Facebook Login Error]", err);
      handleError(err, t("facebookLoginFailed"));
    } finally {
      setBusy("facebookLink", false);
    }
  };

  const handlePickFacebookScreenshot = async () => {
    setBusy("facebookScreenshot", true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t("errorTitle"), t("mediaLibraryPermissionRequired"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });
      if (result.canceled) return;
      const asset = await normalizeImagePickerAssetForUpload(
        result.assets?.[0],
        { jpegQuality: 0.9 },
      );
      if (!asset) return;
      const uri = asset.uri?.trim();
      if (!uri) return;
      const fileName =
        asset.fileName?.trim() ?? uri.split("/").pop() ?? "facebook-proof.jpg";
      setFacebookScreenshot({
        uri,
        name: fileName,
        type: imageUploadMimeType(fileName, asset.mimeType ?? "image/jpeg"),
      });
    } catch (err) {
      handleError(err);
    } finally {
      setBusy("facebookScreenshot", false);
    }
  };

  const handleSubmitFacebookFollow = async () => {
    const name = user?.facebookName?.trim() || facebookName.trim();
    const profileUrl = normalizeFacebookUrl(
      user?.facebookProfileUrl?.trim() || facebookProfileUrl,
    );
    const pageUrl = normalizeFacebookUrl(FACEBOOK_PAGE_URL);
    if (!name || !profileUrl || !pageUrl || !facebookScreenshot) {
      Alert.alert(t("errorTitle"), t("facebookFollowRequired"));
      return;
    }
    setBusy("facebookFollowSubmit", true);
    try {
      await submitFacebookFollow.mutateAsync({
        facebookName: name,
        facebookProfileUrl: profileUrl,
        facebookPageUrl: pageUrl,
        screenshot: facebookScreenshot,
      });
      setFacebookProfileUrl(profileUrl);
      setFacebookScreenshot(null);
      await latestFacebookFollowQuery.refetch();
      Alert.alert(t("profileTitle"), t("facebookFollowSubmitted"));
    } catch (err) {
      handleError(err);
    } finally {
      setBusy("facebookFollowSubmit", false);
    }
  };

  const handleOpenUrl = async (url: string) => {
    const normalized = normalizeFacebookUrl(url);
    if (!normalized) return;
    try {
      const supported = await Linking.canOpenURL(normalized);
      if (supported) await Linking.openURL(normalized);
    } catch (err) {
      handleError(err);
    }
  };

  const handleRequestKbzPay = async () => {
    if (!phoneVerified || !emailVerified) {
      Alert.alert(t("errorTitle"), t("kbzPayNeedsVerificationFirst"));
      return;
    }
    setBusy("kbz", true);
    try {
      await requestKbzPayVerification();
      await refreshProfile();
      await adminCooldown.recordSuccess("kbzPayVerificationRequest");
      Alert.alert(t("kbzPayRequested"));
    } catch (err) {
      if (getHttpStatus(err) === 409) {
        const latest = await refreshProfile();
        if (latest?.isKbzPayVerified) {
          Alert.alert(t("profileStatusVerified"), t("profileVerifiedHint"));
          return;
        }
      }
      handleError(err);
    } finally {
      setBusy("kbz", false);
    }
  };

  const handleSubmitKbzTransaction = async () => {
    if (!kbzHasTransferDetails) {
      Alert.alert(t("errorTitle"), t("kbzPayWaitInstructionHint"));
      return;
    }
    if (!kbzTransactionId.trim()) {
      setKbzTransactionError(t("kbzPayTxnRequired"));
      return;
    }
    setBusy("kbzSubmit", true);
    try {
      await submitKbzPayTransaction(kbzTransactionId.trim());
      setKbzTransactionId("");
      setKbzTransactionError("");
      await refreshProfile();
      await adminCooldown.recordSuccess("kbzPaySubmitTransaction");
      Alert.alert(t("kbzPayTransactionSubmitted"));
    } catch (err) {
      const status = getHttpStatus(err);
      if (status === 409) {
        const latest = await refreshProfile();
        Alert.alert(
          latest?.isKbzPayVerified
            ? t("profileStatusVerified")
            : t("kbzPayAlreadySubmittedTitle"),
          latest?.isKbzPayVerified
            ? t("profileVerifiedHint")
            : t("kbzPayAlreadySubmittedBody"),
        );
        return;
      }
      if (status === 400 || status === 422) {
        setKbzTransactionError(getServerMessage(err) ?? t("kbzPayTxnInvalid"));
        return;
      }
      handleError(err);
    } finally {
      setBusy("kbzSubmit", false);
    }
  };

  const handleRefreshKbzPay = async () => {
    setBusy("kbzRefresh", true);
    try {
      await refreshProfile();
    } catch (err) {
      handleError(err);
    } finally {
      setBusy("kbzRefresh", false);
    }
  };

  const handleCopyKbzPhone = async () => {
    if (!kbzAdminPhone) return;
    await Clipboard.setStringAsync(kbzAdminPhone);
    Alert.alert(t("kbzPayPhoneCopied"));
  };

  const handleRequestWithdrawal = async () => {
    const amount = Number(withdrawalAmount);
    const availablePoints = pointsQuery.data?.availableWithdrawalPoints ?? 0;

    if (!user?.isKbzPayVerified) {
      setWithdrawalError(t("rewardWithdrawalKbzRequired"));
      return;
    }

    if (availablePoints < MIN_WITHDRAWAL_POINTS) {
      setWithdrawalError(t("rewardWithdrawalMin"));
      return;
    }

    if (!Number.isFinite(amount) || amount < 1) {
      setWithdrawalError(t("rewardWithdrawalAmountRequired"));
      return;
    }

    if (amount > availablePoints) {
      setWithdrawalError(t("rewardWithdrawalAmountTooHigh"));
      return;
    }

    setWithdrawalError("");
    try {
      await requestWithdrawal.mutateAsync(amount);
      setWithdrawalAmount("");
      await adminCooldown.recordSuccess("withdrawalRequest");
      Alert.alert(t("rewardWithdrawalRequested"));
    } catch (err) {
      setWithdrawalError(getServerMessage(err) ?? t("rewardWithdrawalFailed"));
    }
  };

  const inputStyle = {
    color: colors.text,
    borderColor: colors.icon,
    backgroundColor: colors.background,
  } as const;

  const facebookLinked = Boolean(
    user?.facebookLinkedAt?.trim() || user?.facebookProfileUrl?.trim(),
  );
  const latestFacebookFollow = latestFacebookFollowQuery.data;
  const facebookFollowStatus =
    latestFacebookFollow?.status?.toUpperCase() ?? "";
  const facebookFollowStatusColor =
    facebookFollowStatus === "APPROVED"
      ? SUCCESS
      : facebookFollowStatus === "REJECTED"
        ? DANGER
        : facebookFollowStatus
          ? WARNING
          : colors.icon;
  const facebookFlowStep =
    facebookFollowStatus === "APPROVED"
      ? 3
      : facebookFollowStatus === "PENDING"
        ? 2
        : facebookLinked
          ? 1
          : 0;
  const phoneFlowStep = phoneVerified ? 2 : phoneOtpSent ? 1 : 0;
  const emailFlowStep = emailVerified ? 2 : emailCodeSent ? 1 : 0;
  const kbzStatus = user?.kbzPayVerificationStatus?.toUpperCase() ?? null;
  const kbzPendingStatuses = new Set([
    "PENDING",
    "REQUESTED",
    "INSTRUCTION_SENT",
    "IN_REVIEW",
  ]);
  const kbzIsPending = Boolean(kbzStatus && kbzPendingStatuses.has(kbzStatus));
  const kbzAdminPhone = user?.kbzPayAdminPhoneForTransfer?.trim() ?? "";
  const kbzAdminInstructionSentAt =
    user?.kbzPayAdminInstructionSentAt?.trim() ?? "";
  const kbzAdminNote = user?.kbzPayAdminNote?.trim() ?? "";
  const kbzSubmittedTransaction = user?.kbzPayTransactionId?.trim() ?? "";
  const kbzRequestedAt = user?.kbzPayRequestedAt?.trim() ?? "";
  const kbzInstructionMarkedSent =
    kbzStatus === "INSTRUCTION_SENT" ||
    kbzAdminPhone.length > 0 ||
    kbzAdminInstructionSentAt.length > 0 ||
    kbzAdminNote.length > 0;
  const kbzHasTransferDetails = kbzAdminPhone.length > 0;
  const kbzHasSubmittedTransaction =
    kbzSubmittedTransaction.length > 0 || kbzStatus === "IN_REVIEW";
  const kbzVerificationStarted = Boolean(
    kbzRequestedAt ||
    kbzInstructionMarkedSent ||
    kbzHasSubmittedTransaction ||
    (kbzStatus && kbzStatus !== "PENDING"),
  );
  const kbzCanRequest =
    !user?.isKbzPayVerified && (!kbzIsPending || !kbzVerificationStarted);
  const kbzWaitingForInstruction =
    kbzIsPending &&
    !user?.isKbzPayVerified &&
    kbzVerificationStarted &&
    !kbzInstructionMarkedSent &&
    !kbzHasSubmittedTransaction;
  const kbzWaitingForTransferDetails =
    kbzIsPending &&
    !user?.isKbzPayVerified &&
    kbzInstructionMarkedSent &&
    !kbzHasTransferDetails &&
    !kbzHasSubmittedTransaction;
  const kbzCanSubmitTransaction =
    kbzIsPending &&
    !user?.isKbzPayVerified &&
    kbzHasTransferDetails &&
    !kbzHasSubmittedTransaction;
  const kbzWaitingForAdminVerification =
    kbzIsPending && !user?.isKbzPayVerified && kbzHasSubmittedTransaction;
  const kbzFlowStep = user?.isKbzPayVerified
    ? 4
    : kbzHasSubmittedTransaction
      ? 3
      : kbzHasTransferDetails
        ? 2
        : kbzVerificationStarted
          ? 1
          : 0;
  const facebookFullyVerified = facebookFollowStatus === "APPROVED";
  const phoneTone: VerificationTone = phoneVerified
    ? "done"
    : phoneOtpSent
      ? "pending"
      : "todo";
  const emailTone: VerificationTone = emailVerified
    ? "done"
    : emailCodeSent
      ? "pending"
      : "todo";
  const facebookTone: VerificationTone = facebookFullyVerified
    ? "done"
    : facebookFollowStatus === "PENDING" || facebookLinked
      ? "pending"
      : "todo";
  const kbzTone: VerificationTone = user?.isKbzPayVerified
    ? "done"
    : kbzIsPending && kbzVerificationStarted
      ? "pending"
      : "todo";
  const toneLabel = (tone: VerificationTone) =>
    tone === "done"
      ? t("verificationStatusComplete")
      : tone === "pending"
        ? t("verificationStatusPending")
        : t("verificationStatusTodo");
  const verificationOverviewItems = [
    {
      key: "phone" as const,
      step: 1,
      title: t("phoneVerification"),
      icon: "phone-iphone" as const,
      tone: phoneTone,
      expanded: showPhoneVerification,
      onPress: () => {
        setShowPhoneVerification(true);
        setShowEmailVerification(false);
        setShowFacebookVerification(false);
        setShowKbzPayVerification(false);
      },
    },
    {
      key: "email" as const,
      step: 2,
      title: t("emailVerification"),
      icon: "alternate-email" as const,
      tone: emailTone,
      expanded: showEmailVerification,
      onPress: () => {
        setShowPhoneVerification(false);
        setShowEmailVerification(true);
        setShowFacebookVerification(false);
        setShowKbzPayVerification(false);
      },
    },
    {
      key: "facebook" as const,
      step: 3,
      title: t("facebookVerification"),
      icon: "groups" as const,
      tone: facebookTone,
      expanded: showFacebookVerification,
      onPress: () => {
        setShowPhoneVerification(false);
        setShowEmailVerification(false);
        setShowFacebookVerification(true);
        setShowKbzPayVerification(false);
      },
    },
    {
      key: "kbz" as const,
      step: 4,
      title: t("kbzPayVerification"),
      icon: "account-balance-wallet" as const,
      tone: kbzTone,
      expanded: showKbzPayVerification,
      onPress: () => {
        setShowPhoneVerification(false);
        setShowEmailVerification(false);
        setShowFacebookVerification(false);
        setShowKbzPayVerification(true);
      },
    },
  ];
  const verificationDoneCount = verificationOverviewItems.filter(
    (item) => item.tone === "done",
  ).length;
  const verificationNextItem = verificationOverviewItems.find(
    (item) => item.tone !== "done",
  );
  const verificationProgress =
    verificationOverviewItems.length > 0
      ? verificationDoneCount / verificationOverviewItems.length
      : 0;
  const pointsSummary = pointsQuery.data;
  const rankLadder = rankConfigsQuery.data ?? [];
  const statsSummary = statsQuery.data;
  const withdrawalRequests = withdrawalsQuery.data ?? [];
  const currentRank = pointsSummary?.currentRank ?? "NEWBIE";
  const currentRankAccent = RANK_ACCENTS[currentRank];
  const totalPoints = pointsSummary?.totalPoints ?? 0;
  const availableWithdrawalPoints =
    pointsSummary?.availableWithdrawalPoints ?? 0;
  const pendingWithdrawalAmount = pointsSummary?.pendingWithdrawalAmount ?? 0;
  const rewardNickname = pointsSummary?.nickname?.trim() || sampleName;
  const rewardHandle = rewardNickname.startsWith("@")
    ? rewardNickname
    : `@${rewardNickname.replace(/\s+/g, "").toLowerCase()}`;
  const currentRankLabel =
    pointsSummary?.currentRankConfig?.label?.trim() ||
    rankLadder.find((r) => r.tier === currentRank)?.label?.trim() ||
    currentRank;
  const nextRankConfig = pointsSummary?.nextRankConfig;
  const currentMinPoints =
    pointsSummary?.currentRankConfig?.minPoints ??
    rankLadder.find((r) => r.tier === currentRank)?.minPoints ??
    FALLBACK_MIN_POINTS_BY_TIER[currentRank];
  const nextMinPoints = nextRankConfig?.minPoints ?? null;
  const rankProgress =
    nextMinPoints && nextMinPoints > currentMinPoints
      ? Math.min(
          1,
          Math.max(
            0,
            (totalPoints - currentMinPoints) /
              (nextMinPoints - currentMinPoints),
          ),
        )
      : 1;
  const rankProgressPercent = Math.round(rankProgress * 100);
  const pointsToNextRank = nextMinPoints
    ? Math.max(0, nextMinPoints - totalPoints)
    : 0;
  const withdrawalAmountNumber = Number(withdrawalAmount);
  const kbzRequestCoolingDown = adminCooldown.isCoolingDown(
    "kbzPayVerificationRequest",
  );
  const kbzSubmitCoolingDown = adminCooldown.isCoolingDown(
    "kbzPaySubmitTransaction",
  );
  const withdrawalCoolingDown =
    adminCooldown.isCoolingDown("withdrawalRequest");
  const withdrawalDisabled =
    requestWithdrawal.isPending ||
    withdrawalCoolingDown ||
    !user?.isKbzPayVerified ||
    availableWithdrawalPoints < MIN_WITHDRAWAL_POINTS ||
    !Number.isFinite(withdrawalAmountNumber) ||
    withdrawalAmountNumber < 1 ||
    withdrawalAmountNumber > availableWithdrawalPoints;
  const rewardLoading = pointsQuery.isLoading || statsQuery.isLoading;
  const rewardError = pointsQuery.isError || statsQuery.isError;
  const rewardPanelBg =
    colorScheme === "dark" ? "rgba(22, 163, 74, 0.14)" : "#ecfdf5";
  const rewardMutedBg =
    colorScheme === "dark" ? "rgba(148, 163, 184, 0.12)" : "#f8fafc";
  const profileRefreshing =
    pointsQuery.isFetching ||
    rankConfigsQuery.isFetching ||
    statsQuery.isFetching ||
    withdrawalsQuery.isFetching ||
    latestFacebookFollowQuery.isFetching;

  return (
    <ThemedView style={styles.screen}>
      <KeyboardAwareFormScroll
        fill
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topInset,
            paddingBottom: Math.max(insets.bottom, 24) + 42,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={profileRefreshing}
            onRefresh={() => {
              void refreshProfile();
              void pointsQuery.refetch();
              void rankConfigsQuery.refetch();
              void statsQuery.refetch();
              void withdrawalsQuery.refetch();
              void latestFacebookFollowQuery.refetch();
            }}
            tintColor={colors.tint}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
          <ProfileAnimatedSection delayMs={0} reduceMotion={reduceMotion}>
            <ThemedText type="screenTitle" style={styles.title}>
              {t("profileTitle")}
            </ThemedText>
          </ProfileAnimatedSection>

          <ProfileAnimatedSection
            delayMs={UI_SECTION_STAGGER_MS}
            reduceMotion={reduceMotion}
          >
            <View style={[styles.tabs, { borderColor: colors.icon }]}>
              <ProfileTabButton
                active={activeTab === "rewards"}
                tint={colors.tint}
                inactiveColor={colors.text}
                label={t("profileTabRewards")}
                onPress={() => setActiveTab("rewards")}
              />
              <ProfileTabButton
                active={activeTab === "verifications"}
                tint={colors.tint}
                inactiveColor={colors.text}
                label={t("profileTabVerifications")}
                onPress={() => setActiveTab("verifications")}
              />
              <ProfileTabButton
                active={activeTab === "password"}
                tint={colors.tint}
                inactiveColor={colors.text}
                label={t("profileTabPassword")}
                onPress={() => setActiveTab("password")}
              />
            </View>
          </ProfileAnimatedSection>

          <ProfileAnimatedSection
            delayMs={UI_SECTION_STAGGER_MS * 2}
            reduceMotion={reduceMotion}
          >
            <ProfileAnimatedCard scheme={scheme} borderColor={colors.icon}>
              <View style={styles.profileHeader}>
                <Pressable
                  onPress={() => {
                    handlePickAndUploadAvatar();
                  }}
                  style={styles.avatarPressable}
                >
                  <View
                    style={[styles.avatar, { backgroundColor: colors.tint }]}
                  >
                    {avatarImageSource ? (
                      <Image
                        key={avatarUrl}
                        source={avatarImageSource}
                        style={styles.avatarImage}
                        contentFit="cover"
                        recyclingKey={avatarUrl}
                      />
                    ) : (
                      <ThemedText style={styles.avatarText}>
                        {initials}
                      </ThemedText>
                    )}
                  </View>
                  <View
                    style={[
                      styles.avatarBadge,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.icon,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="photo-camera"
                      size={14}
                      color={colors.icon}
                    />
                  </View>
                </Pressable>
                <View style={styles.profileInfo}>
                  <ThemedText style={styles.profileName}>
                    {sampleName}
                  </ThemedText>
                  <ThemedText style={styles.profileSub}>
                    {sampleEmail}
                  </ThemedText>
                  <ThemedText style={styles.profileSub}>
                    {sampleRole} | {sampleId}
                  </ThemedText>
                </View>
              </View>
            </ProfileAnimatedCard>
          </ProfileAnimatedSection>

          {myReferralCode ? (
            <ProfileAnimatedSection
              delayMs={UI_SECTION_STAGGER_MS * 2.5}
              reduceMotion={reduceMotion}
            >
              <ReferralCodeBlock
                code={myReferralCode}
                title={t("profileInviteCodeTitle")}
                hint={t("profileInviteCodeHint")}
                tint={colors.tint}
                borderColor={colors.icon + "33"}
                surfaceColor={scheme === "dark" ? "#1C1F24" : "#FFFFFF"}
              />
            </ProfileAnimatedSection>
          ) : null}

          <ProfileTabPanel tabKey={activeTab} reduceMotion={reduceMotion}>
            {activeTab === "rewards" ? (
              <ProfileAnimatedCard
                scheme={scheme}
                borderColor={colors.icon}
                style={styles.rewardCard}
              >
                <View style={styles.rewardHeader}>
                  <View
                    style={[
                      styles.rewardIcon,
                      { backgroundColor: currentRankAccent },
                    ]}
                  >
                    <MaterialIcons name="emoji-events" color="#fff" size={22} />
                  </View>
                  <View style={styles.rewardHeaderText}>
                    <ThemedText style={styles.cardTitle}>
                      {t("rewardMyProfile")}
                    </ThemedText>
                    <ThemedText style={styles.profileSub}>
                      {rewardHandle}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.rankPill,
                      { backgroundColor: currentRankAccent },
                    ]}
                  >
                    <ThemedText style={styles.rankPillText}>
                      {currentRankLabel}
                    </ThemedText>
                  </View>
                </View>

                {rewardLoading ? (
                  <View style={styles.rewardLoading}>
                    <FlexMarketLoader variant="inline" size="xs" showText={false} />
                  </View>
                ) : rewardError ? (
                  <Pressable
                    onPress={() => {
                      pointsQuery.refetch();
                      statsQuery.refetch();
                      withdrawalsQuery.refetch();
                    }}
                    style={[styles.outlineButton, { borderColor: colors.tint }]}
                  >
                    <View style={styles.buttonContent}>
                      <MaterialIcons
                        name="refresh"
                        color={colors.tint}
                        size={18}
                      />
                      <ThemedText
                        style={[
                          styles.outlineButtonText,
                          { color: colors.tint },
                        ]}
                      >
                        {t("rewardRetry")}
                      </ThemedText>
                    </View>
                  </Pressable>
                ) : (
                  <>
                    <View
                      style={[
                        styles.pointsPanel,
                        { backgroundColor: rewardPanelBg },
                      ]}
                    >
                      <ThemedText style={styles.sectionLabel}>
                        {t("rewardMyPoints")}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.pointsValue,
                          { color: currentRankAccent },
                        ]}
                      >
                        {formatPoints(totalPoints)} pts
                      </ThemedText>
                      <View style={styles.rewardHintRow}>
                        <MaterialIcons
                          name="payments"
                          color={SUCCESS}
                          size={18}
                        />
                        <ThemedText style={styles.rewardHintText}>
                          {t("rewardCashoutHint")}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.rewardMetaGrid}>
                      <View
                        style={[
                          styles.rewardMetaItem,
                          { backgroundColor: rewardMutedBg },
                        ]}
                      >
                        <ThemedText style={styles.infoLabel}>
                          {t("rewardAvailablePoints")}
                        </ThemedText>
                        <ThemedText style={styles.infoValue}>
                          {formatPoints(availableWithdrawalPoints)} pts
                        </ThemedText>
                      </View>
                      <View
                        style={[
                          styles.rewardMetaItem,
                          { backgroundColor: rewardMutedBg },
                        ]}
                      >
                        <ThemedText style={styles.infoLabel}>
                          {t("rewardPendingWithdrawal")}
                        </ThemedText>
                        <ThemedText style={styles.infoValue}>
                          {formatPoints(pendingWithdrawalAmount)} pts
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.rankProgressWrap}>
                      <View style={styles.rewardSectionHeader}>
                        <ThemedText style={styles.sectionLabel}>
                          {t("rewardCurrentRank")}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.rankProgressValue,
                            { color: currentRankAccent },
                          ]}
                        >
                          {rankProgressPercent}%
                        </ThemedText>
                      </View>
                      <View
                        style={[
                          styles.rankProgressTrack,
                          { backgroundColor: rewardMutedBg },
                        ]}
                      >
                        <View
                          style={[
                            styles.rankProgressFill,
                            {
                              width: `${rankProgressPercent}%`,
                              backgroundColor: currentRankAccent,
                            },
                          ]}
                        />
                      </View>
                      <ThemedText style={styles.profileSub}>
                        {nextRankConfig
                          ? `${formatPoints(pointsToNextRank)} ${t("rewardPointsToNext")} (${nextRankConfig.label || nextRankConfig.tier})`
                          : t("rewardMaxRank")}
                      </ThemedText>
                    </View>

                    <View style={styles.withdrawalForm}>
                      <ThemedText style={styles.label}>
                        {t("rewardWithdrawalAmount")}
                      </ThemedText>
                      <TextInput
                        style={[
                          styles.input,
                          inputStyle,
                          withdrawalError ? { borderColor: DANGER } : null,
                        ]}
                        value={withdrawalAmount}
                        onChangeText={(value) => {
                          setWithdrawalAmount(value.replace(/[^\d]/g, ""));
                          if (withdrawalError) setWithdrawalError("");
                        }}
                        placeholder={t("rewardWithdrawalPlaceholder")}
                        placeholderTextColor={colors.icon}
                        keyboardType="number-pad"
                        editable={
                          !requestWithdrawal.isPending && !withdrawalCoolingDown
                        }
                      />
                      {withdrawalError ? (
                        <ThemedText style={styles.error}>
                          {withdrawalError}
                        </ThemedText>
                      ) : null}
                      {withdrawalCoolingDown ? (
                        <ThemedText style={styles.profileSub}>
                          {tf(
                            "actionCooldownRemaining",
                            cooldownHhMm(
                              adminCooldown.remainingMs("withdrawalRequest"),
                            ),
                          )}
                        </ThemedText>
                      ) : null}
                      <Pressable
                        onPress={handleRequestWithdrawal}
                        disabled={withdrawalDisabled}
                        style={[
                          styles.primaryButton,
                          styles.fullWidthButton,
                          { backgroundColor: colors.tint },
                          withdrawalDisabled && { opacity: 0.6 },
                        ]}
                      >
                        {requestWithdrawal.isPending ? (
                          <FlexMarketLoader variant="inline" size="xs" showText={false} />
                        ) : (
                          <View style={styles.buttonContent}>
                            <MaterialIcons
                              name="account-balance-wallet"
                              color="#fff"
                              size={18}
                            />
                            <ThemedText style={styles.primaryButtonText}>
                              {t("rewardRequestWithdrawal")}
                            </ThemedText>
                          </View>
                        )}
                      </Pressable>
                    </View>

                    <View style={styles.rewardSection}>
                      <ThemedText style={styles.cardTitle}>
                        {t("rewardTransactionStats")}
                      </ThemedText>
                      <View style={styles.statGrid}>
                        {(
                          [
                            {
                              icon: "bar-chart" as const,
                              iconColor: colors.tint,
                              value: formatPoints(
                                statsSummary?.totalTransactionsMade ?? 0,
                              ),
                              label: t("rewardTotalTransactions"),
                            },
                            {
                              icon: "store" as const,
                              iconColor: SUCCESS,
                              value: formatPoints(
                                statsSummary?.completedSales ?? 0,
                              ),
                              label: t("rewardCompletedSales"),
                            },
                            {
                              icon: "shopping-cart" as const,
                              iconColor: WARNING,
                              value: formatPoints(
                                statsSummary?.completedPurchases ?? 0,
                              ),
                              label: t("rewardCompletedPurchases"),
                            },
                          ] as const
                        ).map((stat, index) => (
                          <ProfileStaggerItem
                            key={stat.label}
                            index={index}
                            reduceMotion={reduceMotion}
                            style={[
                              styles.statTile,
                              { backgroundColor: rewardMutedBg },
                            ]}
                          >
                            <MaterialIcons
                              name={stat.icon}
                              color={stat.iconColor}
                              size={20}
                            />
                            <ThemedText style={styles.statValue}>
                              {stat.value}
                            </ThemedText>
                            <ThemedText style={styles.statLabel}>
                              {stat.label}
                            </ThemedText>
                          </ProfileStaggerItem>
                        ))}
                      </View>
                    </View>

                    <View style={styles.rewardSection}>
                      <Pressable
                        onPress={() => setShowRankSystem((prev) => !prev)}
                        style={styles.collapsibleHeader}
                      >
                        <ThemedText style={styles.cardTitle}>
                          {t("rewardRankSystem")}
                        </ThemedText>
                        <MaterialIcons
                          name={showRankSystem ? "expand-less" : "expand-more"}
                          color={colors.icon}
                          size={22}
                        />
                      </Pressable>
                      {showRankSystem ? (
                        <ProfileFadeIn reduceMotion={reduceMotion}>
                          <View style={styles.rankList}>
                            {rankConfigsQuery.isLoading &&
                            rankLadder.length === 0 ? (
                              <View style={styles.rankLoading}>
                                <FlexMarketLoader variant="inline" size="xs" showText={false} />
                              </View>
                            ) : rankLadder.length === 0 ? (
                              <ThemedText style={styles.profileSub}>
                                {t("rewardRankLadderUnavailable")}
                              </ThemedText>
                            ) : (
                              rankLadder.map((rank, index) => {
                                const active = rank.tier === currentRank;
                                const accent = RANK_ACCENTS[rank.tier];
                                const badgeSource =
                                  rank.badgeUrl?.trim() &&
                                  user?.accessToken &&
                                  mediaUrlSharesApiOrigin(rank.badgeUrl)
                                    ? {
                                        uri: rank.badgeUrl.trim(),
                                        headers: {
                                          Authorization: `Bearer ${user.accessToken}`,
                                        },
                                      }
                                    : rank.badgeUrl?.trim()
                                      ? { uri: rank.badgeUrl.trim() }
                                      : null;
                                return (
                                  <ProfileStaggerItem
                                    key={rank.tier}
                                    index={index}
                                    reduceMotion={reduceMotion}
                                    style={[
                                      styles.rankRow,
                                      {
                                        backgroundColor: active
                                          ? rewardMutedBg
                                          : "transparent",
                                        borderColor: active
                                          ? accent
                                          : colors.icon,
                                      },
                                    ]}
                                  >
                                    {badgeSource ? (
                                      <Image
                                        source={badgeSource}
                                        style={styles.rankBadge}
                                        contentFit="contain"
                                        recyclingKey={
                                          rank.badgeUrl ?? rank.tier
                                        }
                                      />
                                    ) : (
                                      <View
                                        style={[
                                          styles.rankDot,
                                          { backgroundColor: accent },
                                        ]}
                                      />
                                    )}
                                    <ThemedText style={styles.rankName}>
                                      {rank.label}
                                    </ThemedText>
                                    <ThemedText style={styles.rankThreshold}>
                                      {formatRankPointsRange(rank)}
                                    </ThemedText>
                                  </ProfileStaggerItem>
                                );
                              })
                            )}
                          </View>
                        </ProfileFadeIn>
                      ) : null}
                    </View>

                    <View style={styles.rewardSection}>
                      <Pressable
                        onPress={() =>
                          setShowWithdrawalHistory((prev) => !prev)
                        }
                        style={styles.collapsibleHeader}
                      >
                        <View style={styles.withdrawalHeaderLeft}>
                          <ThemedText style={styles.cardTitle}>
                            {t("rewardWithdrawalHistory")}
                          </ThemedText>
                          {withdrawalsQuery.isFetching ? (
                            <FlexMarketLoader variant="inline" size="xs" showText={false} />
                          ) : null}
                        </View>
                        <MaterialIcons
                          name={
                            showWithdrawalHistory
                              ? "expand-less"
                              : "expand-more"
                          }
                          color={colors.icon}
                          size={22}
                        />
                      </Pressable>
                      {showWithdrawalHistory ? (
                        <ProfileFadeIn reduceMotion={reduceMotion}>
                          {withdrawalRequests.length === 0 ? (
                            <ThemedText style={styles.profileSub}>
                              {t("rewardNoWithdrawals")}
                            </ThemedText>
                          ) : (
                            <View style={styles.withdrawalList}>
                              {withdrawalRequests.map((item, index) => (
                                <ProfileStaggerItem
                                  key={item.id}
                                  index={index}
                                  reduceMotion={reduceMotion}
                                  style={[
                                    styles.withdrawalRow,
                                    {
                                      borderColor: colors.icon,
                                      backgroundColor: rewardMutedBg,
                                    },
                                  ]}
                                >
                                  <View style={styles.withdrawalTopRow}>
                                    <ThemedText style={styles.withdrawalAmount}>
                                      {formatPoints(item.amount)} pts
                                    </ThemedText>
                                    <ThemedText
                                      style={[
                                        styles.withdrawalStatus,
                                        {
                                          color: getWithdrawalStatusColor(
                                            item.status,
                                            colors.tint,
                                          ),
                                        },
                                      ]}
                                    >
                                      {item.status}
                                    </ThemedText>
                                  </View>
                                  <ThemedText style={styles.profileSub}>
                                    {formatDate(item.createdAt)}
                                    {item.kbzTransferRef
                                      ? ` | ${item.kbzTransferRef}`
                                      : ""}
                                  </ThemedText>
                                  {item.adminNote ? (
                                    <ThemedText style={styles.profileSub}>
                                      {item.adminNote}
                                    </ThemedText>
                                  ) : null}
                                </ProfileStaggerItem>
                              ))}
                            </View>
                          )}
                        </ProfileFadeIn>
                      ) : null}
                    </View>
                  </>
                )}
              </ProfileAnimatedCard>
            ) : activeTab === "verifications" ? (
              <>
                <ProfileAnimatedCard
                  scheme={scheme}
                  borderColor={
                    verificationDoneCount === 4
                      ? SUCCESS + "66"
                      : colors.icon
                  }
                  style={[
                    styles.verificationOverviewCard,
                    verificationDoneCount === 4
                      ? { backgroundColor: SUCCESS + "10" }
                      : null,
                  ]}
                >
                  <View style={styles.verificationOverviewHeader}>
                    <View
                      style={[
                        styles.verificationOverviewIcon,
                        {
                          backgroundColor:
                            verificationDoneCount === 4
                              ? SUCCESS
                              : colors.tint,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={
                          verificationDoneCount === 4
                            ? "verified-user"
                            : "security"
                        }
                        color="#fff"
                        size={22}
                      />
                    </View>
                    <View style={styles.verificationOverviewCopy}>
                      <View style={styles.verificationOverviewTitleRow}>
                        <ThemedText
                          numberOfLines={2}
                          style={styles.verificationOverviewTitle}
                        >
                          {t("verificationsOverviewTitle")}
                        </ThemedText>
                        <View
                          style={[
                            styles.verificationProgressChip,
                            {
                              backgroundColor:
                                verificationDoneCount === 4
                                  ? SUCCESS + "22"
                                  : colors.tint + "18",
                            },
                          ]}
                        >
                          <ThemedText
                            numberOfLines={1}
                            style={[
                              styles.verificationProgressChipText,
                              {
                                color:
                                  verificationDoneCount === 4
                                    ? SUCCESS
                                    : colors.tint,
                              },
                            ]}
                          >
                            {tf("verificationsProgressCount", {
                              done: String(verificationDoneCount),
                              total: "4",
                            })}
                          </ThemedText>
                        </View>
                      </View>
                      <ThemedText style={styles.verificationOverviewHint}>
                        {verificationDoneCount === 4
                          ? t("verificationsAllComplete")
                          : t("verificationsOverviewHint")}
                      </ThemedText>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.verificationProgressTrack,
                      { backgroundColor: colors.icon + "22" },
                    ]}
                  >
                    <View
                      style={[
                        styles.verificationProgressFill,
                        {
                          width: `${Math.round(verificationProgress * 100)}%`,
                          backgroundColor:
                            verificationDoneCount === 4
                              ? SUCCESS
                              : colors.tint,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.verificationOverviewGrid}>
                    {verificationOverviewItems.map((item) => {
                      const accent = verificationToneColor(
                        item.tone,
                        colors.tint,
                      );
                      return (
                        <Pressable
                          key={item.key}
                          onPress={item.onPress}
                          style={[
                            styles.verificationOverviewTile,
                            {
                              borderColor: item.expanded
                                ? accent
                                : colors.icon + "33",
                              backgroundColor: item.expanded
                                ? accent + "12"
                                : colors.icon + "0A",
                            },
                          ]}
                        >
                          <View style={styles.verificationOverviewTileTop}>
                            <View
                              style={[
                                styles.verificationOverviewTileIcon,
                                { backgroundColor: accent + "20" },
                              ]}
                            >
                              <MaterialIcons
                                name={
                                  item.tone === "done" ? "check" : item.icon
                                }
                                size={16}
                                color={accent}
                              />
                            </View>
                            <ThemedText
                              style={[
                                styles.verificationOverviewTileStep,
                                { color: colors.icon },
                              ]}
                            >
                              {item.step}
                            </ThemedText>
                          </View>
                          <ThemedText
                            numberOfLines={3}
                            style={styles.verificationOverviewTileTitle}
                          >
                            {item.title}
                          </ThemedText>
                          <VerificationStatusPill
                            tone={item.tone}
                            label={toneLabel(item.tone)}
                            tint={colors.tint}
                          />
                        </Pressable>
                      );
                    })}
                  </View>

                  {verificationNextItem ? (
                    <View
                      style={[
                        styles.verificationNextRow,
                        { borderColor: colors.icon + "33" },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.verificationNextLabel,
                          { color: colors.icon },
                        ]}
                      >
                        {t("verificationsNextHint")}
                      </ThemedText>
                      <Pressable
                        onPress={verificationNextItem.onPress}
                        style={styles.verificationNextButton}
                      >
                        <ThemedText
                          numberOfLines={2}
                          style={[
                            styles.verificationNextButtonText,
                            { color: colors.tint },
                          ]}
                        >
                          {verificationNextItem.title}
                        </ThemedText>
                        <MaterialIcons
                          name="arrow-forward"
                          size={16}
                          color={colors.tint}
                        />
                      </Pressable>
                    </View>
                  ) : null}
                </ProfileAnimatedCard>

                <ProfileAnimatedCard
                  scheme={scheme}
                  borderColor={
                    phoneTone === "done"
                      ? SUCCESS + "55"
                      : phoneTone === "pending"
                        ? WARNING + "55"
                        : colors.icon
                  }
                  style={styles.verificationItemCard}
                >
                  <VerificationItemHeader
                    step={1}
                    icon="phone-iphone"
                    title={t("phoneVerification")}
                    tone={phoneTone}
                    statusLabel={toneLabel(phoneTone)}
                    expanded={showPhoneVerification}
                    onPress={() =>
                      setShowPhoneVerification((prev) => !prev)
                    }
                    colors={colors}
                  />
                  {showPhoneVerification ? (
                    <ProfileFadeIn reduceMotion={reduceMotion}>
                      <View style={styles.kbzFlow}>
                        {!phoneVerified ? (
                          <VerificationStepRail
                            labels={[
                              t("phoneVerifyStepPhone"),
                              t("phoneVerifyStepCode"),
                              t("phoneVerifyStepDone"),
                            ]}
                            activeStep={phoneFlowStep}
                            colors={colors}
                          />
                        ) : null}

                        {phoneVerified ? (
                          <View
                            style={[
                              styles.kbzStatusPanel,
                              {
                                backgroundColor: SUCCESS + "12",
                                borderColor: SUCCESS + "55",
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.kbzStatusIcon,
                                { backgroundColor: SUCCESS + "20" },
                              ]}
                            >
                              <MaterialIcons
                                name="verified"
                                size={26}
                                color={SUCCESS}
                              />
                            </View>
                            <ThemedText style={styles.kbzStateTitle}>
                              {t("phoneVerifiedTitle")}
                            </ThemedText>
                            <ThemedText
                              style={[
                                styles.kbzCenteredText,
                                { color: colors.icon },
                              ]}
                            >
                              {t("phoneVerifiedBody")}
                            </ThemedText>
                            {phone.trim() ? (
                              <View
                                style={[
                                  styles.kbzSubmittedId,
                                  { borderColor: colors.icon + "44" },
                                ]}
                              >
                                <ThemedText style={styles.infoLabel}>
                                  {t("phoneNumber")}
                                </ThemedText>
                                <ThemedText style={styles.infoValue}>
                                  {phone}
                                </ThemedText>
                              </View>
                            ) : null}
                          </View>
                        ) : (
                          <View style={styles.kbzStateContent}>
                            <ThemedText style={styles.kbzStateTitle}>
                              {t("phoneVerifyStartTitle")}
                            </ThemedText>
                            <ThemedText style={styles.profileSub}>
                              {t("phoneVerifyIntro")}
                            </ThemedText>

                            <View style={styles.kbzInstructionRow}>
                              <View
                                style={[
                                  styles.kbzInstructionNumber,
                                  { backgroundColor: colors.tint },
                                ]}
                              >
                                <ThemedText
                                  style={styles.kbzInstructionNumberText}
                                >
                                  1
                                </ThemedText>
                              </View>
                              <View style={styles.kbzInstructionBody}>
                                <ThemedText style={styles.label}>
                                  {t("phoneNumber")}
                                </ThemedText>
                                <TextInput
                                  style={[styles.input, inputStyle]}
                                  value={phone}
                                  onChangeText={(value) => {
                                    setPhone(value);
                                    if (phoneOtpSent) setPhoneOtpSent(false);
                                  }}
                                  placeholder={t("phoneNumberPlaceholder")}
                                  placeholderTextColor={colors.icon}
                                  keyboardType="phone-pad"
                                  autoCapitalize="none"
                                />
                                <Pressable
                                  onPress={handleSendOtp}
                                  disabled={loading.sendOtp || !phone.trim()}
                                  style={[
                                    styles.primaryButton,
                                    styles.fullWidthButton,
                                    { backgroundColor: colors.tint },
                                    (loading.sendOtp || !phone.trim()) && {
                                      opacity: 0.5,
                                    },
                                  ]}
                                >
                                  {loading.sendOtp ? (
                                    <FlexMarketLoader
                                      variant="inline"
                                      size="xs"
                                      showText={false}
                                    />
                                  ) : (
                                    <ThemedText
                                      style={styles.primaryButtonText}
                                    >
                                      {phoneOtpSent
                                        ? t("resend")
                                        : t("phoneSendCodeButton")}
                                    </ThemedText>
                                  )}
                                </Pressable>
                              </View>
                            </View>

                            {phoneOtpSent ? (
                              <View style={styles.kbzInstructionRow}>
                                <View
                                  style={[
                                    styles.kbzInstructionNumber,
                                    { backgroundColor: colors.tint },
                                  ]}
                                >
                                  <ThemedText
                                    style={styles.kbzInstructionNumberText}
                                  >
                                    2
                                  </ThemedText>
                                </View>
                                <View style={styles.kbzInstructionBody}>
                                  <ThemedText style={styles.label}>
                                    {t("otpCode")}
                                  </ThemedText>
                                  <ThemedText
                                    style={[
                                      styles.kbzInputHint,
                                      { color: colors.icon },
                                    ]}
                                  >
                                    {t("phoneCodeSentHint")}
                                  </ThemedText>
                                  <TextInput
                                    style={[styles.input, inputStyle]}
                                    value={otpCode}
                                    onChangeText={(v) =>
                                      setOtpCode(v.replace(/\D/g, ""))
                                    }
                                    placeholder={t("otpPlaceholder")}
                                    placeholderTextColor={colors.icon}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                  />
                                  <Pressable
                                    onPress={handleVerifyOtp}
                                    disabled={
                                      loading.verifyOtp ||
                                      otpCode.trim().length < 4
                                    }
                                    style={[
                                      styles.primaryButton,
                                      styles.fullWidthButton,
                                      { backgroundColor: colors.tint },
                                      (loading.verifyOtp ||
                                        otpCode.trim().length < 4) && {
                                        opacity: 0.5,
                                      },
                                    ]}
                                  >
                                    {loading.verifyOtp ? (
                                      <FlexMarketLoader
                                        variant="inline"
                                        size="xs"
                                        showText={false}
                                      />
                                    ) : (
                                      <ThemedText
                                        style={styles.primaryButtonText}
                                      >
                                        {t("verify")}
                                      </ThemedText>
                                    )}
                                  </Pressable>
                                </View>
                              </View>
                            ) : null}
                          </View>
                        )}
                      </View>
                    </ProfileFadeIn>
                  ) : null}
                </ProfileAnimatedCard>

                <ProfileAnimatedCard
                  scheme={scheme}
                  borderColor={
                    emailTone === "done"
                      ? SUCCESS + "55"
                      : emailTone === "pending"
                        ? WARNING + "55"
                        : colors.icon
                  }
                  style={styles.verificationItemCard}
                >
                  <VerificationItemHeader
                    step={2}
                    icon="alternate-email"
                    title={t("emailVerification")}
                    tone={emailTone}
                    statusLabel={toneLabel(emailTone)}
                    expanded={showEmailVerification}
                    onPress={() =>
                      setShowEmailVerification((prev) => !prev)
                    }
                    colors={colors}
                  />
                  {showEmailVerification ? (
                    <ProfileFadeIn reduceMotion={reduceMotion}>
                      <View style={styles.kbzFlow}>
                        {!emailVerified ? (
                          <VerificationStepRail
                            labels={[
                              t("emailVerifyStepEmail"),
                              t("emailVerifyStepToken"),
                              t("emailVerifyStepDone"),
                            ]}
                            activeStep={emailFlowStep}
                            colors={colors}
                          />
                        ) : null}

                        {emailVerified ? (
                          <View
                            style={[
                              styles.kbzStatusPanel,
                              {
                                backgroundColor: SUCCESS + "12",
                                borderColor: SUCCESS + "55",
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.kbzStatusIcon,
                                { backgroundColor: SUCCESS + "20" },
                              ]}
                            >
                              <MaterialIcons
                                name="verified"
                                size={26}
                                color={SUCCESS}
                              />
                            </View>
                            <ThemedText style={styles.kbzStateTitle}>
                              {t("emailVerifiedTitle")}
                            </ThemedText>
                            <ThemedText
                              style={[
                                styles.kbzCenteredText,
                                { color: colors.icon },
                              ]}
                            >
                              {t("emailVerifiedBody")}
                            </ThemedText>
                            {email.trim() ? (
                              <View
                                style={[
                                  styles.kbzSubmittedId,
                                  { borderColor: colors.icon + "44" },
                                ]}
                              >
                                <ThemedText style={styles.infoLabel}>
                                  {t("emailAddress")}
                                </ThemedText>
                                <ThemedText style={styles.infoValue}>
                                  {email}
                                </ThemedText>
                              </View>
                            ) : null}
                          </View>
                        ) : (
                          <View style={styles.kbzStateContent}>
                            <ThemedText style={styles.kbzStateTitle}>
                              {t("emailVerifyStartTitle")}
                            </ThemedText>
                            <ThemedText style={styles.profileSub}>
                              {t("emailVerifyIntro")}
                            </ThemedText>

                            <View style={styles.kbzInstructionRow}>
                              <View
                                style={[
                                  styles.kbzInstructionNumber,
                                  { backgroundColor: colors.tint },
                                ]}
                              >
                                <ThemedText
                                  style={styles.kbzInstructionNumberText}
                                >
                                  1
                                </ThemedText>
                              </View>
                              <View style={styles.kbzInstructionBody}>
                                <ThemedText style={styles.label}>
                                  {t("emailAddress")}
                                </ThemedText>
                                <TextInput
                                  style={[styles.input, inputStyle]}
                                  value={email}
                                  onChangeText={setEmail}
                                  placeholder={t("emailPlaceholder")}
                                  placeholderTextColor={colors.icon}
                                  keyboardType="email-address"
                                  autoCapitalize="none"
                                />
                                <Pressable
                                  onPress={handleSendEmail}
                                  disabled={loading.sendEmail || !email.trim()}
                                  style={[
                                    styles.primaryButton,
                                    styles.fullWidthButton,
                                    { backgroundColor: colors.tint },
                                    (loading.sendEmail || !email.trim()) && {
                                      opacity: 0.5,
                                    },
                                  ]}
                                >
                                  {loading.sendEmail ? (
                                    <FlexMarketLoader
                                      variant="inline"
                                      size="xs"
                                      showText={false}
                                    />
                                  ) : (
                                    <ThemedText
                                      style={styles.primaryButtonText}
                                    >
                                      {emailCodeSent
                                        ? t("resend")
                                        : t("sendEmailVerificationButton")}
                                    </ThemedText>
                                  )}
                                </Pressable>
                              </View>
                            </View>

                            {emailCodeSent ? (
                              <View style={styles.kbzInstructionRow}>
                                <View
                                  style={[
                                    styles.kbzInstructionNumber,
                                    { backgroundColor: colors.tint },
                                  ]}
                                >
                                  <ThemedText
                                    style={styles.kbzInstructionNumberText}
                                  >
                                    2
                                  </ThemedText>
                                </View>
                                <View style={styles.kbzInstructionBody}>
                                  <ThemedText style={styles.label}>
                                    {t("emailToken")}
                                  </ThemedText>
                                  <ThemedText
                                    style={[
                                      styles.kbzInputHint,
                                      { color: colors.icon },
                                    ]}
                                  >
                                    {t("emailCodeSentHint")}
                                  </ThemedText>
                                  <TextInput
                                    style={[styles.input, inputStyle]}
                                    value={emailToken}
                                    onChangeText={setEmailToken}
                                    placeholder={t("emailTokenPlaceholder")}
                                    placeholderTextColor={colors.icon}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                  />
                                  <Pressable
                                    onPress={handleVerifyEmail}
                                    disabled={
                                      loading.verifyEmail ||
                                      !email.trim() ||
                                      !emailToken.trim()
                                    }
                                    style={[
                                      styles.primaryButton,
                                      styles.fullWidthButton,
                                      { backgroundColor: colors.tint },
                                      (loading.verifyEmail ||
                                        !email.trim() ||
                                        !emailToken.trim()) && {
                                        opacity: 0.5,
                                      },
                                    ]}
                                  >
                                    {loading.verifyEmail ? (
                                      <FlexMarketLoader
                                        variant="inline"
                                        size="xs"
                                        showText={false}
                                      />
                                    ) : (
                                      <ThemedText
                                        style={styles.primaryButtonText}
                                      >
                                        {t("verifyEmailButton")}
                                      </ThemedText>
                                    )}
                                  </Pressable>
                                </View>
                              </View>
                            ) : null}
                          </View>
                        )}
                      </View>
                    </ProfileFadeIn>
                  ) : null}
                </ProfileAnimatedCard>

                <ProfileAnimatedCard
                  scheme={scheme}
                  borderColor={
                    facebookTone === "done"
                      ? SUCCESS + "55"
                      : facebookTone === "pending"
                        ? WARNING + "55"
                        : colors.icon
                  }
                  style={styles.verificationItemCard}
                >
                  <VerificationItemHeader
                    step={3}
                    icon="groups"
                    title={t("facebookVerification")}
                    tone={facebookTone}
                    statusLabel={toneLabel(facebookTone)}
                    expanded={showFacebookVerification}
                    onPress={() =>
                      setShowFacebookVerification((prev) => !prev)
                    }
                    colors={colors}
                  />
                  {showFacebookVerification ? (
                    <ProfileFadeIn reduceMotion={reduceMotion}>
                      <View style={styles.kbzFlow}>
                        {facebookFollowStatus !== "APPROVED" ? (
                          <VerificationStepRail
                            labels={[
                              t("facebookFlowLink"),
                              t("facebookFlowFollow"),
                              t("facebookFlowReview"),
                            ]}
                            activeStep={facebookFlowStep}
                            colors={colors}
                          />
                        ) : null}

                        {facebookFollowStatus === "APPROVED" ? (
                          <View
                            style={[
                              styles.kbzStatusPanel,
                              {
                                backgroundColor: SUCCESS + "12",
                                borderColor: SUCCESS + "55",
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.kbzStatusIcon,
                                { backgroundColor: SUCCESS + "20" },
                              ]}
                            >
                              <MaterialIcons
                                name="verified"
                                size={26}
                                color={SUCCESS}
                              />
                            </View>
                            <ThemedText style={styles.kbzStateTitle}>
                              {t("facebookFollowApprovedTitle")}
                            </ThemedText>
                          </View>
                        ) : facebookFollowStatus === "PENDING" ? (
                          <View
                            style={[
                              styles.kbzStatusPanel,
                              {
                                backgroundColor: colors.tint + "0D",
                                borderColor: colors.tint + "44",
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.kbzStatusIcon,
                                { backgroundColor: colors.tint + "18" },
                              ]}
                            >
                              <MaterialIcons
                                name="fact-check"
                                size={24}
                                color={colors.tint}
                              />
                            </View>
                            <ThemedText style={styles.kbzStateTitle}>
                              {t("facebookFollowReviewTitle")}
                            </ThemedText>
                          </View>
                        ) : (
                          <View style={styles.kbzStateContent}>
                            {!facebookLinked ? (
                              <>
                                <ThemedText style={styles.kbzStateTitle}>
                                  {t("facebookStartTitle")}
                                </ThemedText>
                                <ThemedText style={styles.profileSub}>
                                  {t("facebookLinkIntro")}
                                </ThemedText>
                                <View style={styles.kbzInstructionRow}>
                                  <View
                                    style={[
                                      styles.kbzInstructionNumber,
                                      { backgroundColor: "#1877F2" },
                                    ]}
                                  >
                                    <ThemedText
                                      style={styles.kbzInstructionNumberText}
                                    >
                                      1
                                    </ThemedText>
                                  </View>
                                  <View style={styles.kbzInstructionBody}>
                                    <ThemedText style={styles.label}>
                                      {t("facebookLinkStepTitle")}
                                    </ThemedText>
                                    <Pressable
                                      onPress={handleStartFacebookOAuth}
                                      disabled={
                                        loading.facebookLink || !FACEBOOK_APP_ID
                                      }
                                      style={[
                                        styles.primaryButton,
                                        styles.fullWidthButton,
                                        { backgroundColor: "#1877F2" },
                                        (loading.facebookLink ||
                                          !FACEBOOK_APP_ID) && {
                                          opacity: 0.6,
                                        },
                                      ]}
                                    >
                                      {loading.facebookLink ? (
                                        <FlexMarketLoader
                                          variant="inline"
                                          size="xs"
                                          showText={false}
                                        />
                                      ) : (
                                        <ThemedText
                                          style={styles.primaryButtonText}
                                        >
                                          {t("facebookOAuthButton")}
                                        </ThemedText>
                                      )}
                                    </Pressable>
                                  </View>
                                </View>
                              </>
                            ) : (
                              <View
                                style={[
                                  styles.kbzStatusPanel,
                                  {
                                    backgroundColor: SUCCESS + "12",
                                    borderColor: SUCCESS + "55",
                                  },
                                ]}
                              >
                                <View
                                  style={[
                                    styles.kbzStatusIcon,
                                    { backgroundColor: SUCCESS + "20" },
                                  ]}
                                >
                                  <MaterialIcons
                                    name="link"
                                    size={24}
                                    color={SUCCESS}
                                  />
                                </View>
                                <ThemedText style={styles.kbzStateTitle}>
                                  {t("facebookLinkedTitle")}
                                </ThemedText>
                                {(user?.facebookName || facebookName) ? (
                                  <View
                                    style={[
                                      styles.kbzSubmittedId,
                                      { borderColor: colors.icon + "44" },
                                    ]}
                                  >
                                    <ThemedText style={styles.infoLabel}>
                                      {t("facebookNameLabel")}
                                    </ThemedText>
                                    <ThemedText style={styles.infoValue}>
                                      {user?.facebookName || facebookName}
                                    </ThemedText>
                                  </View>
                                ) : null}
                                {user?.facebookProfileUrl ||
                                facebookProfileUrl ? (
                                  <Pressable
                                    onPress={() =>
                                      handleOpenUrl(
                                        user?.facebookProfileUrl ||
                                          facebookProfileUrl,
                                      )
                                    }
                                    style={[
                                      styles.kbzSecondaryButton,
                                      { borderColor: colors.tint },
                                    ]}
                                  >
                                    <MaterialIcons
                                      name="open-in-new"
                                      size={18}
                                      color={colors.tint}
                                    />
                                    <ThemedText
                                      style={[
                                        styles.kbzSecondaryButtonText,
                                        { color: colors.tint },
                                      ]}
                                    >
                                      {t("facebookOpenProfile")}
                                    </ThemedText>
                                  </Pressable>
                                ) : null}
                              </View>
                            )}

                            <View style={styles.kbzInstructionRow}>
                              <View
                                style={[
                                  styles.kbzInstructionNumber,
                                  {
                                    backgroundColor: facebookLinked
                                      ? "#1877F2"
                                      : colors.icon,
                                  },
                                ]}
                              >
                                <ThemedText
                                  style={styles.kbzInstructionNumberText}
                                >
                                  2
                                </ThemedText>
                              </View>
                              <View style={styles.kbzInstructionBody}>
                                <ThemedText style={styles.label}>
                                  {t("facebookFollowStepTitle")}
                                </ThemedText>
                                <ThemedText
                                  style={[
                                    styles.kbzInputHint,
                                    { color: colors.icon },
                                  ]}
                                >
                                  {t("facebookFollowIntro")}
                                </ThemedText>
                                {facebookFollowStatus === "REJECTED" ? (
                                  <View
                                    style={[
                                      styles.kbzImportantBanner,
                                      {
                                        backgroundColor: DANGER + "12",
                                        borderColor: DANGER + "55",
                                      },
                                    ]}
                                  >
                                    <MaterialIcons
                                      name="error-outline"
                                      size={20}
                                      color={DANGER}
                                    />
                                    <ThemedText
                                      style={[
                                        styles.kbzImportantText,
                                        { color: DANGER },
                                      ]}
                                    >
                                      {t("facebookFollowRejectedHint")}
                                    </ThemedText>
                                  </View>
                                ) : null}
                                {(user?.facebookName || facebookName) ? (
                                  <View
                                    style={[
                                      styles.kbzSubmittedId,
                                      { borderColor: colors.icon + "44" },
                                    ]}
                                  >
                                    <ThemedText style={styles.infoLabel}>
                                      {t("facebookNameLabel")}
                                    </ThemedText>
                                    <ThemedText style={styles.infoValue}>
                                      {user?.facebookName || facebookName}
                                    </ThemedText>
                                  </View>
                                ) : null}
                                {FACEBOOK_PAGE_URL ? (
                                  <Pressable
                                    onPress={() =>
                                      handleOpenUrl(FACEBOOK_PAGE_URL)
                                    }
                                    disabled={!facebookLinked}
                                    style={[
                                      styles.kbzSecondaryButton,
                                      { borderColor: colors.tint },
                                      !facebookLinked && { opacity: 0.5 },
                                    ]}
                                  >
                                    <MaterialIcons
                                      name="open-in-new"
                                      size={18}
                                      color={colors.tint}
                                    />
                                    <ThemedText
                                      style={[
                                        styles.kbzSecondaryButtonText,
                                        { color: colors.tint },
                                      ]}
                                    >
                                      {t("facebookOpenPage")}
                                    </ThemedText>
                                  </Pressable>
                                ) : (
                                  <ThemedText style={styles.profileSub}>
                                    {t("facebookMissingPageUrl")}
                                  </ThemedText>
                                )}
                                <Pressable
                                  onPress={handlePickFacebookScreenshot}
                                  disabled={
                                    !facebookLinked ||
                                    loading.facebookScreenshot ||
                                    loading.facebookFollowSubmit
                                  }
                                  style={[
                                    styles.outlineButton,
                                    { borderColor: colors.tint },
                                    (!facebookLinked ||
                                      loading.facebookScreenshot ||
                                      loading.facebookFollowSubmit) && {
                                      opacity: 0.6,
                                    },
                                  ]}
                                >
                                  {loading.facebookScreenshot ? (
                                    <FlexMarketLoader
                                      variant="inline"
                                      size="xs"
                                      showText={false}
                                    />
                                  ) : (
                                    <ThemedText
                                      style={[
                                        styles.outlineButtonText,
                                        { color: colors.tint },
                                      ]}
                                    >
                                      {facebookScreenshot
                                        ? t("facebookScreenshotSelected")
                                        : t("facebookScreenshotButton")}
                                    </ThemedText>
                                  )}
                                </Pressable>
                                {facebookScreenshot ? (
                                  <ThemedText style={styles.profileSub}>
                                    {facebookScreenshot.name}
                                  </ThemedText>
                                ) : null}
                                <Pressable
                                  onPress={handleSubmitFacebookFollow}
                                  disabled={
                                    loading.facebookFollowSubmit ||
                                    !facebookLinked ||
                                    !FACEBOOK_PAGE_URL ||
                                    !facebookScreenshot
                                  }
                                  style={[
                                    styles.primaryButton,
                                    styles.fullWidthButton,
                                    { backgroundColor: colors.tint },
                                    (loading.facebookFollowSubmit ||
                                      !facebookLinked ||
                                      !FACEBOOK_PAGE_URL ||
                                      !facebookScreenshot) && {
                                      opacity: 0.6,
                                    },
                                  ]}
                                >
                                  {loading.facebookFollowSubmit ? (
                                    <FlexMarketLoader
                                      variant="inline"
                                      size="xs"
                                      showText={false}
                                    />
                                  ) : (
                                    <ThemedText
                                      style={styles.primaryButtonText}
                                    >
                                      {t("facebookSubmitFollowProof")}
                                    </ThemedText>
                                  )}
                                </Pressable>
                              </View>
                            </View>
                          </View>
                        )}

                        <View
                          style={[
                            styles.infoBox,
                            { borderColor: colors.icon },
                          ]}
                        >
                          <View style={styles.facebookStatusRow}>
                            <ThemedText style={styles.infoLabel}>
                              {t("facebookFollowLatestStatus")}
                            </ThemedText>
                            {latestFacebookFollowQuery.isFetching ? (
                              <FlexMarketLoader
                                variant="inline"
                                size="xs"
                                showText={false}
                              />
                            ) : null}
                          </View>
                          <ThemedText
                            style={[
                              styles.infoValue,
                              { color: facebookFollowStatusColor },
                            ]}
                          >
                            {facebookFollowStatus ||
                              t("facebookFollowNoSubmission")}
                          </ThemedText>
                          {latestFacebookFollow?.facebookPageUrl ? (
                            <Pressable
                              onPress={() =>
                                handleOpenUrl(
                                  latestFacebookFollow.facebookPageUrl,
                                )
                              }
                              style={styles.inlineLinkButton}
                            >
                              <ThemedText
                                style={{
                                  color: colors.tint,
                                  fontWeight: "700",
                                }}
                              >
                                {t("facebookOpenPage")}
                              </ThemedText>
                            </Pressable>
                          ) : null}
                          {latestFacebookFollow?.adminNote ? (
                            <ThemedText style={styles.profileSub}>
                              {t("facebookFollowAdminNote")}:{" "}
                              {latestFacebookFollow.adminNote}
                            </ThemedText>
                          ) : null}
                        </View>
                      </View>
                    </ProfileFadeIn>
                  ) : null}
                </ProfileAnimatedCard>

                <ProfileAnimatedCard
                  scheme={scheme}
                  borderColor={
                    kbzTone === "done"
                      ? SUCCESS + "55"
                      : kbzTone === "pending"
                        ? WARNING + "55"
                        : colors.icon
                  }
                  style={styles.verificationItemCard}
                >
                  <VerificationItemHeader
                    step={4}
                    icon="account-balance-wallet"
                    title={t("kbzPayVerification")}
                    tone={kbzTone}
                    statusLabel={toneLabel(kbzTone)}
                    expanded={showKbzPayVerification}
                    onPress={() =>
                      setShowKbzPayVerification((prev) => !prev)
                    }
                    colors={colors}
                  />

                  {showKbzPayVerification ? (
                    <ProfileFadeIn reduceMotion={reduceMotion}>
                      <View style={styles.kbzFlow}>
                        {!user?.isKbzPayVerified ? (
                          <VerificationStepRail
                            labels={[
                              t("kbzPayFlowRequest"),
                              t("kbzPayFlowInstruction"),
                              t("kbzPayFlowTransfer"),
                              t("kbzPayFlowReview"),
                            ]}
                            activeStep={kbzFlowStep}
                            colors={colors}
                          />
                        ) : null}

                        {kbzCanRequest ? (
                          <View style={styles.kbzStateContent}>
                            <ThemedText style={styles.kbzStateTitle}>
                              {t("kbzPayStartTitle")}
                            </ThemedText>
                            <ThemedText style={styles.profileSub}>
                              {t("kbzPayRequestIntro")}
                            </ThemedText>

                            <View
                              style={[
                                styles.kbzPrerequisiteBox,
                                { borderColor: colors.icon + "44" },
                              ]}
                            >
                              <ThemedText style={styles.kbzPrerequisiteTitle}>
                                {t("kbzPayBeforeStart")}
                              </ThemedText>
                              {[
                                {
                                  label: t("kbzPayPhoneRequirement"),
                                  ready: phoneVerified,
                                },
                                {
                                  label: t("kbzPayEmailRequirement"),
                                  ready: emailVerified,
                                },
                              ].map((item) => (
                                <View
                                  key={item.label}
                                  style={styles.kbzRequirementRow}
                                >
                                  <MaterialIcons
                                    name={
                                      item.ready
                                        ? "check-circle"
                                        : "radio-button-unchecked"
                                    }
                                    size={18}
                                    color={item.ready ? SUCCESS : colors.icon}
                                  />
                                  <ThemedText style={styles.kbzRequirementText}>
                                    {item.label}
                                  </ThemedText>
                                </View>
                              ))}
                            </View>

                            {kbzRequestCoolingDown ? (
                              <ThemedText style={styles.profileSub}>
                                {tf(
                                  "actionCooldownRemaining",
                                  cooldownHhMm(
                                    adminCooldown.remainingMs(
                                      "kbzPayVerificationRequest",
                                    ),
                                  ),
                                )}
                              </ThemedText>
                            ) : null}
                            <Pressable
                              onPress={handleRequestKbzPay}
                              disabled={
                                loading.kbz ||
                                kbzRequestCoolingDown ||
                                !phoneVerified ||
                                !emailVerified
                              }
                              style={[
                                styles.primaryButton,
                                styles.fullWidthButton,
                                { backgroundColor: colors.tint },
                                (loading.kbz ||
                                  kbzRequestCoolingDown ||
                                  !phoneVerified ||
                                  !emailVerified) && { opacity: 0.5 },
                              ]}
                            >
                              {loading.kbz ? (
                                <FlexMarketLoader
                                  variant="inline"
                                  size="xs"
                                  showText={false}
                                />
                              ) : (
                                <ThemedText style={styles.primaryButtonText}>
                                  {t("requestVerification")}
                                </ThemedText>
                              )}
                            </Pressable>
                          </View>
                        ) : null}

                        {kbzWaitingForInstruction ||
                        kbzWaitingForTransferDetails ? (
                          <View
                            style={[
                              styles.kbzStatusPanel,
                              {
                                backgroundColor: WARNING + "12",
                                borderColor: WARNING + "55",
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.kbzStatusIcon,
                                { backgroundColor: WARNING + "20" },
                              ]}
                            >
                              <MaterialIcons
                                name="schedule"
                                size={24}
                                color={WARNING}
                              />
                            </View>
                            <ThemedText style={styles.kbzStateTitle}>
                              {t("kbzPayWaitingTitle")}
                            </ThemedText>
                            <ThemedText
                              style={[
                                styles.kbzCenteredText,
                                { color: colors.icon },
                              ]}
                            >
                              {kbzWaitingForTransferDetails
                                ? t("kbzPayInstructionDetailsPending")
                                : t("kbzPayWaitInstructionHint")}
                            </ThemedText>
                            <Pressable
                              onPress={handleRefreshKbzPay}
                              disabled={loading.kbzRefresh}
                              style={[
                                styles.kbzSecondaryButton,
                                { borderColor: colors.tint },
                              ]}
                            >
                              {loading.kbzRefresh ? (
                                <FlexMarketLoader
                                  variant="inline"
                                  size="xs"
                                  showText={false}
                                />
                              ) : (
                                <>
                                  <MaterialIcons
                                    name="refresh"
                                    size={18}
                                    color={colors.tint}
                                  />
                                  <ThemedText
                                    style={[
                                      styles.kbzSecondaryButtonText,
                                      { color: colors.tint },
                                    ]}
                                  >
                                    {t("kbzPayCheckStatus")}
                                  </ThemedText>
                                </>
                              )}
                            </Pressable>
                          </View>
                        ) : null}

                        {kbzCanSubmitTransaction ? (
                          <View style={styles.kbzStateContent}>
                            <View
                              style={[
                                styles.kbzImportantBanner,
                                {
                                  backgroundColor: colors.tint + "12",
                                  borderColor: colors.tint + "55",
                                },
                              ]}
                            >
                              <MaterialIcons
                                name="info"
                                size={20}
                                color={colors.tint}
                              />
                              <ThemedText
                                style={[
                                  styles.kbzImportantText,
                                  { color: colors.text },
                                ]}
                              >
                                {t("kbzPayPendingHint")}
                              </ThemedText>
                            </View>

                            <View style={styles.kbzInstructionRow}>
                              <View
                                style={[
                                  styles.kbzInstructionNumber,
                                  { backgroundColor: colors.tint },
                                ]}
                              >
                                <ThemedText style={styles.kbzInstructionNumberText}>
                                  1
                                </ThemedText>
                              </View>
                              <View style={styles.kbzInstructionBody}>
                                <ThemedText style={styles.infoLabel}>
                                  {t("kbzPayAmountLabel")}
                                </ThemedText>
                                <ThemedText
                                  style={[
                                    styles.kbzAmountValue,
                                    { color: colors.tint },
                                  ]}
                                >
                                  {t("kbzPayAmountValue")}
                                </ThemedText>
                              </View>
                            </View>

                            <View style={styles.kbzInstructionRow}>
                              <View
                                style={[
                                  styles.kbzInstructionNumber,
                                  { backgroundColor: colors.tint },
                                ]}
                              >
                                <ThemedText style={styles.kbzInstructionNumberText}>
                                  2
                                </ThemedText>
                              </View>
                              <View style={styles.kbzInstructionBody}>
                                <ThemedText style={styles.infoLabel}>
                                  {t("kbzPayAdminPhoneLabel")}
                                </ThemedText>
                                <View style={styles.kbzCopyRow}>
                                  <ThemedText style={styles.kbzPhoneValue}>
                                    {kbzAdminPhone}
                                  </ThemedText>
                                  <Pressable
                                    onPress={handleCopyKbzPhone}
                                    style={[
                                      styles.kbzCopyButton,
                                      { backgroundColor: colors.tint + "18" },
                                    ]}
                                  >
                                    <MaterialIcons
                                      name="content-copy"
                                      size={16}
                                      color={colors.tint}
                                    />
                                    <ThemedText
                                      style={[
                                        styles.kbzCopyText,
                                        { color: colors.tint },
                                      ]}
                                    >
                                      {t("actionCopy")}
                                    </ThemedText>
                                  </Pressable>
                                </View>
                              </View>
                            </View>

                            {kbzAdminNote ? (
                              <View
                                style={[
                                  styles.kbzAdminNote,
                                  {
                                    backgroundColor: colors.icon + "0D",
                                    borderColor: colors.icon + "33",
                                  },
                                ]}
                              >
                                <MaterialIcons
                                  name="notes"
                                  size={18}
                                  color={colors.icon}
                                />
                                <View style={styles.kbzInstructionBody}>
                                  <ThemedText style={styles.infoLabel}>
                                    {t("kbzPayAdminNoteLabel")}
                                  </ThemedText>
                                  <ThemedText style={styles.infoValue}>
                                    {kbzAdminNote}
                                  </ThemedText>
                                </View>
                              </View>
                            ) : null}

                            <View style={styles.kbzInstructionRow}>
                              <View
                                style={[
                                  styles.kbzInstructionNumber,
                                  { backgroundColor: colors.tint },
                                ]}
                              >
                                <ThemedText style={styles.kbzInstructionNumberText}>
                                  3
                                </ThemedText>
                              </View>
                              <View style={styles.kbzInstructionBody}>
                                <ThemedText style={styles.label}>
                                  {t("kbzPayTxnIdLabel")}
                                </ThemedText>
                                <ThemedText
                                  style={[
                                    styles.kbzInputHint,
                                    { color: colors.icon },
                                  ]}
                                >
                                  {t("kbzPayTxnIdHelp")}
                                </ThemedText>
                                <TextInput
                                  style={[
                                    styles.input,
                                    inputStyle,
                                    kbzTransactionError
                                      ? { borderColor: DANGER }
                                      : null,
                                  ]}
                                  value={kbzTransactionId}
                                  onChangeText={(value) => {
                                    setKbzTransactionId(value);
                                    if (kbzTransactionError)
                                      setKbzTransactionError("");
                                  }}
                                  placeholder={t("kbzPayTxnIdPlaceholder")}
                                  placeholderTextColor={colors.icon}
                                  autoCapitalize="characters"
                                  autoCorrect={false}
                                  editable={
                                    !loading.kbzSubmit && !kbzSubmitCoolingDown
                                  }
                                />
                                {kbzTransactionError ? (
                                  <ThemedText style={styles.error}>
                                    {kbzTransactionError}
                                  </ThemedText>
                                ) : null}
                              </View>
                            </View>

                            {kbzSubmitCoolingDown ? (
                              <ThemedText style={styles.profileSub}>
                                {tf(
                                  "actionCooldownRemaining",
                                  cooldownHhMm(
                                    adminCooldown.remainingMs(
                                      "kbzPaySubmitTransaction",
                                    ),
                                  ),
                                )}
                              </ThemedText>
                            ) : null}
                            <Pressable
                              onPress={handleSubmitKbzTransaction}
                              disabled={
                                loading.kbzSubmit ||
                                kbzSubmitCoolingDown ||
                                !kbzTransactionId.trim()
                              }
                              style={[
                                styles.primaryButton,
                                styles.fullWidthButton,
                                { backgroundColor: colors.tint },
                                (loading.kbzSubmit ||
                                  kbzSubmitCoolingDown ||
                                  !kbzTransactionId.trim()) && {
                                  opacity: 0.5,
                                },
                              ]}
                            >
                              {loading.kbzSubmit ? (
                                <FlexMarketLoader
                                  variant="inline"
                                  size="xs"
                                  showText={false}
                                />
                              ) : (
                                <ThemedText style={styles.primaryButtonText}>
                                  {t("submitTransaction")}
                                </ThemedText>
                              )}
                            </Pressable>
                          </View>
                        ) : null}

                        {kbzWaitingForAdminVerification ? (
                          <View
                            style={[
                              styles.kbzStatusPanel,
                              {
                                backgroundColor: colors.tint + "0D",
                                borderColor: colors.tint + "44",
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.kbzStatusIcon,
                                { backgroundColor: colors.tint + "18" },
                              ]}
                            >
                              <MaterialIcons
                                name="fact-check"
                                size={24}
                                color={colors.tint}
                              />
                            </View>
                            <ThemedText style={styles.kbzStateTitle}>
                              {t("kbzPayReviewTitle")}
                            </ThemedText>
                            <ThemedText
                              style={[
                                styles.kbzCenteredText,
                                { color: colors.icon },
                              ]}
                            >
                              {t("kbzPaySubmittedHint")}
                            </ThemedText>
                            {kbzSubmittedTransaction ? (
                              <View
                                style={[
                                  styles.kbzSubmittedId,
                                  { borderColor: colors.icon + "44" },
                                ]}
                              >
                                <ThemedText style={styles.infoLabel}>
                                  {t("kbzPaySubmittedTxnLabel")}
                                </ThemedText>
                                <ThemedText style={styles.infoValue}>
                                  {kbzSubmittedTransaction}
                                </ThemedText>
                              </View>
                            ) : null}
                            <Pressable
                              onPress={handleRefreshKbzPay}
                              disabled={loading.kbzRefresh}
                              style={[
                                styles.kbzSecondaryButton,
                                { borderColor: colors.tint },
                              ]}
                            >
                              {loading.kbzRefresh ? (
                                <FlexMarketLoader
                                  variant="inline"
                                  size="xs"
                                  showText={false}
                                />
                              ) : (
                                <>
                                  <MaterialIcons
                                    name="refresh"
                                    size={18}
                                    color={colors.tint}
                                  />
                                  <ThemedText
                                    style={[
                                      styles.kbzSecondaryButtonText,
                                      { color: colors.tint },
                                    ]}
                                  >
                                    {t("kbzPayCheckStatus")}
                                  </ThemedText>
                                </>
                              )}
                            </Pressable>
                          </View>
                        ) : null}

                        {user?.isKbzPayVerified ? (
                          <View
                            style={[
                              styles.kbzStatusPanel,
                              {
                                backgroundColor: SUCCESS + "12",
                                borderColor: SUCCESS + "55",
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.kbzStatusIcon,
                                { backgroundColor: SUCCESS + "20" },
                              ]}
                            >
                              <MaterialIcons
                                name="verified"
                                size={26}
                                color={SUCCESS}
                              />
                            </View>
                            <ThemedText style={styles.kbzStateTitle}>
                              {t("kbzPayVerifiedTitle")}
                            </ThemedText>
                            <ThemedText
                              style={[
                                styles.kbzCenteredText,
                                { color: colors.icon },
                              ]}
                            >
                              {t("kbzPayVerifiedBody")}
                            </ThemedText>
                          </View>
                        ) : null}
                      </View>
                    </ProfileFadeIn>
                  ) : null}
                </ProfileAnimatedCard>
              </>
            ) : (
              <ProfileAnimatedCard scheme={scheme} borderColor={colors.icon}>
                <View style={styles.cardHeader}>
                  <ThemedText style={styles.cardTitle}>
                    Change password
                  </ThemedText>
                </View>
                <PasswordInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Current password"
                  editable={!loading.changePassword}
                  inputStyle={[styles.input, inputStyle]}
                />
                <PasswordInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New password"
                  editable={!loading.changePassword}
                  inputStyle={[styles.input, inputStyle]}
                />
                <PasswordStrengthMeter password={newPassword} />
                <PasswordInput
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  placeholder="Confirm new password"
                  editable={!loading.changePassword}
                  inputStyle={[styles.input, inputStyle]}
                />
                <Pressable
                  onPress={handleChangePassword}
                  disabled={loading.changePassword}
                  style={[
                    styles.primaryButton,
                    styles.fullWidthButton,
                    { backgroundColor: colors.tint },
                    loading.changePassword && { opacity: 0.6 },
                  ]}
                >
                  {loading.changePassword ? (
                                <FlexMarketLoader variant="inline" size="xs" showText={false} />
                  ) : (
                    <ThemedText style={styles.primaryButtonText}>
                      Update Password
                    </ThemedText>
                  )}
                </Pressable>
              </ProfileAnimatedCard>
            )}
          </ProfileTabPanel>

          <ProfileAnimatedSection
            delayMs={UI_SECTION_STAGGER_MS * 3}
            reduceMotion={reduceMotion}
          >
            <ProfilePressableScale
              onPress={() => setBlockedUsersVisible(true)}
              style={[
                styles.signOutButton,
                {
                  borderColor: colors.icon + "44",
                  backgroundColor: colors.background,
                  marginBottom: 10,
                },
              ]}
            >
              <View style={styles.blockedUsersRow}>
                <MaterialIcons name="block" size={18} color={colors.text} />
                <ThemedText
                  style={[styles.signOutText, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {t("userBlocksOpenButton")}
                </ThemedText>
              </View>
            </ProfilePressableScale>
            <ProfilePressableScale
              onPress={logout}
              style={[
                styles.signOutButton,
                {
                  borderColor: colors.tint,
                  backgroundColor: colors.background,
                  marginBottom: 10,
                },
              ]}
            >
              <ThemedText style={[styles.signOutText, { color: colors.tint }]}>
                {t("signOutButton")}
              </ThemedText>
            </ProfilePressableScale>
            <ProfilePressableScale
              onPress={() => setDeleteAccountVisible(true)}
              style={[
                styles.signOutButton,
                {
                  borderColor: DANGER + "88",
                  backgroundColor: colors.background,
                },
              ]}
            >
              <View style={styles.blockedUsersRow}>
                <MaterialIcons name="person-remove" size={18} color={DANGER} />
                <ThemedText
                  style={[styles.signOutText, { color: DANGER }]}
                  numberOfLines={2}
                >
                  {t("deleteAccountOpenButton")}
                </ThemedText>
              </View>
            </ProfilePressableScale>
          </ProfileAnimatedSection>
      </KeyboardAwareFormScroll>
      <MyBlockedUsersSection
        visible={blockedUsersVisible}
        onClose={() => setBlockedUsersVisible(false)}
      />
      <DeleteAccountModal
        visible={deleteAccountVisible}
        onClose={() => setDeleteAccountVisible(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    gap: 16,
  },
  title: { marginBottom: 4 },
  tabs: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    gap: 6,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabText: {
    fontWeight: "800",
    fontSize: 11,
    lineHeight: 14,
    textAlign: "center",
    paddingHorizontal: 2,
  },
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
  avatarPressable: {
    position: "relative",
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
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
  label: { fontWeight: "600", fontSize: 14 },
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
  infoBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  infoLabel: { fontSize: 12, opacity: 0.72 },
  infoValue: { fontSize: 14, fontWeight: "600" },
  kbzHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  kbzFlow: {
    gap: 16,
  },
  kbzStepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 2,
  },
  kbzStep: {
    flex: 1,
    alignItems: "center",
    gap: 5,
    position: "relative",
  },
  kbzStepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  kbzStepNumber: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
    includeFontPadding: false,
  },
  kbzStepLabel: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "600",
    textAlign: "center",
    minHeight: 24,
    paddingHorizontal: 1,
    width: "100%",
  },
  kbzStepConnector: {
    position: "absolute",
    top: 13,
    left: "65%",
    width: "70%",
    height: 2,
    zIndex: 1,
  },
  kbzStateContent: {
    gap: 12,
  },
  kbzStateTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
  },
  kbzPrerequisiteBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 9,
  },
  kbzPrerequisiteTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  kbzRequirementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  kbzRequirementText: {
    flex: 1,
    fontSize: 13,
  },
  kbzStatusPanel: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 9,
  },
  kbzStatusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  kbzCenteredText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  kbzSecondaryButton: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  kbzSecondaryButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  kbzImportantBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  kbzImportantText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  kbzInstructionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  kbzInstructionNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  kbzInstructionNumberText: {
    color: "#fff",
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "800",
    includeFontPadding: false,
  },
  kbzInstructionBody: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  kbzAmountValue: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
  },
  kbzCopyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  kbzPhoneValue: {
    flex: 1,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "800",
  },
  kbzCopyButton: {
    minHeight: 34,
    borderRadius: 9,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  kbzCopyText: {
    fontSize: 12,
    fontWeight: "800",
  },
  kbzAdminNote: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  kbzInputHint: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 2,
  },
  kbzSubmittedId: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 4,
    marginVertical: 2,
  },
  divider: {
    height: 1,
    width: "100%",
    backgroundColor: "rgba(148, 163, 184, 0.32)",
    marginVertical: 2,
  },
  facebookStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  error: { color: DANGER, fontSize: 12 },
  rewardCard: {
    gap: 14,
  },
  rewardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rewardIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  rewardHeaderText: { flex: 1, gap: 2 },
  rankPill: {
    minHeight: 30,
    maxWidth: 122,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rankPillText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  rewardLoading: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  pointsPanel: {
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  sectionLabel: { fontSize: 13, fontWeight: "700" },
  pointsValue: {
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 36,
  },
  rewardHintRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  rewardHintText: { flex: 1, fontSize: 12, opacity: 0.78, lineHeight: 17 },
  rewardMetaGrid: {
    flexDirection: "row",
    gap: 10,
  },
  rewardMetaItem: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  rankProgressWrap: { gap: 8 },
  rewardSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  collapsibleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  verificationHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    flexWrap: "wrap",
  },
  badgeInline: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.9,
  },
  verificationOverviewCard: {
    gap: 14,
  },
  verificationOverviewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  verificationOverviewIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  verificationOverviewCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  verificationOverviewTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 8,
  },
  verificationOverviewTitle: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 120,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  verificationOverviewHint: {
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.72,
  },
  verificationProgressChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexShrink: 0,
    maxWidth: "100%",
  },
  verificationProgressChipText: {
    fontSize: 11,
    fontWeight: "800",
  },
  verificationProgressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  verificationProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  verificationOverviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  verificationOverviewTile: {
    flexBasis: "47%",
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: "100%",
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    gap: 8,
    overflow: "hidden",
  },
  verificationOverviewTileTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  verificationOverviewTileIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  verificationOverviewTileStep: {
    fontSize: 12,
    fontWeight: "800",
  },
  verificationOverviewTileTitle: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    minHeight: 34,
  },
  verificationNextRow: {
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  verificationNextLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  verificationNextButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "100%",
  },
  verificationNextButtonText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  verificationItemCard: {
    gap: 14,
  },
  verificationItemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  verificationItemHeaderLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  verificationHeaderCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  verificationHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
  },
  verificationStepIndex: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: 1,
  },
  verificationHeaderTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  verificationStatusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: "100%",
  },
  verificationStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  verificationStatusPillText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "800",
  },
  verificationChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 4,
  },
  withdrawalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  rankProgressValue: { fontSize: 13, fontWeight: "800" },
  rankProgressTrack: {
    height: 9,
    borderRadius: 999,
    overflow: "hidden",
  },
  rankProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  withdrawalForm: { gap: 8 },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  rewardSection: {
    gap: 10,
  },
  statGrid: {
    flexDirection: "row",
    gap: 8,
  },
  statTile: {
    flex: 1,
    minHeight: 112,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  statValue: { fontSize: 18, fontWeight: "900" },
  statLabel: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: "center",
    opacity: 0.78,
  },
  rankList: { gap: 7 },
  rankLoading: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  rankRow: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rankDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  rankName: { flex: 1, fontSize: 13, fontWeight: "700" },
  rankThreshold: { fontSize: 12, opacity: 0.75 },
  withdrawalList: { gap: 8 },
  withdrawalRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 5,
  },
  withdrawalTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  withdrawalAmount: { fontSize: 14, fontWeight: "800" },
  withdrawalStatus: { fontSize: 12, fontWeight: "900" },
  linkButton: { alignItems: "center", paddingVertical: 6 },
  inlineLinkButton: { alignSelf: "flex-start", paddingVertical: 4 },
  signOutButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    marginTop: 4,
    alignSelf: "stretch",
  },
  blockedUsersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    maxWidth: "100%",
  },
  signOutText: {
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "center",
  },
});
