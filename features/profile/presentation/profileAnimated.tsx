import { ThemedText } from "@/components/themed-text";
import { memo, type ReactNode } from "react";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

import {
  uiCardShadow,
  uiCardSurface,
  uiContentEnter,
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

export const ProfileAnimatedSection = memo(function ProfileAnimatedSection({
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

type CardProps = {
  scheme: "light" | "dark";
  borderColor: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export const ProfileAnimatedCard = memo(function ProfileAnimatedCard({
  scheme,
  borderColor,
  style,
  children,
}: CardProps) {
  return (
    <Animated.View
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

type StaggerProps = {
  index: number;
  reduceMotion: boolean | null;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export const ProfileStaggerItem = memo(function ProfileStaggerItem({
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
  children: ReactNode;
};

export const ProfileFadeIn = memo(function ProfileFadeIn({
  reduceMotion,
  children,
}: FadeProps) {
  return (
    <Animated.View entering={uiFadeEnter(reduceMotion, 220)} layout={uiLayoutTransition}>
      {children}
    </Animated.View>
  );
});

type TabProps = {
  active: boolean;
  tint: string;
  inactiveColor: string;
  label: string;
  onPress: () => void;
};

export const ProfileTabButton = memo(function ProfileTabButton({
  active,
  tint,
  inactiveColor,
  label,
  onPress,
}: TabProps) {
  const press = usePressScale();
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={press.handlers.onPressIn}
      onPressOut={press.handlers.onPressOut}
      style={[
        styles.tab,
        press.style,
        active && { backgroundColor: tint, borderColor: tint },
      ]}
    >
      <ThemedText
        style={[
          styles.tabText,
          { color: active ? "#fff" : inactiveColor },
          active && styles.tabTextActive,
        ]}
      >
        {label}
      </ThemedText>
    </AnimatedPressable>
  );
});

type PressableButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export const ProfilePressableScale = memo(function ProfilePressableScale({
  onPress,
  disabled,
  style,
  children,
}: PressableButtonProps) {
  const press = usePressScale();
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={press.handlers.onPressIn}
      onPressOut={press.handlers.onPressOut}
      style={[style, press.style, disabled && styles.disabled]}
    >
      {children}
    </AnimatedPressable>
  );
});

type TabPanelProps = {
  tabKey: string;
  reduceMotion: boolean | null;
  children: ReactNode;
};

export const ProfileTabPanel = memo(function ProfileTabPanel({
  tabKey,
  reduceMotion,
  children,
}: TabPanelProps) {
  return (
    <Animated.View
      key={tabKey}
      entering={uiContentEnter(reduceMotion)}
      layout={uiLayoutTransition}
      style={styles.tabPanel}
    >
      {children}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabText: {
    fontWeight: "800",
    fontSize: 13,
    opacity: 0.85,
  },
  tabTextActive: {
    color: "#fff",
    opacity: 1,
  },
  tabPanel: { gap: 16 },
  disabled: { opacity: 0.6 },
});
