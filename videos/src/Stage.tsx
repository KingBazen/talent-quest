import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { BRAND } from "./brand";

export const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Slow drifting spotlights for stage feel.
  const drift = (seed: number) =>
    interpolate(frame, [0, 450], [0, 360 + seed * 90], { extrapolateRight: "extend" });

  const blob = (
    color: string,
    size: number,
    cx: number,
    cy: number,
    angle: number,
  ): React.CSSProperties => ({
    position: "absolute",
    width: size,
    height: size,
    left: cx - size / 2,
    top: cy - size / 2,
    borderRadius: "50%",
    background: color,
    filter: "blur(140px)",
    opacity: 0.55,
    transform: `rotate(${angle}deg) translate(${size * 0.05}px, 0)`,
  });

  return (
    <AbsoluteFill style={{ background: BRAND.bg, overflow: "hidden" }}>
      <div style={blob(BRAND.pink, width * 0.7, width * 0.3, height * 0.3, drift(0))} />
      <div style={blob(BRAND.violet, width * 0.6, width * 0.7, height * 0.7, drift(1))} />
      <div style={blob(BRAND.cyan, width * 0.5, width * 0.5, height * 0.5, drift(2))} />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)",
        }}
      />
      {children}
    </AbsoluteFill>
  );
};
