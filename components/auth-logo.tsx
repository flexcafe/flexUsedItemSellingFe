import { Image } from "expo-image";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const logoSource = require("@/assets/images/flex-used-logo.png");

type AuthLogoProps = {
  variant?: "hero" | "compact";
};

export function AuthLogo({ variant = "hero" }: AuthLogoProps) {
  const compact = variant === "compact";
  const rotation = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 5200,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 1800,
          easing: Easing.inOut(Easing.cubic),
        }),
        withTiming(0, {
          duration: 1800,
          easing: Easing.inOut(Easing.cubic),
        }),
      ),
      -1,
      false,
    );
  }, [glow, rotation]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.35, 0.82]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.96, 1.05]) }],
  }));

  return (
    <View style={[styles.frame, compact && styles.compactFrame]}>
      <Animated.View
        style={[styles.glowRing, compact && styles.compactGlowRing, glowStyle]}
      />
      <Animated.View
        style={[
          styles.orbitRing,
          compact && styles.compactOrbitRing,
          ringStyle,
        ]}
      />
      <View style={[styles.shell, compact && styles.compactShell]}>
        <Image
          source={logoSource}
          style={[styles.image, compact && styles.compactImage]}
          contentFit="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  compactFrame: {
    width: 130,
    height: 130,
  },
  glowRing: {
    position: "absolute",
    width: 174,
    height: 174,
    borderRadius: 87,
    backgroundColor: "rgba(247, 210, 107, 0.26)",
    shadowColor: "#d99b24",
    shadowOpacity: 0.55,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  compactGlowRing: {
    width: 124,
    height: 124,
    borderRadius: 62,
    shadowRadius: 14,
  },
  orbitRing: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    borderColor: "rgba(197, 142, 45, 0.12)",
    borderTopColor: "#f7d26b",
    borderRightColor: "rgba(168, 101, 17, 0.8)",
    borderBottomColor: "rgba(197, 142, 45, 0.18)",
  },
  compactOrbitRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
  },
  shell: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 1,
    borderColor: "rgba(197, 142, 45, 0.24)",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#7a4b0d",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  compactShell: {
    width: 118,
    height: 118,
    borderRadius: 59,
  },
  image: {
    width: "92%",
    height: "92%",
  },
  compactImage: {
    width: "92%",
    height: "92%",
  },
});
