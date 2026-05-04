import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { BRAND, COPY, FONT_DISPLAY, STAGE_GRADIENT } from "../brand";

type Layout = "vertical" | "square" | "horizontal";

export const Intro: React.FC<{ layout: Layout }> = ({ layout }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const logoIn = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });
  const logoScale = interpolate(logoIn, [0, 1], [0.6, 1]);
  const badgeOpacity = interpolate(frame, [10, 25], [0, 1], { extrapolateRight: "clamp" });
  const sparkle = interpolate(frame, [0, 45], [0, 360]);

  const fontSize = layout === "vertical" ? width * 0.13 : width * 0.09;
  const padding = width * 0.06;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding,
        gap: padding * 0.4,
      }}
    >
      <div
        style={{
          opacity: badgeOpacity,
          padding: "10px 22px",
          borderRadius: 999,
          background: "rgba(255,255,255,0.08)",
          border: `1px solid ${BRAND.pink}`,
          color: BRAND.fg,
          fontFamily: FONT_DISPLAY,
          fontSize: width * 0.022,
          letterSpacing: 4,
          fontWeight: 600,
        }}
      >
        ✦ {COPY.badge}
      </div>

      <div
        style={{
          transform: `scale(${logoScale})`,
          fontFamily: FONT_DISPLAY,
          fontWeight: 800,
          fontSize,
          lineHeight: 0.95,
          letterSpacing: -2,
          textAlign: "center",
          background: STAGE_GRADIENT,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          filter: `drop-shadow(0 0 ${width * 0.05}px ${BRAND.pink}aa)`,
        }}
      >
        Talent
        <br />
        Quest
      </div>

      <div
        style={{
          fontFamily: FONT_DISPLAY,
          color: BRAND.muted,
          fontSize: width * 0.024,
          letterSpacing: 6,
          textTransform: "uppercase",
          opacity: badgeOpacity,
          transform: `rotate(${sparkle * 0.05}deg)`,
        }}
      >
        Ethiopia · 2026
      </div>
    </div>
  );
};
