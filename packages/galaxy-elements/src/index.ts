export type GalaxyPreset = "cinematic" | "vivid";

export type PresetConfig = {
  floatA: number;
  floatB: number;
  parallaxNear: number;
  parallaxFar: number;
  starsParallax: number;
  opacityA: [number, number];
  opacityB: [number, number];
};

export type GalaxyNebula = {
  width: number;
  height: number;
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  color: string;
};

export type GalaxyStar = {
  topPct: number;
  leftPct?: number;
  rightPct?: number;
};

export const galaxyPresets: Record<GalaxyPreset, PresetConfig> = {
  cinematic: {
    floatA: 16,
    floatB: 12,
    parallaxNear: 36,
    parallaxFar: 18,
    starsParallax: 10,
    opacityA: [0.12, 0.3],
    opacityB: [0.08, 0.22],
  },
  vivid: {
    floatA: 22,
    floatB: 17,
    parallaxNear: 52,
    parallaxFar: 30,
    starsParallax: 18,
    opacityA: [0.16, 0.4],
    opacityB: [0.12, 0.3],
  },
};

export const galaxyNebulae: Record<"one" | "two", GalaxyNebula> = {
  one: {
    width: 240,
    height: 240,
    top: -60,
    right: -80,
    color: "rgba(6, 182, 212, 0.22)",
  },
  two: {
    width: 320,
    height: 320,
    bottom: -120,
    left: -130,
    color: "rgba(124, 58, 237, 0.16)",
  },
};

export const galaxyStars: GalaxyStar[] = [
  { topPct: 12, leftPct: 16 },
  { topPct: 18, rightPct: 18 },
  { topPct: 34, leftPct: 9 },
  { topPct: 43, rightPct: 14 },
  { topPct: 60, leftPct: 22 },
  { topPct: 74, rightPct: 28 },
  { topPct: 86, leftPct: 12 },
];
