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

import { useLanguageSwitcherSafeTop } from "@/components/app-safe-area";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import type { ClientNotification } from "@/core/domain/entities/Notification";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  isChatNotification,
  isGeneralNotification,
  localizeNotification,
} from "@/presentation/i18n/notifications";
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
const UI_SECTION_STAGGER_MS = 70;

type InboxSection = "general" | "chat";
type ChatFilter = "all" | "unread";

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

function SectionTab({
  label,
  active,
  unread,
  tint,
  borderColor,
  onPress,
}: {
  label: string;
  active: boolean;
  unread: number;
  tint: string;
  borderColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.sectionTab,
        { borderColor },
        active && { backgroundColor: tint + "18", borderColor: tint },
      ]}
    >
      <ThemedText
        style={[
          styles.sectionTabText,
          active && { color: tint, fontWeight: "800" },
        ]}
        numberOfLines={1}
      >
        {label}
      </ThemedText>
      {unread > 0 ? (
        <View style={[styles.sectionTabBadge, { backgroundColor: tint }]}>
          <ThemedText style={styles.sectionTabBadgeText}>
            {unread > 99 ? "99+" : unread}
          </ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}

function FilterChip({
  label,
  active,
  tint,
  borderColor,
  onPress,
}: {
  label: string;
  active: boolean;
  tint: string;
  borderColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterChip,
        { borderColor },
        active && { backgroundColor: tint, borderColor: tint },
      ]}
    >
      <ThemedText
        style={[
          styles.filterChipText,
          active && styles.filterChipTextActive,
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function NotificationsScreen() {
  const { t, tf, locale } = useLocale();
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];
  const reduceMotion = useReducedMotion();
  const topInset = useLanguageSwitcherSafeTop();
  const notificationsQuery = useNotifications(20);
  const markReadMutation = useMarkNotificationRead(20);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [section, setSection] = useState<InboxSection>("general");
  const [chatFilter, setChatFilter] = useState<ChatFilter>("all");

  const notifications = useMemo(
    () => notificationsQuery.data ?? [],
    [notificationsQuery.data],
  );

  const generalNotifications = useMemo(
    () => notifications.filter(isGeneralNotification),
    [notifications],
  );
  const chatNotifications = useMemo(
    () => notifications.filter(isChatNotification),
    [notifications],
  );

  const generalUnread = useMemo(
    () => generalNotifications.filter((item) => !item.isRead).length,
    [generalNotifications],
  );
  const chatUnread = useMemo(
    () => chatNotifications.filter((item) => !item.isRead).length,
    [chatNotifications],
  );

  const filteredNotifications = useMemo(() => {
    const base =
      section === "chat" ? chatNotifications : generalNotifications;
    if (section === "chat" && chatFilter === "unread") {
      return base.filter((item) => !item.isRead);
    }
    return base;
  }, [chatFilter, chatNotifications, generalNotifications, section]);

  const sectionUnread =
    section === "chat" ? chatUnread : generalUnread;

  const onToggle = (item: ClientNotification) => {
    setExpandedId((prev) => (prev === item.id ? null : item.id));
    if (!item.isRead) void markReadMutation.mutateAsync(item.id);
  };

  const onSectionChange = (next: InboxSection) => {
    setSection(next);
    setExpandedId(null);
    if (next === "general") setChatFilter("all");
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

  const emptyLabel =
    section === "chat" ? t("noti.chat.empty") : t("notificationsEmpty");

  const sectionHint =
    section === "chat"
      ? t("noti.sections.chatHint")
      : t("noti.sections.generalHint");

  return (
    <ThemedView style={styles.screen}>
      <Animated.View
        entering={uiSectionEnter(0, reduceMotion)}
        style={[styles.header, { paddingTop: topInset }]}
      >
        <ThemedText type="title">{t("notificationsTitle")}</ThemedText>
        {sectionUnread > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.tint }]}>
            <ThemedText style={styles.badgeText}>
              {sectionUnread > 99 ? "99+" : sectionUnread}
            </ThemedText>
          </View>
        ) : null}
      </Animated.View>

      <Animated.View
        entering={uiSectionEnter(UI_SECTION_STAGGER_MS, reduceMotion)}
        style={styles.sectionTabsRow}
      >
        <SectionTab
          label={t("noti.sections.general")}
          active={section === "general"}
          unread={generalUnread}
          tint={colors.tint}
          borderColor={colors.icon + "44"}
          onPress={() => onSectionChange("general")}
        />
        <SectionTab
          label={t("noti.sections.chat")}
          active={section === "chat"}
          unread={chatUnread}
          tint={colors.tint}
          borderColor={colors.icon + "44"}
          onPress={() => onSectionChange("chat")}
        />
      </Animated.View>

      <ThemedText style={styles.sectionHint}>{sectionHint}</ThemedText>

      {section === "chat" ? (
        <View style={styles.filterRow}>
          <FilterChip
            label={t("noti.chat.filterAll")}
            active={chatFilter === "all"}
            tint={colors.tint}
            borderColor={colors.icon + "44"}
            onPress={() => setChatFilter("all")}
          />
          <FilterChip
            label={t("noti.chat.filterUnread")}
            active={chatFilter === "unread"}
            tint={colors.tint}
            borderColor={colors.icon + "44"}
            onPress={() => setChatFilter("unread")}
          />
        </View>
      ) : null}

      {notificationsQuery.isLoading ? (
        <Animated.View
          entering={uiFadeEnter(reduceMotion)}
          style={styles.center}
        >
          <ActivityIndicator size="large" color={colors.tint} />
        </Animated.View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          extraData={`${section}-${chatFilter}-${expandedId}`}
          contentContainerStyle={[
            styles.listContent,
            filteredNotifications.length === 0 && styles.listContentEmpty,
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
                name={
                  section === "chat" ? "forum" : "notifications-none"
                }
                size={40}
                color={colors.icon}
              />
              <ThemedText style={styles.emptyTitle}>{emptyLabel}</ThemedText>
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
    paddingBottom: 10,
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
  sectionTabsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  sectionTab: {
    flex: 1,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  sectionTabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  sectionTabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  sectionTabBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  sectionHint: {
    fontSize: 12,
    opacity: 0.68,
    lineHeight: 17,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.75,
  },
  filterChipTextActive: {
    color: "#fff",
    opacity: 1,
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
