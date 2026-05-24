import type { ChatMessage, ChatRoom } from "@/core/domain/entities/Chat";
import type {
  AcceptLocationInput,
  CursorPage,
  CursorPaginationParams,
  DirectTradeRequestInput,
  LocationShareInput,
  OpenChatRoomInput,
  RequestLocationChangeInput,
  RespondLocationChangeInput,
  SafePaymentSubmitInput,
  SendChatMessageInput,
  TransactionCompleteInput,
  TransactionReviewInput,
} from "@/core/domain/types/chat";
import { displayUnreadCount } from "@/features/chat/presentation/chatFormat";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuth } from "../providers/AuthProvider";
import { useServices } from "../providers/ServicesProvider";

export const CLIENT_CHAT_QUERY_KEY = ["client", "chat"] as const;
export const DEFAULT_CHAT_TAKE = 20;

export function chatRoomByListingKey(listingId: string, sellerId: string) {
  return [
    ...CLIENT_CHAT_QUERY_KEY,
    "roomByListing",
    listingId,
    sellerId,
  ] as const;
}

export function cacheChatRoom(
  qc: ReturnType<typeof useQueryClient>,
  room: ChatRoom,
) {
  qc.setQueryData([...CLIENT_CHAT_QUERY_KEY, "room", room.id], room);
  qc.setQueryData(chatRoomByListingKey(room.listingId, room.sellerId), room);
}

function withDefaultTake(
  params?: CursorPaginationParams,
): CursorPaginationParams {
  return {
    cursor: params?.cursor ?? null,
    take: params?.take ?? DEFAULT_CHAT_TAKE,
  };
}

export function useOpenChatRoom() {
  const { chatService } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: OpenChatRoomInput) => {
      const cached = qc.getQueryData<ChatRoom>(
        chatRoomByListingKey(input.listingId, input.sellerId),
      );
      if (cached) return cached;
      const room = await chatService.openRoom(input);
      cacheChatRoom(qc, room);
      return room;
    },
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "rooms"],
      });
    },
  });
}

export function useChatRooms(params?: Omit<CursorPaginationParams, "cursor">) {
  const { chatService } = useServices();
  const { isAuthenticated, isLoading } = useAuth();
  const take = params?.take ?? DEFAULT_CHAT_TAKE;
  return useInfiniteQuery({
    queryKey: [...CLIENT_CHAT_QUERY_KEY, "rooms", take],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      chatService.listRooms(withDefaultTake({ cursor: pageParam, take })),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !isLoading && isAuthenticated,
    retry: 1,
  });
}

export function useChatRoomsUnreadCount(take = 50) {
  const query = useChatRooms({ take });
  const { user } = useAuth();
  return useMemo(() => {
    const rooms = query.data?.pages.flatMap((page) => page.items) ?? [];
    return rooms.reduce(
      (sum, room) => sum + displayUnreadCount(room, user?.id),
      0,
    );
  }, [query.data, user?.id]);
}

export function useChatMessages(
  chatRoomId: string | null,
  params?: Omit<CursorPaginationParams, "cursor">,
) {
  const { chatService } = useServices();
  const take = params?.take ?? DEFAULT_CHAT_TAKE;
  return useInfiniteQuery({
    queryKey: [...CLIENT_CHAT_QUERY_KEY, "messages", chatRoomId, take],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      chatService.listMessages(
        chatRoomId!,
        withDefaultTake({ cursor: pageParam, take }),
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(chatRoomId),
  });
}

export function useSendChatMessage(chatRoomId: string | null) {
  const { chatService } = useServices();
  const qc = useQueryClient();
  const take = DEFAULT_CHAT_TAKE;
  return useMutation({
    mutationFn: (input: SendChatMessageInput) =>
      chatService.sendMessage(chatRoomId!, input),
    onSuccess: (message) => {
      qc.setQueryData<InfiniteData<CursorPage<ChatMessage>> | undefined>(
        [...CLIENT_CHAT_QUERY_KEY, "messages", chatRoomId, take],
        (prev) => {
          if (!prev?.pages?.length) {
            return {
              pages: [{ items: [message], nextCursor: null }],
              pageParams: [null],
            };
          }
          const pages = [...prev.pages];
          const first = pages[0] ?? { items: [], nextCursor: null };
          const items = [
            message,
            ...first.items.filter((item) => item.id !== message.id),
          ];
          pages[0] = { ...first, items };
          return { ...prev, pages };
        },
      );
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "rooms"],
      });
    },
  });
}

