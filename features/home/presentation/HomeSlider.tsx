import type { SliderAd } from "@/core/domain/entities/SliderAd";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSliderAds } from "@/presentation/hooks/useSliderAds";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  FadeIn,
  FadeInUp,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const SLIDE_ASPECT = 9 / 16;
const HORIZONTAL_INSET = 16;
const SLIDER_BORDER_RADIUS = 20;
const AUTO_INTERVAL_MS = 4500;

function carouselShadow(colorScheme: "light" | "dark") {
  const isDark = colorScheme === "dark";
  return Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: isDark ? 0.45 : 0.18,
      shadowRadius: 20,
    },
    android: {
      elevation: 12,
    },
    default: {},
  });
}

async function openLink(url: string): Promise<void> {
  const normalized = url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `https://${url}`;
  const can = await Linking.canOpenURL(normalized);
  if (can) await Linking.openURL(normalized);
}

const DOT_MIN_W = 7;
const DOT_MAX_W = 26;
const DOT_H = 7;

const SliderDot = memo(function SliderDot({
  active,
  tint,
  muted,
  enteringDelay,
}: {
  active: boolean;
  tint: string;
  muted: string;
  enteringDelay: number;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    const target = active ? 1 : 0;
    if (reduceMotion) {
      progress.value = target;
      return;
    }
    progress.value = withSpring(target, {
      damping: 16,
      stiffness: 300,
      mass: 0.38,
    });
  }, [active, reduceMotion, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: interpolate(
      progress.value,
      [0, 1],
      [DOT_MIN_W, DOT_MAX_W],
      Extrapolation.CLAMP,
    ),
    backgroundColor: interpolateColor(progress.value, [0, 1], [muted, tint]),
    transform: [
      {
        scale: interpolate(progress.value, [0, 1], [1, 1.05], Extrapolation.CLAMP),
      },
    ],
  }), [muted, tint]);

  return (
    <Animated.View
      entering={FadeIn.duration(260).delay(enteringDelay)}
      style={[styles.dotAnimated, animatedStyle]}
    />
  );
});

