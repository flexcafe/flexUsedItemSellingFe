import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { FlexMarketLoader } from "@/components/flex-market-loader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import {
  type ContentReportReason,
  type ContentReportTargetType,
} from "@/core/domain/entities/ContentReport";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSubmitContentReport } from "@/presentation/hooks/useModerationReports";
import { uiCardSurface } from "@/presentation/lib/uiAnimations";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { useLocale } from "@/presentation/providers/LocaleProvider";

export type ContentReportTarget = {
  targetType: ContentReportTargetType;
  targetId: string;
};

type Props = {
  visible: boolean;
  target: ContentReportTarget | null;
  onClose: () => void;
};

type ReasonMeta = {
  reason: ContentReportReason;
  icon: keyof typeof MaterialIcons.glyphMap;
  labelKey:
    | "contentReportReasonObjectionable"
    | "contentReportReasonHarassment"
    | "contentReportReasonHateSpeech"
    | "contentReportReasonSexual"
    | "contentReportReasonSpam"
    | "contentReportReasonViolence"
    | "contentReportReasonScam"
    | "contentReportReasonOther";
};

const REASON_OPTIONS: ReasonMeta[] = [
  {
    reason: "OBJECTIONABLE_CONTENT",
    icon: "report",
    labelKey: "contentReportReasonObjectionable",
  },
  {
    reason: "HARASSMENT",
    icon: "person-off",
    labelKey: "contentReportReasonHarassment",
  },
  {
    reason: "HATE_SPEECH",
    icon: "record-voice-over",
    labelKey: "contentReportReasonHateSpeech",
  },
  {
    reason: "SEXUAL_CONTENT",
    icon: "visibility-off",
    labelKey: "contentReportReasonSexual",
  },
  {
    reason: "SPAM",
    icon: "markunread-mailbox",
    labelKey: "contentReportReasonSpam",
  },
  {
    reason: "VIOLENCE",
    icon: "warning",
    labelKey: "contentReportReasonViolence",
  },
  {
    reason: "SCAM",
    icon: "gavel",
    labelKey: "contentReportReasonScam",
  },
  {
    reason: "OTHER",
    icon: "more-horiz",
    labelKey: "contentReportReasonOther",
  },
];

function targetLabelKey(
  targetType: ContentReportTargetType,
):
  | "contentReportTargetListing"
  | "contentReportTargetChatMessage"
  | "contentReportTargetReview"
  | "contentReportTargetProfile" {
  switch (targetType) {
    case "LISTING":
      return "contentReportTargetListing";
    case "CHAT_MESSAGE":
      return "contentReportTargetChatMessage";
    case "REVIEW":
      return "contentReportTargetReview";
    case "USER_PROFILE":
    default:
      return "contentReportTargetProfile";
  }
}

function targetIcon(
  targetType: ContentReportTargetType,
): keyof typeof MaterialIcons.glyphMap {
  switch (targetType) {
    case "LISTING":
      return "inventory-2";
    case "CHAT_MESSAGE":
      return "chat-bubble-outline";
    case "REVIEW":
      return "rate-review";
    case "USER_PROFILE":
    default:
      return "person-outline";
  }
}

function StepBadge({
  label,
  backgroundColor,
  textColor = "#fff",
}: {
  label: string;
  backgroundColor: string;
  textColor?: string;
}) {
  return (
    <View style={[styles.stepBadge, { backgroundColor }]}>
      <Text
        allowFontScaling={false}
        style={[styles.stepBadgeText, { color: textColor }]}
      >
        {label}
      </Text>
    </View>
  );
}

function readApiErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const response = (error as { response?: { data?: unknown; status?: number } })
    .response;
  const data = response?.data;
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return "";
}

