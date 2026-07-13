import { memo, useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import type { AppLocale } from "@/core/domain/types/locale";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { uiCardShadow } from "@/presentation/lib/uiAnimations";

const OPTIONS: { locale: AppLocale; flag: string }[] = [
  { locale: "ko", flag: "\uD83C\uDDF0\uD83C\uDDF7" },
  { locale: "my", flag: "\uD83C\uDDF2\uD83C\uDDF2" },
  { locale: "zh", flag: "\uD83C\uDDE8\uD83C\uDDF3" },
  { locale: "en", flag: "\uD83C\uDDFA\uD83C\uDDF8" },
];

const LOCALE_COUNT = OPTIONS.length;

type Variant = "compact" | "comfortable";

type VariantMetrics = {
  barHeight: number;
  padding: number;
  gap: number;
  borderRadius: number;
  pillRadius: number;
  flagSize: number;
  minBarWidth: number;
  hitSlop: { top: number; bottom: number; left: number; right: number };
};

const VARIANT_METRICS: Record<Variant, VariantMetrics> = {
  compact: {
    barHeight: 30,
    padding: 3,
    gap: 2,
    borderRadius: 10,
    pillRadius: 6,
    flagSize: 13,
    minBarWidth: 152,
    hitSlop: { top: 10, bottom: 10, left: 4, right: 4 },
  },
  comfortable: {
    barHeight: 56,
    padding: 8,
    gap: 10,
    borderRadius: 16,
    pillRadius: 12,
    flagSize: 22,
    minBarWidth: 0,
    hitSlop: { top: 4, bottom: 4, left: 4, right: 4 },
  },
};

function localeIndex(locale: AppLocale): number {
  return OPTIONS.findIndex((option) => option.locale === locale);
}

function segmentLayout(barWidth: number, metrics: VariantMetrics) {
  const innerWidth = Math.max(0, barWidth - metrics.padding * 2);
  const gapTotal = metrics.gap * (LOCALE_COUNT - 1);
  const segmentWidth = Math.max(0, (innerWidth - gapTotal) / LOCALE_COUNT);
  return { segmentWidth, innerWidth };
}

export type AnimatedLanguageBarProps = {
  locale: AppLocale;
  onSelect: (locale: AppLocale) => void;
  variant?: Variant;
  disabled?: boolean;
  scheme?: "light" | "dark";
  tintColor?: string;
  borderColor?: string;
  backgroundColor?: string;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const AnimatedLanguageBar = memo(function AnimatedLanguageBar({
  locale,
  onSelect,
  variant = "comfortable",
  disabled = false,
  scheme: schemeProp,
  tintColor,
  borderColor,
  backgroundColor,
  elevated = false,
  style,
}: AnimatedLanguageBarProps) {
  const colorScheme = useColorScheme();
  const scheme = schemeProp ?? colorScheme ?? "light";
  const colors = Colors[scheme];
  const reduceMotion = useReducedMotion();
  const metrics = VARIANT_METRICS[variant];

  const [barWidth, setBarWidth] = useState(0);
  const pillX = useSharedValue(0);
  const pillWidth = useSharedValue(0);
  const langIndex = Math.max(0, localeIndex(locale));

  useEffect(() => {
    if (barWidth <= 0) return;
    const { segmentWidth: width } = segmentLayout(barWidth, metrics);
    const targetX = langIndex * (width + metrics.gap);
    pillWidth.value = width;
    pillX.value = reduceMotion
      ? targetX
      : withTiming(targetX, { duration: 420 });
  }, [barWidth, langIndex, metrics, pillWidth, pillX, reduceMotion]);

  const pillStyle = useAnimatedStyle(() => ({
    width: pillWidth.value,
    transform: [{ translateX: pillX.value }],
  }));

  const resolvedTint = tintColor ?? colors.tint;
  const resolvedBorder = borderColor ?? (variant === "compact" ? colors.icon : colors.tint);
  const resolvedBackground = backgroundColor ?? colors.background;

  return (
    <View
      style={[
        styles.bar,
        elevated &&
          uiCardShadow(scheme, {
            iosOffsetLight: 6,
            iosOffsetDark: 6,
            iosOpacityLight: 0.08,
            iosOpacityDark: 0.28,
            iosRadiusLight: 12,
            iosRadiusDark: 12,
            androidElevationLight: 3,
            androidElevationDark: 4,
          }),
        {
          height: metrics.barHeight,
          minWidth: metrics.minBarWidth,
          borderRadius: metrics.borderRadius,
          padding: metrics.padding,
          gap: metrics.gap,
          borderColor: resolvedBorder,
          backgroundColor: resolvedBackground,
        },
        style,
      ]}
      onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pill,
          {
            left: metrics.padding,
            top: metrics.padding,
            bottom: metrics.padding,
            borderRadius: metrics.pillRadius,
            backgroundColor: resolvedTint,
          },
          pillStyle,
        ]}
      />
      {OPTIONS.map((option) => {
        const selected = locale === option.locale;
        return (
          <Pressable
            key={option.locale}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={option.locale}
            hitSlop={metrics.hitSlop}
            onPress={() => onSelect(option.locale)}
            style={styles.flagButton}
          >
            <ThemedText
              style={[
                styles.flag,
                { fontSize: metrics.flagSize, lineHeight: metrics.flagSize + 3 },
                selected && styles.flagSelected,
              ]}
            >
              {option.flag}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    position: "relative",
  },
  pill: {
    position: "absolute",
  },
  flagButton: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  flag: {
    opacity: 0.95,
  },
  flagSelected: {
    color: "#fff",
    opacity: 1,
  },
});
