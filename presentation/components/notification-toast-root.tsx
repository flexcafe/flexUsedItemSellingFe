import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useMemo } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import Toast, { type ToastConfigParams } from "react-native-toast-message";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

function cardShadow(elevation: number): ViewStyle {
  if (Platform.OS === "android") {
    return { elevation };
  }
  return {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
  };
}

export function NotificationToastRoot() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const colors = Colors[colorScheme ?? "light"];
  const isDark = colorScheme === "dark";

  const toastConfig = useMemo(
    () => ({
      notification: (params: ToastConfigParams<undefined>) => {
        const surface = isDark ? "#25282C" : "#FFFFFF";
        const border = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
        return (
          <Pressable
            accessibilityRole="alert"
            accessibilityLabel={params.text1 ?? "Notification"}
            onPress={() => {
              params.onPress?.();
              Toast.hide();
            }}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: surface,
                borderColor: border,
                borderLeftColor: colors.tint,
                opacity: pressed ? 0.94 : 1,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
              cardShadow(isDark ? 12 : 16),
            ]}
          >
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: `${colors.tint}22` },
              ]}
            >
              <MaterialIcons
                name="notifications-active"
                size={26}
                color={colors.tint}
              />
            </View>
            <View style={styles.textCol}>
              <Text
                style={[styles.title, { color: colors.text }]}
                numberOfLines={2}
              >
                {params.text1}
              </Text>
              {params.text2 ? (
                <Text
                  style={[styles.body, { color: colors.text }]}
                  numberOfLines={5}
                >
                  {params.text2}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      },
    }),
    [colors.text, colors.tint, isDark],
  );

  return (
    <Toast
      config={toastConfig}
      position="bottom"
      bottomOffset={Math.max(insets.bottom, 8) + 52}
      visibilityTime={7000}
      autoHide
      swipeable
    />
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginHorizontal: 14,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    paddingLeft: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 5,
    gap: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.92,
  },
});
