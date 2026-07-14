import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { SafeAreaScreenWrapper } from "@/components/app-safe-area";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useChatRoomsUnreadCount } from "@/presentation/hooks/useClientChat";
import { useNotifications } from "@/presentation/hooks/useNotifications";
import { useLocale } from "@/presentation/providers/LocaleProvider";

function TabIconWithBadge({
  name,
  color,
  count,
}: {
  name: React.ComponentProps<typeof IconSymbol>["name"];
  color: string;
  count: number;
}) {
  const label = count > 99 ? "99+" : String(count);
  return (
    <View style={styles.iconWrap}>
      <IconSymbol size={28} name={name} color={color} />
      {count > 0 ? (
        <View style={styles.redBadge}>
          <Text style={styles.redBadgeText} numberOfLines={1}>
            {label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useLocale();
  const notificationsQuery = useNotifications(20);
  const unreadCount =
    notificationsQuery.data?.filter((item) => !item.isRead).length ?? 0;
  const chatUnreadCount = useChatRoomsUnreadCount(50);

  return (
    <SafeAreaScreenWrapper mode="tab">
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
          headerShown: false,
          tabBarButton: HapticTab,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t("tabsHome"),
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="house.fill" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="products"
          options={{
            title: t("tabsProducts"),
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="cube.box.fill" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="chats"
          options={{
            title: t("tabsChats"),
            tabBarIcon: ({ color }) => (
              <TabIconWithBadge
                name="bubble.left.and.bubble.right.fill"
                color={color}
                count={chatUnreadCount}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: t("tabsNotifications"),
            tabBarIcon: ({ color }) => (
              <TabIconWithBadge
                name="bell.fill"
                color={color}
                count={unreadCount}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t("tabsProfile"),
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="person.fill" color={color} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaScreenWrapper>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 28,
    height: 28,
  },
  redBadge: {
    position: "absolute",
    top: -3,
    right: -8,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
  },
  redBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 11,
    textAlign: "center",
    includeFontPadding: false,
  },
});
