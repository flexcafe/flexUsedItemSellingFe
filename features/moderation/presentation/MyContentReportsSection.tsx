import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useCallback, useMemo } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeInUp, useReducedMotion } from "react-native-reanimated";

import { useAppSafeAreaInsets } from "@/components/app-safe-area";
import { FlexMarketLoader } from "@/components/flex-market-loader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import type {
  ContentReport,
  ContentReportReason,
  ContentReportStatus,
  ContentReportTargetType,
} from "@/core/domain/entities/ContentReport";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useMyContentReports } from "@/presentation/hooks/useModerationReports";
import { uiCardShadow, uiCardSurface } from "@/presentation/lib/uiAnimations";
import { useLocale } from "@/presentation/providers/LocaleProvider";

type Props = {
  visible: boolean;
  onClose: () => void;
};

function formatReportDate(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.trim();
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

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

function reasonLabelKey(
  reason: ContentReportReason,
):
  | "contentReportReasonObjectionable"
  | "contentReportReasonHarassment"
  | "contentReportReasonHateSpeech"
  | "contentReportReasonSexual"
  | "contentReportReasonSpam"
  | "contentReportReasonViolence"
  | "contentReportReasonScam"
  | "contentReportReasonOther" {
  switch (reason) {
    case "OBJECTIONABLE_CONTENT":
      return "contentReportReasonObjectionable";
    case "HARASSMENT":
      return "contentReportReasonHarassment";
    case "HATE_SPEECH":
      return "contentReportReasonHateSpeech";
    case "SEXUAL_CONTENT":
      return "contentReportReasonSexual";
    case "SPAM":
      return "contentReportReasonSpam";
    case "VIOLENCE":
      return "contentReportReasonViolence";
    case "SCAM":
      return "contentReportReasonScam";
    case "OTHER":
    default:
      return "contentReportReasonOther";
  }
}

function statusLabelKey(
  status: ContentReportStatus,
):
  | "contentReportStatusPending"
  | "contentReportStatusActioned"
  | "contentReportStatusDismissed" {
  switch (status) {
    case "ACTIONED":
      return "contentReportStatusActioned";
    case "DISMISSED":
      return "contentReportStatusDismissed";
    case "PENDING":
    default:
      return "contentReportStatusPending";
  }
}

function statusPalette(status: ContentReportStatus) {
  switch (status) {
    case "ACTIONED":
      return { bg: "#DCFCE7", text: "#15803D" };
    case "DISMISSED":
      return { bg: "#E2E8F0", text: "#475569" };
    case "PENDING":
    default:
      return { bg: "#FEF3C7", text: "#B45309" };
  }
}

function ContentReportCard({
  item,
  index,
  reduceMotion,
  scheme,
  borderColor,
  tint,
  t,
}: {
  item: ContentReport;
  index: number;
  reduceMotion: boolean | null;
  scheme: "light" | "dark";
  borderColor: string;
  tint: string;
  t: ReturnType<typeof useLocale>["t"];
}) {
  const palette = statusPalette(item.status);
  const reportedName =
    item.reportedUserNickname?.trim() ||
    t("contentReportsUnknownUser");

  return (
    <Animated.View
      entering={
        reduceMotion
          ? undefined
          : FadeInUp.duration(320)
              .delay(Math.min(index, 8) * 40)
              .springify()
              .damping(18)
      }
      style={[
        styles.card,
        uiCardShadow(scheme, { androidElevationLight: 2 }),
        {
          borderColor,
          backgroundColor: uiCardSurface(scheme),
        },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.typeIcon, { backgroundColor: tint + "14" }]}>
          <MaterialIcons
            name={targetIcon(item.targetType)}
            size={18}
            color={tint}
          />
        </View>
        <View style={styles.cardTitleCol}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {t(targetLabelKey(item.targetType))}
          </ThemedText>
          <ThemedText style={styles.meta} numberOfLines={1}>
            {t(reasonLabelKey(item.reason))}
            {item.createdAt ? ` · ${formatReportDate(item.createdAt)}` : ""}
          </ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: palette.bg }]}>
          <ThemedText style={[styles.statusText, { color: palette.text }]}>
            {t(statusLabelKey(item.status))}
          </ThemedText>
        </View>
      </View>

      <ThemedText style={styles.userLine} numberOfLines={1}>
        {t("contentReportsReportedUser")}: {reportedName}
      </ThemedText>

      {item.details?.trim() ? (
        <ThemedText style={styles.details} numberOfLines={4}>
          {item.details.trim()}
        </ThemedText>
      ) : null}

      {item.adminNote?.trim() && item.status !== "PENDING" ? (
        <View
          style={[
            styles.adminNote,
            {
              backgroundColor: tint + "10",
              borderColor: tint + "28",
            },
          ]}
        >
          <MaterialIcons name="support-agent" size={14} color={tint} />
          <ThemedText style={[styles.adminNoteText, { color: tint }]} numberOfLines={3}>
            {item.adminNote.trim()}
          </ThemedText>
        </View>
      ) : null}
    </Animated.View>
  );
}

