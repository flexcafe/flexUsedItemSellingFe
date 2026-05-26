import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  useWindowDimensions,
  View,
  type FlatList as FlatListType,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { DateTimeField } from "@/components/date-time-field";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { topOffsetForFloatingBackButton } from "@/constants/language-switcher-layout";
import { Colors } from "@/constants/theme";
import type { ChatMessage, ChatRoom } from "@/core/domain/entities/Chat";
import type { DirectTradeTransaction } from "@/core/domain/types/chat";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  CLIENT_CHAT_QUERY_KEY,
  DEFAULT_CHAT_TAKE,
  useAcceptLocation,
  useCancelTransaction,
  useChatMessages,
  useChatRooms,
  useCompleteTransaction,
  useDirectTradeDetail,
  useMarkChatRoomRead,
  useRequestDirectTrade,
  useRequestLocationChange,
  useRequestSafePayment,
  useRespondLocationChange,
  useSafePaymentStatus,
  useSendChatMessage,
  useStartLocationShare,
  useStopLocationShare,
  useSubmitSafePayment,
  useSubmitTransactionReview,
  useUpdateLocationShare,
} from "@/presentation/hooks/useClientChat";
import { useProduct, useSetActiveDeal } from "@/presentation/hooks/useProducts";
import {
  buildLeafletLiveViewHtml,
  buildLeafletPickerHtml,
} from "@/presentation/lib/leafletPickerHtml";
import {
  UI_SECTION_STAGGER_MS,
  uiCardShadow,
  uiContentEnter,
  uiFadeEnter,
  uiLayoutTransition,
  uiSectionEnter,
  usePressScale,
} from "@/presentation/lib/uiAnimations";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { useLocale } from "@/presentation/providers/LocaleProvider";
import {
  chatActionErrorMessage,
  formatChatTimestamp,
  isLocationSharingActive,
  locationPointsFromMessages,
  locationSharingByUser,
  messagePreview,
  roomPeerLabel,
} from "./chatFormat";
import {
  buildDirectTradeRequest,
  defaultMeetingDateString,
  defaultMeetingTimeString,
} from "./directTradeForm";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SAFE_PAYMENT_COMPLETABLE_STATUSES = new Set([
  "SAFE_PAYMENT_RECEIVED",
  "BUYER_COMPLETED",
  "SELLER_COMPLETED",
]);
const TRANSACTION_CANCEL_BLOCKED_STATUSES = new Set([
  "BUYER_COMPLETED",
  "CANCELLED",
  "COMPLETED",
  "REFUNDED",
  "SELLER_COMPLETED",
]);
const SAFE_PAYMENT_CANCEL_ALLOWED_STATUSES = new Set([
  "SAFE_PAYMENT_AWAITING_INSTRUCTION",
  "SAFE_PAYMENT_INSTRUCTION_SENT",
]);

function isSafePaymentCancelBlockedMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("safe payment") ||
    normalized.includes("payment submission") ||
    normalized.includes("payment already") ||
    normalized.includes("already initiated")
  );
}

function readTransactionFromMessage(
  message: ChatMessage,
): DirectTradeTransaction | null {
  const md = message.metadata;
  if (!md || typeof md !== "object") return null;
  const source =
    md.transaction && typeof md.transaction === "object"
      ? (md.transaction as Record<string, unknown>)
      : (md as Record<string, unknown>);
  const idRaw = source.id ?? source.transactionId;
  const chatRoomIdRaw = source.chatRoomId ?? message.chatRoomId;
  const typeRaw = source.type;
  const statusRaw = source.status;
  if (
    typeof idRaw !== "string" ||
    !idRaw.trim() ||
    typeof chatRoomIdRaw !== "string" ||
    !chatRoomIdRaw.trim()
  ) {
    return null;
  }
  const fallbackType =
    message.type === "DIRECT_TRADE_REQUEST"
      ? "DIRECT_TRADE"
      : message.type.startsWith("SAFE_PAYMENT") ||
          message.type === "PAYMENT_TRANSFERRED"
        ? "SAFE_PAYMENT"
        : null;
  const type =
    typeof typeRaw === "string" && typeRaw.trim() ? typeRaw : fallbackType;
  if (!type) return null;
  const status =
    typeof statusRaw === "string" && statusRaw.trim()
      ? statusRaw
      : message.type === "TRANSACTION_COMPLETED"
        ? "COMPLETED"
        : "INITIATED";
  return {
    id: idRaw.trim(),
    chatRoomId: chatRoomIdRaw.trim(),
    type,
    status,
    amount:
      typeof source.amount === "number" && Number.isFinite(source.amount)
        ? source.amount
        : 0,
    buyerCompleted: source.buyerCompleted === true,
    sellerCompleted: source.sellerCompleted === true,
    completedAt:
      typeof source.completedAt === "string" && source.completedAt.trim()
        ? source.completedAt
        : null,
  };
}

function readApiErrorInfo(error: unknown): {
  status: number | null;
  message: string;
} {
  let status: number | null = null;
  let message = "";
  if (error && typeof error === "object" && "response" in error) {
    const response = (
      error as { response?: { status?: unknown; data?: unknown } }
    ).response;
    const statusNum = Number(response?.status);
    if (Number.isFinite(statusNum)) status = statusNum;
    const data = response?.data;
    if (data && typeof data === "object" && "message" in data) {
      const raw = (data as { message?: unknown }).message;
      if (typeof raw === "string") message = raw.trim();
    }
  }
  if (!message && error instanceof Error && error.message.trim()) {
    message = error.message.trim();
  }
  return { status, message };
}

function isActiveDealError(error: unknown): boolean {
  const info = readApiErrorInfo(error);
  if (![400, 403, 409].includes(info.status ?? 0)) return false;
  const message = info.message.toLowerCase();
  return (
    message.includes("active deal") ||
    message.includes("another buyer") ||
    message.includes("selected another buyer")
  );
}

type DirectTradeErrorAction =
  | "schedule"
  | "acceptLocation"
  | "requestLocationChange"
  | "respondLocationChange"
  | "startGps";

type ActiveDealAction =
  | "directTradeStart"
  | "directTradeDetail"
  | "acceptLocation"
  | "requestLocationChange"
  | "respondLocationChange"
  | "safePaymentRequest";

type DirectTradeErrorKey =
  | "chatDirectTradeOpsMessageTypeIssue"
  | "chatDirectTradeGpsRequiresAgreed"
  | "chatDirectTradeNeedStartFirst"
  | "chatDirectTradeBuyerOnly"
  | "chatDirectTradeSellerOnly"
  | "chatDirectTradeChooseListingFirst"
  | "chatDirectTradeAlreadyListingUsePicker"
  | "chatDirectTradePendingChangeExists";

function directTradeErrorKey(
  action: DirectTradeErrorAction,
  error: unknown,
): DirectTradeErrorKey | null {
  const info = readApiErrorInfo(error);
  const messageLower = info.message.toLowerCase();

  if (info.status === 500 && messageLower.includes("messagetype")) {
    return "chatDirectTradeOpsMessageTypeIssue";
  }

  if (action === "startGps") {
    return "chatDirectTradeGpsRequiresAgreed";
  }

  if (info.status === 404) {
    return "chatDirectTradeNeedStartFirst";
  }

  if (info.status === 403) {
    if (action === "respondLocationChange") return "chatDirectTradeSellerOnly";
    return "chatDirectTradeBuyerOnly";
  }

  if (action === "requestLocationChange" && info.status === 400) {
    if (
      messageLower.includes("choose listing first") ||
      messageLower.includes("listing first")
    ) {
      return "chatDirectTradeChooseListingFirst";
    }
    if (
      messageLower.includes("already on listing") ||
      messageLower.includes("already listing")
    ) {
      return "chatDirectTradeAlreadyListingUsePicker";
    }
    if (
      messageLower.includes("pending change exists") ||
      messageLower.includes("pending")
    ) {
      return "chatDirectTradePendingChangeExists";
    }
  }

  return null;
}

type Props = {
  chatRoomId: string;
  listingTitle?: string;
  listingImageUrl?: string;
  peerName?: string;
  peerUserId?: string;
};

const LIVE_MAP_MODAL_MAX_HEIGHT = 400;

