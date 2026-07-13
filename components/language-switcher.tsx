import { useSegments } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AnimatedLanguageBar } from "@/components/animated-language-bar";
import { AppVersionLabel } from "@/components/app-version-label";
import { useAppSafeAreaInsets } from "@/components/app-safe-area";
import { languageSwitcherTopOffset } from "@/constants/language-switcher-layout";
import { useLocale } from "@/presentation/providers/LocaleProvider";

export function LanguageSwitcher() {
  const segments = useSegments();
  const insets = useAppSafeAreaInsets();
  const { locale, setLocale } = useLocale();
  const isAuthScreen = segments[0] === "(auth)";

  if (isAuthScreen) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { top: languageSwitcherTopOffset(insets.top) }]}
    >
      <AppVersionLabel
        align="left"
        numberOfLines={1}
        style={styles.version}
      />
      <AnimatedLanguageBar
        locale={locale}
        onSelect={setLocale}
        variant="compact"
        style={styles.bar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 50,
    gap: 6,
  },
  version: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    marginRight: 4,
    fontSize: 9,
    lineHeight: 12,
  },
  bar: {
    flexShrink: 0,
    maxWidth: "58%",
  },
});
