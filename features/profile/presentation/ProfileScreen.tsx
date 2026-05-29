import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image, type ImageSource } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { useAppSafeAreaInsets } from "@/components/app-safe-area";
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
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAdminNotifyCooldown } from "@/presentation/hooks/useAdminNotifyCooldown";
import {
  useChangePassword,
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

function cooldownHhMm(ms: number): { hours: string; minutes: string } {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  return { hours: String(hours), minutes: String(minutes) };
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
  const insets = useAppSafeAreaInsets();
  const pointsQuery = useProfilePoints();
  const rankConfigsQuery = useRankConfigs();
  const statsQuery = useProfileTransactionStats();
  const withdrawalsQuery = useWithdrawalRequests();
  const requestWithdrawal = useRequestWithdrawal();
  const changePassword = useChangePassword();
  const uploadAvatar = useUploadAvatar();

  const [activeTab, setActiveTab] = useState<
    "rewards" | "verifications" | "password"
  >("rewards");
  const [showRankSystem, setShowRankSystem] = useState(false);
  const [showWithdrawalHistory, setShowWithdrawalHistory] = useState(true);
  const [showPhoneVerification, setShowPhoneVerification] = useState(true);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [showKbzPayVerification, setShowKbzPayVerification] = useState(false);

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
  const [kbzTransactionId, setKbzTransactionId] = useState("");
  const [kbzTransactionError, setKbzTransactionError] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalError, setWithdrawalError] = useState("");
  const [kbzMessage, setKbzMessage] = useState(
    "Please verify my KBZPay quickly. I already transferred.",
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

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
        Alert.alert(t("errorTitle"), "Media library permission is required.");
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
    return typeof serverMessage === "string" ? serverMessage : undefined;
  };

  useEffect(() => {
    setPhone(user?.phone?.trim() || "+959123456789");
    setEmail(user?.email?.trim() || "member@flexusedmarket.app");
    setPhoneVerified(Boolean(user?.isPhoneVerified));
    setEmailVerified(Boolean(user?.isEmailVerified));
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
    if (!phoneVerified || !emailVerified) {
      Alert.alert(t("errorTitle"), t("kbzPayNeedsVerificationFirst"));
      return;
    }
    setBusy("kbz", true);
    try {
      await requestKbzPayVerification(
        kbzMessage.trim() ||
          "Please verify my KBZPay quickly. I already transferred.",
      );
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
    if (!kbzHasAdminInstruction) {
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
        await refreshProfile();
        Alert.alert(t("errorTitle"), t("kbzPayWaitInstructionHint"));
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

  const phoneStatusText = phoneVerified
    ? t("profileStatusVerified")
    : t("profileStatusNotVerified");
  const emailStatusText = emailVerified
    ? t("profileStatusVerified")
    : t("profileStatusNotVerified");
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
  const kbzHasAdminInstruction =
    kbzAdminPhone.length > 0 || kbzAdminInstructionSentAt.length > 0;
  const kbzHasSubmittedTransaction =
    kbzSubmittedTransaction.length > 0 || kbzStatus === "IN_REVIEW";
  const kbzVerificationStarted = Boolean(
    kbzRequestedAt ||
    kbzHasAdminInstruction ||
    kbzHasSubmittedTransaction ||
    (kbzStatus && kbzStatus !== "PENDING"),
  );
  const kbzCanRequest =
    !user?.isKbzPayVerified && (!kbzIsPending || !kbzVerificationStarted);
  const kbzWaitingForInstruction =
    kbzIsPending &&
    !user?.isKbzPayVerified &&
    kbzVerificationStarted &&
    !kbzHasAdminInstruction &&
    !kbzHasSubmittedTransaction;
  const kbzCanSubmitTransaction =
    kbzIsPending &&
    !user?.isKbzPayVerified &&
    kbzHasAdminInstruction &&
    !kbzHasSubmittedTransaction;
  const kbzWaitingForAdminVerification =
    kbzIsPending && !user?.isKbzPayVerified && kbzHasSubmittedTransaction;
  const kbzStatusText = user?.isKbzPayVerified
    ? t("profileStatusVerified")
    : kbzWaitingForAdminVerification
      ? t("kbzPayStatusTransactionSubmitted")
      : kbzCanSubmitTransaction
        ? t("kbzPayStatusInstructionReady")
        : kbzWaitingForInstruction
          ? t("kbzPayStatusPendingInstruction")
          : kbzIsPending && kbzVerificationStarted
            ? t("profileStatusRequested")
            : t("profileStatusNotVerified");
  const kbzStatusColor = user?.isKbzPayVerified
    ? SUCCESS
    : kbzIsPending && kbzVerificationStarted
      ? WARNING
      : colors.icon;
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
    withdrawalsQuery.isFetching;

  return (
    <ThemedView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: Math.max(insets.top, 24),
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
              }}
              tintColor={colors.tint}
            />
          }
          keyboardShouldPersistTaps="handled"
        >
          <ProfileAnimatedSection delayMs={0} reduceMotion={reduceMotion}>
            <ThemedText type="title" style={styles.title}>
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
                    <ActivityIndicator color={colors.tint} />
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
                          <ActivityIndicator color="#fff" />
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
                                <ActivityIndicator color={colors.tint} />
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
                            <ActivityIndicator
                              color={colors.tint}
                              size="small"
                            />
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
                <ProfileAnimatedCard scheme={scheme} borderColor={colors.icon}>
                  <View style={styles.cardHeader}>
                    <Pressable
                      onPress={() => setShowPhoneVerification((prev) => !prev)}
                      style={styles.collapsibleHeader}
                    >
                      <View style={styles.verificationHeaderLeft}>
                        <ThemedText style={styles.cardTitle}>
                          {t("phoneVerification")}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.badgeInline,
                            { color: phoneVerified ? SUCCESS : colors.icon },
                          ]}
                        >
                          {phoneStatusText}
                        </ThemedText>
                      </View>
                      <MaterialIcons
                        name={
                          showPhoneVerification ? "expand-less" : "expand-more"
                        }
                        color={colors.icon}
                        size={22}
                      />
                    </Pressable>
                  </View>
                  {showPhoneVerification ? (
                    <ProfileFadeIn reduceMotion={reduceMotion}>
                      <>
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
                                onChangeText={(v) =>
                                  setOtpCode(v.replace(/\D/g, ""))
                                }
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
                                  (loading.verifyOtp || phoneVerified) && {
                                    opacity: 0.6,
                                  },
                                ]}
                              >
                                {loading.verifyOtp ? (
                                  <ActivityIndicator
                                    color="#fff"
                                    size="small"
                                  />
                                ) : (
                                  <ThemedText style={styles.primaryButtonText}>
                                    {t("verify")}
                                  </ThemedText>
                                )}
                              </Pressable>
                            </View>
                            <Pressable
                              onPress={handleSendOtp}
                              disabled={loading.sendOtp || phoneVerified}
                              style={styles.linkButton}
                            >
                              {loading.sendOtp ? (
                                <ActivityIndicator
                                  color={colors.tint}
                                  size="small"
                                />
                              ) : (
                                <ThemedText
                                  style={{
                                    color: colors.tint,
                                    fontWeight: "600",
                                  }}
                                >
                                  {t("resend")}
                                </ThemedText>
                              )}
                            </Pressable>
                          </>
                        ) : (
                          <ThemedText style={styles.profileSub}>
                            {t("profileVerifiedHint")}
                          </ThemedText>
                        )}
                      </>
                    </ProfileFadeIn>
                  ) : null}
                </ProfileAnimatedCard>

                <ProfileAnimatedCard scheme={scheme} borderColor={colors.icon}>
                  <View style={styles.cardHeader}>
                    <Pressable
                      onPress={() => setShowEmailVerification((prev) => !prev)}
                      style={styles.collapsibleHeader}
                    >
                      <View style={styles.verificationHeaderLeft}>
                        <ThemedText style={styles.cardTitle}>
                          {t("emailVerification")}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.badgeInline,
                            { color: emailVerified ? SUCCESS : colors.icon },
                          ]}
                        >
                          {emailStatusText}
                        </ThemedText>
                      </View>
                      <MaterialIcons
                        name={
                          showEmailVerification ? "expand-less" : "expand-more"
                        }
                        color={colors.icon}
                        size={22}
                      />
                    </Pressable>
                  </View>
                  {showEmailVerification ? (
                    <ProfileFadeIn reduceMotion={reduceMotion}>
                      <>
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
                              disabled={
                                loading.sendEmail ||
                                emailVerified ||
                                !email.trim()
                              }
                              style={[
                                styles.outlineButton,
                                { borderColor: colors.tint },
                                (loading.sendEmail ||
                                  emailVerified ||
                                  !email.trim()) && { opacity: 0.5 },
                              ]}
                            >
                              {loading.sendEmail ? (
                                <ActivityIndicator color={colors.tint} />
                              ) : (
                                <ThemedText
                                  style={[
                                    styles.outlineButtonText,
                                    { color: colors.tint },
                                  ]}
                                >
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
                                  !emailToken.trim()) && {
                                  opacity: 0.6,
                                },
                              ]}
                            >
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
                          <ThemedText style={styles.profileSub}>
                            {t("profileVerifiedHint")}
                          </ThemedText>
                        )}
                      </>
                    </ProfileFadeIn>
                  ) : null}
                </ProfileAnimatedCard>

                <ProfileAnimatedCard scheme={scheme} borderColor={colors.icon}>
                  <View style={styles.cardHeader}>
                    <Pressable
                      onPress={() => setShowKbzPayVerification((prev) => !prev)}
                      style={styles.collapsibleHeader}
                    >
                      <View style={styles.verificationHeaderLeft}>
                        <ThemedText style={styles.cardTitle}>
                          {t("kbzPayVerification")}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.badgeInline,
                            { color: kbzStatusColor },
                          ]}
                        >
                          {kbzStatusText}
                        </ThemedText>
                      </View>
                      <MaterialIcons
                        name={
                          showKbzPayVerification ? "expand-less" : "expand-more"
                        }
                        color={colors.icon}
                        size={22}
                      />
                    </Pressable>
                  </View>
                  {showKbzPayVerification ? (
                    <ProfileFadeIn reduceMotion={reduceMotion}>
                      <>
                        {kbzCanRequest ? (
                          <>
                            <ThemedText style={styles.profileSub}>
                              {t("kbzPayRequestIntro")}
                            </ThemedText>
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
                              editable={!loading.kbz && !kbzRequestCoolingDown}
                            />
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
                              disabled={loading.kbz || kbzRequestCoolingDown}
                              style={[
                                styles.primaryButton,
                                styles.fullWidthButton,
                                { backgroundColor: colors.tint },
                                (loading.kbz || kbzRequestCoolingDown) && {
                                  opacity: 0.6,
                                },
                              ]}
                            >
                              {loading.kbz ? (
                                <ActivityIndicator color="#fff" />
                              ) : (
                                <ThemedText style={styles.primaryButtonText}>
                                  {t("requestVerification")}
                                </ThemedText>
                              )}
                            </Pressable>
                          </>
                        ) : null}

                        {kbzWaitingForInstruction ? (
                          <ThemedText style={styles.profileSub}>
                            {t("kbzPayWaitInstructionHint")}
                          </ThemedText>
                        ) : null}

                        {kbzCanSubmitTransaction ? (
                          <>
                            <ThemedText style={styles.profileSub}>
                              {t("kbzPayPendingHint")}
                            </ThemedText>
                            <View
                              style={[
                                styles.infoBox,
                                { borderColor: colors.icon },
                              ]}
                            >
                              <ThemedText style={styles.infoLabel}>
                                {t("kbzPayAmountLabel")}
                              </ThemedText>
                              <ThemedText style={styles.infoValue}>
                                {t("kbzPayAmountValue")}
                              </ThemedText>
                            </View>
                            <View
                              style={[
                                styles.infoBox,
                                { borderColor: colors.icon },
                              ]}
                            >
                              <ThemedText style={styles.infoLabel}>
                                {t("kbzPayAdminPhoneLabel")}
                              </ThemedText>
                              <ThemedText style={styles.infoValue}>
                                {kbzAdminPhone}
                              </ThemedText>
                            </View>
                            {kbzAdminNote ? (
                              <View
                                style={[
                                  styles.infoBox,
                                  { borderColor: colors.icon },
                                ]}
                              >
                                <ThemedText style={styles.infoLabel}>
                                  {t("kbzPayAdminNoteLabel")}
                                </ThemedText>
                                <ThemedText style={styles.infoValue}>
                                  {kbzAdminNote}
                                </ThemedText>
                              </View>
                            ) : null}
                            <ThemedText style={styles.label}>
                              {t("kbzPayTxnIdLabel")}
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
                                  opacity: 0.6,
                                },
                              ]}
                            >
                              {loading.kbzSubmit ? (
                                <ActivityIndicator color="#fff" />
                              ) : (
                                <ThemedText style={styles.primaryButtonText}>
                                  {t("submitTransaction")}
                                </ThemedText>
                              )}
                            </Pressable>
                          </>
                        ) : null}

                        {kbzWaitingForAdminVerification ? (
                          <>
                            <ThemedText style={styles.profileSub}>
                              {t("kbzPaySubmittedHint")}
                            </ThemedText>
                            {kbzSubmittedTransaction ? (
                              <View
                                style={[
                                  styles.infoBox,
                                  { borderColor: colors.icon },
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
                          </>
                        ) : null}

                        {user?.isKbzPayVerified ? (
                          <ThemedText style={styles.profileSub}>
                            {t("profileVerifiedHint")}
                          </ThemedText>
                        ) : null}
                      </>
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
                    <ActivityIndicator color="#fff" />
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
              onPress={logout}
              style={[
                styles.signOutButton,
                {
                  borderColor: colors.tint,
                  backgroundColor: colors.background,
                },
              ]}
            >
              <ThemedText style={[styles.signOutText, { color: colors.tint }]}>
                {t("signOutButton")}
              </ThemedText>
            </ProfilePressableScale>
          </ProfileAnimatedSection>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    gap: 16,
  },
  title: { fontSize: 24, marginBottom: 4 },
  tabs: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    gap: 6,
  },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabText: {
    fontWeight: "800",
    fontSize: 13,
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
  signOutButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  signOutText: { fontSize: 14, fontWeight: "700" },
});
