import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import Toast, { type ToastConfigParams } from "react-native-toast-message";

import { useAppSafeAreaInsets } from "@/components/app-safe-area";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { uiCardShadow, usePressScale } from "@/presentation/lib/uiAnimations";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function NotificationToastCard(
  params: ToastConfigParams<undefined> & {
    colors: (typeof Colors)["light"];
    scheme: "light" | "dark";
  },
) {
  const press = usePressScale();
  const surface = params.scheme === "dark" ? "#25282C" : "#FFFFFF";
  const border =
    params.scheme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";

  return (
    <AnimatedPressable
      accessibilityRole="alert"
      accessibilityLabel={params.text1 ?? "Notification"}
      onPress={() => {
        params.onPress?.();
        Toast.hide();
      }}
      onPressIn={press.handlers.onPressIn}
      onPressOut={press.handlers.onPressOut}
      style={[
        styles.card,
        press.style,
        {
          backgroundColor: surface,
          borderColor: border,
          borderLeftColor: params.colors.tint,
        },
        uiCardShadow(params.scheme, {
          iosOffsetLight: 6,
          iosOffsetDark: 6,
          iosOpacityLight: 0.22,
          iosOpacityDark: 0.22,
          iosRadiusLight: 10,
          iosRadiusDark: 10,
          androidElevationLight: 16,
          androidElevationDark: 12,
        }),
      ]}
    >
      <View
        style={[styles.iconWrap, { backgroundColor: `${params.colors.tint}22` }]}
      >
        <MaterialIcons
          name="notifications-active"
          size={26}
          color={params.colors.tint}
        />
      </View>
      <View style={styles.textCol}>
        <Text
          style={[styles.title, { color: params.colors.text }]}
          numberOfLines={2}
        >
          {params.text1}
        </Text>
        {params.text2 ? (
          <Text
            style={[styles.body, { color: params.colors.text }]}
            numberOfLines={5}
          >
            {params.text2}
          </Text>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

export function NotificationToastRoot() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const insets = useAppSafeAreaInsets();
  const colors = Colors[scheme];

  const toastConfig = useMemo(
    () => ({
      notification: (params: ToastConfigParams<undefined>) => (
        <NotificationToastCard
          {...params}
          colors={colors}
          scheme={scheme}
        />
      ),
    }),
    [colors, scheme],
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