export function ContentReportModal({ visible, target, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const { isAuthenticated } = useAuth();
  const submitReport = useSubmitContentReport();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];
  const surface = uiCardSurface(scheme);
  const fieldSurface = scheme === "dark" ? "#14171C" : "#F8FAFC";

  const [reason, setReason] = useState<ContentReportReason>(
    "OBJECTIONABLE_CONTENT",
  );
  const [details, setDetails] = useState("");

  useEffect(() => {
    if (!visible) return;
    setReason("OBJECTIONABLE_CONTENT");
    setDetails("");
  }, [visible, target?.targetId, target?.targetType]);

  const canSubmit = useMemo(
    () => Boolean(target?.targetId?.trim()) && isAuthenticated,
    [isAuthenticated, target?.targetId],
  );

  const selectedReason = useMemo(
    () => REASON_OPTIONS.find((item) => item.reason === reason) ?? REASON_OPTIONS[0],
    [reason],
  );

  const selectReason = (next: ContentReportReason) => {
    setReason(next);
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync();
    }
  };

  const onSubmit = async () => {
    if (!target?.targetId?.trim() || submitReport.isPending) return;
    if (!isAuthenticated) {
      Alert.alert(
        t("contentReportLoginRequiredTitle"),
        t("contentReportLoginRequiredBody"),
      );
      return;
    }
    try {
      await submitReport.mutateAsync({
        targetType: target.targetType,
        targetId: target.targetId.trim(),
        reason,
        details: details.trim() || undefined,
      });
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onClose();
      Toast.show({
        type: "notification",
        text1: t("contentReportSuccessTitle"),
        text2: t("contentReportSuccessBody"),
      });
    } catch (error) {
      const apiMessage = readApiErrorMessage(error);
      Alert.alert(
        t("errorTitle"),
        apiMessage || t("contentReportSubmitFailed"),
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <ThemedView
        style={[styles.screen, { paddingTop: Math.max(insets.top, 12) }]}
      >
        <View style={styles.header}>
          <View
            style={[styles.headerIconWrap, { backgroundColor: colors.tint + "18" }]}
          >
            <MaterialIcons name="flag" size={22} color={colors.tint} />
          </View>
          <View style={styles.headerCopy}>
            <ThemedText type="defaultSemiBold" style={styles.title}>
              {t("contentReportTitle")}
            </ThemedText>
            {target ? (
              <View
                style={[
                  styles.targetPill,
                  {
                    backgroundColor: colors.tint + "12",
                    borderColor: colors.tint + "33",
                  },
                ]}
              >
                <MaterialIcons
                  name={targetIcon(target.targetType)}
                  size={14}
                  color={colors.tint}
                />
                <ThemedText
                  style={[styles.targetPillText, { color: colors.tint }]}
                  numberOfLines={2}
                >
                  {t(targetLabelKey(target.targetType))}
                </ThemedText>
              </View>
            ) : null}
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={[styles.closeBtn, { backgroundColor: colors.icon + "18" }]}
            accessibilityRole="button"
            accessibilityLabel={t("contentReportCancel")}
          >
            <MaterialIcons name="close" size={20} color={colors.icon} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stepRow}>
            <StepBadge label="1" backgroundColor={colors.tint} />
            <View style={styles.stepCopy}>
              <ThemedText style={styles.sectionTitle}>
                {t("contentReportReasonLabel")}
              </ThemedText>
              <ThemedText style={[styles.sectionHint, { color: colors.icon }]}>
                {t("contentReportReasonHint")}
              </ThemedText>
            </View>
          </View>

          <View style={styles.reasonGrid}>
            {REASON_OPTIONS.map((item) => {
              const selected = item.reason === reason;
              return (
                <Pressable
                  key={item.reason}
                  onPress={() => selectReason(item.reason)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    styles.reasonTile,
                    {
                      borderColor: selected ? colors.tint : colors.icon + "22",
                      backgroundColor: selected ? colors.tint + "12" : surface,
                      opacity: pressed ? 0.88 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                >
                  {selected ? (
                    <View
                      style={[
                        styles.reasonCheck,
                        { backgroundColor: colors.tint },
                      ]}
                    >
                      <MaterialIcons name="check" size={12} color="#fff" />
                    </View>
                  ) : null}
                  <View
                    style={[
                      styles.reasonIconWrap,
                      {
                        backgroundColor: selected
                          ? colors.tint + "22"
                          : fieldSurface,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={item.icon}
                      size={22}
                      color={selected ? colors.tint : colors.icon}
                    />
                  </View>
                  <ThemedText
                    style={[
                      styles.reasonLabel,
                      { color: selected ? colors.tint : colors.text },
                    ]}
                    numberOfLines={2}
                  >
                    {t(item.labelKey)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <View
            style={[
              styles.selectedBanner,
              {
                backgroundColor: colors.tint + "12",
                borderColor: colors.tint + "33",
              },
            ]}
          >
            <MaterialIcons name={selectedReason.icon} size={18} color={colors.tint} />
            <ThemedText style={[styles.selectedBannerText, { color: colors.tint }]}>
              {t("contentReportSelectedPrefix")} {t(selectedReason.labelKey)}
            </ThemedText>
          </View>

          <View style={styles.stepRow}>
            <StepBadge
              label="2"
              backgroundColor={colors.icon + "33"}
              textColor={colors.text}
            />
            <View style={styles.stepCopy}>
              <ThemedText style={styles.sectionTitle}>
                {t("contentReportDetailsLabel")}
              </ThemedText>
              <ThemedText style={[styles.sectionHint, { color: colors.icon }]}>
                {t("contentReportDetailsHint")}
              </ThemedText>
            </View>
          </View>

          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder={t("contentReportDetailsPlaceholder")}
            placeholderTextColor={colors.icon + "99"}
            multiline
            textAlignVertical="top"
            maxLength={2000}
            style={[
              styles.detailsInput,
              {
                borderColor: colors.icon + "28",
                backgroundColor: fieldSurface,
                color: colors.text,
              },
            ]}
          />
          <ThemedText style={[styles.hint, { color: colors.icon }]}>
            {t("contentReportReviewHint")}
          </ThemedText>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              borderTopColor: colors.icon + "22",
              backgroundColor: colors.background,
            },
          ]}
        >
          <Pressable
            onPress={() => {
              void onSubmit();
            }}
            disabled={!canSubmit || submitReport.isPending}
            style={[
              styles.submitBtn,
              {
                backgroundColor: colors.tint,
                opacity: !canSubmit || submitReport.isPending ? 0.55 : 1,
              },
            ]}
          >
            {submitReport.isPending ? (
              <FlexMarketLoader variant="inline" size="xs" showText={false} />
            ) : (
              <View style={styles.submitInner}>
                <MaterialIcons name="send" size={18} color="#fff" />
                <ThemedText style={styles.submitText}>
                  {t("contentReportSubmit")}
                </ThemedText>
              </View>
            )}
          </Pressable>
          <Pressable onPress={onClose} style={styles.cancelBtn} hitSlop={6}>
            <ThemedText style={[styles.cancelText, { color: colors.icon }]}>
              {t("contentReportCancel")}
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  headerCopy: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
  },
  targetPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: "100%",
  },
  targetPillText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 12,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 4,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    // Nudge down to align with the section title on the right.
    marginTop: 5,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 12,
    includeFontPadding: false,
    textAlign: "center",
    textAlignVertical: "center",
    ...(Platform.OS === "android" ? { paddingTop: 0.5 } : { paddingBottom: 1 }),
  },
  stepCopy: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  sectionHint: {
    fontSize: 12,
    lineHeight: 17,
  },
  reasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  reasonTile: {
    flexBasis: "47%",
    flexGrow: 1,
    maxWidth: "48.5%",
    minHeight: 108,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 10,
    position: "relative",
  },
  reasonCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  reasonIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  reasonLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  selectedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  detailsInput: {
    minHeight: 110,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 6,
  },
  submitBtn: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submitText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
  cancelBtn: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontWeight: "700",
    fontSize: 14,
  },
});
