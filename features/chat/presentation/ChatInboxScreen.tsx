import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { paddingTopBelowLanguageSwitcher } from "@/constants/language-switcher-layout";
import { Colors } from "@/constants/theme";
import type { ChatRoom } from "@/core/domain/entities/Chat";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useChatRooms } from "@/presentation/hooks/useClientChat";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { useLocale } from "@/presentation/providers/LocaleProvider";
import {
  formatChatTimestamp,
  messagePreview,
  roomDisplayTitle,
  roomPeerLabel,
} from "./chatFormat";

export function ChatInboxScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const topInset = paddingTopBelowLanguageSwitcher(insets.top);

  const roomsQuery = useChatRooms({ take: 20 });
  const rooms = useMemo(
    () => roomsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [roomsQuery.data],
  );

  const onOpenRoom = (room: ChatRoom) => {
    router.push({
      pathname: "/chat/room/[chatRoomId]",
      params: {
        chatRoomId: room.id,
        listingId: room.listingId,
        sellerId: room.sellerId,
        listingTitle: room.listingTitle ?? "",
        peerName: room.counterpartNickname ?? "",
      },
    });
  };

  const renderItem = ({ item }: { item: ChatRoom }) => {
    const title = roomDisplayTitle(
      item,
      user?.id,
      t("chatListingFallback"),
      t("chatSellerFallback"),
    );
    const peer = roomPeerLabel(
      item,
      user?.id,
      t("chatSellerFallback"),
      t("chatBuyerFallback"),
    );
    const preview = messagePreview(item.lastMessage);
    const time = formatChatTimestamp(
      item.lastMessage?.createdAt ?? item.updatedAt,
    );

    return (
      <Pressable
        onPress={() => onOpenRoom(item)}
        style={({ pressed }) => [
          styles.row,
          {
            borderColor: colors.icon + "33",
            backgroundColor: pressed ? colors.tint + "10" : colors.background,
          },
          item.unreadCount > 0 && { borderColor: colors.tint + "55" },
        ]}
      >
        <View
          style={[styles.avatarWrap, { backgroundColor: colors.tint + "18" }]}
        >
          {item.listingImageUrl ? (
            <Image
              source={{ uri: item.listingImageUrl }}
              style={styles.avatarImage}
              contentFit="cover"
            />
          ) : (
            <MaterialIcons
              name="chat-bubble-outline"
              size={22}
              color={colors.tint}
            />
          )}
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <ThemedText
              type="defaultSemiBold"
              numberOfLines={1}
              style={styles.rowTitle}
            >
              {title}
            </ThemedText>
            {time ? (
              <ThemedText style={styles.rowTime}>{time}</ThemedText>
            ) : null}
          </View>
          <ThemedText style={styles.rowPeer} numberOfLines={1}>
            {peer}
          </ThemedText>
          <ThemedText style={styles.rowPreview} numberOfLines={2}>
            {preview || t("chatNoMessagesYet")}
          </ThemedText>
        </View>
        {item.unreadCount > 0 ? (
          <View style={[styles.unreadBadge, { backgroundColor: colors.tint }]}>
            <ThemedText style={styles.unreadBadgeText}>
              {item.unreadCount > 99 ? "99+" : item.unreadCount}
            </ThemedText>
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.screen}>
      <View style={[styles.header, { paddingTop: topInset }]}>
        <ThemedText type="title">{t("chatInboxTitle")}</ThemedText>
        <ThemedText style={styles.subtitle}>
          {t("chatInboxSubtitle")}
        </ThemedText>
      </View>

      {authLoading || (isAuthenticated && roomsQuery.isPending) ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : roomsQuery.isError ? (
        <View style={styles.center}>
          <ThemedText style={styles.errorText}>
            {t("chatInboxLoadFailed")}
          </ThemedText>
          <Pressable
            onPress={() => void roomsQuery.refetch()}
            style={[styles.retryBtn, { backgroundColor: colors.tint }]}
          >
            <ThemedText style={styles.retryBtnText}>
              {t("chatRetry")}
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            rooms.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={roomsQuery.isRefetching}
              onRefresh={() => void roomsQuery.refetch()}
              tintColor={colors.tint}
            />
          }
          onEndReached={() => {
            if (roomsQuery.hasNextPage && !roomsQuery.isFetchingNextPage) {
              void roomsQuery.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={[styles.emptyBox, { borderColor: colors.icon }]}>
              <MaterialIcons name="forum" size={40} color={colors.icon} />
              <ThemedText style={styles.emptyTitle}>
                {t("chatInboxEmpty")}
              </ThemedText>
              <ThemedText style={styles.emptyHint}>
                {t("chatInboxEmptyHint")}
              </ThemedText>
            </View>
          }
          ListFooterComponent={
            roomsQuery.isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={colors.tint} />
              </View>
            ) : null
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, gap: 4 },
  subtitle: { fontSize: 13, opacity: 0.7 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  listContentEmpty: { flexGrow: 1, justifyContent: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  rowBody: { flex: 1, gap: 2, minWidth: 0 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowTitle: { flex: 1, fontSize: 15 },
  rowTime: { fontSize: 11, opacity: 0.6 },
  rowPeer: { fontSize: 12, opacity: 0.65 },
  rowPreview: { fontSize: 13, opacity: 0.8, lineHeight: 18 },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "800" },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    borderStyle: "dashed",
    padding: 28,
    marginHorizontal: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  emptyHint: {
    fontSize: 13,
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 18,
  },
  footerLoader: { paddingVertical: 16, alignItems: "center" },
  errorText: { color: "#D14343", textAlign: "center", fontSize: 14 },
  retryBtn: {
    marginTop: 8,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryBtnText: { color: "#FFF", fontWeight: "700" },
});
