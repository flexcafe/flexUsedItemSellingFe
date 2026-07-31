import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useCallback, useMemo } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeInUp, useReducedMotion } from "react-native-reanimated";
import Toast from "react-native-toast-message";

import { useAppSafeAreaInsets } from "@/components/app-safe-area";
import { FlexMarketLoader } from "@/components/flex-market-loader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import type { UserBlock } from "@/core/domain/entities/UserBlock";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  useMyBlocks,
  useUnblockUser,
} from "@/presentation/hooks/useModerationReports";
import {
  uiCardShadow,
  uiCardSurface,
  uiSectionEnter,
} from "@/presentation/lib/uiAnimations";
import { useLocale } from "@/presentation/providers/LocaleProvider";

type Props = {
  visible: boolean;
  onClose: () => void;
};

function formatBlockDate(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.trim();
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function readApiErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const response = (error as { response?: { data?: unknown } }).response;
  const data = response?.data;
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return "";
}

function BlockedUserCard({
  item,
  index,
  reduceMotion,
  scheme,
  borderColor,
  tint,
  unblocking,
  onUnblock,
  t,
}: {
  item: UserBlock;
  index: number;
  reduceMotion: boolean | null;
  scheme: "light" | "dark";
  borderColor: string;
  tint: string;
  unblocking: boolean;
  onUnblock: (userId: string, nickname: string) => void;
  t: ReturnType<typeof useLocale>["t"];
}) {
  const name =
    item.blockedNickname?.trim() || t("contentReportsUnknownUser");
  const code = item.blockedReferralCode?.trim();

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
          <MaterialIcons name="person-off" size={18} color={tint} />
        </View>
        <View style={styles.cardTitleCol}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {name}
          </ThemedText>
          <ThemedText style={styles.meta} numberOfLines={1}>
            {code ? `${code} · ` : ""}
            {formatBlockDate(item.createdAt)}
          </ThemedText>
        </View>
        <Pressable
          onPress={() => onUnblock(item.blockedUserId, name)}
          disabled={unblocking}
          style={({ pressed }) => [
            styles.unblockBtn,
            {
              borderColor: tint + "55",
              opacity: unblocking ? 0.55 : pressed ? 0.85 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t("userBlockUnblock")}
        >
          <ThemedText style={[styles.unblockText, { color: tint }]}>
            {t("userBlockUnblock")}
          </ThemedText>
        </Pressable>
      </View>

      {item.reason?.trim() ? (
        <ThemedText style={styles.details} numberOfLines={3}>
          {item.reason.trim()}
        </ThemedText>
      ) : null}
    </Animated.View>
  );
}

export function MyBlockedUsersSection({ visible, onClose }: Props) {
  const { t, tf } = useLocale();
  const insets = useAppSafeAreaInsets();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];
  const reduceMotion = useReducedMotion();
  const borderColor = colors.icon + "22";

  const blocksQuery = useMyBlocks();
  const unblockUser = useUnblockUser();
  const items = useMemo(() => blocksQuery.data ?? [], [blocksQuery.data]);
  const headerEntering = uiSectionEnter(0, reduceMotion);

  const onRefresh = useCallback(() => {
    void blocksQuery.refetch();
  }, [blocksQuery]);

  const onUnblock = useCallback(
    (userId: string, nickname: string) => {
      Alert.alert(
        t("userBlockUnblockTitle"),
        tf("userBlockUnblockConfirm", { name: nickname }),
        [
          { text: t("userBlockCancel"), style: "cancel" },
          {
            text: t("userBlockUnblock"),
            style: "destructive",
            onPress: () => {
              void (async () => {
                try {
                  await unblockUser.mutateAsync(userId);
                  void Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success,
                  );
                  Toast.show({
                    type: "notification",
                    text1: t("userBlockUnblockSuccessTitle"),
                    text2: t("userBlockUnblockSuccessBody"),
                  });
                } catch (error) {
                  const apiMessage = readApiErrorMessage(error);
                  Alert.alert(
                    t("errorTitle"),
                    apiMessage || t("userBlockUnblockFailed"),
                  );
                }
              })();
            },
          },
        ],
      );
    },
    [t, tf, unblockUser],
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ThemedView style={styles.screen}>
        <Animated.View
          entering={headerEntering}
          style={[
            styles.hero,
            {
              paddingTop: Math.max(insets.top, 12) + 8,
              backgroundColor: colors.tint,
            },
            uiCardShadow(scheme, {
              iosOffsetLight: 8,
              iosOpacityLight: 0.18,
              androidElevationLight: 6,
            }),
          ]}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroIconWrap}>
              <MaterialIcons name="block" size={22} color="#fff" />
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && styles.closeBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t("userBlocksClose")}
            >
              <MaterialIcons name="close" size={20} color="#fff" />
            </Pressable>
          </View>
          <ThemedText type="screenTitle" style={styles.heroTitle}>
            {t("userBlocksTitle")}
          </ThemedText>
          <ThemedText style={styles.heroSubtitle}>
            {t("userBlocksSubtitle")}
          </ThemedText>
        </Animated.View>

        {blocksQuery.isPending && items.length === 0 ? (
          <View style={styles.centered}>
            <FlexMarketLoader size="md" showText={false} />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id || item.blockedUserId}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: Math.max(insets.bottom, 16) + 12 },
              items.length === 0 ? styles.listEmptyGrow : null,
            ]}
            refreshControl={
              <RefreshControl
                refreshing={blocksQuery.isRefetching}
                tintColor={colors.tint}
                onRefresh={onRefresh}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View
                  style={[
                    styles.emptyIcon,
                    { backgroundColor: colors.tint + "14" },
                  ]}
                >
                  <MaterialIcons
                    name="person-outline"
                    size={28}
                    color={colors.tint}
                  />
                </View>
                <ThemedText type="defaultSemiBold">
                  {t("userBlocksEmptyTitle")}
                </ThemedText>
                <ThemedText style={styles.emptyBody}>
                  {t("userBlocksEmptyBody")}
                </ThemedText>
              </View>
            }
            renderItem={({ item, index }) => (
              <BlockedUserCard
                item={item}
                index={index}
                reduceMotion={reduceMotion}
                scheme={scheme}
                borderColor={borderColor}
                tint={colors.tint}
                unblocking={unblockUser.isPending}
                onUnblock={onUnblock}
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
  screen: { flex: 1 },
  hero: {
    paddingHorizontal: 18,
    paddingBottom: 20,
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
  closeBtnPressed: { opacity: 0.85 },
  heroTitle: { color: "#fff" },
  heroSubtitle: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    maxWidth: "95%",
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
  listEmptyGrow: { flexGrow: 1 },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 48,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyBody: {
    textAlign: "center",
    opacity: 0.7,
    lineHeight: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleCol: { flex: 1, gap: 2 },
  meta: { fontSize: 12, opacity: 0.65 },
  details: { fontSize: 13, lineHeight: 18, opacity: 0.85 },
  unblockBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  unblockText: { fontSize: 12, fontWeight: "700" },
});