export function ChatRoomScreen({
  chatRoomId,
  listingTitle,
  listingImageUrl: listingImageUrlParam,
  peerName,
  peerUserId: peerUserIdParam,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, tf } = useLocale();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];
  const reduceMotion = useReducedMotion();
  const { height: windowHeight } = useWindowDimensions();
  const liveMapModalHeight = Math.min(
    LIVE_MAP_MODAL_MAX_HEIGHT,
    Math.round(windowHeight * 0.42),
  );
  const backTop = topOffsetForFloatingBackButton(insets.top);
  const queryClient = useQueryClient();
  const backPress = usePressScale();
  const sendPress = usePressScale();

  const inboxRoomsQuery = useChatRooms({ take: 50 });
  const roomMeta = useMemo(() => {
    const cached = queryClient.getQueryData<ChatRoom>([
      ...CLIENT_CHAT_QUERY_KEY,
      "room",
      chatRoomId,
    ]);
    if (cached) return cached;
    const items =
      inboxRoomsQuery.data?.pages.flatMap((page) => page.items) ?? [];
    return items.find((room) => room.id === chatRoomId) ?? null;
  }, [chatRoomId, inboxRoomsQuery.data, queryClient]);
  const currentUserId = user?.id ?? null;
  const sellerListingId = roomMeta?.listingId ?? null;
  const sellerListingQuery = useProduct(
    currentUserId && roomMeta?.sellerId === currentUserId
      ? sellerListingId
      : null,
  );
  const resolvedListingTitle =
    listingTitle?.trim() ||
    roomMeta?.listingTitle?.trim() ||
    t("chatListingFallback");
  const resolvedListingImageUrl =
    listingImageUrlParam?.trim() || roomMeta?.listingImageUrl?.trim() || null;
  const resolvedPeerName =
    peerName?.trim() ||
    roomMeta?.counterpartNickname?.trim() ||
    (roomMeta
      ? roomPeerLabel(
          roomMeta,
          currentUserId,
          t("chatSellerFallback"),
          t("chatBuyerFallback"),
        )
      : t("chatSellerFallback"));

  const messagesQuery = useChatMessages(chatRoomId, {
    take: DEFAULT_CHAT_TAKE,
  });
  const [safePaymentOpen, setSafePaymentOpen] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(false);
  const sendMessage = useSendChatMessage(chatRoomId);
  const markRead = useMarkChatRoomRead(chatRoomId);
  const directTradeMutation = useRequestDirectTrade(chatRoomId);
  const directTradeDetailQuery = useDirectTradeDetail(chatRoomId);
  const acceptLocationMutation = useAcceptLocation(chatRoomId);
  const requestLocationChangeMutation = useRequestLocationChange(chatRoomId);
  const respondLocationChangeMutation = useRespondLocationChange(chatRoomId);
  const requestSafePaymentMutation = useRequestSafePayment(chatRoomId);
  const submitSafePaymentMutation = useSubmitSafePayment(chatRoomId);
  const completeTransactionMutation = useCompleteTransaction(chatRoomId);
  const cancelTransactionMutation = useCancelTransaction(chatRoomId);
  const submitReviewMutation = useSubmitTransactionReview(chatRoomId);
  const startLocationMutation = useStartLocationShare(chatRoomId);
  const updateLocationMutation = useUpdateLocationShare(chatRoomId);
  const stopLocationMutation = useStopLocationShare(chatRoomId);
  const setActiveDealMutation = useSetActiveDeal();
  const [draft, setDraft] = useState("");
  const [directTradeOpen, setDirectTradeOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState(defaultMeetingDateString);
  const [meetingTime, setMeetingTime] = useState(defaultMeetingTimeString);
  const [directTradeTransaction, setDirectTradeTransaction] =
    useState<DirectTradeTransaction | null>(null);
  const [cancelledTransaction, setCancelledTransaction] =
    useState<DirectTradeTransaction | null>(null);
  // Location picker state
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [changeRequestOpen, setChangeRequestOpen] = useState(false);
  const [changeRequestAddress, setChangeRequestAddress] = useState("");
  const [changeRequestCoords, setChangeRequestCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [changeRequestTime, setChangeRequestTime] = useState("");
  const [changeRequestIsLocating, setChangeRequestIsLocating] = useState(false);
  const changeRequestGeocodeTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [payerKbzName, setPayerKbzName] = useState("");
  const [payerKbzPhone, setPayerKbzPhone] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [kbzTransactionId, setKbzTransactionId] = useState("");
  const [reviewStars, setReviewStars] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [locationUpdatedAt, setLocationUpdatedAt] = useState<string | null>(
    null,
  );
  const [isFetchingCoords, setIsFetchingCoords] = useState(false);
  const [myShareOverride, setMyShareOverride] = useState<boolean | null>(null);
  const [localLiveLocation, setLocalLiveLocation] = useState<{
    latitude: number;
    longitude: number;
    updatedAt: string;
  } | null>(null);
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [activeDealBlocked, setActiveDealBlocked] = useState(false);
  const [localActiveDealChatRoomId, setLocalActiveDealChatRoomId] = useState<
    string | null
  >(null);
  const [liveMapModalOpen, setLiveMapModalOpen] = useState(false);
  const [liveMapFocusPoint, setLiveMapFocusPoint] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const safePaymentStatusQuery = useSafePaymentStatus(
    chatRoomId,
    safePaymentOpen || completionOpen,
  );
  const listRef = useRef<FlatListType<ChatMessage>>(null);
  const messages = useMemo(() => {
    const pages = messagesQuery.data?.pages ?? [];
    return pages.flatMap((page) => page.items);
  }, [messagesQuery.data]);

  const chronological = useMemo(() => [...messages].reverse(), [messages]);
  const sharingByUser = useMemo(
    () => locationSharingByUser(chronological),
    [chronological],
  );
  const messageLocationByUser = useMemo(
    () => locationPointsFromMessages(chronological),
    [chronological],
  );
  const mySharingFromMessages = user?.id
    ? Boolean(sharingByUser[user.id])
    : isLocationSharingActive(chronological);
  const mySharingActive = myShareOverride ?? mySharingFromMessages;
  const otherSharedUserId =
    Object.keys(sharingByUser).find((id) => id !== user?.id) ?? null;
  const otherLocationUserId =
    Object.keys(messageLocationByUser).find((id) => id !== user?.id) ?? null;
  const counterpartUserId =
    roomMeta?.counterpartUserId?.trim() ||
    peerUserIdParam?.trim() ||
    otherSharedUserId ||
    otherLocationUserId ||
    chronological.find((m) => m.senderId && m.senderId !== user?.id)
      ?.senderId ||
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
  const myPoint = mySharingActive
    ? (myLiveLocation ?? localLiveLocation)
    : null;
  const counterpartPoint = counterpartSharingActive
    ? counterpartLiveLocation
    : null;
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
  const myLocationStatus = locationShareStatus(
    Boolean(myPoint),
    mySharingActive,
  );
  const peerLocationStatus = locationShareStatus(
    Boolean(counterpartPoint),
    counterpartSharingActive,
  );
  const compactStatus = `${myMarkerLabel}: ${myLocationStatus} · ${peerMarkerLabel}: ${peerLocationStatus}`;
  const safePaymentStatus = safePaymentStatusQuery.data ?? null;
  const messageTransaction = useMemo(() => {
    for (let i = chronological.length - 1; i >= 0; i -= 1) {
      const fromMessage = readTransactionFromMessage(chronological[i]);
      if (fromMessage) return fromMessage;
    }
    return null;
  }, [chronological]);
  const cashMessageTransaction =
    messageTransaction?.type === "DIRECT_TRADE" ? messageTransaction : null;
  const cashTransaction = directTradeTransaction ?? cashMessageTransaction;
  const hasDirectTrade = Boolean(cashTransaction);
  const toolsSubtitle = hasDirectTrade
    ? compactStatus
    : t("chatTradeToolsSubtitleNoDirectTrade");
  const safeTransaction = safePaymentStatus?.transaction ?? null;
  const sellerActiveDealChatRoomId =
    localActiveDealChatRoomId ??
    sellerListingQuery.data?.activeDealChatRoomId ??
    null;
  const isThisChatSellerActiveDeal = sellerActiveDealChatRoomId === chatRoomId;
  const baseCompletionTransaction = safeTransaction ?? cashTransaction;
  const completionTransaction =
    cancelledTransaction &&
    (!baseCompletionTransaction ||
      cancelledTransaction.id === baseCompletionTransaction.id)
      ? cancelledTransaction
      : baseCompletionTransaction;
  const activeTransaction = completionTransaction;
  const usesSafePaymentCompletion = Boolean(safeTransaction);
  const isSafeCompletable = Boolean(
    safeTransaction &&
    SAFE_PAYMENT_COMPLETABLE_STATUSES.has(safeTransaction.status),
  );
  const isBuyer = Boolean(
    user?.id && roomMeta?.buyerId && user.id === roomMeta.buyerId,
  );
  const canSelectActiveDealFromChat = Boolean(
    roomMeta?.listingId && !isBuyer,
  );
  const currentUserAlreadyCompleted = Boolean(
    completionTransaction &&
    (isBuyer
      ? completionTransaction.buyerCompleted
      : completionTransaction.sellerCompleted),
  );
  const detail = directTradeDetailQuery.data;
  const meetupMapPin = useMemo(() => {
    if (
      detail?.meetingLatitude != null &&
      detail?.meetingLongitude != null &&
      Number.isFinite(detail.meetingLatitude) &&
      Number.isFinite(detail.meetingLongitude)
    ) {
      return {
        latitude: detail.meetingLatitude,
        longitude: detail.meetingLongitude,
        label:
          detail.selectedLocationLabel ||
          detail.meetingLocation ||
          t("chatDirectTradeLocationLabel"),
      };
    }
    return null;
  }, [
    detail?.meetingLatitude,
    detail?.meetingLongitude,
    detail?.selectedLocationLabel,
    t,
  ]);
  const pendingLocationChangeFromMessages = useMemo(() => {
    for (let i = chronological.length - 1; i >= 0; i -= 1) {
      const type = chronological[i].type;
      if (type === "DIRECT_TRADE_LOCATION_CHANGE_REQUESTED") return true;
      if (
        type === "DIRECT_TRADE_LOCATION_CHANGE_ACCEPTED" ||
        type === "DIRECT_TRADE_LOCATION_CHANGE_DENIED"
      ) {
        return false;
      }
    }
    return false;
  }, [chronological]);
  const showPendingLocationChange = Boolean(
    detail?.pendingLocationChange || pendingLocationChangeFromMessages,
  );
  const proposedMapPin = useMemo(() => {
    if (
      !showPendingLocationChange ||
      detail?.buyerRequestedLatitude == null ||
      detail?.buyerRequestedLongitude == null ||
      !Number.isFinite(detail.buyerRequestedLatitude) ||
      !Number.isFinite(detail.buyerRequestedLongitude)
    ) {
      return null;
    }
    return {
      latitude: detail.buyerRequestedLatitude,
      longitude: detail.buyerRequestedLongitude,
      label: "Proposed",
    };
  }, [
    detail?.buyerRequestedLatitude,
    detail?.buyerRequestedLongitude,
    showPendingLocationChange,
  ]);

  const hasAnyLivePoint = Boolean(
    myPoint || counterpartPoint || meetupMapPin || proposedMapPin,
  );
  const transactionStatusUpper =
    completionTransaction?.status?.toUpperCase() ?? "";
  const isTransactionFullyCompleted =
    transactionStatusUpper === "COMPLETED";
  const isTransactionCancelled = transactionStatusUpper === "CANCELLED";
  const isTransactionCancelledOrRefunded =
    transactionStatusUpper === "CANCELLED" ||
    transactionStatusUpper === "REFUNDED";
  const isTransactionCancelBlocked =
    TRANSACTION_CANCEL_BLOCKED_STATUSES.has(transactionStatusUpper) ||
    (usesSafePaymentCompletion &&
      !SAFE_PAYMENT_CANCEL_ALLOWED_STATUSES.has(transactionStatusUpper));
  const isSafePaymentCancelBlocked =
    usesSafePaymentCompletion &&
    !SAFE_PAYMENT_CANCEL_ALLOWED_STATUSES.has(transactionStatusUpper) &&
    !TRANSACTION_CANCEL_BLOCKED_STATUSES.has(transactionStatusUpper);
  const hasConfirmedMeetingLocation = Boolean(detail?.meetingLocation?.trim());
  const canStartLiveGps = Boolean(
    hasDirectTrade &&
    !isTransactionCancelledOrRefunded &&
    !isTransactionFullyCompleted &&
    hasConfirmedMeetingLocation &&
    !activeDealBlocked &&
    !showPendingLocationChange,
  );
  const pendingRequestedLocation = useMemo(() => {
    if (detail?.buyerRequestedLocation?.trim()) {
      return detail.buyerRequestedLocation.trim();
    }
    for (let i = chronological.length - 1; i >= 0; i -= 1) {
      const m = chronological[i];
      if (m.type === "DIRECT_TRADE_LOCATION_CHANGE_REQUESTED") {
        const loc = m.metadata?.meetingLocation;
        return typeof loc === "string" && loc.trim() ? loc.trim() : null;
      }
      if (
        m.type === "DIRECT_TRADE_LOCATION_CHANGE_ACCEPTED" ||
        m.type === "DIRECT_TRADE_LOCATION_CHANGE_DENIED"
      ) {
        return null;
      }
    }
    return null;
  }, [chronological, detail?.buyerRequestedLocation]);
  const latestPendingChangeMessageId = useMemo(() => {
    for (let i = chronological.length - 1; i >= 0; i -= 1) {
      const m = chronological[i];
      if (m.type === "DIRECT_TRADE_LOCATION_CHANGE_REQUESTED") return m.id;
      if (
        m.type === "DIRECT_TRADE_LOCATION_CHANGE_ACCEPTED" ||
        m.type === "DIRECT_TRADE_LOCATION_CHANGE_DENIED"
      ) {
        return null;
      }
    }
    return null;
  }, [chronological]);
  const canCompleteTrade = Boolean(
    completionTransaction &&
    !currentUserAlreadyCompleted &&
    !isTransactionCancelBlocked &&
    (usesSafePaymentCompletion
      ? isSafeCompletable
      : completionTransaction.status !== "COMPLETED") &&
    // For meetup flows: must have agreed meeting place and no pending change
    (!hasDirectTrade ||
      (detail?.meetingLocation &&
        !showPendingLocationChange &&
        !isTransactionCancelledOrRefunded)),
  );
  const waitingForCounterpartyComplete = Boolean(
    completionTransaction &&
    completionTransaction.status !== "COMPLETED" &&
    currentUserAlreadyCompleted,
  );
  const canShowReviewSection = Boolean(
    completionTransaction &&
      !isTransactionCancelledOrRefunded &&
      (currentUserAlreadyCompleted ||
        completionTransaction.status === "COMPLETED"),
  );
  const canReview = Boolean(
    completionTransaction &&
      !isTransactionCancelledOrRefunded &&
      ((isBuyer && completionTransaction.buyerCompleted) ||
        (!isBuyer && completionTransaction.sellerCompleted)),
  );
  const canCancelTransaction = Boolean(
    completionTransaction && !isTransactionCancelBlocked,
  );
  const canShowCompletionTool = Boolean(
    chatRoomId &&
      (completionTransaction ||
        hasDirectTrade ||
        detail?.transactionId ||
        isThisChatSellerActiveDeal),
  );
  const markActiveDealBlocked = useCallback(() => {
    setActiveDealBlocked(true);
    setToolsExpanded(true);
  }, []);

  const onSelectActiveDealFromChat = useCallback(() => {
    const productId = roomMeta?.listingId;
    if (!productId || setActiveDealMutation.isPending) return;
    setActiveDealMutation.mutate(
      { productId, chatRoomId },
      {
        onSuccess: async () => {
          setActiveDealBlocked(false);
          setLocalActiveDealChatRoomId(chatRoomId);
          await sellerListingQuery.refetch();
          await directTradeDetailQuery.refetch();
          Alert.alert(
            t("productsActiveDealTitle"),
            t("productsActiveDealUpdated"),
          );
        },
        onError: () => {
          Alert.alert(
            t("productsActiveDealTitle"),
            t("productsActiveDealFailed"),
          );
        },
      },
    );
  }, [
    chatRoomId,
    directTradeDetailQuery,
    roomMeta?.listingId,
    sellerListingQuery,
    setActiveDealMutation,
    t,
  ]);

  const showActiveDealBlockedAlert = useCallback(
    (title: string) => {
      const message = `${t("chatActiveDealBlockedMessage")}\n\n${
        canSelectActiveDealFromChat
          ? t("chatActiveDealSellerProductNote")
          : t("chatActiveDealBuyerProductNote")
      }`;
      if (canSelectActiveDealFromChat) {
        Alert.alert(title, message, [
          {
            text: t("chatActiveDealSelectThisBuyer"),
            onPress: onSelectActiveDealFromChat,
          },
          { text: t("chatActiveDealDismiss"), style: "cancel" },
        ]);
        return;
      }
      Alert.alert(title, message);
    },
    [canSelectActiveDealFromChat, onSelectActiveDealFromChat, t],
  );

  const shouldTreatAsActiveDealBlock = useCallback(
    (action: ActiveDealAction, error: unknown) => {
      if (isActiveDealError(error)) return true;
      const info = readApiErrorInfo(error);
      const status = info.status;
      if (action === "safePaymentRequest" && status === 409) return true;
      if (action === "directTradeStart" && status === 400) return true;
      if (action === "directTradeDetail" && status === 403) return true;
      if (
        (action === "acceptLocation" || action === "requestLocationChange") &&
        status === 403 &&
        isBuyer
      ) {
        return true;
      }
      if (action === "respondLocationChange" && status === 403 && !isBuyer) {
        return true;
      }
      return false;
    },
    [isBuyer],
  );

  useEffect(() => {
    if (!isBuyer && showPendingLocationChange) {
      setToolsExpanded(true);
    }
  }, [isBuyer, showPendingLocationChange]);

  useEffect(() => {
    if (directTradeDetailQuery.isSuccess) {
      setActiveDealBlocked(false);
      return;
    }
    if (
      shouldTreatAsActiveDealBlock(
        "directTradeDetail",
        directTradeDetailQuery.error,
      )
    ) {
      markActiveDealBlocked();
    }
  }, [
    directTradeDetailQuery.error,
    directTradeDetailQuery.isSuccess,
    markActiveDealBlocked,
    shouldTreatAsActiveDealBlock,
  ]);

  useEffect(() => {
    if (pendingLocationChangeFromMessages && chatRoomId) {
      void directTradeDetailQuery.refetch();
    }
  }, [chatRoomId, directTradeDetailQuery, pendingLocationChangeFromMessages]);

  const liveMapHtml = useMemo(() => {
    const markers = [];
    if (meetupMapPin) {
      markers.push({
        latitude: meetupMapPin.latitude,
        longitude: meetupMapPin.longitude,
        label: meetupMapPin.label,
        color: "#FF8F00",
      });
    }
    if (proposedMapPin) {
      markers.push({
        latitude: proposedMapPin.latitude,
        longitude: proposedMapPin.longitude,
        label: proposedMapPin.label,
        color: "#78909C",
        kind: "proposed" as const,
      });
    }
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
    const routeLine =
      myPoint && meetupMapPin
        ? {
            fromLatitude: myPoint.latitude,
            fromLongitude: myPoint.longitude,
            toLatitude: meetupMapPin.latitude,
            toLongitude: meetupMapPin.longitude,
            color: "#1565C0",
          }
        : null;
    return buildLeafletLiveViewHtml(markers, routeLine, liveMapFocusPoint);
  }, [
    counterpartPoint,
    liveMapFocusPoint,
    meetupMapPin,
    myMarkerLabel,
    myPoint,
    peerMarkerLabel,
    proposedMapPin,
  ]);

  useEffect(() => {
    if (!safePaymentOpen) return;
    const nextName =
      safePaymentStatus?.payerKbzName ??
      safePaymentStatus?.buyerKbzAccountName ??
      "";
    const nextPhone =
      safePaymentStatus?.payerKbzPhone ??
      safePaymentStatus?.buyerKbzPhoneNumber ??
      "";
    const nextAmount =
      safePaymentStatus?.paymentAmount != null
        ? String(safePaymentStatus.paymentAmount)
        : "";
    const nextTxn = safePaymentStatus?.kbzTransactionId ?? "";
    setPayerKbzName(nextName);
    setPayerKbzPhone(nextPhone);
    setPaymentAmount(nextAmount);
    setKbzTransactionId(nextTxn);
  }, [safePaymentOpen, safePaymentStatus]);

  useEffect(() => {
    if (myShareOverride == null) return;
    if (myShareOverride === mySharingFromMessages) setMyShareOverride(null);
  }, [myShareOverride, mySharingFromMessages]);

  useEffect(() => {
    if (!messageTransaction || messageTransaction.type !== "DIRECT_TRADE")
      return;
    if (cancelledTransaction?.id === messageTransaction.id) return;
    setDirectTradeTransaction((prev) => {
      if (!prev || prev.id !== messageTransaction.id) return messageTransaction;
      return {
        ...prev,
        status: messageTransaction.status || prev.status,
        buyerCompleted:
          messageTransaction.buyerCompleted || prev.buyerCompleted,
        sellerCompleted:
          messageTransaction.sellerCompleted || prev.sellerCompleted,
        completedAt: messageTransaction.completedAt ?? prev.completedAt,
      };
    });
  }, [cancelledTransaction?.id, messageTransaction]);

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
    if (activeDealBlocked) {
      showActiveDealBlockedAlert(t("chatDirectTradeTitle"));
      return;
    }
    setMeetingDate(defaultMeetingDateString());
    setMeetingTime(defaultMeetingTimeString());
    setDirectTradeOpen(true);
  }, [activeDealBlocked, showActiveDealBlockedAlert, t]);

  const openSafePaymentModal = useCallback(() => {
    if (activeDealBlocked) {
      showActiveDealBlockedAlert(t("chatSafePaymentTitle"));
      return;
    }
    setSafePaymentOpen(true);
    void safePaymentStatusQuery.refetch();
  }, [
    activeDealBlocked,
    safePaymentStatusQuery,
    showActiveDealBlockedAlert,
    t,
  ]);

  const openCompletionModal = useCallback(() => {
    setCompletionOpen(true);
    setReviewSubmitted(false);
    setReviewStars(5);
    setReviewComment("");
    void safePaymentStatusQuery.refetch();
  }, [safePaymentStatusQuery]);

  const onRequestSafePayment = useCallback(() => {
    if (!chatRoomId) return;
    if (activeDealBlocked) {
      showActiveDealBlockedAlert(t("chatSafePaymentTitle"));
      return;
    }
    if (!isBuyer) {
      Alert.alert(t("chatSafePaymentTitle"), t("chatSafePaymentBuyerOnly"));
      return;
    }
    requestSafePaymentMutation.mutate(undefined, {
      onSuccess: async () => {
        setActiveDealBlocked(false);
        setCancelledTransaction(null);
        await safePaymentStatusQuery.refetch();
        Alert.alert(
          t("chatSafePaymentTitle"),
          t("chatSafePaymentRequestSuccess"),
        );
      },
      onError: (error) => {
        if (shouldTreatAsActiveDealBlock("safePaymentRequest", error)) {
          markActiveDealBlocked();
          Alert.alert(t("chatSafePaymentTitle"), t("chatActiveDealBlockedMessage"));
          return;
        }
        Alert.alert(
          t("chatSafePaymentTitle"),
          chatActionErrorMessage(error, t("chatSafePaymentLoadFailed")),
        );
      },
    });
  }, [
    chatRoomId,
    activeDealBlocked,
    isBuyer,
    markActiveDealBlocked,
    requestSafePaymentMutation,
    safePaymentStatusQuery,
    showActiveDealBlockedAlert,
    shouldTreatAsActiveDealBlock,
    t,
  ]);

  const onSubmitSafePayment = useCallback(() => {
    if (!chatRoomId) return;
    if (!isBuyer) {
      Alert.alert(t("chatSafePaymentTitle"), t("chatSafePaymentBuyerOnly"));
      return;
    }
    const amount = Number(paymentAmount);
    const expectedAmount = safePaymentStatus?.transaction?.amount;
    if (
      !payerKbzName.trim() ||
      !payerKbzPhone.trim() ||
      !kbzTransactionId.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      Alert.alert(t("chatSafePaymentTitle"), t("chatSafePaymentValidation"));
      return;
    }
    if (
      expectedAmount != null &&
      Number.isFinite(expectedAmount) &&
      amount !== expectedAmount
    ) {
      Alert.alert(
        t("chatSafePaymentTitle"),
        t("chatSafePaymentAmountMismatch"),
      );
      return;
    }
    submitSafePaymentMutation.mutate(
      {
        payerKbzName: payerKbzName.trim(),
        payerKbzPhone: payerKbzPhone.trim(),
        paymentAmount: amount,
        kbzTransactionId: kbzTransactionId.trim(),
      },
      {
        onSuccess: async () => {
          await safePaymentStatusQuery.refetch();
          Alert.alert(
            t("chatSafePaymentTitle"),
            t("chatSafePaymentSubmitSuccess"),
          );
          setSafePaymentOpen(false);
        },
        onError: (error) => {
          Alert.alert(
            t("chatSafePaymentTitle"),
            chatActionErrorMessage(error, t("chatSafePaymentLoadFailed")),
          );
        },
      },
    );
  }, [
    chatRoomId,
    isBuyer,
    kbzTransactionId,
    payerKbzName,
    payerKbzPhone,
    paymentAmount,
    safePaymentStatus,
    submitSafePaymentMutation,
    safePaymentStatusQuery,
    t,
  ]);

  const onCompleteTransaction = useCallback(() => {
    const transactionId = completionTransaction?.id;
    if (!transactionId) {
      Alert.alert(
        t("chatCompleteTradeTitle"),
        t("chatCompleteTradeUnavailable"),
      );
      return;
    }
    if (usesSafePaymentCompletion && !isSafeCompletable) {
      Alert.alert(
        t("chatCompleteTradeTitle"),
        t("chatCompleteTradeWaitAdminReceived"),
      );
      return;
    }
    if (
      currentUserAlreadyCompleted &&
      completionTransaction?.status !== "COMPLETED"
    ) {
      Alert.alert(
        t("chatCompleteTradeTitle"),
        t("chatCompleteTradePendingBoth"),
      );
      return;
    }
    completeTransactionMutation.mutate(
      { transactionId },
      {
        onSuccess: async (updated) => {
          if (!usesSafePaymentCompletion) {
            setDirectTradeTransaction(updated);
          }
          // Stop GPS sharing since this user completed
          if (mySharingActive) {
            stopLocationMutation.mutate(undefined, {
              onSettled: () => setMyShareOverride(false),
            });
          }
          await safePaymentStatusQuery.refetch();
          Alert.alert(
            t("chatCompleteTradeTitle"),
            t("chatCompleteTradeSuccess"),
          );
        },
        onError: (error) => {
          const message = chatActionErrorMessage(
            error,
            t("chatSafePaymentLoadFailed"),
          );
          const normalized = message.toLowerCase();
          const mapped = normalized.includes(
            "cannot complete until admin has confirmed",
          )
            ? t("chatCompleteTradeWaitAdminReceived")
            : normalized.includes("safe payment was started") ||
                normalized.includes("finish the safe payment flow")
              ? t("chatCompleteTradeUseSafePaymentId")
              : normalized.includes("already completed via safe payment")
                ? t("chatCompleteTradeAlreadyDone")
                : message;
          Alert.alert(t("chatCompleteTradeTitle"), mapped);
        },
      },
    );
  }, [
    completionTransaction,
    completeTransactionMutation,
    currentUserAlreadyCompleted,
    isSafeCompletable,
    mySharingActive,
    safePaymentStatusQuery,
    stopLocationMutation,
    t,
    usesSafePaymentCompletion,
  ]);

  const onCancelTransaction = useCallback(() => {
    const transactionId = completionTransaction?.id;
    if (!transactionId) {
      Alert.alert(t("chatCancelTradeTitle"), t("chatCompleteTradeUnavailable"));
      return;
    }
    if (isTransactionCancelBlocked) {
      Alert.alert(
        t("chatCancelTradeTitle"),
        t(
          isSafePaymentCancelBlocked
            ? "chatCancelTradeSafePaymentBlocked"
            : "chatCancelTradeBlocked",
        ),
      );
      return;
    }
    Alert.alert(t("chatCancelTradeTitle"), t("chatCancelTradeConfirm"), [
      { text: t("chatActiveDealDismiss"), style: "cancel" },
      {
        text: t("chatCancelTradeAction"),
        style: "destructive",
        onPress: () => {
          cancelTransactionMutation.mutate(
            { transactionId },
            {
              onSuccess: async (updated) => {
                setCancelledTransaction(updated);
                if (updated.type === "DIRECT_TRADE") {
                  setDirectTradeTransaction(updated);
                }
                setMyShareOverride(false);
                setLocalLiveLocation(null);
                await safePaymentStatusQuery.refetch();
                Alert.alert(
                  t("chatCancelTradeTitle"),
                  t("chatCancelTradeSuccess"),
                );
              },
              onError: (error) => {
                const info = readApiErrorInfo(error);
                if (info.status === 400) {
                  const safePaymentBlocked =
                    isSafePaymentCancelBlocked ||
                    isSafePaymentCancelBlockedMessage(info.message);
                  Alert.alert(
                    t("chatCancelTradeTitle"),
                    t(
                      safePaymentBlocked
                        ? "chatCancelTradeSafePaymentBlocked"
                        : "chatCancelTradeBlocked",
                    ),
                  );
                  return;
                }
                Alert.alert(
                  t("chatCancelTradeTitle"),
                  chatActionErrorMessage(error, t("chatCancelTradeFailed")),
                );
              },
            },
          );
        },
      },
    ]);
  }, [
    cancelTransactionMutation,
    completionTransaction?.id,
    isTransactionCancelBlocked,
    isSafePaymentCancelBlocked,
    safePaymentStatusQuery,
    t,
  ]);

  const onSubmitReview = useCallback(() => {
    const transactionId = completionTransaction?.id;
    if (!transactionId) {
      Alert.alert(t("chatReviewTitle"), t("chatCompleteTradeUnavailable"));
      return;
    }
    if (!canReview) {
      Alert.alert(t("chatReviewTitle"), t("chatReviewCompleteFirst"));
      return;
    }
    if (!Number.isFinite(reviewStars) || reviewStars < 1 || reviewStars > 5) {
      Alert.alert(t("chatReviewTitle"), t("chatReviewValidation"));
      return;
    }
    submitReviewMutation.mutate(
      {
        transactionId,
        input: {
          stars: reviewStars,
          comment: reviewComment.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          setReviewSubmitted(true);
          setCompletionOpen(false);
          Alert.alert(t("chatReviewTitle"), t("chatReviewSuccess"));
        },
        onError: (error) => {
          const status = (
            error as { response?: { status?: number } } | undefined
          )?.response?.status;
          if (status === 400) {
            Alert.alert(t("chatReviewTitle"), t("chatReviewCompleteFirst"));
            return;
          }
          Alert.alert(
            t("chatReviewTitle"),
            chatActionErrorMessage(error, t("chatSafePaymentLoadFailed")),
          );
        },
      },
    );
  }, [
    canReview,
    completionTransaction?.id,
    reviewComment,
    reviewStars,
    submitReviewMutation,
    t,
  ]);

  const getCurrentCoords = useCallback(
    async (shouldPrompt: boolean) => {
      const permission = shouldPrompt
        ? await Location.requestForegroundPermissionsAsync()
        : await Location.getForegroundPermissionsAsync();
      if (permission.status !== "granted")
        throw new Error(t("chatLocationPermissionDenied"));
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
    },
    [t],
  );

  const onSubmitDirectTrade = useCallback(() => {
    if (!chatRoomId) return;
    if (activeDealBlocked) {
      showActiveDealBlockedAlert(t("chatDirectTradeTitle"));
      return;
    }

    const built = buildDirectTradeRequest({
      meetingDate,
      meetingTime,
    });

    if ("errorKey" in built) {
      Alert.alert(t("chatDirectTradeTitle"), t(built.errorKey));
      return;
    }

    directTradeMutation.mutate(built.payload, {
      onSuccess: (transaction) => {
        setActiveDealBlocked(false);
        setCancelledTransaction(null);
        setDirectTradeTransaction(transaction);
        setDirectTradeOpen(false);
        // Clear stale meetup-place detail immediately after restart.
        queryClient.removeQueries({
          queryKey: [...CLIENT_CHAT_QUERY_KEY, "directTrade", chatRoomId],
          exact: true,
        });
        void directTradeDetailQuery.refetch();
        Alert.alert(t("chatDirectTradeTitle"), t("chatDirectTradeSaved"));
      },
      onError: (error) => {
        if (shouldTreatAsActiveDealBlock("directTradeStart", error)) {
          markActiveDealBlocked();
          Alert.alert(t("chatDirectTradeTitle"), t("chatActiveDealBlockedMessage"));
          return;
        }
        const key = directTradeErrorKey("schedule", error);
        Alert.alert(
          t("chatDirectTradeTitle"),
          key
            ? t(key)
            : chatActionErrorMessage(error, t("chatDirectTradeFailed")),
        );
      },
    });
  }, [
    chatRoomId,
    activeDealBlocked,
    directTradeMutation,
    directTradeDetailQuery,
    markActiveDealBlocked,
    meetingDate,
    meetingTime,
    queryClient,
    showActiveDealBlockedAlert,
    shouldTreatAsActiveDealBlock,
    t,
  ]);

  // ===== Location picker handlers =====

  const onAcceptLocation = useCallback(
    (locationLabel: string) => {
      if (!chatRoomId) return;
      if (isTransactionCancelledOrRefunded) {
        Alert.alert(t("chatDirectTradeTitle"), t("chatCancelTradeBlocked"));
        return;
      }
      if (activeDealBlocked) {
        showActiveDealBlockedAlert(t("chatDirectTradeTitle"));
        return;
      }
      acceptLocationMutation.mutate(
        { locationLabel },
        {
          onSuccess: () => {
            setActiveDealBlocked(false);
            void directTradeDetailQuery.refetch();
            setLocationPickerOpen(false);
          },
          onError: (error) => {
            if (shouldTreatAsActiveDealBlock("acceptLocation", error)) {
              markActiveDealBlocked();
              Alert.alert(t("chatDirectTradeTitle"), t("chatActiveDealBlockedMessage"));
              return;
            }
            const info = readApiErrorInfo(error);
            if (info.status === 404) {
              setLocationPickerOpen(false);
              setDirectTradeOpen(true);
              Alert.alert(
                t("chatDirectTradeTitle"),
                t("chatDirectTradeNeedStartFirst"),
              );
              return;
            }
            const key = directTradeErrorKey("acceptLocation", error);
            if (key) {
              Alert.alert(t("chatDirectTradeTitle"), t(key));
              return;
            }
            Alert.alert(
              t("chatDirectTradeTitle"),
              chatActionErrorMessage(error, t("chatDirectTradeFailed")),
            );
          },
        },
      );
    },
    [
      acceptLocationMutation,
      activeDealBlocked,
      chatRoomId,
      directTradeDetailQuery,
      isTransactionCancelledOrRefunded,
      markActiveDealBlocked,
      showActiveDealBlockedAlert,
      shouldTreatAsActiveDealBlock,
      t,
    ],
  );

  const runReverseGeocodeChangeRequest = useCallback(
    async (coords: { latitude: number; longitude: number }) => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") return;
        const results = await Location.reverseGeocodeAsync(coords);
        const first = results[0];
        if (!first) return;
        const parts: string[] = [];
        if (first.name) parts.push(first.name);
        if (first.street) parts.push(first.street);
        if (first.city) parts.push(first.city);
        if (first.region) parts.push(first.region);
        const text = parts.join(", ").trim();
        if (!text) return;
        setChangeRequestAddress(text);
      } catch {
        // Reverse geocode is optional; user can type manually.
      }
    },
    [],
  );

  const handleChangeRequestMapMessage = useCallback(
    (raw: string) => {
      try {
        const data = JSON.parse(raw) as {
          latitude: number;
          longitude: number;
        } | null;
        if (
          data &&
          typeof data.latitude === "number" &&
          typeof data.longitude === "number"
        ) {
          setChangeRequestCoords({
            latitude: data.latitude,
            longitude: data.longitude,
          });
          if (changeRequestGeocodeTimerRef.current) {
            clearTimeout(changeRequestGeocodeTimerRef.current);
          }
          changeRequestGeocodeTimerRef.current = setTimeout(() => {
            changeRequestGeocodeTimerRef.current = null;
            void runReverseGeocodeChangeRequest(data);
          }, 450);
        }
      } catch {
        // ignore malformed webview message
      }
    },
    [runReverseGeocodeChangeRequest],
  );

  const handleChangeRequestUseCurrentLocation = useCallback(async () => {
    setChangeRequestIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("chatDirectTradeTitle"), t("chatMeetingCoordsInvalid"));
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setChangeRequestCoords(coords);
      void runReverseGeocodeChangeRequest(coords);
    } catch {
      Alert.alert(t("chatDirectTradeTitle"), t("chatGpsError"));
    } finally {
      setChangeRequestIsLocating(false);
    }
  }, [runReverseGeocodeChangeRequest, t]);

  const onSubmitLocationChange = useCallback(() => {
    if (!chatRoomId) return;
    if (isTransactionCancelledOrRefunded) {
      Alert.alert(t("chatDirectTradeTitle"), t("chatCancelTradeBlocked"));
      return;
    }
    if (activeDealBlocked) {
      showActiveDealBlockedAlert(t("chatDirectTradeTitle"));
      return;
    }
    if (!changeRequestAddress.trim() || !changeRequestCoords) {
      Alert.alert(t("chatDirectTradeTitle"), t("chatMeetingCoordsInvalid"));
      return;
    }
    const meetingTimeRaw =
      changeRequestTime.trim() || detail?.meetingTime?.trim() || "";
    requestLocationChangeMutation.mutate(
      {
        meetingTime: meetingTimeRaw,
        meetingLocation: changeRequestAddress.trim(),
        meetingLatitude: changeRequestCoords.latitude,
        meetingLongitude: changeRequestCoords.longitude,
      },
      {
        onSuccess: () => {
          setActiveDealBlocked(false);
          void directTradeDetailQuery.refetch();
          setChangeRequestOpen(false);
        },
        onError: (error) => {
          if (shouldTreatAsActiveDealBlock("requestLocationChange", error)) {
            markActiveDealBlocked();
            setChangeRequestOpen(false);
            Alert.alert(t("chatDirectTradeTitle"), t("chatActiveDealBlockedMessage"));
            return;
          }
          const info = readApiErrorInfo(error);
          const key = directTradeErrorKey("requestLocationChange", error);
          if (key === "chatDirectTradeChooseListingFirst") {
            setChangeRequestOpen(false);
            setLocationPickerOpen(true);
            Alert.alert(t("chatDirectTradeTitle"), t(key));
            return;
          }
          if (key === "chatDirectTradeAlreadyListingUsePicker") {
            setChangeRequestOpen(false);
            setLocationPickerOpen(true);
            Alert.alert(t("chatDirectTradeTitle"), t(key));
            return;
          }
          if (key === "chatDirectTradePendingChangeExists") {
            setChangeRequestOpen(false);
            void directTradeDetailQuery.refetch();
            Alert.alert(t("chatDirectTradeTitle"), t(key));
            return;
          }
          if (info.status === 404) {
            setChangeRequestOpen(false);
            setDirectTradeOpen(true);
            Alert.alert(
              t("chatDirectTradeTitle"),
              t("chatDirectTradeNeedStartFirst"),
            );
            return;
          }
          if (key) {
            setChangeRequestOpen(false);
            Alert.alert(t("chatDirectTradeTitle"), t(key));
            return;
          }
          Alert.alert(
            t("chatDirectTradeTitle"),
            chatActionErrorMessage(error, t("chatDirectTradeFailed")),
          );
        },
      },
    );
  }, [
    activeDealBlocked,
    changeRequestAddress,
    changeRequestCoords,
    chatRoomId,
    directTradeDetailQuery,
    isTransactionCancelledOrRefunded,
    markActiveDealBlocked,
    requestLocationChangeMutation,
    showActiveDealBlockedAlert,
    shouldTreatAsActiveDealBlock,
    t,
  ]);

  const onRespondLocationChange = useCallback(
    (accepted: boolean) => {
      if (!chatRoomId) return;
      if (isTransactionCancelledOrRefunded) {
        Alert.alert(t("chatDirectTradeTitle"), t("chatCancelTradeBlocked"));
        return;
      }
      if (activeDealBlocked) {
        showActiveDealBlockedAlert(t("chatDirectTradeTitle"));
        return;
      }
      respondLocationChangeMutation.mutate(
        { accepted },
        {
          onSuccess: () => {
            setActiveDealBlocked(false);
            void directTradeDetailQuery.refetch();
          },
          onError: (error) => {
            if (shouldTreatAsActiveDealBlock("respondLocationChange", error)) {
              markActiveDealBlocked();
              Alert.alert(t("chatDirectTradeTitle"), t("chatActiveDealBlockedMessage"));
              return;
            }
            const info = readApiErrorInfo(error);
            if (info.status === 404) {
              setDirectTradeOpen(true);
              Alert.alert(
                t("chatDirectTradeTitle"),
                t("chatDirectTradeNeedStartFirst"),
              );
              return;
            }
            const key = directTradeErrorKey("respondLocationChange", error);
            if (key) {
              Alert.alert(t("chatDirectTradeTitle"), t(key));
              return;
            }
            Alert.alert(
              t("chatDirectTradeTitle"),
              chatActionErrorMessage(error, t("chatDirectTradeFailed")),
            );
          },
        },
      );
    },
    [
      activeDealBlocked,
      chatRoomId,
      directTradeDetailQuery,
      isTransactionCancelledOrRefunded,
      markActiveDealBlocked,
      respondLocationChangeMutation,
      showActiveDealBlockedAlert,
      shouldTreatAsActiveDealBlock,
      t,
    ],
  );

  const shareCoords = useCallback(
    async (mode: "start" | "update", silent = false) => {
      if (!chatRoomId || !hasDirectTrade || isFetchingCoords) return;
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
        const mutation =
          mode === "start" ? startLocationMutation : updateLocationMutation;
        const failKey =
          mode === "start"
            ? "chatLocationStartFailed"
            : "chatLocationUpdateFailed";
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
              Alert.alert(
                t("chatDirectTradeTitle"),
                t("chatLocationAlreadyActive"),
              );
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
            t(
              mode === "start"
                ? "chatLocationStartFailed"
                : "chatLocationUpdateFailed",
            ),
          ),
        );
      } finally {
        setIsFetchingCoords(false);
      }
    },
    [
      chatRoomId,
      getCurrentCoords,
      hasDirectTrade,
      isFetchingCoords,
      startLocationMutation,
      t,
      updateLocationMutation,
    ],
  );

  const onStartLocationShare = useCallback(() => {
    if (!canStartLiveGps) {
      Alert.alert(
        t("chatDirectTradeTitle"),
        t("chatDirectTradeGpsRequiresAgreed"),
      );
      return;
    }
    void shareCoords("start");
  }, [canStartLiveGps, shareCoords, t]);

  const onUpdateLocationShare = useCallback(() => {
    if (
      !hasDirectTrade ||
      isTransactionFullyCompleted ||
      isTransactionCancelledOrRefunded
    ) {
      return;
    }
    void shareCoords("update");
  }, [
    hasDirectTrade,
    isTransactionCancelledOrRefunded,
    isTransactionFullyCompleted,
    shareCoords,
  ]);

  const onStopLocationShare = useCallback(() => {
    if (
      !hasDirectTrade ||
      isTransactionFullyCompleted ||
      isTransactionCancelledOrRefunded
    ) {
      return;
    }
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
  }, [
    chatRoomId,
    hasDirectTrade,
    isTransactionCancelledOrRefunded,
    isTransactionFullyCompleted,
    stopLocationMutation,
    t,
  ]);

  useEffect(() => {
    if (
      !chatRoomId ||
      !hasDirectTrade ||
      !mySharingActive ||
      isTransactionCancelledOrRefunded ||
      isTransactionFullyCompleted
    ) {
      return;
    }
    const id = setInterval(() => {
      if (updateLocationMutation.isPending) return;
      void shareCoords("update", true);
    }, 3000);
    return () => clearInterval(id);
  }, [
    chatRoomId,
    hasDirectTrade,
    isTransactionCancelledOrRefunded,
    mySharingActive,
    shareCoords,
    isTransactionFullyCompleted,
    updateLocationMutation.isPending,
  ]);

  useEffect(() => {
    if (
      !chatRoomId ||
      !hasDirectTrade ||
      isTransactionCancelledOrRefunded ||
      isTransactionFullyCompleted ||
      (!mySharingActive && !counterpartSharingActive)
    ) {
      return;
    }
    const id = setInterval(() => {
      void messagesQuery.refetch();
    }, 3000);
    return () => clearInterval(id);
  }, [
    chatRoomId,
    counterpartSharingActive,
    hasDirectTrade,
    isTransactionCancelledOrRefunded,
    isTransactionFullyCompleted,
    messagesQuery,
    mySharingActive,
  ]);

  useEffect(() => {
    if (hasDirectTrade || !liveMapModalOpen) return;
    setLiveMapModalOpen(false);
  }, [hasDirectTrade, liveMapModalOpen]);

  const onMessagesScroll = useCallback(
    (offsetY: number) => {
      if (offsetY > 72) return;
      if (!messagesQuery.hasNextPage || messagesQuery.isFetchingNextPage)
        return;
      void messagesQuery.fetchNextPage();
    },
    [messagesQuery],
  );

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isMine = item.senderId != null && item.senderId === user?.id;
      const isSystem = item.type !== "TEXT" || item.senderId == null;
      const isDirectTrade = item.type === "DIRECT_TRADE_REQUEST";

      const tradeMeta = isDirectTrade
        ? (item.metadata as Record<string, unknown>)
        : null;

      return (
        <Animated.View
          entering={uiContentEnter(reduceMotion)}
          layout={uiLayoutTransition}
          style={[
            styles.messageRow,
            isMine ? styles.messageRowMine : styles.messageRowOther,
          ]}
        >
          <View
            style={[
              styles.bubble,
              isSystem && styles.bubbleSystem,
              isDirectTrade && styles.bubbleDirectTrade,
              isMine
                ? { backgroundColor: colors.tint }
                : {
                    backgroundColor: colors.icon + "22",
                    borderColor: colors.icon + "33",
                  },
            ]}
          >
            {isDirectTrade ? (
              <DirectTradeRequestCard
                metadata={tradeMeta}
                t={t}
                isMine={isMine}
                colors={colors}
              />
            ) : item.type === "DIRECT_TRADE_LOCATION_ACCEPTED" ||
              item.type === "DIRECT_TRADE_LOCATION_CHANGE_ACCEPTED" ? (
              <DirectTradeLocationMessage
                message={item}
                t={t}
                isMine={isMine}
                colors={colors}
                accepted
              />
            ) : item.type === "DIRECT_TRADE_LOCATION_CHANGE_REQUESTED" ? (
              <DirectTradeLocationMessage
                message={item}
                t={t}
                isMine={isMine}
                colors={colors}
                accepted={false}
              />
            ) : item.type === "DIRECT_TRADE_LOCATION_CHANGE_DENIED" ? (
              <DirectTradeLocationMessage
                message={item}
                t={t}
                isMine={isMine}
                colors={colors}
                accepted={false}
                denied
              />
            ) : (
              <>
                {isSystem ? (
                  <ThemedText style={styles.systemType}>
                    {item.type.replaceAll("_", " ")}
                  </ThemedText>
                ) : null}
                <ThemedText
                  style={[styles.bubbleText, isMine && styles.bubbleTextMine]}
                >
                  {messagePreview(item) || t("chatSystemMessage")}
                </ThemedText>
              </>
            )}
            <ThemedText
              style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}
            >
              {formatChatTimestamp(item.createdAt)}
            </ThemedText>
          </View>
        </Animated.View>
      );
    },
    [
      colors,
      isBuyer,
      latestPendingChangeMessageId,
      onRespondLocationChange,
      reduceMotion,
      respondLocationChangeMutation.isPending,
      showPendingLocationChange,
      t,
      user?.id,
    ],
  );

  return (
    <ThemedView style={styles.screen}>
      <AnimatedPressable
        onPress={() => router.back()}
        onPressIn={backPress.handlers.onPressIn}
        onPressOut={backPress.handlers.onPressOut}
        style={[styles.backBtn, { top: backTop }, backPress.style]}
        accessibilityRole="button"
        accessibilityLabel={t("productsComposerBack")}
      >
        <MaterialIcons name="arrow-back" size={22} color="#FFF" />
      </AnimatedPressable>

      <Animated.View
        entering={uiSectionEnter(0, reduceMotion)}
        style={[styles.header, { paddingTop: backTop + 44 }]}
      >
        {resolvedListingImageUrl ? (
          <Image
            source={{ uri: resolvedListingImageUrl }}
            style={styles.headerThumb}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.headerThumb,
              styles.headerThumbFallback,
              { backgroundColor: colors.tint + "18" },
            ]}
          >
            <MaterialIcons name="inventory-2" size={20} color={colors.tint} />
          </View>
        )}
        <View style={styles.headerText}>
          <ThemedText
            type="defaultSemiBold"
            style={styles.headerTitle}
            numberOfLines={1}
          >
            {resolvedListingTitle}
          </ThemedText>
          <ThemedText style={styles.headerSubtitle} numberOfLines={1}>
            {resolvedPeerName}
          </ThemedText>
        </View>
      </Animated.View>

      {!isBuyer && showPendingLocationChange ? (
        <Animated.View
          entering={uiSectionEnter(UI_SECTION_STAGGER_MS, reduceMotion)}
          layout={uiLayoutTransition}
          style={[
            styles.pendingLocationBanner,
            uiCardShadow(scheme),
            {
              borderColor: colors.tint + "55",
              backgroundColor: scheme === "dark" ? "#1A2E22" : "#F0FAF0",
            },
          ]}
        >
          <View style={styles.pendingLocationBannerHeader}>
            <MaterialIcons
              name="edit-location-alt"
              size={20}
              color={colors.tint}
            />
            <ThemedText
              type="defaultSemiBold"
              style={{ color: colors.tint, fontSize: 15 }}
            >
              {t("chatDirectTradePendingChange")}
            </ThemedText>
          </View>
          {pendingRequestedLocation ? (
            <View style={styles.pendingLocationBannerAddress}>
              <MaterialIcons name="place" size={16} color={colors.icon} />
              <ThemedText
                numberOfLines={2}
                style={{ flex: 1, fontSize: 13, opacity: 0.85 }}
              >
                {pendingRequestedLocation}
              </ThemedText>
            </View>
          ) : null}
          <LocationChangeRespondActions
            onAccept={() => onRespondLocationChange(true)}
            onDeny={() => onRespondLocationChange(false)}
            disabled={
              activeDealBlocked ||
              isTransactionCancelledOrRefunded ||
              respondLocationChangeMutation.isPending
            }
            acceptLabel={t("chatDirectTradeAccept")}
            denyLabel={t("chatDirectTradeDeny")}
            colors={colors}
          />
        </Animated.View>
      ) : null}

      {activeDealBlocked ? (
        <Animated.View
          entering={uiSectionEnter(UI_SECTION_STAGGER_MS, reduceMotion)}
          layout={uiLayoutTransition}
          style={[
            styles.activeDealBanner,
            uiCardShadow(scheme),
            {
              borderColor: "#F59E0B55",
              backgroundColor: scheme === "dark" ? "#2A2112" : "#FFF7E8",
            },
          ]}
        >
          <MaterialIcons name="lock" size={18} color="#F59E0B" />
          <View style={styles.activeDealBannerCopy}>
            <ThemedText
              type="defaultSemiBold"
              style={styles.activeDealBannerTitle}
            >
              {t("chatActiveDealBlockedTitle")}
            </ThemedText>
            <ThemedText style={styles.activeDealBannerText}>
              {t("chatActiveDealBlockedMessage")}
            </ThemedText>
            <ThemedText style={styles.activeDealBannerNote}>
              {t(
                canSelectActiveDealFromChat
                  ? "chatActiveDealSellerProductNote"
                  : "chatActiveDealBuyerProductNote",
              )}
            </ThemedText>
            {canSelectActiveDealFromChat ? (
              <Pressable
                onPress={onSelectActiveDealFromChat}
                disabled={setActiveDealMutation.isPending}
                style={({ pressed }) => [
                  styles.activeDealBannerButton,
                  {
                    backgroundColor: "#F59E0B",
                    opacity: setActiveDealMutation.isPending
                      ? 0.55
                      : pressed
                        ? 0.88
                        : 1,
                  },
                ]}
              >
                {setActiveDealMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <MaterialIcons name="check-circle" size={16} color="#FFFFFF" />
                )}
                <ThemedText style={styles.activeDealBannerButtonText}>
                  {t("chatActiveDealSelectThisBuyer")}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      ) : null}

      <Animated.View
        entering={uiSectionEnter(UI_SECTION_STAGGER_MS, reduceMotion)}
        layout={uiLayoutTransition}
        style={[
          styles.toolsCard,
          uiCardShadow(scheme),
          {
            borderColor: colors.icon + "33",
            backgroundColor: scheme === "dark" ? "#1C1F24" : "#FFFFFF",
          },
        ]}
      >
        <Pressable
          onPress={() => setToolsExpanded((open) => !open)}
          style={styles.toolsHeader}
          accessibilityRole="button"
          accessibilityState={{ expanded: toolsExpanded }}
        >
          <View style={styles.toolsHeaderText}>
            <ThemedText style={styles.toolsTitle}>
              {t("chatTradeTools")}
            </ThemedText>
            <ThemedText style={styles.toolsSubtitle} numberOfLines={2}>
              {toolsSubtitle}
            </ThemedText>
          </View>
          <MaterialIcons
            name={toolsExpanded ? "expand-less" : "expand-more"}
            size={22}
            color={colors.icon}
          />
        </Pressable>

        {toolsExpanded ? (
          <Animated.View
            entering={uiFadeEnter(reduceMotion, 220)}
            layout={uiLayoutTransition}
            style={styles.toolsExpandedBody}
          >
            <View style={styles.toolsActionGrid}>
              <View style={styles.toolChipPairRow}>
                <Pressable
                  onPress={openDirectTradeModal}
                  disabled={activeDealBlocked}
                  style={({ pressed }) => [
                    styles.toolChip,
                    styles.toolChipFlex,
                    {
                      backgroundColor: colors.tint,
                      opacity: activeDealBlocked ? 0.5 : pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <MaterialIcons name="event" size={17} color="#FFF" />
                  <ThemedText
                    style={styles.toolChipTextLight}
                    numberOfLines={1}
                  >
                    {t("chatDirectTradeButton")}
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={openSafePaymentModal}
                  disabled={!isBuyer || activeDealBlocked}
                  style={({ pressed }) => [
                    styles.toolChip,
                    styles.toolChipFlex,
                    {
                      borderColor:
                        isBuyer && !activeDealBlocked
                          ? colors.tint
                          : colors.icon + "55",
                      backgroundColor:
                        isBuyer && !activeDealBlocked
                          ? colors.tint + "12"
                          : colors.icon + "10",
                      opacity:
                        !isBuyer || activeDealBlocked
                          ? 0.55
                          : pressed
                            ? 0.88
                            : 1,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="verified-user"
                    size={17}
                    color={
                      isBuyer && !activeDealBlocked ? colors.tint : colors.icon
                    }
                  />
                  <ThemedText
                    style={[
                      styles.toolChipText,
                      {
                        color:
                          isBuyer && !activeDealBlocked
                            ? colors.tint
                            : colors.icon,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {t("chatSafePaymentButton")}
                  </ThemedText>
                </Pressable>
              </View>

              {canShowCompletionTool ? (
                <Pressable
                  onPress={openCompletionModal}
                  disabled={!chatRoomId}
                  style={({ pressed }) => [
                    styles.toolChip,
                    styles.toolChipFull,
                    {
                      borderColor: chatRoomId ? colors.tint : colors.icon + "55",
                      backgroundColor: chatRoomId
                        ? colors.tint + "12"
                        : colors.icon + "10",
                      opacity: !chatRoomId ? 0.55 : pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="task-alt"
                    size={17}
                    color={chatRoomId ? colors.tint : colors.icon}
                  />
                  <ThemedText
                    style={[
                      styles.toolChipText,
                      { color: chatRoomId ? colors.tint : colors.icon },
                    ]}
                    numberOfLines={1}
                  >
                    {t("chatCompleteTradeButton")}
                  </ThemedText>
                </Pressable>
              ) : null}

              {hasDirectTrade ? (
                <>
                  {isTransactionFullyCompleted ? (
                    <ThemedText style={styles.safeMutedText}>
                      {t("chatCompleteTradeSuccess")}
                    </ThemedText>
                  ) : !mySharingActive && !currentUserAlreadyCompleted ? (
                    <Pressable
                      onPress={onStartLocationShare}
                      disabled={
                        !canStartLiveGps ||
                        isFetchingCoords ||
                        startLocationMutation.isPending
                      }
                      style={({ pressed }) => [
                        styles.toolChip,
                        styles.toolChipFull,
                        {
                          borderColor: colors.tint + "55",
                          opacity:
                            !canStartLiveGps ||
                            isFetchingCoords ||
                            startLocationMutation.isPending
                              ? 0.55
                              : pressed
                                ? 0.88
                                : 1,
                        },
                      ]}
                    >
                      {isFetchingCoords || startLocationMutation.isPending ? (
                        <ActivityIndicator size="small" color={colors.tint} />
                      ) : (
                        <MaterialIcons
                          name="my-location"
                          size={17}
                          color={colors.tint}
                        />
                      )}
                      <ThemedText
                        style={[styles.toolChipText, { color: colors.tint }]}
                        numberOfLines={1}
                      >
                        {t("chatStartSharing")}
                      </ThemedText>
                    </Pressable>
                  ) : (
                    <View style={[styles.toolChipRow, styles.toolChipFull]}>
                      <Pressable
                        onPress={onUpdateLocationShare}
                        disabled={
                          isFetchingCoords ||
                          isTransactionCancelledOrRefunded ||
                          updateLocationMutation.isPending
                        }
                        style={({ pressed }) => [
                          styles.toolChip,
                          styles.toolChipRowItem,
                          {
                            borderColor: colors.tint + "55",
                            opacity:
                              isFetchingCoords ||
                              isTransactionCancelledOrRefunded ||
                              updateLocationMutation.isPending
                                ? 0.55
                                : pressed
                                  ? 0.88
                                  : 1,
                          },
                        ]}
                      >
                        {isFetchingCoords ||
                        updateLocationMutation.isPending ? (
                          <ActivityIndicator size="small" color={colors.tint} />
                        ) : (
                          <MaterialIcons
                            name="sync"
                            size={17}
                            color={colors.tint}
                          />
                        )}
                        <ThemedText
                          style={[styles.toolChipText, { color: colors.tint }]}
                          numberOfLines={1}
                        >
                          {t("chatUpdateLocation")}
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={onStopLocationShare}
                        disabled={
                          isTransactionCancelledOrRefunded ||
                          stopLocationMutation.isPending
                        }
                        style={({ pressed }) => [
                          styles.toolChip,
                          styles.toolChipRowItem,
                          {
                            borderColor: colors.icon + "55",
                            opacity:
                              isTransactionCancelledOrRefunded ||
                              stopLocationMutation.isPending
                              ? 0.55
                              : pressed
                                ? 0.88
                                : 1,
                          },
                        ]}
                      >
                        {stopLocationMutation.isPending ? (
                          <ActivityIndicator size="small" color={colors.icon} />
                        ) : (
                          <MaterialIcons
                            name="location-off"
                            size={17}
                            color={colors.icon}
                          />
                        )}
                        <ThemedText
                          style={[styles.toolChipText, { color: colors.icon }]}
                          numberOfLines={1}
                        >
                          {t("chatStopSharing")}
                        </ThemedText>
                      </Pressable>
                    </View>
                  )}

                  {/* Location picker / status section */}
                  {detail ? (
                    <>
                      {detail.meetingLocation ? (
                        <View
                          style={[
                            styles.mapPreviewCard,
                            {
                              borderColor: colors.tint + "44",
                              backgroundColor: colors.tint + "08",
                            },
                          ]}
                        >
                          <View style={styles.mapPreviewTextCol}>
                            <ThemedText
                              style={[
                                styles.liveLocationTitle,
                                { color: colors.tint },
                              ]}
                            >
                              {detail.selectedLocationLabel ||
                                t("chatDirectTradeLocationLabel")}
                            </ThemedText>
                            <ThemedText
                              style={styles.liveLocationLine}
                              numberOfLines={2}
                            >
                              {detail.meetingLocation}
                            </ThemedText>
                          </View>
                          {isBuyer && !showPendingLocationChange ? (
                            <Pressable
                              onPress={() => setLocationPickerOpen(true)}
                              disabled={
                                activeDealBlocked ||
                                isTransactionCancelledOrRefunded
                              }
                              style={({ pressed }) => [
                                styles.mapOpenBtn,
                                {
                                  backgroundColor: colors.tint,
                                  opacity:
                                    activeDealBlocked ||
                                    isTransactionCancelledOrRefunded
                                      ? 0.55
                                      : pressed
                                        ? 0.88
                                        : 1,
                                },
                              ]}
                            >
                              <MaterialIcons
                                name="edit"
                                size={16}
                                color="#FFF"
                              />
                              <ThemedText style={styles.mapOpenBtnText}>
                                {t("chatDirectTradeChangeLocation")}
                              </ThemedText>
                            </Pressable>
                          ) : null}
                        </View>
                      ) : (
                        <>
                          {isBuyer ? (
                            <Pressable
                              onPress={() => setLocationPickerOpen(true)}
                              disabled={
                                activeDealBlocked ||
                                isTransactionCancelledOrRefunded
                              }
                              style={({ pressed }) => [
                                styles.toolChip,
                                styles.toolChipFull,
                                {
                                  borderColor: colors.tint,
                                  opacity:
                                    activeDealBlocked ||
                                    isTransactionCancelledOrRefunded
                                      ? 0.55
                                      : pressed
                                        ? 0.88
                                        : 1,
                                },
                              ]}
                            >
                              <MaterialIcons
                                name="place"
                                size={17}
                                color={colors.tint}
                              />
                              <ThemedText
                                style={[
                                  styles.toolChipText,
                                  { color: colors.tint },
                                ]}
                                numberOfLines={1}
                              >
                                {t("chatDirectTradePickLocation")}
                              </ThemedText>
                            </Pressable>
                          ) : (
                            <ThemedText style={styles.safeMutedText}>
                              {t("chatDirectTradeAwaitingLocation")}
                            </ThemedText>
                          )}
                        </>
                      )}
                    </>
                  ) : hasDirectTrade && !directTradeDetailQuery.isLoading ? (
                    <ThemedText style={styles.safeMutedText}>
                      {t("chatDirectTradeAwaitingDetails")}
                    </ThemedText>
                  ) : null}

                  {isBuyer && showPendingLocationChange ? (
                    <ThemedText style={styles.safeMutedText}>
                      {t("chatDirectTradeLocationRequestPending")}
                    </ThemedText>
                  ) : null}

                  <View
                    style={[
                      styles.mapPreviewCard,
                      {
                        borderColor: colors.icon + "33",
                        backgroundColor: colors.icon + "08",
                      },
                    ]}
                  >
                    <View style={styles.mapPreviewTextCol}>
                      <ThemedText style={styles.liveLocationTitle}>
                        {t("chatLiveLocationMap")}
                      </ThemedText>
                      <ThemedText
                        style={styles.liveLocationLine}
                        numberOfLines={2}
                      >
                        {myMarkerLabel}: {myLocationStatus} · {peerMarkerLabel}:{" "}
                        {peerLocationStatus}
                      </ThemedText>
                    </View>
                    <Pressable
                      onPress={() => {
                        setLiveMapFocusPoint(null);
                        setLiveMapModalOpen(true);
                        setToolsExpanded(false);
                      }}
                      style={({ pressed }) => [
                        styles.mapOpenBtn,
                        {
                          backgroundColor: colors.tint,
                          opacity: pressed ? 0.88 : 1,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={t("chatOpenLiveMap")}
                    >
                      <MaterialIcons name="map" size={18} color="#FFF" />
                      <ThemedText style={styles.mapOpenBtnText}>
                        {t("chatOpenLiveMap")}
                      </ThemedText>
                    </Pressable>
                  </View>
                </>
              ) : (
                <ThemedText style={styles.safeMutedText}>
                  {t("chatLocationRequiresDirectTrade")}
                </ThemedText>
              )}
            </View>
          </Animated.View>
        ) : null}
      </Animated.View>
      {hasDirectTrade && locationUpdatedAt ? (
        <Animated.View entering={uiFadeEnter(reduceMotion, 180)}>
          <ThemedText style={styles.locationStamp}>
            {tf("chatLocationUpdatedAt", {
              time: formatChatTimestamp(locationUpdatedAt),
            })}
          </ThemedText>
        </Animated.View>
      ) : null}

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
            onScroll={(event) =>
              onMessagesScroll(event.nativeEvent.contentOffset.y)
            }
            scrollEventThrottle={120}
            ListHeaderComponent={
              messagesQuery.isFetchingNextPage ? (
                <Animated.View
                  entering={uiFadeEnter(reduceMotion)}
                  style={styles.historyLoader}
                >
                  <ActivityIndicator color={colors.tint} />
                  <ThemedText style={styles.historyLoaderText}>
                    {t("chatLoadingOlder")}
                  </ThemedText>
                </Animated.View>
              ) : null
            }
            ListEmptyComponent={
              <Animated.View
                entering={uiFadeEnter(reduceMotion, 360)}
                style={styles.emptyThread}
              >
                <MaterialIcons name="chat" size={42} color={colors.icon} />
                <ThemedText style={styles.emptyThreadText}>
                  {t("chatThreadEmpty")}
                </ThemedText>
              </Animated.View>
            }
          />
        )}

        <Animated.View
          entering={uiSectionEnter(UI_SECTION_STAGGER_MS * 2, reduceMotion)}
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
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.icon + "44" },
            ]}
            multiline
            maxLength={5000}
            editable={Boolean(chatRoomId) && !sendMessage.isPending}
          />
          <AnimatedPressable
            onPress={onSend}
            onPressIn={sendPress.handlers.onPressIn}
            onPressOut={sendPress.handlers.onPressOut}
            disabled={
              !chatRoomId || sendMessage.isPending || draft.trim().length === 0
            }
            style={[
              styles.sendBtn,
              sendPress.style,
              {
                backgroundColor:
                  !chatRoomId ||
                  sendMessage.isPending ||
                  draft.trim().length === 0
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
          </AnimatedPressable>
        </Animated.View>
      </KeyboardAvoidingView>

      <Modal
        transparent
        visible={directTradeOpen}
        animationType="fade"
        onRequestClose={() => setDirectTradeOpen(false)}
      >
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(220)}
          style={styles.modalBackdrop}
        >
          <Animated.View
            entering={
              reduceMotion
                ? undefined
                : FadeInDown.duration(360).springify().damping(18)
            }
            style={[
              styles.modalCard,
              uiCardShadow(scheme),
              {
                backgroundColor: colors.background,
                borderColor: colors.icon + "33",
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText type="defaultSemiBold">
                {t("chatDirectTradeTitle")}
              </ThemedText>
              <Pressable
                onPress={() => setDirectTradeOpen(false)}
                style={styles.modalCloseBtn}
              >
                <MaterialIcons name="close" size={20} color={colors.icon} />
              </Pressable>
            </View>
            <DateTimeField
              mode="date"
              value={meetingDate}
              onChange={setMeetingDate}
              label={t("chatMeetingDateLabel")}
              minimumDate={new Date(2020, 0, 1)}
            />
            <DateTimeField
              mode="time"
              value={meetingTime}
              onChange={setMeetingTime}
              label={t("chatMeetingTimeLabel")}
            />
            <Pressable
              onPress={onSubmitDirectTrade}
              disabled={directTradeMutation.isPending}
              style={[
                styles.modalSaveBtn,
                {
                  backgroundColor: directTradeMutation.isPending
                    ? colors.icon + "55"
                    : colors.tint,
                },
              ]}
            >
              {directTradeMutation.isPending ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <ThemedText style={styles.modalSaveBtnText}>
                  {t("chatDirectTradeSave")}
                </ThemedText>
              )}
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Modal>

      <Modal
        transparent
        visible={liveMapModalOpen}
        animationType="fade"
        onRequestClose={() => setLiveMapModalOpen(false)}
      >
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(220)}
          style={styles.modalBackdrop}
        >
          <Animated.View
            entering={
              reduceMotion
                ? undefined
                : FadeInDown.duration(360).springify().damping(18)
            }
            style={[
              styles.mapModalCard,
              uiCardShadow(scheme),
              {
                backgroundColor: colors.background,
                borderColor: colors.icon + "33",
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText type="defaultSemiBold" style={styles.mapModalTitle}>
                {t("chatLiveLocationMap")}
              </ThemedText>
              <Pressable
                onPress={() => setLiveMapModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <MaterialIcons name="close" size={20} color={colors.icon} />
              </Pressable>
            </View>
            {hasAnyLivePoint ? (
              <>
                <View
                  style={[styles.liveMapWrap, { height: liveMapModalHeight }]}
                >
                  <WebView
                    source={{ html: liveMapHtml }}
                    style={[styles.liveMapView, { height: liveMapModalHeight }]}
                    scrollEnabled={false}
                    originWhitelist={["*"]}
                  />
                </View>
                <View style={styles.mapStatusGrid}>
                  <View
                    style={[styles.mapStatusChip, { borderColor: "#1E88E544" }]}
                  >
                    <View
                      style={[
                        styles.liveLegendDot,
                        styles.mapStatusDot,
                        { backgroundColor: "#1E88E5" },
                      ]}
                    />
                    <ThemedText style={styles.mapStatusLabel}>
                      {myMarkerLabel}
                    </ThemedText>
                    <ThemedText
                      style={styles.mapStatusValue}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {myLocationStatus}
                    </ThemedText>
                  </View>
                  <View
                    style={[styles.mapStatusChip, { borderColor: "#E5393544" }]}
                  >
                    <View
                      style={[
                        styles.liveLegendDot,
                        styles.mapStatusDot,
                        { backgroundColor: "#E53935" },
                      ]}
                    />
                    <ThemedText style={styles.mapStatusLabel}>
                      {peerMarkerLabel}
                    </ThemedText>
                    <ThemedText
                      style={styles.mapStatusValue}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {peerLocationStatus}
                    </ThemedText>
                  </View>
                </View>
                <Pressable
                  onPress={() => {
                    if (!myPoint) {
                      Alert.alert(
                        t("chatDirectTradeTitle"),
                        "Your live location is not available yet.",
                      );
                      return;
                    }
                    setLiveMapFocusPoint({
                      latitude: myPoint.latitude,
                      longitude: myPoint.longitude,
                    });
                  }}
                  style={({ pressed }) => [
                    styles.locationChangeBtn,
                    {
                      borderColor: colors.tint,
                      alignSelf: "stretch",
                      justifyContent: "center",
                      marginTop: 6,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="my-location"
                    size={16}
                    color={colors.tint}
                  />
                  <ThemedText
                    style={[
                      styles.locationChangeBtnText,
                      { color: colors.tint },
                    ]}
                  >
                    Show my place
                  </ThemedText>
                </Pressable>
                {meetupMapPin ? (
                  <View style={styles.mapMeetupPill}>
                    <View
                      style={[
                        styles.liveLegendDot,
                        styles.mapStatusDot,
                        { backgroundColor: "#FF8F00" },
                      ]}
                    />
                    <ThemedText
                      style={styles.mapMeetupText}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {t("chatDirectTradeLocationLabel")}: {meetupMapPin.label}
                    </ThemedText>
                  </View>
                ) : null}
                <View style={styles.liveLegendRow}>
                  {meetupMapPin ? (
                    <View style={styles.liveLegendItem}>
                      <View
                        style={[
                          styles.liveLegendDot,
                          { backgroundColor: "#FF8F00" },
                        ]}
                      />
                      <ThemedText
                        style={styles.liveLegendText}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {meetupMapPin.label}
                      </ThemedText>
                    </View>
                  ) : null}
                  <View style={styles.liveLegendItem}>
                    <View
                      style={[
                        styles.liveLegendDot,
                        { backgroundColor: "#1E88E5" },
                      ]}
                    />
                    <ThemedText
                      style={styles.liveLegendText}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {myMarkerLabel}
                    </ThemedText>
                  </View>
                  <View style={styles.liveLegendItem}>
                    <View
                      style={[
                        styles.liveLegendDot,
                        { backgroundColor: "#E53935" },
                      ]}
                    />
                    <ThemedText
                      style={styles.liveLegendText}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {peerMarkerLabel}
                    </ThemedText>
                  </View>
                </View>
              </>
            ) : (
              <View
                style={[styles.mapEmptyState, { borderColor: colors.icon }]}
              >
                <MaterialIcons
                  name="location-off"
                  size={32}
                  color={colors.icon}
                />
                <ThemedText style={styles.liveLocationLine}>
                  {t("chatMapNoLocations")}
                </ThemedText>
              </View>
            )}
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Location picker modal — buyer picks a listing spot */}
      <Modal
        transparent
        visible={locationPickerOpen}
        animationType="fade"
        onRequestClose={() => setLocationPickerOpen(false)}
      >
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(220)}
          style={styles.modalBackdrop}
        >
          <Animated.View
            entering={
              reduceMotion
                ? undefined
                : FadeInDown.duration(360).springify().damping(18)
            }
            style={[
              styles.modalCard,
              uiCardShadow(scheme),
              {
                backgroundColor: colors.background,
                borderColor: colors.icon + "33",
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText type="defaultSemiBold">
                {t("chatDirectTradePickLocation")}
              </ThemedText>
              <Pressable
                onPress={() => setLocationPickerOpen(false)}
                style={styles.modalCloseBtn}
              >
                <MaterialIcons name="close" size={20} color={colors.icon} />
              </Pressable>
            </View>
            {detail?.listingLocations?.length ? (
              detail.listingLocations.map((loc) => (
                <Pressable
                  key={loc.label}
                  onPress={() => onAcceptLocation(loc.label)}
                  disabled={
                    acceptLocationMutation.isPending ||
                    isTransactionCancelledOrRefunded
                  }
                  style={[
                    styles.locationOptionRow,
                    {
                      backgroundColor: colors.icon + "11",
                      borderColor: colors.icon + "33",
                    },
                  ]}
                >
                  <MaterialIcons
                    name="location-on"
                    size={18}
                    color={colors.tint}
                  />
                  <View style={styles.locationOptionTextCol}>
                    <ThemedText style={styles.locationOptionLabel}>
                      {loc.label}
                    </ThemedText>
                    <ThemedText
                      style={styles.locationOptionAddress}
                      numberOfLines={2}
                    >
                      {loc.address}
                    </ThemedText>
                  </View>
                </Pressable>
              ))
            ) : (
              <ThemedText style={{ opacity: 0.7, paddingVertical: 12 }}>
                {t("chatDirectTradeNoLocations")}
              </ThemedText>
            )}
            {detail?.meetingLocation ? (
              <Pressable
                onPress={() => {
                  setLocationPickerOpen(false);
                  setChangeRequestTime(
                    detail?.meetingTime?.trim() ? detail.meetingTime : "",
                  );
                  setChangeRequestOpen(true);
                }}
                style={[styles.locationChangeBtn, { borderColor: colors.tint }]}
              >
                <MaterialIcons
                  name="edit-location-alt"
                  size={16}
                  color={colors.tint}
                />
                <ThemedText
                  style={[styles.locationChangeBtnText, { color: colors.tint }]}
                >
                  {t("chatDirectTradeRequestOtherPlace")}
                </ThemedText>
              </Pressable>
            ) : null}
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Location change request modal — buyer proposes custom place via map pinning */}
      <Modal
        transparent
        visible={changeRequestOpen}
        animationType="fade"
        onRequestClose={() => setChangeRequestOpen(false)}
      >
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(220)}
          style={styles.modalBackdrop}
        >
          <Animated.View
            entering={
              reduceMotion
                ? undefined
                : FadeInDown.duration(360).springify().damping(18)
            }
            style={[
              styles.modalCard,
              uiCardShadow(scheme),
              {
                backgroundColor: colors.background,
                borderColor: colors.icon + "33",
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText type="defaultSemiBold">
                {t("chatDirectTradeRequestOtherPlace")}
              </ThemedText>
              <Pressable
                onPress={() => setChangeRequestOpen(false)}
                style={styles.modalCloseBtn}
              >
                <MaterialIcons name="close" size={20} color={colors.icon} />
              </Pressable>
            </View>
            <TextInput
              value={changeRequestAddress}
              onChangeText={setChangeRequestAddress}
              placeholder={t("chatMeetingLocationPlaceholder")}
              placeholderTextColor={colors.icon}
              style={[
                styles.modalInput,
                { color: colors.text, borderColor: colors.icon + "44" },
              ]}
            />
            {/* Map picker — draggable pin sets lat/lng + reverse-geocodes address */}
            <View
              style={{
                height: 220,
                borderRadius: 10,
                overflow: "hidden",
                marginBottom: 10,
              }}
            >
              <WebView
                source={{
                  html: buildLeafletPickerHtml(
                    changeRequestCoords?.latitude ?? 16.84,
                    changeRequestCoords?.longitude ?? 96.14,
                  ),
                }}
                onMessage={(e) =>
                  handleChangeRequestMapMessage(e.nativeEvent.data)
                }
                style={{ flex: 1 }}
                scrollEnabled={false}
                bounces={false}
              />
            </View>
            {changeRequestCoords && (
              <ThemedText
                style={{
                  fontSize: 12,
                  opacity: 0.6,
                  marginBottom: 8,
                }}
              >
                {`${changeRequestCoords.latitude.toFixed(6)}, ${changeRequestCoords.longitude.toFixed(6)}`}
              </ThemedText>
            )}
            <Pressable
              onPress={handleChangeRequestUseCurrentLocation}
              disabled={changeRequestIsLocating}
              style={[
                styles.locationChangeBtn,
                { borderColor: colors.tint, marginBottom: 10 },
              ]}
            >
              {changeRequestIsLocating ? (
                <ActivityIndicator size={16} color={colors.tint} />
              ) : (
                <MaterialIcons
                  name="my-location"
                  size={16}
                  color={colors.tint}
                />
              )}
              <ThemedText
                style={[styles.locationChangeBtnText, { color: colors.tint }]}
              >
                {t("chatUseCurrentLocation")}
              </ThemedText>
            </Pressable>
            <DateTimeField
              mode="time"
              value={changeRequestTime}
              onChange={setChangeRequestTime}
              placeholder={t("chatMeetingTimePlaceholder")}
            />
            <Pressable
              onPress={onSubmitLocationChange}
              disabled={
                requestLocationChangeMutation.isPending ||
                isTransactionCancelledOrRefunded
              }
              style={[
                styles.modalSaveBtn,
                {
                  backgroundColor:
                    requestLocationChangeMutation.isPending ||
                    isTransactionCancelledOrRefunded
                    ? colors.icon + "55"
                    : colors.tint,
                },
              ]}
            >
              {requestLocationChangeMutation.isPending ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <ThemedText style={styles.modalSaveBtnText}>
                  {t("chatDirectTradeRequestChangeSubmit")}
                </ThemedText>
              )}
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Modal>

      <Modal
        transparent
        visible={completionOpen}
        animationType="fade"
        onRequestClose={() => setCompletionOpen(false)}
      >
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(220)}
          style={styles.modalBackdrop}
        >
          <Animated.View
            entering={
              reduceMotion
                ? undefined
                : FadeInDown.duration(360).springify().damping(18)
            }
            style={[
              styles.modalCard,
              uiCardShadow(scheme),
              {
                backgroundColor: colors.background,
                borderColor: colors.icon + "33",
              },
            ]}
          >
            <View style={[styles.modalHeader, styles.completionModalHeader]}>
              <ThemedText
                type="defaultSemiBold"
                numberOfLines={1}
                style={styles.completionModalTitle}
              >
                {t("chatCompleteTradeTitle")}
              </ThemedText>
              <Pressable
                onPress={() => setCompletionOpen(false)}
                style={[
                  styles.modalCloseBtn,
                  styles.completionModalCloseBtnAbsolute,
                ]}
              >
                <MaterialIcons name="close" size={20} color={colors.icon} />
              </Pressable>
            </View>

            {safePaymentStatusQuery.isLoading ? (
              <View style={styles.center}>
                <ActivityIndicator color={colors.tint} />
              </View>
            ) : !activeTransaction ? (
              <ThemedText style={styles.safeMutedText}>
                {t("chatCompleteTradeUnavailable")}
              </ThemedText>
            ) : (
              <>
                <ThemedText style={styles.pickerLabel}>
                  {t("chatCompleteTradeStatus")}: {activeTransaction.status}
                </ThemedText>
                <ThemedText style={styles.safeMutedText}>
                  {t("chatCompleteTradeHint")}
                </ThemedText>
                {isTransactionCancelled ? (
                  <ThemedText style={styles.cancelPenaltyText}>
                    {t("chatCancelTradePenaltyNote")}
                  </ThemedText>
                ) : null}
                {waitingForCounterpartyComplete ? (
                  <ThemedText style={styles.safeMutedText}>
                    {t("chatCompleteTradePendingBoth")}
                  </ThemedText>
                ) : null}

                {canCancelTransaction ? (
                  <Pressable
                    onPress={onCancelTransaction}
                    disabled={cancelTransactionMutation.isPending}
                    style={[
                      styles.modalSaveBtn,
                      styles.cancelTradeBtn,
                      {
                        backgroundColor: cancelTransactionMutation.isPending
                          ? colors.icon + "55"
                          : "#DC2626",
                      },
                    ]}
                  >
                    {cancelTransactionMutation.isPending ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <ThemedText style={styles.modalSaveBtnText}>
                        {t("chatCancelTradeAction")}
                      </ThemedText>
                    )}
                  </Pressable>
                ) : null}

                {canCompleteTrade ? (
                  <Pressable
                    onPress={onCompleteTransaction}
                    disabled={completeTransactionMutation.isPending}
                    style={[
                      styles.modalSaveBtn,
                      {
                        backgroundColor: completeTransactionMutation.isPending
                          ? colors.icon + "55"
                          : colors.tint,
                      },
                    ]}
                  >
                    {completeTransactionMutation.isPending ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <ThemedText style={styles.modalSaveBtnText}>
                        {t("chatCompleteTradeAction")}
                      </ThemedText>
                    )}
                  </Pressable>
                ) : canShowReviewSection ? (
                  <>
                    <ThemedText style={styles.pickerLabel}>
                      {t("chatReviewHint")}
                    </ThemedText>
                    {currentUserAlreadyCompleted &&
                    completionTransaction.status !== "COMPLETED" ? (
                      <ThemedText style={styles.safeMutedText}>
                        {t("chatReviewUnlockedHelper")}
                      </ThemedText>
                    ) : null}
                    <ThemedText style={styles.pickerLabel}>
                      {t("chatReviewStarsLabel")}
                    </ThemedText>
                    <View style={styles.reviewStarsRow}>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <Pressable
                          key={value}
                          onPress={() => setReviewStars(value)}
                          style={styles.reviewStarButton}
                        >
                          <MaterialIcons
                            name={value <= reviewStars ? "star" : "star-border"}
                            size={26}
                            color={
                              value <= reviewStars ? "#F5B400" : colors.icon
                            }
                          />
                        </Pressable>
                      ))}
                    </View>
                    <ThemedText style={styles.pickerLabel}>
                      {t("chatReviewCommentLabel")}
                    </ThemedText>
                    <TextInput
                      value={reviewComment}
                      onChangeText={setReviewComment}
                      placeholder={t("chatReviewCommentPlaceholder")}
                      placeholderTextColor={colors.icon}
                      multiline
                      maxLength={500}
                      style={[
                        styles.modalInput,
                        styles.reviewCommentInput,
                        { color: colors.text, borderColor: colors.icon + "44" },
                      ]}
                    />
                    <Pressable
                      onPress={onSubmitReview}
                      disabled={
                        submitReviewMutation.isPending || reviewSubmitted
                      }
                      style={[
                        styles.modalSaveBtn,
                        {
                          backgroundColor:
                            submitReviewMutation.isPending || reviewSubmitted
                              ? colors.icon + "55"
                              : colors.tint,
                        },
                      ]}
                    >
                      {submitReviewMutation.isPending ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <ThemedText style={styles.modalSaveBtnText}>
                          {reviewSubmitted
                            ? t("chatReviewSuccess")
                            : t("chatReviewSubmit")}
                        </ThemedText>
                      )}
                    </Pressable>
                  </>
                ) : (
                  <ThemedText style={styles.safeMutedText}>
                    {usesSafePaymentCompletion && !isSafeCompletable
                      ? t("chatCompleteTradeWaitAdminReceived")
                      : t("chatCompleteTradePendingBoth")}
                  </ThemedText>
                )}
              </>
            )}
          </Animated.View>
        </Animated.View>
      </Modal>

      <Modal
        transparent
        visible={safePaymentOpen}
        animationType="fade"
        onRequestClose={() => setSafePaymentOpen(false)}
      >
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(220)}
          style={styles.modalBackdrop}
        >
          <Animated.View
            entering={
              reduceMotion
                ? undefined
                : FadeInDown.duration(360).springify().damping(18)
            }
            style={[
              styles.modalCard,
              uiCardShadow(scheme),
              {
                backgroundColor: colors.background,
                borderColor: colors.icon + "33",
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText type="defaultSemiBold">
                {t("chatSafePaymentTitle")}
              </ThemedText>
              <Pressable
                onPress={() => setSafePaymentOpen(false)}
                style={styles.modalCloseBtn}
              >
                <MaterialIcons name="close" size={20} color={colors.icon} />
              </Pressable>
            </View>

            {!isBuyer ? (
              <ThemedText style={styles.safeMutedText}>
                {t("chatSafePaymentBuyerOnly")}
              </ThemedText>
            ) : safePaymentStatusQuery.isLoading ? (
              <View style={styles.center}>
                <ActivityIndicator color={colors.tint} />
              </View>
            ) : safePaymentStatusQuery.isError ? (
              <ThemedText style={styles.errorText}>
                {t("chatSafePaymentLoadFailed")}
              </ThemedText>
            ) : !safePaymentStatus ? (
              <>
                <ThemedText style={styles.safeMutedText}>
                  {t("chatSafePaymentRequestHint")}
                </ThemedText>
                <Pressable
                  onPress={onRequestSafePayment}
                  disabled={requestSafePaymentMutation.isPending || !isBuyer}
                  style={[
                    styles.modalSaveBtn,
                    {
                      backgroundColor:
                        requestSafePaymentMutation.isPending || !isBuyer
                          ? colors.icon + "55"
                          : colors.tint,
                    },
                  ]}
                >
                  {requestSafePaymentMutation.isPending ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <ThemedText style={styles.modalSaveBtnText}>
                      {t("chatSafePaymentRequest")}
                    </ThemedText>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <ThemedText style={styles.pickerLabel}>
                  {t("chatSafePaymentStatusLabel")}:{" "}
                  {safePaymentStatus.transaction.status}
                </ThemedText>
                <ThemedText style={styles.safeMutedText}>
                  {t("chatSafePaymentInstructionPhone")}:{" "}
                  {safePaymentStatus.adminReceivingPhone ??
                    t("chatSafePaymentNoInstruction")}
                </ThemedText>
                {safePaymentStatus.instructionSentAt ? (
                  <ThemedText style={styles.safeMutedText}>
                    {t("chatSafePaymentInstructionSentAt")}:{" "}
                    {formatChatTimestamp(safePaymentStatus.instructionSentAt)}
                  </ThemedText>
                ) : null}
                {safePaymentStatus.instructionNote ? (
                  <ThemedText style={styles.safeMutedText}>
                    {t("chatSafePaymentInstructionNote")}:{" "}
                    {safePaymentStatus.instructionNote}
                  </ThemedText>
                ) : null}

                {isBuyer && safePaymentStatus.canSubmitPayment ? (
                  <>
                    <ThemedText style={styles.pickerLabel}>
                      {t("chatSafePaymentFormName")}
                    </ThemedText>
                    <TextInput
                      value={payerKbzName}
                      onChangeText={setPayerKbzName}
                      placeholder={t("chatSafePaymentFormName")}
                      placeholderTextColor={colors.icon}
                      style={[
                        styles.modalInput,
                        { color: colors.text, borderColor: colors.icon + "44" },
                      ]}
                    />
                    <ThemedText style={styles.pickerLabel}>
                      {t("chatSafePaymentFormPhone")}
                    </ThemedText>
                    <TextInput
                      value={payerKbzPhone}
                      onChangeText={setPayerKbzPhone}
                      placeholder={t("chatSafePaymentFormPhone")}
                      placeholderTextColor={colors.icon}
                      style={[
                        styles.modalInput,
                        { color: colors.text, borderColor: colors.icon + "44" },
                      ]}
                      keyboardType="phone-pad"
                    />
                    <ThemedText style={styles.pickerLabel}>
                      {t("chatSafePaymentFormAmount")}
                    </ThemedText>
                    <TextInput
                      value={paymentAmount}
                      onChangeText={setPaymentAmount}
                      placeholder={t("chatSafePaymentFormAmount")}
                      placeholderTextColor={colors.icon}
                      style={[
                        styles.modalInput,
                        { color: colors.text, borderColor: colors.icon + "44" },
                      ]}
                      keyboardType="decimal-pad"
                    />
                    <ThemedText style={styles.pickerLabel}>
                      {t("chatSafePaymentFormTxnId")}
                    </ThemedText>
                    <TextInput
                      value={kbzTransactionId}
                      onChangeText={setKbzTransactionId}
                      placeholder={t("chatSafePaymentFormTxnId")}
                      placeholderTextColor={colors.icon}
                      style={[
                        styles.modalInput,
                        { color: colors.text, borderColor: colors.icon + "44" },
                      ]}
                    />
                    <Pressable
                      onPress={onSubmitSafePayment}
                      disabled={submitSafePaymentMutation.isPending}
                      style={[
                        styles.modalSaveBtn,
                        {
                          backgroundColor: submitSafePaymentMutation.isPending
                            ? colors.icon + "55"
                            : colors.tint,
                        },
                      ]}
                    >
                      {submitSafePaymentMutation.isPending ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <ThemedText style={styles.modalSaveBtnText}>
                          {t("chatSafePaymentSubmit")}
                        </ThemedText>
                      )}
                    </Pressable>
                  </>
                ) : null}
              </>
            )}
          </Animated.View>
        </Animated.View>
      </Modal>
    </ThemedView>
  );
}

type LocationChangeRespondActionsProps = {
  onAccept: () => void;
  onDeny: () => void;
  disabled?: boolean;
  acceptLabel: string;
  denyLabel: string;
  colors: { tint: string; icon: string };
  compact?: boolean;
};

function LocationChangeRespondActions({
  onAccept,
  onDeny,
  disabled,
  acceptLabel,
  denyLabel,
  colors: c,
  compact,
}: LocationChangeRespondActionsProps) {
  const rowStyle = compact ? styles.respondCompactRow : styles.respondRow;
  return (
    <View style={rowStyle}>
      <Pressable
        onPress={onAccept}
        disabled={disabled}
        style={({ pressed }) => [
          styles.respondBtn,
          styles.respondBtnAccept,
          {
            backgroundColor: "#2E7D32",
            opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
          },
        ]}
      >
        <MaterialIcons name="check-circle" size={18} color="#FFF" />
        <ThemedText style={styles.respondBtnText}>{acceptLabel}</ThemedText>
      </Pressable>
      <Pressable
        onPress={onDeny}
        disabled={disabled}
        style={({ pressed }) => [
          styles.respondBtn,
          styles.respondBtnDeny,
          {
            backgroundColor: "#dc3545",
            opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
          },
        ]}
      >
        <MaterialIcons name="cancel" size={18} color="#FFF" />
        <ThemedText style={styles.respondBtnText}>{denyLabel}</ThemedText>
      </Pressable>
    </View>
  );
}

type DirectTradeLocationMessageProps = {
  message: ChatMessage;
  t: (key: string) => string;
  isMine: boolean;
  colors: { text: string; tint: string; icon: string };
  accepted: boolean;
  denied?: boolean;
};

function DirectTradeLocationMessage({
  message,
  t,
  isMine,
  colors: c,
  accepted,
  denied,
}: DirectTradeLocationMessageProps) {
  const meta = message.metadata;
  const location =
    meta && typeof meta.meetingLocation === "string"
      ? (meta.meetingLocation as string)
      : null;
  const primaryText = isMine ? "#FFF" : c.text;
  const mutedText = isMine ? "rgba(255,255,255,0.75)" : c.icon;
  const bgCard = isMine ? "rgba(255,255,255,0.12)" : c.tint + "0C";

  let labelKey: string;
  let iconName: "check-circle" | "edit-location-alt" | "cancel" = accepted
    ? "check-circle"
    : denied
      ? "cancel"
      : "edit-location-alt";

  if (accepted) {
    labelKey = "chatDirectTradeLocationAccepted";
  } else if (denied) {
    labelKey = "chatDirectTradeLocationDenied";
  } else {
    labelKey = "chatDirectTradeLocationChangeRequested";
  }

  return (
    <View style={styles.directTradeCard}>
      <View style={styles.directTradeCardLocationMessageRow}>
        <MaterialIcons name={iconName} size={16} color={primaryText} />
        <ThemedText
          style={[styles.directTradeCardTitle, { color: primaryText }]}
        >
          {t(labelKey)}
        </ThemedText>
      </View>
      {location ? (
        <View
          style={[
            styles.directTradeCardLocationRowInline,
            { backgroundColor: bgCard },
          ]}
        >
          <MaterialIcons name="place" size={14} color={mutedText} />
          <ThemedText
            style={[styles.directTradeCardInlineValue, { color: mutedText }]}
            numberOfLines={2}
          >
            {location}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

type DirectTradeCardProps = {
  metadata: Record<string, unknown> | null;
  t: (key: string) => string;
  isMine: boolean;
  colors: { text: string; tint: string; icon: string };
};

function DirectTradeRequestCard({
  metadata,
  t,
  isMine,
  colors: c,
}: DirectTradeCardProps) {
  const meetingDate =
    metadata && typeof metadata.meetingDate === "string"
      ? (metadata.meetingDate as string)
      : null;
  const meetingTime =
    metadata && typeof metadata.meetingTime === "string"
      ? (metadata.meetingTime as string)
      : null;

  const primaryText = isMine ? "#FFF" : c.text;
  const mutedText = isMine ? "rgba(255,255,255,0.75)" : c.icon;

  return (
    <View style={styles.directTradeCard}>
      <ThemedText style={[styles.directTradeCardTitle, { color: primaryText }]}>
        {t("chatDirectTradeRequestTitle")}
      </ThemedText>
      {meetingDate || meetingTime ? (
        <View style={styles.directTradeCardInfoRow}>
          {meetingDate ? (
            <View style={styles.directTradeCardInfoItem}>
              <MaterialIcons name="event" size={14} color={primaryText} />
              <ThemedText
                style={[styles.directTradeCardInfoLabel, { color: mutedText }]}
              >
                {t("chatDirectTradeRequestDate")}
              </ThemedText>
              <ThemedText
                style={[
                  styles.directTradeCardInfoValue,
                  { color: primaryText },
                ]}
              >
                {meetingDate}
              </ThemedText>
            </View>
          ) : null}
          {meetingTime ? (
            <View style={styles.directTradeCardInfoItem}>
              <MaterialIcons name="schedule" size={14} color={primaryText} />
              <ThemedText
                style={[styles.directTradeCardInfoLabel, { color: mutedText }]}
              >
                {t("chatDirectTradeRequestTime")}
              </ThemedText>
              <ThemedText
                style={[
                  styles.directTradeCardInfoValue,
                  { color: primaryText },
                ]}
              >
                {meetingTime}
              </ThemedText>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 56,
    paddingBottom: 10,
  },
  headerThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    overflow: "hidden",
  },
  headerThumbFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, minWidth: 0, gap: 2 },
  headerTitle: { fontSize: 16 },
  headerSubtitle: { fontSize: 12, opacity: 0.65 },
  pendingLocationBanner: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  pendingLocationBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pendingLocationBannerAddress: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingLeft: 2,
  },
  activeDealBanner: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  activeDealBannerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  activeDealBannerTitle: {
    fontSize: 13,
    color: "#B45309",
  },
  activeDealBannerText: {
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.76,
  },
  activeDealBannerNote: {
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.68,
  },
  activeDealBannerButton: {
    marginTop: 6,
    alignSelf: "flex-start",
    minHeight: 34,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activeDealBannerButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  respondRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  respondCompactRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  respondBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  respondBtnAccept: {},
  respondBtnDeny: {},
  respondBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  toolsCard: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  toolsHeader: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  toolsHeaderText: { flex: 1, minWidth: 0, gap: 2 },
  toolsTitle: { fontSize: 13, fontWeight: "700" },
  toolsSubtitle: { fontSize: 12, opacity: 0.75 },
  toolsExpandedBody: { gap: 10 },
  toolsActionGrid: {
    gap: 8,
  },
  toolChipPairRow: {
    flexDirection: "row",
    gap: 8,
  },
  toolChip: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  toolChipFlex: {
    flex: 1,
    minWidth: 0,
  },
  toolChipFull: {
    width: "100%",
  },
  toolChipRow: {
    flexDirection: "row",
    gap: 8,
  },
  toolChipRowItem: {
    flex: 1,
    minWidth: 0,
  },
  toolChipText: {
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
  },
  toolChipTextLight: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
  },
  mapPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  mapPreviewTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  mapOpenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  mapOpenBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  mapModalCard: {
    width: "100%",
    maxHeight: "82%",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 6,
  },
  mapModalTitle: {
    fontSize: 14,
    letterSpacing: 0.2,
  },
  mapEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  liveLocationTitle: { fontSize: 13, fontWeight: "700" },
  liveMapWrap: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
  },
  liveMapView: { width: "100%" },
  liveLocationLine: { fontSize: 12, opacity: 0.85 },
  mapStatusGrid: {
    flexDirection: "row",
    gap: 4,
    minWidth: 0,
  },
  mapStatusChip: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 5,
    gap: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  mapStatusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  mapStatusLabel: {
    fontSize: 9,
    opacity: 0.72,
  },
  mapStatusValue: {
    minWidth: 0,
    fontSize: 10,
    fontWeight: "700",
  },
  mapMeetupPill: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FF8F0055",
    backgroundColor: "#FF8F0015",
    paddingHorizontal: 7,
    paddingVertical: 5,
    alignSelf: "stretch",
    minWidth: 0,
    maxWidth: "100%",
  },
  mapMeetupText: {
    flex: 1,
    minWidth: 0,
    fontSize: 10,
    fontWeight: "700",
    color: "#FF8F00",
  },
  liveLegendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 0,
    flexWrap: "wrap",
    minWidth: 0,
  },
  liveLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 0,
    maxWidth: "100%",
    flexShrink: 1,
  },
  liveLegendDot: { width: 8, height: 8, borderRadius: 4 },
  liveLegendText: {
    fontSize: 10,
    opacity: 0.85,
    maxWidth: 140,
    flexShrink: 1,
  },
  locationStamp: {
    fontSize: 11,
    opacity: 0.65,
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
  },
  loadingText: { opacity: 0.7, fontSize: 13 },
  errorText: { color: "#D14343", textAlign: "center", fontSize: 14 },
  retryBtn: {
    marginTop: 8,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryBtnText: { color: "#FFF", fontWeight: "700" },
  messagesContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
    flexGrow: 1,
  },
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
  bubbleDirectTrade: {
    alignSelf: "center",
    maxWidth: "92%",
    opacity: 1,
    minWidth: 240,
    overflow: "hidden",
  },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextMine: { color: "#FFF" },
  bubbleTime: { fontSize: 10, opacity: 0.65, alignSelf: "flex-end" },
  bubbleTimeMine: { color: "rgba(255,255,255,0.85)" },
  systemType: {
    fontSize: 10,
    fontWeight: "800",
    opacity: 0.75,
    textTransform: "uppercase",
  },
  directTradeCard: {
    gap: 8,
    paddingVertical: 2,
    flexShrink: 1,
  },
  directTradeCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 1,
  },
  directTradeCardInfoRow: {
    flexDirection: "column",
    gap: 6,
  },
  directTradeCardInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  directTradeCardInfoLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  directTradeCardInfoValue: {
    fontSize: 13,
    fontWeight: "500",
    flexShrink: 1,
  },
  directTradeCardLocationRowInline: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  directTradeCardInlineValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  directTradeCardLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  directTradeCardLocationMessageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  historyLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  historyLoaderText: { fontSize: 12, opacity: 0.65 },
  emptyThread: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 48,
  },
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
  completionModalTitle: {
    paddingRight: 44,
  },
  completionModalHeader: {
    position: "relative",
  },
  completionModalCloseBtnAbsolute: {
    position: "absolute",
    right: 0,
    top: "50%",
    transform: [{ translateY: -15 }],
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
  safeMutedText: { fontSize: 13, opacity: 0.75, lineHeight: 18 },
  reviewStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  reviewStarButton: {
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  reviewCommentInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  modalSaveBtn: {
    borderRadius: 10,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  cancelTradeBtn: {
    marginTop: 10,
  },
  cancelPenaltyText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: "#DC2626",
  },
  modalSaveBtnText: { color: "#FFF", fontWeight: "700" },
  locationOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  locationOptionTextCol: { flex: 1, minWidth: 0, gap: 2 },
  locationOptionLabel: { fontSize: 14, fontWeight: "600" },
  locationOptionAddress: { fontSize: 12, opacity: 0.75 },
  locationChangeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    marginTop: 4,
  },
  locationChangeBtnText: { fontSize: 13, fontWeight: "600" },
});
