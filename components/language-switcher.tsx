import { useSegments } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { AppLocale } from "@/core/domain/types/locale";
import { useLocale } from "@/presentation/providers/LocaleProvider";
import { ThemedText } from "./themed-text";

const OPTIONS: { locale: AppLocale; flag: string }[] = [
  { locale: "ko", flag: "\uD83C\uDDF0\uD83C\uDDF7" },
  { locale: "my", flag: "\uD83C\uDDF2\uD83C\uDDF2" },
  { locale: "zh", flag: "\uD83C\uDDE8\uD83C\uDDF3" },
];

export function LanguageSwitcher() {
  const segments = useSegments();
  const { locale, setLocale } = useLocale();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const isAuthScreen = segments[0] === "(auth)";

  if (isAuthScreen) return null;

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <View
        style={[
          styles.bar,
          { borderColor: colors.icon, backgroundColor: colors.background },
        ]}>
        {OPTIONS.map((option) => {
          const selected = locale === option.locale;
          return (
            <Pressable
              key={option.locale}
              onPress={() => setLocale(option.locale)}
              style={[
                styles.button,
                selected && { backgroundColor: colors.tint, borderColor: colors.tint },
              ]}>
              <ThemedText style={[styles.buttonText, selected && { color: "#fff" }]}>
                {option.flag}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 44,
    right: 16,
    zIndex: 50,
  },
  bar: {
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    padding: 6,
  },
  button: {
    minWidth: 42,
    height: 30,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  buttonText: {
    fontSize: 18,
  },
});
