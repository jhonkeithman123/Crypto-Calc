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
export declare const galaxyPresets: Record<GalaxyPreset, PresetConfig>;
export declare const galaxyNebulae: Record<"one" | "two", GalaxyNebula>;
export declare const galaxyStars: GalaxyStar[];
//# sourceMappingURL=index.d.ts.map