import { useMemo } from "react";
import { StyleSheet, type StyleProp, type TextStyle } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getAppVersionInfo } from "@/presentation/lib/appVersion";
import { useLocale } from "@/presentation/providers/LocaleProvider";

import { ThemedText } from "./themed-text";

type AppVersionLabelProps = {
  align?: "left" | "center";
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
};

export function AppVersionLabel({
  align = "center",
  numberOfLines,
  style,
}: AppVersionLabelProps) {
  const { tf } = useLocale();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const label = useMemo(
    () => tf("appVersionDisplay", getAppVersionInfo()),
    [tf],
  );

  return (
    <ThemedText
      numberOfLines={numberOfLines}
      ellipsizeMode="tail"
      style={[
        styles.text,
        { color: colors.icon, textAlign: align },
        style,
      ]}
    >
      {label}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 12,
    opacity: 0.72,
  },
});
