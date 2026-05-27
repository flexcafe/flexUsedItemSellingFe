import { memo, useEffect, useState, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import {
  uiCardShadow,
  uiCardSurface,
  uiFadeEnter,
  uiLayoutTransition,
  uiListItemEnter,
  uiSectionEnter,
  usePressScale,
} from "@/presentation/lib/uiAnimations";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type SectionProps = {
  delayMs: number;
  reduceMotion: boolean | null;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export const AuthAnimatedSection = memo(function AuthAnimatedSection({
  delayMs,
  reduceMotion,
  style,
  children,
}: SectionProps) {
  return (
    <Animated.View
      entering={uiSectionEnter(delayMs, reduceMotion)}
      layout={uiLayoutTransition}
      style={style}
    >
      {children}
    </Animated.View>
  );
});

type StaggerProps = {
  index: number;
  reduceMotion: boolean | null;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export const AuthStaggerItem = memo(function AuthStaggerItem({
  index,
  reduceMotion,
  style,
  children,
}: StaggerProps) {
  return (
    <Animated.View
      entering={uiListItemEnter(index, reduceMotion)}
      layout={uiLayoutTransition}
      style={style}
    >
      {children}
    </Animated.View>
  );
});

type FadeProps = {
  reduceMotion: boolean | null;
  duration?: number;
  children: ReactNode;
};

export const AuthFadeIn = memo(function AuthFadeIn({
  reduceMotion,
  duration = 280,
  children,
}: FadeProps) {
  return (
    <Animated.View
      entering={uiFadeEnter(reduceMotion, duration)}
      layout={uiLayoutTransition}
    >
      {children}
    </Animated.View>
  );
});

type CardProps = {
  scheme: "light" | "dark";
  borderColor: string;
  index?: number;
  reduceMotion: boolean | null;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export const AuthAnimatedCard = memo(function AuthAnimatedCard({
  scheme,
  borderColor,
  index = 0,
  reduceMotion,
  style,
  children,
}: CardProps) {
  return (
    <Animated.View
      entering={uiListItemEnter(index, reduceMotion)}
      layout={uiLayoutTransition}
      style={[
        styles.card,
        uiCardShadow(scheme),
        {
          borderColor,
          backgroundColor: uiCardSurface(scheme),
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
});

type PrimaryButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  backgroundColor: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export const AuthPrimaryButton = memo(function AuthPrimaryButton({
  onPress,
  disabled,
  backgroundColor,
  style,
  children,
}: PrimaryButtonProps) {
  const press = usePressScale();
  return (
    <Animated.View style={press.style}>
      <AnimatedPressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={press.handlers.onPressIn}
        onPressOut={press.handlers.onPressOut}
        style={[
          styles.primaryButton,
          { backgroundColor },
          disabled && styles.primaryButtonDisabled,
          style,
        ]}
      >
        {children}
      </AnimatedPressable>
    </Animated.View>
  );
});

type LanguageBarProps = {
  locale: "ko" | "my" | "zh";
  onSelect: (locale: "ko" | "my" | "zh") => void;
  scheme: "light" | "dark";
  colors: (typeof Colors)["light"];
  disabled?: boolean;
  reduceMotion: boolean | null;
};

export const AuthLanguageBar = memo(function AuthLanguageBar({
  locale,
  onSelect,
  scheme,
  colors,
  disabled,
  reduceMotion,
}: LanguageBarProps) {
  const langIndex = locale === "ko" ? 0 : locale === "my" ? 1 : 2;
  const [languageWidth, setLanguageWidth] = useState(0);
  const pillX = useSharedValue(0);

  const pillStyle = useAnimatedStyle(() => {
    const w = languageWidth > 0 ? languageWidth / 3 : 0;
    return {
      width: w,
      transform: [{ translateX: pillX.value }],
    };
  }, [languageWidth]);

  useEffect(() => {
    if (languageWidth <= 0) return;
    const w = languageWidth / 3;
    const target = w * langIndex;
    pillX.value = withTiming(target, { duration: 420 });
  }, [langIndex, languageWidth, pillX]);

  return (
    <Animated.View
      entering={uiSectionEnter(120, reduceMotion)}
      pointerEvents="box-none"
      style={styles.languageDock}
    >
      <View
        style={[
          styles.languageBar,
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
          { backgroundColor: colors.background, borderColor: colors.tint },
        ]}
        onLayout={(e) => setLanguageWidth(e.nativeEvent.layout.width - 16)}
      >
        <Animated.View
          style={[
            styles.languagePill,
            { backgroundColor: colors.tint },
            pillStyle,
          ]}
        />
        <Pressable
          disabled={disabled}
          style={styles.flagButton}
          onPress={() => onSelect("ko")}
        >
          <ThemedText
            style={[styles.flag, locale === "ko" && styles.flagSelected]}
          >
            🇰🇷
          </ThemedText>
        </Pressable>
        <Pressable
          disabled={disabled}
          style={styles.flagButton}
          onPress={() => onSelect("my")}
        >
          <ThemedText
            style={[styles.flag, locale === "my" && styles.flagSelected]}
          >
            🇲🇲
          </ThemedText>
        </Pressable>
        <Pressable
          disabled={disabled}
          style={styles.flagButton}
          onPress={() => onSelect("zh")}
        >
          <ThemedText
            style={[styles.flag, locale === "zh" && styles.flagSelected]}
          >
            🇨🇳
          </ThemedText>
        </Pressable>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  primaryButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  languageDock: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 18,
  },
  languageBar: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    position: "relative",
  },
  languagePill: {
    position: "absolute",
    left: 8,
    top: 8,
    bottom: 8,
    borderRadius: 12,
  },
  flagButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  flag: {
    fontSize: 22,
    opacity: 0.95,
  },
  flagSelected: {
    color: "#fff",
    opacity: 1,
  },
});

