import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
  type Edge,
  type EdgeInsets,
} from "react-native-safe-area-context";

import {
  paddingTopBelowLanguageSwitcher,
  paddingTopInsideSafeAreaForLanguageSwitcher,
  topOffsetForFloatingBackButton,
} from "@/constants/language-switcher-layout";

export type SafeAreaLayoutMode = "full" | "tab" | "none";

const SafeAreaLayoutContext = createContext<SafeAreaLayoutMode>("none");

type AppSafeAreaViewProps = {
  children: ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
};

type SafeAreaScreenWrapperProps = {
  children: ReactNode;
  /** `full` = top+bottom for stack screens; `tab` = top only (tab bar handles bottom). */
  mode?: SafeAreaLayoutMode;
  style?: StyleProp<ViewStyle>;
};

const TAB_EDGES: Edge[] = ["top", "left", "right"];
const FULL_EDGES: Edge[] = ["top", "left", "right", "bottom"];

/** Raw device/window insets — use for absolute overlays and full-screen modals. */
export function useAppSafeAreaInsets(): EdgeInsets {
  return useSafeAreaInsets();
}

export function useSafeAreaLayoutMode(): SafeAreaLayoutMode {
  return useContext(SafeAreaLayoutContext);
}

/**
 * Insets still needed inside content after `SafeAreaScreenWrapper` applied edges.
 * Edges consumed by the wrapper return 0 here to avoid double padding.
 */
export function useAppliedSafeAreaInsets(): EdgeInsets & {
  window: EdgeInsets;
  mode: SafeAreaLayoutMode;
} {
  const windowInsets = useSafeAreaInsets();
  const mode = useSafeAreaLayoutMode();

  return useMemo(() => {
    if (mode === "full") {
      return {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        window: windowInsets,
        mode,
      };
    }

    if (mode === "tab") {
      return {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        window: windowInsets,
        mode,
      };
    }

    return {
      top: windowInsets.top,
      bottom: windowInsets.bottom,
      left: windowInsets.left,
      right: windowInsets.right,
      window: windowInsets,
      mode,
    };
  }, [mode, windowInsets]);
}

export function useLanguageSwitcherSafeTop() {
  const { top, window, mode } = useAppliedSafeAreaInsets();

  if (mode === "none") {
    return paddingTopBelowLanguageSwitcher(window.top);
  }

  return top + paddingTopInsideSafeAreaForLanguageSwitcher();
}

export function useFloatingBackButtonTop() {
  const { window } = useAppliedSafeAreaInsets();
  return topOffsetForFloatingBackButton(window.top);
}

export function SafeAreaScreenWrapper({
  children,
  mode = "full",
  style,
}: SafeAreaScreenWrapperProps) {
  const edges = mode === "tab" ? TAB_EDGES : FULL_EDGES;

  return (
    <SafeAreaLayoutContext.Provider value={mode}>
      <SafeAreaView edges={edges} style={[styles.fill, style]}>
        {children}
      </SafeAreaView>
    </SafeAreaLayoutContext.Provider>
  );
}

export function AppSafeAreaView({
  children,
  edges = FULL_EDGES,
  style,
}: AppSafeAreaViewProps) {
  return (
    <SafeAreaView edges={edges} style={[styles.fill, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
