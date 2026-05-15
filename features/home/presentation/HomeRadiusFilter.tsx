import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import {
  CLIENT_CATALOG_RADIUS_KM_OPTIONS,
  catalogRadiusFromIndex,
  resolveCatalogRadiusIndex,
  type ClientCatalogRadiusKm,
  type ClientCatalogRadiusSelection,
} from "@/core/domain/types/catalog";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLocale } from "@/presentation/providers/LocaleProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { memo, useCallback, useEffect, useMemo } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
  type TextStyle,
} from "react-native";
import Animated, {
  Extrapolation,
  FadeIn,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const KM_SEGMENT_COUNT = CLIENT_CATALOG_RADIUS_KM_OPTIONS.length;
const TRACK_PADDING = 3;
const RING_COUNT = CLIENT_CATALOG_RADIUS_KM_OPTIONS.length;

const AnimatedPressableAll = Animated.createAnimatedComponent(Pressable);

export type HomeRadiusFilterProps = {
  value: ClientCatalogRadiusSelection;
  onChange: (radiusKm: ClientCatalogRadiusSelection) => void;
  disabled: boolean;
};

function kmSegmentIndex(value: ClientCatalogRadiusSelection): number {
  if (value == null) return -1;
  return CLIENT_CATALOG_RADIUS_KM_OPTIONS.indexOf(value);
}

function formatKmLabel(km: ClientCatalogRadiusKm, unit: string): string {
  return unit === "公里" ? `${km}${unit}` : `${km} ${unit}`;
}

const DistanceRings = memo(function DistanceRings({
  activeRingIndex,
  tint,
  muted,
  disabled,
}: {
  activeRingIndex: number;
  tint: string;
  muted: string;
  disabled: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <View
      style={styles.ringsWrap}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: RING_COUNT }, (_, i) => {
        const ringIndex = i + 1;
        const isActive = !disabled && activeRingIndex === ringIndex;
        const diameter = 20 + i * 14;
        return (
          <RingCircle
            key={`ring-${ringIndex}`}
            diameter={diameter}
            active={isActive}
            tint={tint}
            muted={muted}
            reduceMotion={!!reduceMotion}
          />
        );
      })}
      <View style={[styles.ringsCenter, { backgroundColor: tint + (disabled ? "30" : "55") }]}>
        <MaterialIcons
          name={disabled ? "location-off" : "my-location"}
          size={12}
          color={disabled ? muted : tint}
        />
      </View>
    </View>
  );
});

const RingCircle = memo(function RingCircle({
  diameter,
  active,
  tint,
  muted,
  reduceMotion,
}: {
  diameter: number;
  active: boolean;
  tint: string;
  muted: string;
  reduceMotion: boolean;
}) {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    const target = active ? 1 : 0;
    if (reduceMotion) {
      progress.value = target;
      return;
    }
    progress.value = withSpring(target, { damping: 18, stiffness: 260, mass: 0.4 });
  }, [active, progress, reduceMotion]);

  const ringStyle = useAnimatedStyle(() => ({
    width: diameter,
    height: diameter,
    borderRadius: diameter / 2,
    borderColor: interpolateColor(progress.value, [0, 1], [muted + "55", tint + "CC"]),
    borderWidth: interpolate(progress.value, [0, 1], [1, 2], Extrapolation.CLAMP),
    opacity: interpolate(progress.value, [0, 1], [0.35, 1], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.ring, ringStyle, { marginLeft: -diameter / 2, marginTop: -diameter / 2 }]}
    />
  );
});