export function HomeSlider() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const { width: windowWidth } = useWindowDimensions();
  const tint = Colors[scheme].tint;
  const bg = Colors[scheme].background;
  const { data, isLoading, isFetching } = useSliderAds();
  const slideCount = data?.length ?? 0;
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<SliderAd>>(null);
  const indexRef = useRef(0);
  /** True while the user is dragging — auto-advance must not fight the gesture. */
  const userInteractingRef = useRef(false);

  const slideWidth = useMemo(
    () => Math.max(1, windowWidth - HORIZONTAL_INSET * 2),
    [windowWidth],
  );

  const slideHeight = useMemo(
    () => Math.max(120, Math.round(slideWidth * SLIDE_ASPECT)),
    [slideWidth],
  );

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const scrollToIndexClamped = useCallback(
    (pageIndex: number, animated: boolean) => {
      if (slideCount <= 0) return;
      const clamped = Math.max(0, Math.min(slideCount - 1, pageIndex));
      listRef.current?.scrollToIndex({ index: clamped, animated });
    },
    [slideCount],
  );

  useEffect(() => {
    if (slideCount <= 1) return;
    const id = setInterval(() => {
      if (userInteractingRef.current) return;
      const next = (indexRef.current + 1) % slideCount;
      scrollToIndexClamped(next, true);
    }, AUTO_INTERVAL_MS);
    return () => clearInterval(id);
  }, [slideCount, scrollToIndexClamped]);

  const settleIndexFromOffset = useCallback(
    (x: number, fromUserGesture: boolean) => {
      if (slideCount <= 0 || slideWidth <= 0) return;
      const raw = x / slideWidth;
      const i = Math.min(slideCount - 1, Math.max(0, Math.round(raw)));
      const prevI = indexRef.current;
      if (fromUserGesture && i !== prevI) {
        void Haptics.selectionAsync();
      }
      setIndex((prev) => {
        indexRef.current = i;
        if (i === prev) return prev;
        return i;
      });
    },
    [slideWidth, slideCount],
  );

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const fromUser = userInteractingRef.current;
      settleIndexFromOffset(e.nativeEvent.contentOffset.x, fromUser);
      userInteractingRef.current = false;
    },
    [settleIndexFromOffset],
  );

  const onScrollBeginDrag = useCallback(() => {
    userInteractingRef.current = true;
  }, []);

  const renderItem: ListRenderItem<SliderAd> = useCallback(
    ({ item }) => {
      const titleTrim = item.title?.trim();
      const inner = (
        <View style={[styles.slide, { width: slideWidth, height: slideHeight }]}>
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={380}
            accessibilityLabel={item.title}
          />
          <View pointerEvents="none" style={styles.vignetteBottom} />
          <View pointerEvents="none" style={styles.innerRim} />
          {titleTrim ? (
            <View style={styles.titleBlock} pointerEvents="none">
              <Text style={styles.titleText} numberOfLines={2}>
                {titleTrim}
              </Text>
            </View>
          ) : null}
        </View>
      );

      if (!item.linkUrl) {
        return inner;
      }

      return (
        <Pressable
          onPress={() => void openLink(item.linkUrl!)}
          accessibilityRole="button"
          accessibilityLabel={item.title}>
          {inner}
        </Pressable>
      );
    },
    [slideWidth, slideHeight],
  );

  if (!isLoading && !isFetching && slideCount === 0) {
    return null;
  }

  const shellStyle = {
    width: slideWidth,
    borderRadius: SLIDER_BORDER_RADIUS,
    backgroundColor: bg,
    ...carouselShadow(scheme),
  };

  if (isLoading && slideCount === 0) {
    return (
      <View style={[styles.root, { paddingHorizontal: HORIZONTAL_INSET }]}>
        <View style={shellStyle}>
          <View
            style={[
              styles.clip,
              {
                height: slideHeight,
                borderRadius: SLIDER_BORDER_RADIUS,
                backgroundColor: scheme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
              },
            ]}>
            <View style={styles.loaderInner}>
              <ActivityIndicator size="small" color={tint} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (slideCount === 0 || !data) {
    return null;
  }

  const mutedDot =
    scheme === "dark" ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.18)";

  return (
    <Animated.View
      style={[styles.root, { paddingHorizontal: HORIZONTAL_INSET }]}
      entering={FadeIn.duration(340).delay(20)}>
      <Animated.View style={shellStyle} entering={FadeInUp.duration(450).delay(30)}>
        <View
          style={[
            styles.clip,
            {
              height: slideHeight,
              borderRadius: SLIDER_BORDER_RADIUS,
            },
          ]}>
          <FlatList
            ref={listRef}
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            onScrollBeginDrag={onScrollBeginDrag}
            onMomentumScrollEnd={onMomentumScrollEnd}
            getItemLayout={(_, i) => ({
              length: slideWidth,
              offset: slideWidth * i,
              index: i,
            })}
            onScrollToIndexFailed={(info) => {
              const target = Math.min(info.index, slideCount - 1);
              setTimeout(() => {
                listRef.current?.scrollToIndex({
                  index: Math.max(0, target),
                  animated: false,
                });
              }, 50);
            }}
          />
        </View>
      </Animated.View>
      {data.length > 1 ? (
        <Animated.View
          style={styles.dotsRow}
          entering={FadeInUp.duration(400).delay(40)}
          accessibilityRole="tablist"
          accessibilityLabel="Promotional slides">
          {data.map((ad, i) => (
            <SliderDot
              key={`slider-dot-${ad.id}`}
              active={i === index}
              tint={tint}
              muted={mutedDot}
              enteringDelay={50 + i * 42}
            />
          ))}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginBottom: 18,
  },
  clip: {
    overflow: "hidden",
  },
  slide: {
    overflow: "hidden",
    backgroundColor: "#0a0a0a",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  vignetteBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "42%",
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  innerRim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: SLIDER_BORDER_RADIUS,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  titleBlock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 28,
  },
  titleText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
    lineHeight: 22,
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  loaderInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
    marginTop: 12,
  },
  dotAnimated: {
    height: DOT_H,
    borderRadius: 999,
    overflow: "hidden",
  },
});
