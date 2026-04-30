import { Image } from "expo-image";
import { useEffect, useMemo } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const logoSource = require("@/assets/images/flex-used-logo.png");

type AnimatedLaunchScreenProps = {
  onFinish: () => void;
};

type ParticleConfig = {
  phase: number;
  xOffset: number;
  yOffset: number;
  size: number;
};

function Particle({
  config,
  centerX,
  centerY,
  t,
}: {
  config: ParticleConfig;
  centerX: number;
  centerY: number;
  t: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const p = (t.value + config.phase) % 1;
    const wobble = Math.sin((p + config.phase) * Math.PI * 2);

    return {
      transform: [
        { translateX: config.xOffset * (p * 1.12) + wobble * 6 },
        { translateY: config.yOffset * (p * 0.86) - wobble * 8 },
        { scale: interpolate(p, [0, 0.18, 0.7, 1], [0, 1.15, 1, 0]) },
      ],
      opacity: interpolate(p, [0, 0.12, 0.88, 1], [0, 0.65, 0.65, 0]),
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          left: centerX,
          top: centerY,
        },
        style,
      ]}
    />
  );
}

export function AnimatedLaunchScreen({ onFinish }: AnimatedLaunchScreenProps) {
  const { width, height } = useWindowDimensions();
  const isLarge = width > 768;
  const logoSize = isLarge ? 200 : Math.min(width * 0.45, 180);
  const centerX = width / 2;
  const centerY = height / 2;

  // Animation values
  const progress = useSharedValue(0);
  const ring1Rotation = useSharedValue(0);
  const ring2Rotation = useSharedValue(0);
  const ring1Tilt = useSharedValue(0);
  const ring2Tilt = useSharedValue(0);
  const floatY = useSharedValue(0);
  const glowIntensity = useSharedValue(0);
  const exitAnim = useSharedValue(0);

  const particlesT = useSharedValue(0);
  const particles = useMemo<ParticleConfig[]>(
    () =>
      Array.from({ length: 30 }, () => ({
        phase: Math.random(),
        xOffset: (Math.random() - 0.5) * 300,
        yOffset: (Math.random() - 0.5) * 400,
        size: 2 + Math.random() * 4,
      })),
    []
  );

  useEffect(() => {
    // Main entrance
    progress.value = withSequence(
      withTiming(0.8, { duration: 1000, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
      withSpring(1, { damping: 12, stiffness: 80 })
    );

    // Ring 1: Continuous rotation in 3D
    ring1Rotation.value = withRepeat(
      withTiming(360, { duration: 12000, easing: Easing.linear }),
      -1,
      false
    );
    
    // Ring 2: Opposite direction rotation
    ring2Rotation.value = withRepeat(
      withTiming(-360, { duration: 15000, easing: Easing.linear }),
      -1,
      false
    );
    
    // Ring tilts for 3D effect
    ring1Tilt.value = withRepeat(
      withSequence(
        withTiming(15, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(-15, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    
    ring2Tilt.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 3500, easing: Easing.inOut(Easing.sin) }),
        withTiming(10, { duration: 3500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    
    // Floating animation
    floatY.value = withRepeat(
      withSequence(
        withTiming(10, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(-10, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    
    // Glow pulse
    glowIntensity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0.4, { duration: 2000, easing: Easing.inOut(Easing.cubic) })
      ),
      -1,
      true
    );

    particlesT.value = withRepeat(
      withTiming(1, { duration: 7200, easing: Easing.linear }),
      -1,
      false
    );
    
    // Exit animation
    exitAnim.value = withDelay(
      6500,
      withTiming(1, { duration: 600, easing: Easing.inOut(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onFinish)();
      })
    );
  }, [
    exitAnim,
    floatY,
    glowIntensity,
    onFinish,
    particlesT,
    progress,
    ring1Rotation,
    ring1Tilt,
    ring2Rotation,
    ring2Tilt,
  ]);

  // Container exit
  const containerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(exitAnim.value, [0, 1], [1, 0]),
    transform: [{ scale: interpolate(exitAnim.value, [0, 1], [1, 0.95]) }],
  }));

  // Logo entrance animation
  const logoContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 0.5, 1], [0.3, 1.05, 1]) },
      { translateY: interpolate(progress.value, [0, 1], [30, 0]) },
    ],
    opacity: interpolate(progress.value, [0, 0.3, 1], [0, 1, 1]),
  }));

  // Logo glow
  const logoGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.3, 0.7, 1], [0, 0.6, 0.4]),
    transform: [{ scale: 1 + interpolate(glowIntensity.value, [0.4, 1], [0, 0.1]) }],
    shadowOpacity: interpolate(glowIntensity.value, [0.4, 1], [0.3, 0.8]),
    shadowRadius: interpolate(glowIntensity.value, [0.4, 1], [20, 40]),
  }));

  // Ring 1 animation (outer ring)
  const ring1Style = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateX: `${interpolate(ring1Tilt.value, [-15, 15], [-8, 8])}deg` },
      { rotateY: `${interpolate(ring1Rotation.value % 360, [0, 360], [0, 360])}deg` },
      { rotateZ: `${interpolate(ring1Tilt.value, [-15, 15], [-5, 5])}deg` },
      { scale: interpolate(progress.value, [0, 1], [0.5, 1]) },
      { translateY: interpolate(floatY.value, [-10, 10], [-5, 5]) },
    ],
    opacity: interpolate(progress.value, [0.2, 0.5, 1], [0, 0.7, 0.9]),
  }));

  // Ring 2 animation (inner ring)
  const ring2Style = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateX: `${interpolate(ring2Tilt.value, [-10, 10], [-5, 5])}deg` },
      { rotateY: `${interpolate(ring2Rotation.value % 360, [0, 360], [0, -360])}deg` },
      { rotateZ: `${interpolate(ring2Tilt.value, [-10, 10], [3, -3])}deg` },
      { scale: interpolate(progress.value, [0, 1], [0.3, 0.85]) },
      { translateY: interpolate(floatY.value, [-10, 10], [5, -5]) },
    ],
    opacity: interpolate(progress.value, [0.3, 0.6, 1], [0, 0.6, 0.8]),
  }));

  // Floating logo animation
  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(floatY.value, [-10, 10], [-8, 8]) },
    ],
  }));

  // Text animations
  const textContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0.4, 0.8, 1], [20, -5, 0]) },
      { scale: interpolate(progress.value, [0.4, 1], [0.8, 1]) },
    ],
    opacity: interpolate(progress.value, [0.4, 0.6, 1], [0, 0.8, 1]),
  }));

  const lineStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0.5, 0.8, 1], [0, 80, 100]),
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Dark gradient background */}
      <View style={styles.background}>
        <View style={styles.gradient1} />
        <View style={styles.gradient2} />
      </View>

      {/* Particle effects */}
      {particles.map((config, index) => (
        <Particle
          key={index}
          config={config}
          centerX={centerX}
          centerY={centerY}
          t={particlesT}
        />
      ))}

      {/* Main content */}
      <View style={styles.content}>
        {/* Logo with 3D rings */}
        <Animated.View style={[styles.logoArea, logoContainerStyle]}>
          {/* Outer Ring */}
          <Animated.View style={[styles.ring, styles.ringOuter, ring1Style]}>
            <View style={[styles.ringSegment, styles.ringSegment1]} />
            <View style={[styles.ringSegment, styles.ringSegment2]} />
            <View style={[styles.ringSegment, styles.ringSegment3]} />
            <View style={[styles.ringSegment, styles.ringSegment4]} />
          </Animated.View>

          {/* Inner Ring */}
          <Animated.View style={[styles.ring, styles.ringInner, ring2Style]}>
            <View style={[styles.ringSegment, styles.ringSegment1]} />
            <View style={[styles.ringSegment, styles.ringSegment2]} />
            <View style={[styles.ringSegment, styles.ringSegment3]} />
            <View style={[styles.ringSegment, styles.ringSegment4]} />
          </Animated.View>

          {/* Logo Glow */}
          <Animated.View style={[styles.logoGlow, { width: logoSize * 1.2, height: logoSize * 1.2 }, logoGlowStyle]} />

          {/* Logo Image */}
          <Animated.View style={[styles.logoWrapper, logoStyle]}>
            <Image source={logoSource} style={[styles.logo, { width: logoSize, height: logoSize }]} contentFit="contain" />
          </Animated.View>
        </Animated.View>

        {/* Text Section */}
        <Animated.View style={[styles.textSection, textContainerStyle]}>
          <Text style={styles.brandText}>FLEX USED</Text>
          <View style={styles.dividerContainer}>
            <Animated.View style={[styles.divider, lineStyle]} />
          </View>
          <Text style={styles.marketText}>PREMIUM MARKETPLACE</Text>
          
          {/* Loading indicator */}
          <View style={styles.loaderContainer}>
            <View style={styles.loaderDot} />
            <View style={styles.loaderDot} />
            <View style={styles.loaderDot} />
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7ED",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient1: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFF7ED",
  },
  gradient2: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(247, 199, 93, 0.16)",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoArea: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 60,
  },
  ring: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 1.5,
    borderColor: "rgba(198, 140, 28, 0.42)",
  },
  ringOuter: {
    width: 320,
    height: 320,
    borderRadius: 160,
    borderColor: "rgba(198, 140, 28, 0.28)",
  },
  ringInner: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderColor: "rgba(198, 140, 28, 0.34)",
  },
  ringSegment: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#C68C1C",
  },
  ringSegment1: {
    top: -4,
    left: "50%",
    marginLeft: -4,
  },
  ringSegment2: {
    bottom: -4,
    left: "50%",
    marginLeft: -4,
  },
  ringSegment3: {
    left: -4,
    top: "50%",
    marginTop: -4,
  },
  ringSegment4: {
    right: -4,
    top: "50%",
    marginTop: -4,
  },
  logoGlow: {
    position: "absolute",
    borderRadius: 200,
    backgroundColor: "rgba(247, 199, 93, 0.26)",
    shadowColor: "#C68C1C",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 30,
    elevation: 15,
  },
  logoWrapper: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  logo: {
    width: 180,
    height: 180,
  },
  particle: {
    position: "absolute",
    backgroundColor: "rgba(198, 140, 28, 0.38)",
    shadowColor: "#C68C1C",
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  textSection: {
    alignItems: "center",
    marginTop: 20,
  },
  brandText: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 4,
    color: "#7A4B0D",
    textShadowColor: "rgba(198, 140, 28, 0.22)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    marginBottom: 12,
  },
  dividerContainer: {
    width: 120,
    height: 1,
    marginBottom: 12,
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#C68C1C",
    opacity: 0.55,
  },
  marketText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 3,
    color: "rgba(122, 75, 13, 0.62)",
    marginBottom: 24,
  },
  loaderContainer: {
    flexDirection: "row",
    gap: 8,
  },
  loaderDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#C68C1C",
    opacity: 0.34,
  },
});