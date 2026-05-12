import type { SliderAd } from "@/core/domain/entities/SliderAd";
import { useSliderAds } from "@/presentation/hooks/useSliderAds";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const SLIDE_ASPECT = 9 / 16;
/** Side gutter so the slider does not touch screen edges */
const HORIZONTAL_INSET = 16;
const SLIDER_BORDER_RADIUS = 12;
/** Auto-advance interval (ms) */
const AUTO_INTERVAL_MS = 4500;

async function openLink(url: string): Promise<void> {
  const normalized = url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `https://${url}`;
  const can = await Linking.canOpenURL(normalized);
  if (can) await Linking.openURL(normalized);
}

export function HomeSlider() {
  const colorScheme = useColorScheme();
  const { width: windowWidth } = useWindowDimensions();
  const tint = Colors[colorScheme ?? "light"].tint;
  const { data, isLoading, isFetching } = useSliderAds();
  const slideCount = data?.length ?? 0;
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<SliderAd>>(null);
  const indexRef = useRef(0);

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

  useEffect(() => {
    if (slideCount <= 1) return;
    const id = setInterval(() => {
      const next = (indexRef.current + 1) % slideCount;
      indexRef.current = next;
      setIndex(next);
      listRef.current?.scrollToOffset({
        offset: next * slideWidth,
        animated: true,
      });
    }, AUTO_INTERVAL_MS);
    return () => clearInterval(id);
  }, [slideCount, slideWidth]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const i = Math.round(x / slideWidth);
      if (i >= 0 && i < slideCount) {
        indexRef.current = i;
        setIndex(i);
      }
    },
    [slideWidth, slideCount],
  );

  const renderItem: ListRenderItem<SliderAd> = useCallback(
    ({ item }) => {
      const inner = (
        <View style={[styles.slide, { width: slideWidth, height: slideHeight }]}>
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.image}
            contentFit="cover"
            accessibilityLabel={item.title}
          />
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

  if (isLoading && slideCount === 0) {
    return (
      <View style={[styles.root, { paddingHorizontal: HORIZONTAL_INSET }]}>
        <View
          style={[
            styles.roundedClip,
            { width: slideWidth, height: slideHeight, borderRadius: SLIDER_BORDER_RADIUS },
          ]}>
          <View style={[styles.loaderInner, { height: slideHeight }]}>
            <ActivityIndicator size="small" color={tint} />
          </View>
        </View>
      </View>
    );
  }

  if (slideCount === 0 || !data) {
    return null;
  }

  return (
    <View style={[styles.root, { paddingHorizontal: HORIZONTAL_INSET }]}>
      <View
        style={[
          styles.roundedClip,
          {
            width: slideWidth,
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
          onScroll={onScroll}
          scrollEventThrottle={16}
          getItemLayout={(_, i) => ({
            length: slideWidth,
            offset: slideWidth * i,
            index: i,
          })}
        />
      </View>
      {data.length > 1 ? (
        <View style={styles.dots}>
          {data.map((_, i) => (
            <View
              key={`slider-dot-${data[i]!.id}`}
              style={[
                styles.dot,
                { backgroundColor: i === index ? tint : "rgba(120,120,120,0.35)" },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginBottom: 16,
  },
  roundedClip: {
    overflow: "hidden",
    backgroundColor: "rgba(120,120,120,0.12)",
  },
  slide: {
    overflow: "hidden",
    backgroundColor: "rgba(120,120,120,0.12)",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  loaderInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
