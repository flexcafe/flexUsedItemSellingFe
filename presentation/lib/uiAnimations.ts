import { Platform } from "react-native";
import {
  Extrapolation,
  FadeIn,
  FadeInDown,
  FadeInUp,
  LinearTransition,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

export const UI_LIST_STAGGER_MS = 48;
export const UI_MAX_STAGGER_ITEMS = 10;
export const UI_SECTION_STAGGER_MS = 70;

type UiEnterDirection = "up" | "down";

type UiShadowOptions = {
  iosOffsetLight?: number;
  iosOffsetDark?: number;
  iosOpacityLight?: number;
  iosOpacityDark?: number;
  iosRadiusLight?: number;
  iosRadiusDark?: number;
  androidElevationLight?: number;
  androidElevationDark?: number;
};

type UiEnterOptions = {
  direction?: UiEnterDirection;
  duration?: number;
  damping?: number;
  stiffness?: number;
  delay?: number;
};

type UiListEnterOptions = UiEnterOptions & {
  staggerMs?: number;
  maxItems?: number;
};

function baseEnter(direction: UiEnterDirection) {
  return direction === "down" ? FadeInDown : FadeInUp;
}

export function uiCardShadow(
  scheme: "light" | "dark",
  options?: UiShadowOptions,
) {
  const isDark = scheme === "dark";
  const iosOffsetLight = options?.iosOffsetLight ?? 4;
  const iosOffsetDark = options?.iosOffsetDark ?? 6;
  const iosOpacityLight = options?.iosOpacityLight ?? 0.08;
  const iosOpacityDark = options?.iosOpacityDark ?? 0.28;
  const iosRadiusLight = options?.iosRadiusLight ?? 10;
  const iosRadiusDark = options?.iosRadiusDark ?? 12;
  const androidElevationLight = options?.androidElevationLight ?? 3;
  const androidElevationDark = options?.androidElevationDark ?? 4;
  return Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: isDark ? iosOffsetDark : iosOffsetLight },
      shadowOpacity: isDark ? iosOpacityDark : iosOpacityLight,
      shadowRadius: isDark ? iosRadiusDark : iosRadiusLight,
    },
    android: { elevation: isDark ? androidElevationDark : androidElevationLight },
    default: {},
  });
}

export function uiCardSurface(scheme: "light" | "dark") {
  return scheme === "dark" ? "#1C1F24" : "#FFFFFF";
}

export function uiListItemEnter(
  index: number,
  reduceMotion: boolean | null,
  options?: UiListEnterOptions,
) {
  if (reduceMotion) return undefined;
  const direction = options?.direction ?? "up";
  const duration = options?.duration ?? 400;
  const staggerMs = options?.staggerMs ?? UI_LIST_STAGGER_MS;
  const maxItems = options?.maxItems ?? UI_MAX_STAGGER_ITEMS;
  const delay =
    (options?.delay ?? 0) + Math.min(index, maxItems) * staggerMs;
  const damping = options?.damping ?? 18;
  const stiffness = options?.stiffness ?? 220;
  return baseEnter(direction)
    .duration(duration)
    .delay(delay)
    .springify()
    .damping(damping)
    .stiffness(stiffness);
}

export function uiSectionEnter(
  delayMs: number,
  reduceMotion: boolean | null,
  options?: UiEnterOptions,
) {
  if (reduceMotion) return undefined;
  const direction = options?.direction ?? "down";
  const duration = options?.duration ?? 420;
  const damping = options?.damping ?? 18;
  const stiffness = options?.stiffness ?? 220;
  const delay = delayMs + (options?.delay ?? 0);
  return baseEnter(direction)
    .duration(duration)
    .delay(delay)
    .springify()
    .damping(damping)
    .stiffness(stiffness);
}

export function uiFadeEnter(reduceMotion: boolean | null, duration = 280) {
  if (reduceMotion) return undefined;
  return FadeIn.duration(duration);
}

export function uiContentEnter(
  reduceMotion: boolean | null,
  options?: UiEnterOptions,
) {
  if (reduceMotion) return undefined;
  const direction = options?.direction ?? "up";
  const duration = options?.duration ?? 320;
  const damping = options?.damping ?? 20;
  const stiffness = options?.stiffness ?? 260;
  const delay = options?.delay ?? 0;
  return baseEnter(direction)
    .duration(duration)
    .delay(delay)
    .springify()
    .damping(damping)
    .stiffness(stiffness);
}

export const uiLayoutTransition = LinearTransition.springify()
  .damping(20)
  .stiffness(200);

export function usePressScale() {
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(pressed.value, [0, 1], [1, 0.97], Extrapolation.CLAMP),
      },
    ],
  }));
  const handlers = {
    onPressIn: () => {
      if (reduceMotion) return;
      pressed.value = withTiming(1, { duration: 90 });
    },
    onPressOut: () => {
      if (reduceMotion) return;
      pressed.value = withSpring(0, { damping: 14, stiffness: 320 });
    },
  };
  return { style, handlers, reduceMotion };
}
