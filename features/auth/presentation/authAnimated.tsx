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

import { AnimatedLanguageBar } from "@/components/animated-language-bar";
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
  locale: "ko" | "my" | "zh" | "en";
  onSelect: (locale: "ko" | "my" | "zh" | "en") => void;
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
  return (
    <Animated.View
      entering={uiSectionEnter(120, reduceMotion)}
      pointerEvents="box-none"
      style={styles.languageDock}
    >
      <AnimatedLanguageBar
        locale={locale}
        onSelect={onSelect}
        variant="comfortable"
        disabled={disabled}
        scheme={scheme}
        tintColor={colors.tint}
        borderColor={colors.tint}
        backgroundColor={colors.background}
        elevated
        style={styles.languageBar}
      />
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
    width: "100%",
  },
});

