import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { BRAND, COPY, FONT_DISPLAY, STAGE_GRADIENT } from "../brand";

export const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const pop = spring({ frame, fps, config: { damping: 10, stiffness: 140 } });
  const scale = interpolate(pop, [0, 1], [0.7, 1]);

  const pulse = 1 + Math.sin(frame / 6) * 0.04;
  const urlOpacity = interpolate(frame, [10, 25], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: width * 0.04,
      }}
    >
      <div
        style={{
          transform: `scale(${scale * pulse})`,
          padding: `${width * 0.025}px ${width * 0.06}px`,
          borderRadius: 999,
          background: STAGE_GRADIENT,
          color: BRAND.fg,
          fontFamily: FONT_DISPLAY,
          fontWeight: 800,
          fontSize: width * 0.05,
          letterSpacing: 1,
          boxShadow: `0 0 ${width * 0.06}px ${BRAND.pink}cc`,
        }}
      >
        {COPY.cta} →
      </div>
      <div
        style={{
          opacity: urlOpacity,
          fontFamily: FONT_DISPLAY,
          color: BRAND.fg,
          fontSize: width * 0.028,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        {COPY.url}
      </div>
    </div>
  );
};
