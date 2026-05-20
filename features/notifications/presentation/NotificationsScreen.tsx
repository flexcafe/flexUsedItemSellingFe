import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { memo, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { paddingTopBelowLanguageSwitcher } from "@/constants/language-switcher-layout";
import { Colors } from "@/constants/theme";
import type { ClientNotification } from "@/core/domain/entities/Notification";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { localizeNotification } from "@/presentation/i18n/notifications";
import {
  useMarkNotificationRead,
  useNotifications,
} from "@/presentation/hooks/useNotifications";
import {
  uiCardShadow,
  uiCardSurface,
  uiFadeEnter,
  uiLayoutTransition,
  uiListItemEnter,
  uiSectionEnter,
  usePressScale,
} from "@/presentation/lib/uiAnimations";
import { useLocale } from "@/presentation/providers/LocaleProvider";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mm = `${date.getMinutes()}`.padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

type NotificationRowProps = {
  item: ClientNotification;
  index: number;
  expanded: boolean;
  colors: (typeof Colors)["light"];
  scheme: "light" | "dark";
  onToggle: (item: ClientNotification) => void;
  tf: ReturnType<typeof useLocale>["tf"];
  locale: ReturnType<typeof useLocale>["locale"];
};

const NotificationRow = memo(function NotificationRow({
  item,
  index,
  expanded,
  colors,
  scheme,
  onToggle,
  tf,
  locale,
}: NotificationRowProps) {
  const press = usePressScale();
  const localized = localizeNotification(item, tf, locale);

  return (
    <Animated.View
      entering={uiListItemEnter(index, press.reduceMotion)}
      layout={uiLayoutTransition}
      style={press.style}
    >
      <AnimatedPressable
        onPress={() => onToggle(item)}
        onPressIn={press.handlers.onPressIn}
        onPressOut={press.handlers.onPressOut}
        style={[
          styles.card,
          uiCardShadow(scheme),
          {
            borderColor: colors.icon + "33",
            backgroundColor: uiCardSurface(scheme),
          },
          !item.isRead && { borderColor: colors.tint + "55" },
        ]}
      >
        <View style={styles.cardHeader}>
          <ThemedText
            style={[styles.title, !item.isRead && styles.titleUnread]}
            numberOfLines={expanded ? undefined : 2}
          >
            {localized.title}
          </ThemedText>
          <View style={styles.cardHeaderRight}>
            <ThemedText style={styles.dateInline}>
              {formatDate(item.createdAt)}
            </ThemedText>
            <MaterialIcons
              name={expanded ? "expand-less" : "expand-more"}
              size={22}
              color={colors.icon}
            />
          </View>
        </View>
        {expanded ? (
          <Animated.View
            entering={uiFadeEnter(press.reduceMotion, 200)}
            layout={uiLayoutTransition}
            style={styles.expandedBody}
          >
            <ThemedText style={styles.message}>{localized.body}</ThemedText>
            <ThemedText style={styles.date}>{formatDate(item.createdAt)}</ThemedText>
          </Animated.View>
        ) : null}
      </AnimatedPressable>
    </Animated.View>
  );
});

export function NotificationsScreen() {
  const { t, tf, locale } = useLocale();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];
  const reduceMotion = useReducedMotion();
  const topInset = paddingTopBelowLanguageSwitcher(insets.top);
  const notificationsQuery = useNotifications(20);
  const markReadMutation = useMarkNotificationRead(20);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const notifications = useMemo(
    () => notificationsQuery.data ?? [],
    [notificationsQuery.data],
  );
  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications],
  );

  const onToggle = (item: ClientNotification) => {
    setExpandedId((prev) => (prev === item.id ? null : item.id));
    if (!item.isRead) void markReadMutation.mutateAsync(item.id);
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: ClientNotification;
    index: number;
  }) => (
    <NotificationRow
      item={item}
      index={index}
      expanded={expandedId === item.id}
      colors={colors}
      scheme={scheme}
      onToggle={onToggle}
      tf={tf}
      locale={locale}
    />
  );

  return (
    <ThemedView style={styles.screen}>
      <Animated.View
        entering={uiSectionEnter(0, reduceMotion)}
        style={[styles.header, { paddingTop: topInset }]}
      >
        <ThemedText type="title">{t("notificationsTitle")}</ThemedText>
        {unreadCount > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.tint }]}>
            <ThemedText style={styles.badgeText}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </ThemedText>
          </View>
        ) : null}
      </Animated.View>

      {notificationsQuery.isLoading ? (
        <Animated.View
          entering={uiFadeEnter(reduceMotion)}
          style={styles.center}
        >
          <ActivityIndicator size="large" color={colors.tint} />
        </Animated.View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={notificationsQuery.isFetching}
              onRefresh={() => void notificationsQuery.refetch()}
              tintColor={colors.tint}
            />
          }
          ListEmptyComponent={
            <Animated.View
              entering={uiFadeEnter(reduceMotion, 360)}
              style={[styles.emptyBox, { borderColor: colors.icon }]}
            >
              <MaterialIcons
                name="notifications-none"
                size={40}
                color={colors.icon}
              />
              <ThemedText style={styles.emptyTitle}>
                {t("notificationsEmpty")}
              </ThemedText>
            </Animated.View>
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
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
  emptyTitle: {
    fontSize: 15,
    opacity: 0.72,
    textAlign: "center",
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  cardHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  titleUnread: {
    fontWeight: "800",
  },
  message: {
    fontSize: 13,
    opacity: 0.85,
    lineHeight: 18,
  },
  date: {
    marginTop: 4,
    fontSize: 12,
    opacity: 0.6,
  },
  dateInline: {
    fontSize: 12,
    opacity: 0.6,
  },
  expandedBody: {
    gap: 4,
    paddingTop: 2,
  },
});
