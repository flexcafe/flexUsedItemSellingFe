import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { localizeNotification } from "@/presentation/i18n/notifications";
import {
  useMarkNotificationRead,
  useNotifications,
} from "@/presentation/hooks/useNotifications";
import { useLocale } from "@/presentation/providers/LocaleProvider";

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

export function NotificationsScreen() {
  const { t, tf, locale } = useLocale();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const notificationsQuery = useNotifications(20);
  const markReadMutation = useMarkNotificationRead(20);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const notifications = notificationsQuery.data ?? [];
  const unreadCount = useMemo(() => {
    const list = notificationsQuery.data ?? [];
    return list.filter((item) => !item.isRead).length;
  }, [notificationsQuery.data]);

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={notificationsQuery.isFetching}
            onRefresh={() => {
              void notificationsQuery.refetch();
            }}
            tintColor={colors.tint}
          />
        }>
        <View style={styles.header}>
          <ThemedText type="title">{t("notificationsTitle")}</ThemedText>
          {unreadCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.tint }]}>
              <ThemedText style={styles.badgeText}>{unreadCount}</ThemedText>
            </View>
          ) : null}
        </View>

        {notificationsQuery.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.tint} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={[styles.emptyBox, { borderColor: colors.icon }]}>
            <ThemedText style={styles.emptyText}>{t("notificationsEmpty")}</ThemedText>
          </View>
        ) : (
          <View style={styles.list}>
            {notifications.map((item) => {
              const localized = localizeNotification(item, tf, locale);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setExpandedId((prev) => (prev === item.id ? null : item.id));
                    if (!item.isRead) void markReadMutation.mutateAsync(item.id);
                  }}
                  style={[
                    styles.card,
                    { borderColor: colors.icon, backgroundColor: colors.background },
                    !item.isRead && { borderColor: colors.tint },
                  ]}>
                  <View style={styles.cardHeader}>
                    <ThemedText style={[styles.title, !item.isRead && { fontWeight: "800" }]}>
                      {localized.title}
                    </ThemedText>
                    <View style={styles.cardHeaderRight}>
                      <ThemedText style={styles.dateInline}>
                        {formatDate(item.createdAt)}
                      </ThemedText>
                      <MaterialIcons
                        name={expandedId === item.id ? "expand-less" : "expand-more"}
                        size={22}
                        color={colors.icon}
                      />
                    </View>
                  </View>
                  {expandedId === item.id ? (
                    <>
                      <ThemedText style={styles.message}>
                        {localized.body}
                      </ThemedText>
                      <ThemedText style={styles.date}>{formatDate(item.createdAt)}</ThemedText>
                    </>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 30,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  emptyText: {
    opacity: 0.72,
    textAlign: "center",
  },
  list: { gap: 10 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
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
});

