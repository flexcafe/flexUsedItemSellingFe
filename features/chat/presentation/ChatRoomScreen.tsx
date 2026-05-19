import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FlatList as FlatListType } from "react-native";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { topOffsetForFloatingBackButton } from "@/constants/language-switcher-layout";
import { Colors } from "@/constants/theme";
import type { ChatMessage } from "@/core/domain/entities/Chat";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  DEFAULT_CHAT_TAKE,
  useChatMessages,
  useEnsureChatRoom,
  useMarkChatRoomRead,
  useSendChatMessage,
} from "@/presentation/hooks/useClientChat";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { useLocale } from "@/presentation/providers/LocaleProvider";
import { formatChatTimestamp, messagePreview } from "./chatFormat";

type Props = {
  chatRoomId?: string;
  listingId?: string;
  sellerId?: string;
  listingTitle?: string;
  peerName?: string;
};

export function ChatRoomScreen({
  chatRoomId: chatRoomIdParam,
  listingId,
  sellerId,
  listingTitle,
  peerName,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const backTop = topOffsetForFloatingBackButton(insets.top);

  const ensureRoom = useEnsureChatRoom(
    chatRoomIdParam ? null : (listingId ?? null),
    chatRoomIdParam ? null : (sellerId ?? null),
  );
  const chatRoomId = chatRoomIdParam ?? ensureRoom.chatRoomId;
  const resolvedListingTitle =
    listingTitle?.trim() ||
    ensureRoom.room?.listingTitle?.trim() ||
    t("chatListingFallback");
  const resolvedPeerName =
    peerName?.trim() ||
    ensureRoom.room?.counterpartNickname?.trim() ||
    t("chatSellerFallback");

  const messagesQuery = useChatMessages(chatRoomId, { take: DEFAULT_CHAT_TAKE });
  const sendMessage = useSendChatMessage(chatRoomId);
  const markRead = useMarkChatRoomRead(chatRoomId);
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatListType<ChatMessage>>(null);
  const messages = useMemo(() => {
    const pages = messagesQuery.data?.pages ?? [];
    return pages.flatMap((page) => page.items);
  }, [messagesQuery.data]);

  const chronological = useMemo(() => [...messages].reverse(), [messages]);

  const latestMessageId = messages[0]?.id ?? null;
  useEffect(() => {
    if (!chatRoomId || !latestMessageId) return;
    markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatRoomId, latestMessageId]);

  useEffect(() => {
    if (!chronological.length) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [chronological.length, latestMessageId]);

  const onSend = useCallback(() => {
    const content = draft.trim();
    if (!chatRoomId || !content || sendMessage.isPending) return;
    setDraft("");
    sendMessage.mutate({ content, type: "TEXT" });
  }, [chatRoomId, draft, sendMessage]);

  const onMessagesScroll = useCallback(
    (offsetY: number) => {
      if (offsetY > 72) return;
      if (!messagesQuery.hasNextPage || messagesQuery.isFetchingNextPage) return;
      void messagesQuery.fetchNextPage();
    },
    [messagesQuery],
  );

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isMine = item.senderId != null && item.senderId === user?.id;
      const isSystem = item.type !== "TEXT" || item.senderId == null;
      return (
        <View
          style={[
            styles.messageRow,
            isMine ? styles.messageRowMine : styles.messageRowOther,
          ]}
        >
          <View
            style={[
              styles.bubble,
              isSystem && styles.bubbleSystem,
              isMine
                ? { backgroundColor: colors.tint }
                : { backgroundColor: colors.icon + "22", borderColor: colors.icon + "33" },
            ]}
          >
            {isSystem ? (
              <ThemedText style={styles.systemType}>{item.type.replaceAll("_", " ")}</ThemedText>
            ) : null}
            <ThemedText style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
              {messagePreview(item) || t("chatSystemMessage")}
            </ThemedText>
            <ThemedText style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
              {formatChatTimestamp(item.createdAt)}
            </ThemedText>
          </View>
        </View>
      );
    },
    [colors.icon, colors.tint, t, user?.id],
  );

  const isBootstrapping = !chatRoomIdParam && ensureRoom.isLoading;
  const bootstrapFailed = !chatRoomIdParam && ensureRoom.isError;
  const missingListing = !chatRoomIdParam && (!listingId || !sellerId);

  return (
    <ThemedView style={styles.screen}>
      <Pressable
        onPress={() => router.back()}
        style={[styles.backBtn, { top: backTop }]}
        accessibilityRole="button"
        accessibilityLabel={t("productsComposerBack")}
      >
        <MaterialIcons name="arrow-back" size={22} color="#FFF" />
      </Pressable>

      <View style={[styles.header, { paddingTop: backTop + 44 }]}>
        <ThemedText type="defaultSemiBold" style={styles.headerTitle} numberOfLines={1}>
          {resolvedListingTitle}
        </ThemedText>
        <ThemedText style={styles.headerSubtitle} numberOfLines={1}>
          {resolvedPeerName}
        </ThemedText>
      </View>

      {missingListing ? (
        <View style={styles.center}>
          <ThemedText style={styles.errorText}>{t("chatMissingListing")}</ThemedText>
        </View>
      ) : isBootstrapping ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.tint} />
          <ThemedText style={styles.loadingText}>{t("chatOpeningRoom")}</ThemedText>
        </View>
      ) : bootstrapFailed ? (
        <View style={styles.center}>
          <ThemedText style={styles.errorText}>{t("chatOpenRoomFailed")}</ThemedText>
          <Pressable
            onPress={() => void ensureRoom.refetch()}
            style={[styles.retryBtn, { backgroundColor: colors.tint }]}
          >
            <ThemedText style={styles.retryBtnText}>{t("chatRetry")}</ThemedText>
          </Pressable>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          {messagesQuery.isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.tint} />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={chronological}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.messagesContent}
              onScroll={(event) => onMessagesScroll(event.nativeEvent.contentOffset.y)}
              scrollEventThrottle={120}
              ListHeaderComponent={
                messagesQuery.isFetchingNextPage ? (
                  <View style={styles.historyLoader}>
                    <ActivityIndicator color={colors.tint} />
                    <ThemedText style={styles.historyLoaderText}>
                      {t("chatLoadingOlder")}
                    </ThemedText>
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.emptyThread}>
                  <MaterialIcons name="chat" size={42} color={colors.icon} />
                  <ThemedText style={styles.emptyThreadText}>{t("chatThreadEmpty")}</ThemedText>
                </View>
              }
            />
          )}

          <View
            style={[
              styles.composer,
              {
                borderTopColor: colors.icon + "33",
                backgroundColor: colors.background,
                paddingBottom: Math.max(insets.bottom, 10),
              },
            ]}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t("chatInputPlaceholder")}
              placeholderTextColor={colors.icon}
              style={[styles.input, { color: colors.text, borderColor: colors.icon + "44" }]}
              multiline
              maxLength={5000}
              editable={Boolean(chatRoomId) && !sendMessage.isPending}
            />
            <Pressable
              onPress={onSend}
              disabled={!chatRoomId || sendMessage.isPending || draft.trim().length === 0}
              style={[
                styles.sendBtn,
                {
                  backgroundColor:
                    !chatRoomId || sendMessage.isPending || draft.trim().length === 0
                      ? colors.icon + "55"
                      : colors.tint,
                },
              ]}
            >
              {sendMessage.isPending ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <MaterialIcons name="send" size={20} color="#FFF" />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  header: {
    paddingHorizontal: 72,
    paddingBottom: 10,
    alignItems: "center",
    gap: 2,
  },
  headerTitle: { fontSize: 16, textAlign: "center" },
  headerSubtitle: { fontSize: 12, opacity: 0.65, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  loadingText: { opacity: 0.7, fontSize: 13 },
  errorText: { color: "#D14343", textAlign: "center", fontSize: 14 },
  retryBtn: { marginTop: 8, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  retryBtnText: { color: "#FFF", fontWeight: "700" },
  messagesContent: { paddingHorizontal: 14, paddingVertical: 12, gap: 8, flexGrow: 1 },
  messageRow: { width: "100%" },
  messageRowMine: { alignItems: "flex-end" },
  messageRowOther: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "82%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: "transparent",
  },
  bubbleSystem: { alignSelf: "center", maxWidth: "92%", opacity: 0.92 },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextMine: { color: "#FFF" },
  bubbleTime: { fontSize: 10, opacity: 0.65, alignSelf: "flex-end" },
  bubbleTimeMine: { color: "rgba(255,255,255,0.85)" },
  systemType: { fontSize: 10, fontWeight: "800", opacity: 0.75, textTransform: "uppercase" },
  historyLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  historyLoaderText: { fontSize: 12, opacity: 0.65 },
  emptyThread: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 48 },
  emptyThreadText: { opacity: 0.7, fontSize: 14 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
