import { Image } from "expo-image";
import { useEffect } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const logoSource = require("@/assets/images/flex-used-logo.png");
const depthLayers = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

type AnimatedLaunchScreenProps = {
  onFinish: () => void;
};

export function AnimatedLaunchScreen({ onFinish }: AnimatedLaunchScreenProps) {
  const { width, height } = useWindowDimensions();
  const reveal = useSharedValue(0);
  const idle = useSharedValue(0);
  const ring = useSharedValue(0);
  const shine = useSharedValue(0);
  const exit = useSharedValue(0);

  const stageSize = Math.min(width * 0.9, 360);
  const logoSize = Math.min(stageSize, height * 0.42);
  const compact = height < 720;

  useEffect(() => {
    reveal.value = withTiming(1, {
      duration: 1900,
      easing: Easing.out(Easing.cubic),
    });
    idle.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 1800,
          easing: Easing.inOut(Easing.cubic),
        }),
        withTiming(0, {
          duration: 1800,
          easing: Easing.inOut(Easing.cubic),
        })
      ),
      -1,
      false
    );
    ring.value = withRepeat(
      withTiming(360, { duration: 5600, easing: Easing.linear }),
      -1,
      false
    );
    shine.value = withRepeat(
      withTiming(1, {
        duration: 2600,
        easing: Easing.inOut(Easing.cubic),
      }),
      -1,
      false
    );
    exit.value = withDelay(
      6200,
      withTiming(
        1,
        { duration: 760, easing: Easing.inOut(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(onFinish)();
        }
      )
    );
  }, [exit, idle, onFinish, reveal, ring, shine]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(exit.value, [0, 1], [1, 0]),
    transform: [{ scale: interpolate(exit.value, [0, 1], [1, 1.035]) }],
  }));

  const stageStyle = useAnimatedStyle(() => ({
    opacity: interpolate(reveal.value, [0, 0.16, 1], [0, 1, 1]),
    transform: [
      {
        translateY:
          interpolate(reveal.value, [0, 1], [38, 0], Extrapolation.CLAMP) -
          interpolate(exit.value, [0, 1], [0, 18]),
      },
      {
        scale: interpolate(
          reveal.value,
          [0, 0.72, 1],
          [0.82, 1.05, 1],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  const logoRigStyle = useAnimatedStyle(() => {
    const revealY = interpolate(
      reveal.value,
      [0, 0.42, 0.72, 1],
      [-86, 24, -7, 0],
      Extrapolation.CLAMP
    );
    const revealX = interpolate(
      reveal.value,
      [0, 0.55, 1],
      [38, -14, 0],
      Extrapolation.CLAMP
    );
    const idleY = interpolate(idle.value, [0, 1], [-13, 13]);
    const idleX = interpolate(idle.value, [0, 1], [7, -7]);

    return {
      transform: [
        { perspective: 560 },
        { rotateY: `${revealY + idleY * reveal.value}deg` },
        { rotateX: `${revealX + idleX * reveal.value}deg` },
        {
          rotateZ: `${interpolate(
            reveal.value,
            [0, 1],
            [-7, 0],
            Extrapolation.CLAMP
          )}deg`,
        },
        {
          translateY: interpolate(idle.value, [0, 1], [4, -6]) * reveal.value,
        },
        {
          scaleX: interpolate(
            reveal.value,
            [0, 0.52, 1],
            [0.34, 1.08, 1],
            Extrapolation.CLAMP
          ),
        },
        {
          scale: interpolate(
            reveal.value,
            [0, 0.75, 1],
            [0.72, 1.08, 1],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  const frontLogoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(reveal.value, [0, 0.18, 1], [0, 1, 1]),
    transform: [
      {
        translateX: interpolate(idle.value, [0, 1], [-2, 2]) * reveal.value,
      },
      {
        translateY: interpolate(idle.value, [0, 1], [2, -3]) * reveal.value,
      },
      { scale: interpolate(idle.value, [0, 1], [0.992, 1.018]) },
    ],
  }));

  const logoDepthStyle = useAnimatedStyle(() => ({
    opacity: interpolate(reveal.value, [0, 0.34, 1], [0, 0.7, 1]),
    transform: [
      {
        translateX: interpolate(idle.value, [0, 1], [0, 5]) * reveal.value,
      },
      {
        translateY: interpolate(idle.value, [0, 1], [4, -1]) * reveal.value,
      },
    ],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(reveal.value, [0.2, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      { rotateX: "68deg" },
      { rotateZ: `${ring.value}deg` },
      { scale: interpolate(idle.value, [0, 1], [0.96, 1.03]) },
    ],
  }));

  const counterRingStyle = useAnimatedStyle(() => ({
    opacity: interpolate(reveal.value, [0.3, 1], [0, 0.84], Extrapolation.CLAMP),
    transform: [
      { rotateX: "73deg" },
      { rotateZ: `${-ring.value * 0.72}deg` },
      { scale: interpolate(idle.value, [0, 1], [1.04, 0.97]) },
    ],
  }));

  const shadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(reveal.value, [0, 1], [0, 0.5]),
    transform: [
      { scaleX: interpolate(idle.value, [0, 1], [1.08, 0.9]) },
      { scaleY: interpolate(idle.value, [0, 1], [0.84, 1]) },
    ],
  }));

  const shineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shine.value, [0, 0.18, 0.68, 1], [0, 0.62, 0.5, 0]),
    transform: [
      { translateX: interpolate(shine.value, [0, 1], [-logoSize, logoSize]) },
      { rotate: "-18deg" },
    ],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(reveal.value, [0.55, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(
          reveal.value,
          [0.55, 1],
          [16, 0],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  const loaderStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(shine.value, [0, 1], [-58, 150]),
      },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="auto"
      style={[styles.overlay, overlayStyle]}>
      <View style={styles.backdrop}>
        <View style={[styles.lightPanel, styles.lightPanelTop]} />
        <View style={[styles.lightPanel, styles.lightPanelBottom]} />
      </View>

      <Animated.View
        style={[
          styles.stage,
          { width: stageSize, height: stageSize },
          stageStyle,
        ]}>
        <Animated.View
          style={[
            styles.floorShadow,
            {
              width: logoSize * 0.78,
              height: logoSize * 0.18,
              borderRadius: logoSize * 0.09,
              bottom: logoSize * 0.08,
            },
            shadowStyle,
          ]}
        />

        <Animated.View
          style={[
            styles.orbitRing,
            {
              width: logoSize * 1.16,
              height: logoSize * 1.16,
              borderRadius: logoSize * 0.58,
            },
            ringStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.counterOrbitRing,
            {
              width: logoSize * 0.96,
              height: logoSize * 0.96,
              borderRadius: logoSize * 0.48,
            },
            counterRingStyle,
          ]}
        />

        <Animated.View
          style={[
            styles.logoRig,
            { width: logoSize, height: logoSize },
            logoRigStyle,
          ]}>
          <Animated.View style={[styles.logoDepthStack, logoDepthStyle]}>
            {depthLayers.map((layer) => (
              <Image
                key={layer}
                source={logoSource}
                style={[
                  styles.logoLayer,
                  {
                    opacity: 0.045 + layer * 0.018,
                    transform: [
                      { translateX: layer * 2.4 },
                      { translateY: layer * 2.9 },
                      { scale: 1 - layer * 0.002 },
                    ],
                  },
                ]}
                contentFit="contain"
              />
            ))}
          </Animated.View>

          <Animated.View style={[styles.frontLogo, frontLogoStyle]}>
            <Image source={logoSource} style={styles.logo} contentFit="contain" />
            <Animated.View
              style={[
                styles.shine,
                { width: logoSize * 0.22, height: logoSize * 0.84 },
                shineStyle,
              ]}
            />
          </Animated.View>
        </Animated.View>
      </Animated.View>

      <Animated.View
        style={[styles.copy, compact && styles.compactCopy, titleStyle]}>
        <Text style={styles.brand}>FLEX USED</Text>
        <View style={styles.loaderTrack}>
          <Animated.View style={[styles.loaderFill, loaderStyle]} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#070503",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  lightPanel: {
    position: "absolute",
    left: -70,
    right: -70,
    height: 170,
    borderRadius: 24,
    backgroundColor: "rgba(231, 163, 41, 0.1)",
    transform: [{ rotate: "-16deg" }],
  },
  lightPanelTop: {
    top: "18%",
  },
  lightPanelBottom: {
    bottom: "10%",
    backgroundColor: "rgba(255, 231, 164, 0.06)",
  },
  stage: {
    alignItems: "center",
    justifyContent: "center",
  },
  floorShadow: {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.62)",
  },
  orbitRing: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(247, 210, 107, 0.2)",
    borderTopColor: "#ffe28b",
    borderRightColor: "#b86b15",
  },
  counterOrbitRing: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    borderLeftColor: "#f2b84f",
    borderBottomColor: "rgba(117, 55, 6, 0.64)",
  },
  logoRig: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoDepthStack: {
    ...StyleSheet.absoluteFillObject,
  },
  logoLayer: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  frontLogo: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  shine: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.38)",
  },
  copy: {
    position: "absolute",
    bottom: 78,
    alignItems: "center",
    gap: 14,
  },
  compactCopy: {
    bottom: 46,
  },
  brand: {
    color: "#f9e6ae",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0,
  },
  loaderTrack: {
    width: 126,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(249, 230, 174, 0.18)",
    overflow: "hidden",
  },
  loaderFill: {
    width: 42,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#f4c75f",
  },
});