const KmSegment = memo(function KmSegment({
  label,
  active,
  disabled,
  onPress,
  tint,
  textColor,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
  tint: string;
  textColor: string;
}) {
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);

  const labelStyle = useAnimatedStyle(() => ({
    color: active ? tint : textColor,
    opacity: disabled ? 0.45 : active ? 1 : 0.72,
    transform: [
      {
        scale: interpolate(pressed.value, [0, 1], [1, 0.94], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        if (disabled || reduceMotion) return;
        pressed.value = withTiming(1, { duration: 70 });
      }}
      onPressOut={() => {
        if (reduceMotion) return;
        pressed.value = withSpring(0, { damping: 14, stiffness: 320 });
      }}
      style={styles.kmSegmentPressable}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
    >
      <Animated.Text
        style={[styles.kmSegmentLabel, labelStyle]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.78}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
});

export const HomeRadiusFilter = memo(function HomeRadiusFilter({
  value,
  onChange,
  disabled,
}: HomeRadiusFilterProps) {
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];
  const { t } = useLocale();
  const reduceMotion = useReducedMotion();

  const isAll = value == null;
  const selectedRingIndex = resolveCatalogRadiusIndex(value);
  const kmIndex = kmSegmentIndex(value);

  const kmTrackWidth = useSharedValue(0);
  const pillIndex = useSharedValue(Math.max(kmIndex, 0));
  const allProgress = useSharedValue(isAll ? 1 : 0);

  useEffect(() => {
    const target = isAll ? 1 : 0;
    if (reduceMotion) {
      allProgress.value = target;
      return;
    }
    allProgress.value = withSpring(target, { damping: 18, stiffness: 280, mass: 0.35 });
  }, [allProgress, isAll, reduceMotion]);

  useEffect(() => {
    if (kmIndex < 0) return;
    if (reduceMotion) {
      pillIndex.value = kmIndex;
      return;
    }
    pillIndex.value = withSpring(kmIndex, {
      damping: 20,
      stiffness: 300,
      mass: 0.35,
    });
  }, [kmIndex, pillIndex, reduceMotion]);

  const onKmTrackLayout = useCallback(
    (e: LayoutChangeEvent) => {
      kmTrackWidth.value = e.nativeEvent.layout.width;
    },
    [kmTrackWidth],
  );

  const pillStyle = useAnimatedStyle(() => {
    const w = kmTrackWidth.value;
    if (w <= 0 || kmIndex < 0) return { opacity: 0 };
    const segmentW = w / KM_SEGMENT_COUNT;
    return {
      width: Math.max(segmentW - TRACK_PADDING * 2, 0),
      opacity: disabled ? 0.5 : 1,
      transform: [{ translateX: pillIndex.value * segmentW + TRACK_PADDING }],
    };
  });

  const allButtonStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      allProgress.value,
      [0, 1],
      [scheme === "dark" ? "#252A31" : "#EEF2F6", colors.tint + "22"],
    ),
    borderColor: interpolateColor(
      allProgress.value,
      [0, 1],
      [colors.icon + "33", colors.tint + "88"],
    ),
  }));

  const allLabelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(allProgress.value, [0, 1], [colors.text, colors.tint]),
    opacity: disabled ? 0.45 : 1,
  }));

  const summaryText = useMemo(() => {
    if (value == null) return t("homeRadiusFilterSummaryAll");
    return t("homeRadiusFilterSummaryWithin").replace("{km}", String(value));
  }, [t, value]);

  const kmUnit = t("homeRadiusFilterKmUnit");
  const kmLabels = useMemo(
    () =>
      CLIENT_CATALOG_RADIUS_KM_OPTIONS.map((km) =>
        formatKmLabel(km, kmUnit),
      ),
    [kmUnit],
  );

  const selectAll = useCallback(() => {
    if (value == null) return;
    if (!disabled) void Haptics.selectionAsync();
    onChange(null);
  }, [disabled, onChange, value]);

  const selectKm = useCallback(
    (index: number) => {
      const next = catalogRadiusFromIndex(index + 1);
      if (next === value) return;
      if (!disabled) void Haptics.selectionAsync();
      onChange(next);
    },
    [disabled, onChange, value],
  );

  const trackBg = scheme === "dark" ? "#252A31" : "#EEF2F6";
  const pillBg = scheme === "dark" ? "#343B44" : "#FFFFFF";
  const hint = disabled ? t("homeRadiusFilterNoLocationHint") : t("homeRadiusFilterHint");

  return (
    <View style={styles.root}>
      <View style={styles.titleRow}>
        <View style={[styles.headerIcon, { backgroundColor: colors.tint + "18" }]}>
          <MaterialIcons name="radar" size={17} color={colors.tint} />
        </View>
        <ThemedText style={styles.title} numberOfLines={1}>
          {t("homeRadiusFilterTitle")}
        </ThemedText>
      </View>

      <Animated.View
        key={summaryText}
        entering={reduceMotion ? undefined : FadeIn.duration(200)}
        style={[styles.summaryPill, { backgroundColor: colors.tint + "14" }]}
      >
        <MaterialIcons name="straighten" size={14} color={colors.tint} style={styles.summaryIcon} />
        <ThemedText
          style={[styles.summaryText, { color: colors.tint }]}
          numberOfLines={2}
        >
          {summaryText}
        </ThemedText>
      </Animated.View>

      <ThemedText style={styles.hint} numberOfLines={3}>
        {hint}
      </ThemedText>

      <DistanceRings
        activeRingIndex={selectedRingIndex}
        tint={colors.tint}
        muted={colors.icon}
        disabled={disabled}
      />

      <AnimatedPressableAll
        disabled={disabled}
        onPress={selectAll}
        style={[
          styles.allTrack,
          allButtonStyle,
          disabled && styles.trackDisabled,
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected: isAll, disabled }}
        accessibilityLabel={t("homeRadiusFilterAll")}
      >
        <Animated.Text
          style={[styles.allLabel, allLabelStyle]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {t("homeRadiusFilterAll")}
        </Animated.Text>
      </AnimatedPressableAll>

      <View
        style={[
          styles.kmTrack,
          { backgroundColor: trackBg, borderColor: colors.icon + "22" },
          disabled && styles.trackDisabled,
        ]}
        onLayout={onKmTrackLayout}
      >
        {kmIndex >= 0 ? (
          <Animated.View
            style={[
              styles.pill,
              pillStyle,
              {
                backgroundColor: pillBg,
                borderColor: colors.tint + "35",
              },
              cardShadow(scheme),
            ]}
          />
        ) : null}
        <View style={styles.kmSegmentRow}>
          {kmLabels.map((label, index) => (
            <KmSegment
              key={CLIENT_CATALOG_RADIUS_KM_OPTIONS[index]}
              label={label}
              active={kmIndex === index}
              disabled={disabled}
              tint={colors.tint}
              textColor={colors.text}
              onPress={() => selectKm(index)}
            />
          ))}
        </View>
      </View>
    </View>
  );
});

