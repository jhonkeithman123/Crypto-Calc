import {
  galaxyNebulae,
  galaxyPresets,
  galaxyStars,
  type GalaxyPreset,
} from "@crypto/galaxy-elements";

export default function GalaxyBackgroundWeb({
  preset = "cinematic",
}: {
  preset?: GalaxyPreset;
}) {
  const cfg = galaxyPresets[preset];
  const n1 = galaxyNebulae.one;
  const n2 = galaxyNebulae.two;

  return (
    <>
      <div className="galaxy-web-layer" aria-hidden>
        <div
          className="galaxy-web-nebula-a"
          style={{
            width: n1.width,
            height: n1.height,
            top: n1.top,
            right: n1.right,
            background: n1.color,
            ["--float-a" as string]: `${cfg.floatA}px`,
            ["--opa-a-min" as string]: cfg.opacityA[0],
            ["--opa-a-max" as string]: cfg.opacityA[1],
          }}
        />
        <div
          className="galaxy-web-nebula-b"
          style={{
            width: n2.width,
            height: n2.height,
            bottom: n2.bottom,
            left: n2.left,
            background: n2.color,
            ["--float-b" as string]: `${cfg.floatB}px`,
            ["--opa-b-min" as string]: cfg.opacityB[0],
            ["--opa-b-max" as string]: cfg.opacityB[1],
          }}
        />
        {galaxyStars.map((star, i) => (
          <span
            key={i}
            className="galaxy-web-star"
            style={{
              top: `${star.topPct}%`,
              left: star.leftPct !== undefined ? `${star.leftPct}%` : undefined,
              right:
                star.rightPct !== undefined ? `${star.rightPct}%` : undefined,
            }}
          />
        ))}
      </div>
      <style>{`
        .galaxy-web-layer {
          position: fixed;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 0;
        }
        .galaxy-web-nebula-a,
        .galaxy-web-nebula-b {
          position: absolute;
          border-radius: 9999px;
        }
        .galaxy-web-nebula-a {
          animation: webNebulaA 5.2s ease-in-out infinite;
          opacity: var(--opa-a-min);
        }
        .galaxy-web-nebula-b {
          animation: webNebulaB 6.8s ease-in-out infinite;
          opacity: var(--opa-b-min);
        }
        .galaxy-web-star {
          position: absolute;
          width: 3px;
          height: 3px;
          border-radius: 99px;
          background: rgba(226, 224, 255, 0.45);
          animation: webStarTwinkle 4.6s ease-in-out infinite;
        }
        @keyframes webNebulaA {
          0% { transform: translateY(0px); opacity: var(--opa-a-min); }
          50% { transform: translateY(calc(var(--float-a) * -1)); opacity: var(--opa-a-max); }
          100% { transform: translateY(0px); opacity: var(--opa-a-min); }
        }
        @keyframes webNebulaB {
          0% { transform: translateX(0px); opacity: var(--opa-b-min); }
          50% { transform: translateX(var(--float-b)); opacity: var(--opa-b-max); }
          100% { transform: translateX(0px); opacity: var(--opa-b-min); }
        }
        @keyframes webStarTwinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.15); }
        }
      `}</style>
    </>
  );
}
