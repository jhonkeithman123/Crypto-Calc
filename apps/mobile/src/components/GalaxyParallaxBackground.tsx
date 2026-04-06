import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import {
  galaxyNebulae,
  galaxyPresets,
  galaxyStars,
  type GalaxyPreset,
} from "@crypto/galaxy-elements";

export default function GalaxyParallaxBackground({
  scrollY,
  preset = "cinematic",
}: {
  scrollY: Animated.Value;
  preset?: GalaxyPreset;
}) {
  const cfg = galaxyPresets[preset];
  const floatA = useRef(new Animated.Value(0)).current;
  const floatB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loopA = Animated.loop(
      Animated.sequence([
        Animated.timing(floatA, {
          toValue: 1,
          duration: 5200,
          useNativeDriver: true,
        }),
        Animated.timing(floatA, {
          toValue: 0,
          duration: 5200,
          useNativeDriver: true,
        }),
      ]),
    );

    const loopB = Animated.loop(
      Animated.sequence([
        Animated.timing(floatB, {
          toValue: 1,
          duration: 6800,
          useNativeDriver: true,
        }),
        Animated.timing(floatB, {
          toValue: 0,
          duration: 6800,
          useNativeDriver: true,
        }),
      ]),
    );

    loopA.start();
    loopB.start();

    return () => {
      loopA.stop();
      loopB.stop();
    };
  }, [floatA, floatB]);

  const driftY = floatA.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -cfg.floatA],
  });
  const driftX = floatB.interpolate({
    inputRange: [0, 1],
    outputRange: [0, cfg.floatB],
  });
  const twinkleA = floatA.interpolate({
    inputRange: [0, 1],
    outputRange: cfg.opacityA,
  });
  const twinkleB = floatB.interpolate({
    inputRange: [0, 1],
    outputRange: cfg.opacityB,
  });
  const parallaxNear = scrollY.interpolate({
    inputRange: [0, 800],
    outputRange: [0, -cfg.parallaxNear],
    extrapolate: "clamp",
  });
  const parallaxFar = scrollY.interpolate({
    inputRange: [0, 800],
    outputRange: [0, -cfg.parallaxFar],
    extrapolate: "clamp",
  });
  const starsParallax = scrollY.interpolate({
    inputRange: [0, 800],
    outputRange: [0, -cfg.starsParallax],
    extrapolate: "clamp",
  });

  return (
    <View pointerEvents="none" style={s.galaxyLayer}>
      <Animated.View
        style={[
          s.nebula,
          {
            width: galaxyNebulae.one.width,
            height: galaxyNebulae.one.height,
            top: galaxyNebulae.one.top,
            right: galaxyNebulae.one.right,
            backgroundColor: galaxyNebulae.one.color,
          },
          {
            transform: [{ translateY: Animated.add(driftY, parallaxNear) }],
            opacity: twinkleA,
          },
        ]}
      />
      <Animated.View
        style={[
          s.nebula,
          {
            width: galaxyNebulae.two.width,
            height: galaxyNebulae.two.height,
            bottom: galaxyNebulae.two.bottom,
            left: galaxyNebulae.two.left,
            backgroundColor: galaxyNebulae.two.color,
          },
          {
            transform: [{ translateX: driftX }, { translateY: parallaxFar }],
            opacity: twinkleB,
          },
        ]}
      />
      <Animated.View style={{ transform: [{ translateY: starsParallax }] }}>
        {galaxyStars.map((star, i) => (
          <View
            key={i}
            style={[
              s.star,
              {
                top: `${star.topPct}%`,
                left:
                  star.leftPct !== undefined ? `${star.leftPct}%` : undefined,
                right:
                  star.rightPct !== undefined ? `${star.rightPct}%` : undefined,
              },
            ]}
          />
        ))}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  galaxyLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  nebula: {
    position: "absolute",
    borderRadius: 999,
  },
  star: {
    position: "absolute",
    width: 3,
    height: 3,
    borderRadius: 99,
    backgroundColor: "rgba(226, 224, 255, 0.4)",
  },
});