export function useMarkChatRoomRead(chatRoomId: string | null) {
  const { chatService } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => chatService.markRead(chatRoomId!),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "rooms"],
      });
    },
  });
}

export function useRequestDirectTrade(chatRoomId: string | null) {
  const { chatService } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DirectTradeRequestInput) =>
      chatService.requestDirectTrade(chatRoomId!, input),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "messages", chatRoomId],
      });
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "rooms"],
      });
    },
  });
}

export function useDirectTradeDetail(chatRoomId: string | null) {
  const { chatService } = useServices();
  return useQuery({
    queryKey: [...CLIENT_CHAT_QUERY_KEY, "directTrade", chatRoomId],
    enabled: Boolean(chatRoomId),
    retry: false,
    queryFn: async () => {
      try {
        return await chatService.getDirectTradeDetail(chatRoomId!);
      } catch (error) {
        const status = (error as { response?: { status?: number } } | undefined)
          ?.response?.status;
        if (status === 404) return null;
        throw error;
      }
    },
  });
}

export function useAcceptLocation(chatRoomId: string | null) {
  const { chatService } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AcceptLocationInput) =>
      chatService.acceptLocation(chatRoomId!, input),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "directTrade", chatRoomId],
      });
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "messages", chatRoomId],
      });
    },
  });
}

export function useRequestLocationChange(chatRoomId: string | null) {
  const { chatService } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RequestLocationChangeInput) =>
      chatService.requestLocationChange(chatRoomId!, input),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "directTrade", chatRoomId],
      });
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "messages", chatRoomId],
      });
    },
  });
}

export function useRespondLocationChange(chatRoomId: string | null) {
  const { chatService } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RespondLocationChangeInput) =>
      chatService.respondLocationChange(chatRoomId!, input),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "directTrade", chatRoomId],
      });
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "messages", chatRoomId],
      });
    },
  });
}

export function useStartLocationShare(chatRoomId: string | null) {
  const { chatService } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LocationShareInput) =>
      chatService.startLocationShare(chatRoomId!, input),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "messages", chatRoomId],
      });
    },
  });
}

export function useUpdateLocationShare(chatRoomId: string | null) {
  const { chatService } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LocationShareInput) =>
      chatService.updateLocationShare(chatRoomId!, input),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "messages", chatRoomId],
      });
    },
  });
}

export function useStopLocationShare(chatRoomId: string | null) {
  const { chatService } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => chatService.stopLocationShare(chatRoomId!),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "messages", chatRoomId],
      });
    },
  });
}

export function useSafePaymentStatus(
  chatRoomId: string | null,
  enabled = true,
) {
  const { chatService } = useServices();
  return useQuery({
    queryKey: [...CLIENT_CHAT_QUERY_KEY, "safePayment", chatRoomId],
    enabled: Boolean(chatRoomId) && enabled,
    retry: false,
    queryFn: async () => {
      try {
        return await chatService.getSafePaymentStatus(chatRoomId!);
      } catch (error) {
        const status = (error as { response?: { status?: number } } | undefined)
          ?.response?.status;
        if (status === 404) return null;
        throw error;
      }
    },
  });
}

export function useRequestSafePayment(chatRoomId: string | null) {
  const { chatService } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => chatService.requestSafePayment(chatRoomId!),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "messages", chatRoomId],
      });
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "safePayment", chatRoomId],
      });
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "rooms"],
      });
    },
  });
}

export function useSubmitSafePayment(chatRoomId: string | null) {
  const { chatService } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SafePaymentSubmitInput) =>
      chatService.submitSafePayment(chatRoomId!, input),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "messages", chatRoomId],
      });
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "safePayment", chatRoomId],
      });
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "rooms"],
      });
    },
  });
}

export function useCompleteTransaction(chatRoomId: string | null) {
  const { chatService } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TransactionCompleteInput) =>
      chatService.completeTransaction(input),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "messages", chatRoomId],
      });
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "safePayment", chatRoomId],
      });
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "rooms"],
      });
      void qc.invalidateQueries({
        queryKey: ["products", "my"],
      });
    },
  });
}

export function useSubmitTransactionReview(chatRoomId: string | null) {
  const { chatService } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      transactionId,
      input,
    }: {
      transactionId: string;
      input: TransactionReviewInput;
    }) => chatService.submitTransactionReview(transactionId, input),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "messages", chatRoomId],
      });
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "safePayment", chatRoomId],
      });
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "rooms"],
      });
    },
  });
}