export function MyContentReportsSection({ visible, onClose }: Props) {
  const { t } = useLocale();
  const insets = useAppSafeAreaInsets();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];
  const reduceMotion = useReducedMotion();
  const borderColor = colors.icon + "22";

  const reportsQuery = useMyContentReports();
  const items = useMemo(() => reportsQuery.data ?? [], [reportsQuery.data]);

  const onRefresh = useCallback(() => {
    void reportsQuery.refetch();
  }, [reportsQuery]);

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
        <View
          style={[
            styles.hero,
            {
              backgroundColor: colors.tint,
              paddingBottom: 18,
            },
          ]}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroIconWrap}>
              <MaterialIcons name="flag" size={22} color="#fff" />
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && styles.closeBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t("contentReportsClose")}
            >
              <MaterialIcons name="close" size={20} color="#fff" />
            </Pressable>
          </View>
          <ThemedText type="screenTitle" style={styles.heroTitle}>
            {t("contentReportsTitle")}
          </ThemedText>
          <ThemedText style={styles.heroSubtitle}>
            {t("contentReportsSubtitle")}
          </ThemedText>
        </View>

        {reportsQuery.isPending && items.length === 0 ? (
          <View style={styles.centered}>
            <FlexMarketLoader size="md" showText={false} />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: Math.max(insets.bottom, 16) + 12 },
              items.length === 0 ? styles.listEmptyGrow : null,
            ]}
            refreshControl={
              <RefreshControl
                refreshing={reportsQuery.isRefetching}
                tintColor={colors.tint}
                onRefresh={onRefresh}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View
                  style={[styles.emptyIcon, { backgroundColor: colors.tint + "14" }]}
                >
                  <MaterialIcons name="flag" size={28} color={colors.tint} />
                </View>
                <ThemedText style={styles.emptyTitle}>
                  {t("contentReportsEmptyTitle")}
                </ThemedText>
                <ThemedText style={[styles.emptyBody, { color: colors.icon }]}>
                  {t("contentReportsEmptyBody")}
                </ThemedText>
              </View>
            }
            renderItem={({ item, index }) => (
              <ContentReportCard
                item={item}
                index={index}
                reduceMotion={reduceMotion}
                scheme={scheme}
                borderColor={borderColor}
                tint={colors.tint}
                t={t}
              />
            )}
          />
        )}
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnPressed: {
    opacity: 0.85,
  },
  heroTitle: {
    color: "#fff",
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  listEmptyGrow: {
    flexGrow: 1,
    justifyContent: "center",
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  meta: {
    fontSize: 12,
    opacity: 0.7,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  userLine: {
    fontSize: 13,
    fontWeight: "600",
  },
  details: {
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.9,
  },
  adminNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  adminNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  emptyWrap: {
    alignItems: "center",
    paddingHorizontal: 28,
    gap: 8,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
