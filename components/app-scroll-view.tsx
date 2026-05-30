import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

type AppScrollViewProps = Omit<ScrollViewProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  scrollViewStyle?: ScrollViewProps["style"];
  showScrollHint?: boolean;
  hintBottomOffset?: number;
};

const SCROLL_HINT_BOTTOM_GAP = 12;

export function AppScrollView({
  style,
  scrollViewStyle,
  showScrollHint = true,
  hintBottomOffset = 12,
  horizontal,
  onLayout,
  onContentSizeChange,
  onScroll,
  scrollEventThrottle,
  children,
  ...rest
}: AppScrollViewProps) {
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";
  const colors = Colors[scheme];
  const reduceMotion = useReducedMotion();

  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const hintOffset = useSharedValue(0);

  const canScroll = contentHeight > viewportHeight + 8;
  const atBottom = scrollY >= Math.max(0, contentHeight - viewportHeight - SCROLL_HINT_BOTTOM_GAP);
  const shouldShowHint = Boolean(showScrollHint && !horizontal && canScroll && !atBottom);

  useEffect(() => {
    if (!shouldShowHint || reduceMotion) {
      hintOffset.value = 0;
      return;
    }
    hintOffset.value = withRepeat(
      withSequence(
        withTiming(8, { duration: 820, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 820, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [hintOffset, reduceMotion, shouldShowHint]);

  const hintAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: hintOffset.value }],
    opacity: 0.8 + Math.min(0.2, Math.abs(hintOffset.value) / 8),
  }));

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      setViewportHeight(event.nativeEvent.layout.height);
      onLayout?.(event);
    },
    [onLayout],
  );

  const handleContentSizeChange = useCallback(
    (width: number, height: number) => {
      setContentHeight(height);
      onContentSizeChange?.(width, height);
    },
    [onContentSizeChange],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      setScrollY(event.nativeEvent.contentOffset.y);
      onScroll?.(event);
    },
    [onScroll],
  );

  const hintTint = useMemo(
    () => colors.tint,
    [colors.tint],
  );

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        {...rest}
        horizontal={horizontal}
        style={scrollViewStyle}
        onLayout={handleLayout}
        onContentSizeChange={handleContentSizeChange}
        onScroll={handleScroll}
        scrollEventThrottle={scrollEventThrottle ?? 16}
      >
        {children}
      </ScrollView>
      {shouldShowHint ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.hint,
            { bottom: hintBottomOffset },
            hintAnimatedStyle,
          ]}
        >
          <View style={[styles.phone, { borderColor: hintTint }]}>
            <View style={[styles.phoneScreen, { backgroundColor: hintTint }]} />
          </View>
          <MaterialIcons
            color={hintTint}
            name="touch-app"
            size={18}
            style={styles.finger}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  hint: {
    alignItems: "center",
    left: 0,
    position: "absolute",
    right: 0,
  },
  phone: {
    borderRadius: 7,
    borderWidth: 1.4,
    height: 18,
    justifyContent: "center",
    opacity: 0.88,
    width: 13,
  },
  phoneScreen: {
    alignSelf: "center",
    borderRadius: 2,
    height: 3,
    opacity: 0.55,
    width: 5,
  },
  finger: {
    marginTop: 1,
    opacity: 0.95,
  },
});
