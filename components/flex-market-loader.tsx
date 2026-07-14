import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect } from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLocale } from "@/presentation/providers/LocaleProvider";

export type FlexMarketLoaderSize = "xs" | "sm" | "md" | "lg";
export type FlexMarketLoaderVariant = "full" | "inline";

type Props = {
  size?: FlexMarketLoaderSize;
  style?: StyleProp<ViewStyle>;
  showText?: boolean;
  text?: string;
  variant?: FlexMarketLoaderVariant;
};

const BOX: Record<FlexMarketLoaderSize, number> = {
  xs: 22,
  sm: 48,
  md: 88,
  lg: 112,
};

const TEXT_SIZE: Record<FlexMarketLoaderSize, number> = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
};

/**
 * Marketplace-themed loader for Flex Used Market.
 * Motif: listing cards swapping around a trade hub (not a copy of car-parts loaders).
 */
export function FlexMarketLoader({
  size = "md",
  style,
  showText = true,
  text,
  variant = "full",
}: Props) {
  const { t } = useLocale();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const reduceMotion = useReducedMotion();
  const label = text?.trim() || t("commonLoading");
  const box = BOX[size];

  const orbit = useSharedValue(0);
  const swap = useSharedValue(0);
  const pulse = useSharedValue(0);
  const tagBounce = useSharedValue(0);
  const ripple = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      orbit.value = 0;
      swap.value = 0;
      pulse.value = 0.5;
      tagBounce.value = 0;
      ripple.value = 0.4;
      return;
    }

    orbit.value = withRepeat(
      withTiming(1, { duration: 4200, easing: Easing.linear }),
      -1,
      false,
    );
    swap.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.cubic) }),
      -1,
      false,
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    tagBounce.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 700, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      false,
    );
    ripple.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.out(Easing.cubic) }),
      -1,
      false,
    );
  }, [orbit, pulse, reduceMotion, ripple, swap, tagBounce]);

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbit.value * 360}deg` }],
  }));

  const counterOrbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-orbit.value * 360}deg` }],
  }));

  const cardAStyle = useAnimatedStyle(() => {
    const t = swap.value;
    const x = interpolate(t, [0, 0.5, 1], [-box * 0.28, box * 0.28, -box * 0.28]);
    const y = interpolate(t, [0, 0.5, 1], [-box * 0.06, box * 0.06, -box * 0.06]);
    const scale = interpolate(t, [0, 0.5, 1], [1, 0.88, 1]);
    const z = t < 0.5 ? 2 : 1;
    return {
      zIndex: z,
      transform: [{ translateX: x }, { translateY: y }, { scale }],
      opacity: interpolate(t, [0, 0.5, 1], [1, 0.75, 1]),
    };
  });

  const cardBStyle = useAnimatedStyle(() => {
    const t = swap.value;
    const x = interpolate(t, [0, 0.5, 1], [box * 0.28, -box * 0.28, box * 0.28]);
    const y = interpolate(t, [0, 0.5, 1], [box * 0.08, -box * 0.08, box * 0.08]);
    const scale = interpolate(t, [0, 0.5, 1], [0.9, 1.05, 0.9]);
    return {
      zIndex: t < 0.5 ? 1 : 2,
      transform: [{ translateX: x }, { translateY: y }, { scale }],
      opacity: interpolate(t, [0, 0.5, 1], [0.85, 1, 0.85]),
    };
  });

  const hubStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(pulse.value, [0, 1], [0.94, 1.08]) },
    ],
    opacity: interpolate(pulse.value, [0, 1], [0.88, 1]),
  }));

  const tagStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(tagBounce.value, [0, 1], [0, -box * 0.04]) },
      { rotate: `${interpolate(tagBounce.value, [0, 1], [-6, 8])}deg` },
    ],
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ripple.value, [0, 1], [0.45, 0]),
    transform: [{ scale: interpolate(ripple.value, [0, 1], [0.55, 1.25]) }],
  }));

  const textPulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.55, 1]),
  }));

  const compact = size === "xs";
  const cardW = Math.max(18, box * 0.28);
  const cardH = Math.max(22, box * 0.34);
  const hub = compact ? Math.max(14, box * 0.72) : Math.max(20, box * 0.34);
  const stroke = colorScheme === "dark" ? "#3A3F46" : "#E7E2DB";
  const cardFill = colorScheme === "dark" ? "#25282C" : "#FFF8F2";
  const muted = colors.icon;

  const scene = (
    <View style={[styles.scene, { width: box, height: box }]}>
      {!compact ? (
        <Animated.View
          style={[
            styles.ripple,
            {
              borderColor: colors.tint + "55",
              width: box,
              height: box,
              borderRadius: box / 2,
            },
            rippleStyle,
          ]}
        />
      ) : null}

      <Animated.View
        style={[
          styles.orbitRing,
          {
            width: box * 0.92,
            height: box * 0.92,
            borderRadius: box * 0.46,
            borderColor: colors.tint + (compact ? "88" : "40"),
            borderWidth: compact ? 1.5 : 1.5,
          },
          orbitStyle,
        ]}
      >
        <View
          style={[
            styles.orbitDot,
            {
              backgroundColor: colors.tint,
              top: compact ? -2 : -3,
              left: "50%",
              marginLeft: compact ? -2 : -3,
              width: compact ? 4 : 6,
              height: compact ? 4 : 6,
              borderRadius: compact ? 2 : 3,
            },
          ]}
        />
        {!compact ? (
          <View
            style={[
              styles.orbitDot,
              {
                backgroundColor: colors.tint + "AA",
                bottom: -3,
                left: "50%",
                marginLeft: -2.5,
                width: 5,
                height: 5,
                borderRadius: 3,
              },
            ]}
          />
        ) : null}
      </Animated.View>

      {!compact ? (
        <Animated.View
          style={[
            styles.dashedRing,
            {
              width: box * 0.72,
              height: box * 0.72,
              borderRadius: box * 0.36,
              borderColor: muted + "55",
            },
            counterOrbitStyle,
          ]}
        />
      ) : null}

      {!compact ? (
        <>
          <Animated.View
            style={[
              styles.listingCard,
              {
                width: cardW,
                height: cardH,
                backgroundColor: cardFill,
                borderColor: stroke,
              },
              cardAStyle,
            ]}
          >
            <View
              style={[styles.cardThumb, { backgroundColor: colors.tint + "33" }]}
            />
            <View
              style={[
                styles.cardLine,
                { backgroundColor: muted + "44", width: "70%" },
              ]}
            />
            <View
              style={[
                styles.cardLine,
                { backgroundColor: muted + "33", width: "45%" },
              ]}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.listingCard,
              {
                width: cardW,
                height: cardH,
                backgroundColor: cardFill,
                borderColor: stroke,
              },
              cardBStyle,
            ]}
          >
            <View
              style={[styles.cardThumb, { backgroundColor: "#0EA5E933" }]}
            />
            <View
              style={[
                styles.cardLine,
                { backgroundColor: muted + "44", width: "65%" },
              ]}
            />
            <View
              style={[
                styles.cardLine,
                { backgroundColor: muted + "33", width: "40%" },
              ]}
            />
          </Animated.View>
        </>
      ) : null}

      <Animated.View
        style={[
          styles.hub,
          {
            width: hub,
            height: hub,
            borderRadius: hub / 2,
            backgroundColor: colors.tint,
          },
          hubStyle,
        ]}
      >
        <MaterialIcons
          name="swap-horiz"
          size={Math.max(compact ? 10 : 14, hub * 0.48)}
          color="#FFFFFF"
        />
      </Animated.View>

      {variant === "full" && !compact ? (
        <Animated.View
          style={[
            styles.priceTag,
            {
              top: box * 0.02,
              right: box * 0.02,
              backgroundColor: colors.tint,
            },
            tagStyle,
          ]}
        >
          <MaterialIcons
            name="local-offer"
            size={Math.max(10, box * 0.12)}
            color="#FFFFFF"
          />
        </Animated.View>
      ) : null}
    </View>
  );

  if (variant === "inline") {
    return (
      <View style={[styles.inlineRow, style]}>
        {scene}
        {showText ? (
          <ThemedText
            style={[
              styles.inlineText,
              { color: muted, fontSize: TEXT_SIZE[size], lineHeight: TEXT_SIZE[size] + 4 },
            ]}
          >
            {label}
          </ThemedText>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.fullWrap, style]}>
      {scene}
      {showText ? (
        <Animated.View style={[styles.textBlock, textPulseStyle]}>
          <ThemedText
            style={[
              styles.fullText,
              { color: muted, fontSize: TEXT_SIZE[size], lineHeight: TEXT_SIZE[size] + 6 },
            ]}
          >
            {label}
          </ThemedText>
          <View style={styles.statusRow}>
            <StatusChip delay={0} color={colors.tint} label={t("flexLoaderTrade")} reduceMotion={reduceMotion} />
            <StatusChip delay={220} color="#0EA5E9" label={t("flexLoaderList")} reduceMotion={reduceMotion} />
            <StatusChip delay={440} color="#F59E0B" label={t("flexLoaderMeet")} reduceMotion={reduceMotion} />
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

function StatusChip({
  label,
  color,
  delay,
  reduceMotion,
}: {
  label: string;
  color: string;
  delay: number;
  reduceMotion: boolean | null;
}) {
  const blink = useSharedValue(0.45);

  useEffect(() => {
    if (reduceMotion) {
      blink.value = 0.85;
      return;
    }
    blink.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.4, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [blink, delay, reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: blink.value }));

  return (
    <Animated.View style={[styles.chip, style]}>
      <View style={[styles.chipDot, { backgroundColor: color }]} />
      <ThemedText style={styles.chipLabel}>{label}</ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  scene: {
    alignItems: "center",
    justifyContent: "center",
  },
  ripple: {
    position: "absolute",
    borderWidth: 1.5,
  },
  orbitRing: {
    position: "absolute",
    borderWidth: 1.5,
  },
  dashedRing: {
    position: "absolute",
    borderWidth: 1,
    borderStyle: "dashed",
  },
  orbitDot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  listingCard: {
    position: "absolute",
    borderWidth: 1,
    borderRadius: 8,
    padding: 5,
    gap: 3,
  },
  cardThumb: {
    width: "100%",
    height: "46%",
    borderRadius: 4,
  },
  cardLine: {
    height: 3,
    borderRadius: 2,
  },
  hub: {
    alignItems: "center",
    justifyContent: "center",
  },
  priceTag: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    alignItems: "center",
    gap: 10,
  },
  fullText: {
    fontWeight: "600",
    textAlign: "center",
  },
  inlineText: {
    fontWeight: "600",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipLabel: {
    fontSize: 10,
    fontWeight: "700",
    opacity: 0.7,
    letterSpacing: 0.4,
  },
});

export default FlexMarketLoader;