function cardShadow(scheme: "light" | "dark") {
  const isDark = scheme === "dark";
  return {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: isDark ? 4 : 2 },
    shadowOpacity: isDark ? 0.28 : 0.08,
    shadowRadius: isDark ? 8 : 6,
    elevation: isDark ? 4 : 2,
  };
}

const styles = StyleSheet.create({
  root: {
    marginTop: 14,
    gap: 10,
    width: "100%",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.2,
    minWidth: 0,
  },
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    gap: 8,
    width: "100%",
  },
  summaryIcon: {
    flexShrink: 0,
  },
  summaryText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    minWidth: 0,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.58,
    width: "100%",
  },
  ringsWrap: {
    width: 64,
    height: 64,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
  },
  ring: {
    position: "absolute",
    left: "50%",
    top: "50%",
    backgroundColor: "transparent",
  },
  ringsCenter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  allTrack: {
    width: "100%",
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  allLabel: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    width: "100%",
  } as TextStyle,
  kmTrack: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    padding: TRACK_PADDING,
    overflow: "hidden",
    minHeight: 46,
    justifyContent: "center",
  },
  trackDisabled: {
    opacity: 0.55,
  },
  pill: {
    position: "absolute",
    top: TRACK_PADDING,
    bottom: TRACK_PADDING,
    borderRadius: 11,
    borderWidth: 1,
  },
  kmSegmentRow: {
    flexDirection: "row",
    zIndex: 1,
    width: "100%",
  },
  kmSegmentPressable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    minWidth: 0,
  },
  kmSegmentLabel: {
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    width: "100%",
  } as TextStyle,
});
