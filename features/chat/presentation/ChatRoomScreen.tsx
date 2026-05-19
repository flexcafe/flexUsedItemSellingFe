import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FlatList as FlatListType } from "react-native";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import * as Location from "expo-location";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

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
  useRequestDirectTrade,
  useSendChatMessage,
  useStartLocationShare,
  useStopLocationShare,
  useUpdateLocationShare,
} from "@/presentation/hooks/useClientChat";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { useLocale } from "@/presentation/providers/LocaleProvider";
import { buildLeafletLiveViewHtml } from "@/presentation/lib/leafletPickerHtml";
import {
  chatActionErrorMessage,
  formatChatTimestamp,
  isLocationSharingActive,
  locationPointsFromMessages,
  locationSharingByUser,
  messagePreview,
} from "./chatFormat";
import {
  buildDirectTradeRequest,
  defaultMeetingDateString,
  defaultMeetingTimeString,
  formatMeetingDateInput,
  formatMeetingTimeInput,
} from "./directTradeForm";

type Props = {
  chatRoomId?: string;
  listingId?: string;
  sellerId?: string;
  listingTitle?: string;
  peerName?: string;
};

const LIVE_MAP_HEIGHT = 220;

export function ChatRoomScreen({
  chatRoomId: chatRoomIdParam,
  listingId,
  sellerId,
  listingTitle,
  peerName,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, tf } = useLocale();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const backTop = topOffsetForFloatingBackButton(insets.top);

  const ensureRoom = useEnsureChatRoom(
    chatRoomIdParam ? null : (listingId ?? null),
    chatRoomIdParam ? null : (sellerId ?? null),
  );
  const chatRoomId = chatRoomIdParam ?? ensureRoom.chatRoomId;
  const currentUserId = user?.id ?? null;
  const peerRoleFallback = useMemo(() => {
    const room = ensureRoom.room;
    if (room && currentUserId) {
      if (room.buyerId === currentUserId) return t("chatSellerFallback");
      if (room.sellerId === currentUserId) return t("chatBuyerFallback");
    }
    const sellerIdHint = sellerId?.trim() || room?.sellerId || null;
    if (currentUserId && sellerIdHint) {
      return currentUserId === sellerIdHint
        ? t("chatBuyerFallback")
        : t("chatSellerFallback");
    }
    return t("chatSellerFallback");
  }, [currentUserId, ensureRoom.room, sellerId, t]);
  const resolvedListingTitle =
    listingTitle?.trim() ||
    ensureRoom.room?.listingTitle?.trim() ||
    t("chatListingFallback");
  const resolvedPeerName =
    peerName?.trim() ||
    ensureRoom.room?.counterpartNickname?.trim() ||
    peerRoleFallback;

  const messagesQuery = useChatMessages(chatRoomId, { take: DEFAULT_CHAT_TAKE });
  const sendMessage = useSendChatMessage(chatRoomId);
  const markRead = useMarkChatRoomRead(chatRoomId);
  const directTradeMutation = useRequestDirectTrade(chatRoomId);
  const startLocationMutation = useStartLocationShare(chatRoomId);
  const updateLocationMutation = useUpdateLocationShare(chatRoomId);
  const stopLocationMutation = useStopLocationShare(chatRoomId);
  const [draft, setDraft] = useState("");
  const [directTradeOpen, setDirectTradeOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState(defaultMeetingDateString);
  const [meetingTime, setMeetingTime] = useState(defaultMeetingTimeString);
  const [meetingLocation, setMeetingLocation] = useState("");
  const [meetingLatitude, setMeetingLatitude] = useState("");
  const [meetingLongitude, setMeetingLongitude] = useState("");
  const [locationUpdatedAt, setLocationUpdatedAt] = useState<string | null>(null);
  const [isFetchingCoords, setIsFetchingCoords] = useState(false);
  const [myShareOverride, setMyShareOverride] = useState<boolean | null>(null);
  const [localLiveLocation, setLocalLiveLocation] = useState<{
    latitude: number;
    longitude: number;
    updatedAt: string;
  } | null>(null);
  const [liveMapExpanded, setLiveMapExpanded] = useState(true);
  const listRef = useRef<FlatListType<ChatMessage>>(null);
  const messages = useMemo(() => {
    const pages = messagesQuery.data?.pages ?? [];
    return pages.flatMap((page) => page.items);
  }, [messagesQuery.data]);

  const chronological = useMemo(() => [...messages].reverse(), [messages]);
  const sharingByUser = useMemo(() => locationSharingByUser(chronological), [chronological]);
  const messageLocationByUser = useMemo(
    () => locationPointsFromMessages(chronological),
    [chronological],
  );
  const mySharingFromMessages = user?.id
    ? Boolean(sharingByUser[user.id])
    : isLocationSharingActive(chronological);
  const mySharingActive = myShareOverride ?? mySharingFromMessages;
  const otherSharedUserId = Object.keys(sharingByUser).find((id) => id !== user?.id) ?? null;
  const otherLocationUserId =
    Object.keys(messageLocationByUser).find((id) => id !== user?.id) ?? null;
  const counterpartUserId =
    ensureRoom.room?.counterpartUserId ??
    otherSharedUserId ??
    otherLocationUserId ??
    chronological.find((m) => m.senderId && m.senderId !== user?.id)?.senderId ??
    null;
  const counterpartSharingActive = counterpartUserId
    ? Boolean(sharingByUser[counterpartUserId])
    : false;
  const myLiveLocation = user?.id
    ? (messageLocationByUser[user.id] ?? null)
    : null;
  const counterpartLiveLocation = counterpartUserId
    ? (messageLocationByUser[counterpartUserId] ?? null)
    : null;
  const myPoint = mySharingActive ? (myLiveLocation ?? localLiveLocation) : null;
  const counterpartPoint = counterpartSharingActive ? counterpartLiveLocation : null;
  const myMarkerLabel = "Me";
  const peerMarkerLabel = resolvedPeerName || "Other party";
  const locationShareStatus = useCallback(
    (hasPoint: boolean, isSharing: boolean) => {
      if (hasPoint) return t("chatLocationStatusSharing");
      if (isSharing) return t("chatLocationStatusStarting");
      return t("chatLocationStatusOff");
    },
    [t],
  );
  const myLocationStatus = locationShareStatus(Boolean(myPoint), mySharingActive);
  const peerLocationStatus = locationShareStatus(
    Boolean(counterpartPoint),
    counterpartSharingActive,
  );
  const liveMapHtml = useMemo(() => {
    const markers = [];
    if (myPoint) {
      markers.push({
        latitude: myPoint.latitude,
        longitude: myPoint.longitude,
        label: myMarkerLabel,
        color: "#1E88E5",
      });
    }
    if (counterpartPoint) {
      markers.push({
        latitude: counterpartPoint.latitude,
        longitude: counterpartPoint.longitude,
        label: peerMarkerLabel,
        color: "#E53935",
      });
    }
    return buildLeafletLiveViewHtml(markers);
  }, [counterpartPoint, myMarkerLabel, myPoint, peerMarkerLabel]);

  useEffect(() => {
    if (myShareOverride == null) return;
    if (myShareOverride === mySharingFromMessages) setMyShareOverride(null);
  }, [myShareOverride, mySharingFromMessages]);

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

  const openDirectTradeModal = useCallback(() => {
    setMeetingDate(defaultMeetingDateString());
    setMeetingTime(defaultMeetingTimeString());
    setDirectTradeOpen(true);
  }, []);

  const getCurrentCoords = useCallback(async (shouldPrompt: boolean) => {
    const permission = shouldPrompt
      ? await Location.requestForegroundPermissionsAsync()
      : await Location.getForegroundPermissionsAsync();
    if (permission.status !== "granted") throw new Error(t("chatLocationPermissionDenied"));
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };
  }, [t]);

  const onSubmitDirectTrade = useCallback(() => {
    if (!chatRoomId) return;

    const built = buildDirectTradeRequest({
      meetingDate,
      meetingTime,
      meetingLocation,
      meetingLatitude,
      meetingLongitude,
    });

    if ("errorKey" in built) {
      Alert.alert(t("chatDirectTradeTitle"), t(built.errorKey));
      return;
    }

    directTradeMutation.mutate(built.payload, {
      onSuccess: () => {
        setDirectTradeOpen(false);
        Alert.alert(t("chatDirectTradeTitle"), t("chatDirectTradeSaved"));
      },
      onError: (error) => {
        const message =
          error instanceof Error && error.message.trim()
            ? error.message
            : t("chatDirectTradeFailed");
        Alert.alert(t("chatDirectTradeTitle"), message);
      },
    });
  }, [
    chatRoomId,
    directTradeMutation,
    meetingDate,
    meetingLatitude,
    meetingLocation,
    meetingLongitude,
    meetingTime,
    t,
  ]);

  const shareCoords = useCallback(
    async (mode: "start" | "update", silent = false) => {
      if (!chatRoomId || isFetchingCoords) return;
      setIsFetchingCoords(true);
      try {
        const coords = await getCurrentCoords(mode === "start");
        const payload = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          expiresInSeconds: 120,
        };
        setLocalLiveLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
          updatedAt: new Date().toISOString(),
        });
        const mutation = mode === "start" ? startLocationMutation : updateLocationMutation;
        const failKey =
          mode === "start" ? "chatLocationStartFailed" : "chatLocationUpdateFailed";
        mutation.mutate(payload, {
          onSuccess: (result) => {
            if (mode === "start") setMyShareOverride(true);
            setLocationUpdatedAt(new Date().toISOString());
            if (
              mode === "start" &&
              typeof result === "object" &&
              result != null &&
              "alreadyActive" in result &&
              result.alreadyActive
            ) {
              Alert.alert(t("chatDirectTradeTitle"), t("chatLocationAlreadyActive"));
            }
          },
          onError: (error) => {
            if (silent) return;
            Alert.alert(
              t("chatDirectTradeTitle"),
              chatActionErrorMessage(error, t(failKey)),
            );
          },
        });
      } catch (error) {
        if (silent) return;
        Alert.alert(
          t("chatDirectTradeTitle"),
          chatActionErrorMessage(
            error,
            t(mode === "start" ? "chatLocationStartFailed" : "chatLocationUpdateFailed"),
          ),
        );
      } finally {
        setIsFetchingCoords(false);
      }
    },
    [
      chatRoomId,
      getCurrentCoords,
      isFetchingCoords,
      startLocationMutation,
      t,
      updateLocationMutation,
    ],
  );

  const onStartLocationShare = useCallback(() => {
    void shareCoords("start");
  }, [shareCoords]);

  const onUpdateLocationShare = useCallback(() => {
    void shareCoords("update");
  }, [shareCoords]);

  const onStopLocationShare = useCallback(() => {
    if (!chatRoomId || stopLocationMutation.isPending) return;
    stopLocationMutation.mutate(undefined, {
      onSuccess: () => {
        setMyShareOverride(false);
        setLocalLiveLocation(null);
        setLocationUpdatedAt(new Date().toISOString());
      },
      onError: (error) => {
        Alert.alert(
          t("chatDirectTradeTitle"),
          chatActionErrorMessage(error, t("chatLocationStopFailed")),
        );
      },
    });
  }, [chatRoomId, stopLocationMutation, t]);

  useEffect(() => {
    if (!chatRoomId || !mySharingActive) return;
    const id = setInterval(() => {
      if (updateLocationMutation.isPending) return;
      void shareCoords("update", true);
    }, 3000);
    return () => clearInterval(id);
  }, [chatRoomId, mySharingActive, shareCoords, updateLocationMutation.isPending]);

  useEffect(() => {
    if (!chatRoomId || (!mySharingActive && !counterpartSharingActive)) return;
    const id = setInterval(() => {
      void messagesQuery.refetch();
    }, 3000);
    return () => clearInterval(id);
  }, [chatRoomId, counterpartSharingActive, messagesQuery, mySharingActive]);

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

      {chatRoomId ? (
      <View style={styles.actionPanel}>
        <Pressable
          onPress={openDirectTradeModal}
          style={({ pressed }) => [
            styles.actionBtnPrimary,
            { backgroundColor: colors.tint, opacity: pressed ? 0.88 : 1 },
          ]}
        >
          <MaterialIcons name="event" size={18} color="#FFF" />
          <ThemedText style={styles.actionBtnPrimaryText}>{t("chatDirectTradeButton")}</ThemedText>
        </Pressable>

        {!mySharingActive ? (
          <Pressable
            onPress={onStartLocationShare}
            disabled={isFetchingCoords || startLocationMutation.isPending}
            style={({ pressed }) => [
              styles.actionBtnOutline,
              {
                borderColor: colors.tint,
                opacity:
                  isFetchingCoords || startLocationMutation.isPending ? 0.55 : pressed ? 0.88 : 1,
              },
            ]}
          >
            {isFetchingCoords || startLocationMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <MaterialIcons name="my-location" size={18} color={colors.tint} />
            )}
            <ThemedText style={[styles.actionBtnOutlineText, { color: colors.tint }]}>
              {t("chatStartSharing")}
            </ThemedText>
          </Pressable>
        ) : (
          <View style={styles.locationRow}>
            <Pressable
              onPress={onUpdateLocationShare}
              disabled={isFetchingCoords || updateLocationMutation.isPending}
              style={({ pressed }) => [
                styles.actionBtnOutline,
                styles.locationRowBtn,
                {
                  borderColor: colors.tint,
                  opacity:
                    isFetchingCoords || updateLocationMutation.isPending
                      ? 0.55
                      : pressed
                        ? 0.88
                        : 1,
                },
              ]}
            >
              {isFetchingCoords || updateLocationMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <MaterialIcons name="sync" size={18} color={colors.tint} />
              )}
              <ThemedText style={[styles.actionBtnOutlineText, { color: colors.tint }]}>
                {t("chatUpdateLocation")}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={onStopLocationShare}
              disabled={stopLocationMutation.isPending}
              style={({ pressed }) => [
                styles.actionBtnOutline,
                styles.locationRowBtn,
                {
                  borderColor: colors.icon + "66",
                  opacity: stopLocationMutation.isPending ? 0.55 : pressed ? 0.88 : 1,
                },
              ]}
            >
              {stopLocationMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.icon} />
              ) : (
                <MaterialIcons name="location-off" size={18} color={colors.icon} />
              )}
              <ThemedText style={[styles.actionBtnOutlineText, { color: colors.icon }]}>
                {t("chatStopSharing")}
              </ThemedText>
            </Pressable>
          </View>
        )}
      </View>
      ) : null}
      {chatRoomId ? (
        <View style={[styles.liveLocationPanel, { borderColor: colors.icon + "33" }]}>
          <Pressable
            onPress={() => setLiveMapExpanded((open) => !open)}
            style={styles.liveLocationHeader}
            accessibilityRole="button"
            accessibilityState={{ expanded: liveMapExpanded }}
          >
            <ThemedText style={styles.liveLocationTitle}>{t("chatLiveLocationMap")}</ThemedText>
            <MaterialIcons
              name={liveMapExpanded ? "expand-less" : "expand-more"}
              size={22}
              color={colors.icon}
            />
          </Pressable>
          {!liveMapExpanded ? (
            <ThemedText style={styles.liveLocationLine} numberOfLines={2}>
              {myMarkerLabel}: {myLocationStatus} · {peerMarkerLabel}: {peerLocationStatus}
            </ThemedText>
          ) : (
            <>
              <View style={styles.liveMapWrap}>
                <WebView
                  source={{ html: liveMapHtml }}
                  style={styles.liveMapView}
                  scrollEnabled={false}
                  originWhitelist={["*"]}
                />
              </View>
              <ThemedText style={styles.liveLocationLine}>
                {myMarkerLabel}: {myLocationStatus}
              </ThemedText>
              <ThemedText style={styles.liveLocationLine}>
                {peerMarkerLabel}: {peerLocationStatus}
              </ThemedText>
              <View style={styles.liveLegendRow}>
                <View style={styles.liveLegendItem}>
                  <View style={[styles.liveLegendDot, { backgroundColor: "#1E88E5" }]} />
                  <ThemedText style={styles.liveLegendText}>{myMarkerLabel}</ThemedText>
                </View>
                <View style={styles.liveLegendItem}>
                  <View style={[styles.liveLegendDot, { backgroundColor: "#E53935" }]} />
                  <ThemedText style={styles.liveLegendText}>{peerMarkerLabel}</ThemedText>
                </View>
              </View>
            </>
          )}
        </View>
      ) : null}
      {locationUpdatedAt ? (
        <ThemedText style={styles.locationStamp}>
          {tf("chatLocationUpdatedAt", { time: formatChatTimestamp(locationUpdatedAt) })}
        </ThemedText>
      ) : null}

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

      <Modal
        transparent
        visible={directTradeOpen}
        animationType="fade"
        onRequestClose={() => setDirectTradeOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.background, borderColor: colors.icon + "33" },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText type="defaultSemiBold">{t("chatDirectTradeTitle")}</ThemedText>
              <Pressable onPress={() => setDirectTradeOpen(false)} style={styles.modalCloseBtn}>
                <MaterialIcons name="close" size={20} color={colors.icon} />
              </Pressable>
            </View>
            <ThemedText style={styles.pickerLabel}>{t("chatMeetingDateLabel")}</ThemedText>
            <TextInput
              value={meetingDate}
              onChangeText={(text) => setMeetingDate(formatMeetingDateInput(text))}
              placeholder={t("chatMeetingDatePlaceholder")}
              placeholderTextColor={colors.icon}
              keyboardType="number-pad"
              maxLength={10}
              style={[styles.modalInput, { color: colors.text, borderColor: colors.icon + "44" }]}
            />
            <ThemedText style={styles.pickerLabel}>{t("chatMeetingTimeLabel")}</ThemedText>
            <TextInput
              value={meetingTime}
              onChangeText={(text) => setMeetingTime(formatMeetingTimeInput(text))}
              placeholder={t("chatMeetingTimePlaceholder")}
              placeholderTextColor={colors.icon}
              keyboardType="number-pad"
              maxLength={5}
              style={[styles.modalInput, { color: colors.text, borderColor: colors.icon + "44" }]}
            />
            <TextInput
              value={meetingLocation}
              onChangeText={setMeetingLocation}
              placeholder={t("chatMeetingLocationPlaceholder")}
              placeholderTextColor={colors.icon}
              style={[styles.modalInput, { color: colors.text, borderColor: colors.icon + "44" }]}
            />
            <View style={styles.modalRow}>
              <TextInput
                value={meetingLatitude}
                onChangeText={setMeetingLatitude}
                placeholder={t("chatMeetingLatitudePlaceholder")}
                placeholderTextColor={colors.icon}
                style={[
                  styles.modalInput,
                  styles.modalInputHalf,
                  { color: colors.text, borderColor: colors.icon + "44" },
                ]}
                keyboardType="decimal-pad"
              />
              <TextInput
                value={meetingLongitude}
                onChangeText={setMeetingLongitude}
                placeholder={t("chatMeetingLongitudePlaceholder")}
                placeholderTextColor={colors.icon}
                style={[
                  styles.modalInput,
                  styles.modalInputHalf,
                  { color: colors.text, borderColor: colors.icon + "44" },
                ]}
                keyboardType="decimal-pad"
              />
            </View>
            <Pressable
              onPress={onSubmitDirectTrade}
              disabled={directTradeMutation.isPending}
              style={[
                styles.modalSaveBtn,
                { backgroundColor: directTradeMutation.isPending ? colors.icon + "55" : colors.tint },
              ]}
            >
              {directTradeMutation.isPending ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <ThemedText style={styles.modalSaveBtnText}>{t("chatDirectTradeSave")}</ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
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
  actionPanel: {
    zIndex: 12,
    elevation: 4,
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  actionBtnPrimary: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionBtnPrimaryText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  actionBtnOutline: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionBtnOutlineText: { fontSize: 14, fontWeight: "700" },
  locationRow: { flexDirection: "row", gap: 8 },
  locationRowBtn: { flex: 1 },
  liveLocationPanel: {
    marginHorizontal: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  liveLocationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    minHeight: 32,
  },
  liveLocationTitle: { fontSize: 13, fontWeight: "700", flex: 1 },
  liveMapWrap: { height: LIVE_MAP_HEIGHT, borderRadius: 10, overflow: "hidden", marginTop: 2 },
  liveMapView: { width: "100%", height: LIVE_MAP_HEIGHT },
  liveLocationLine: { fontSize: 12, opacity: 0.85 },
  liveLegendRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 2 },
  liveLegendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveLegendDot: { width: 10, height: 10, borderRadius: 5 },
  liveLegendText: { fontSize: 12, opacity: 0.85 },
  locationStamp: {
    fontSize: 11,
    opacity: 0.65,
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
  },
  modalRow: { flexDirection: "row", gap: 8 },
  modalInputHalf: { flex: 1 },
  pickerLabel: { fontSize: 12, fontWeight: "700", opacity: 0.75 },
  modalSaveBtn: {
    borderRadius: 10,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  modalSaveBtnText: { color: "#FFF", fontWeight: "700" },
});
