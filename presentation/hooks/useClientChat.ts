import type { ChatMessage } from "@/core/domain/entities/Chat";
import type {
  CursorPage,
  CursorPaginationParams,
  DirectTradeRequestInput,
  LocationShareInput,
  OpenChatRoomInput,
  SendChatMessageInput,
} from "@/core/domain/types/chat";
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
    mutationFn: (input: OpenChatRoomInput) => chatService.openRoom(input),
    onSuccess: (room) => {
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "rooms"],
      });
      qc.setQueryData([...CLIENT_CHAT_QUERY_KEY, "room", room.id], room);
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
  return useMemo(() => {
    const rooms = query.data?.pages.flatMap((page) => page.items) ?? [];
    return rooms.reduce((sum, room) => sum + room.unreadCount, 0);
  }, [query.data]);
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

/** Opens room by listing + seller (A.1), then returns stable room id for the thread screen. */
export function useEnsureChatRoom(
  listingId: string | null,
  sellerId: string | null,
) {
  const { chatService } = useServices();
  const qc = useQueryClient();
  const enabled = Boolean(listingId && sellerId);
  const query = useQuery({
    queryKey: [...CLIENT_CHAT_QUERY_KEY, "ensure", listingId, sellerId],
    queryFn: async () => {
      const room = await chatService.openRoom({
        listingId: listingId!,
        sellerId: sellerId!,
      });
      qc.setQueryData([...CLIENT_CHAT_QUERY_KEY, "room", room.id], room);
      void qc.invalidateQueries({
        queryKey: [...CLIENT_CHAT_QUERY_KEY, "rooms"],
      });
      return room;
    },
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
  return {
    chatRoomId: query.data?.id ?? null,
    room: query.data ?? null,
    isLoading: enabled && (query.isLoading || query.isFetching),
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
