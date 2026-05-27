import {
  SafeAreaView,
  useSafeAreaInsets,
  type Edge,
} from "react-native-safe-area-context";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import {
  paddingTopBelowLanguageSwitcher,
  topOffsetForFloatingBackButton,
} from "@/constants/language-switcher-layout";

type AppSafeAreaViewProps = {
  children: ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
};

export function useAppSafeAreaInsets() {
  return useSafeAreaInsets();
}

export function useLanguageSwitcherSafeTop() {
  const insets = useAppSafeAreaInsets();
  return paddingTopBelowLanguageSwitcher(insets.top);
}

export function useFloatingBackButtonTop() {
  const insets = useAppSafeAreaInsets();
  return topOffsetForFloatingBackButton(insets.top);
}

export function AppSafeAreaView({
  children,
  edges = ["top", "left", "right", "bottom"],
  style,
}: AppSafeAreaViewProps) {
  return (
    <SafeAreaView edges={edges} style={style}>
      {children}
    </SafeAreaView>
  );
}
