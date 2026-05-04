import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { BRAND, COPY, FONT_DISPLAY, STAGE_GRADIENT } from "../brand";

export const Headline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const line1Y = interpolate(spring({ frame, fps }), [0, 1], [40, 0]);
  const line1Opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  const line2Y = interpolate(
    spring({ frame: frame - 10, fps }),
    [0, 1],
    [40, 0],
  );
  const line2Opacity = interpolate(frame, [10, 22], [0, 1], { extrapolateRight: "clamp" });

  const subOpacity = interpolate(frame, [22, 36], [0, 1], { extrapolateRight: "clamp" });

  const isVertical = height > width;
  const fontSize = isVertical ? width * 0.105 : width * 0.07;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: width * 0.06,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize,
          color: BRAND.fg,
          letterSpacing: -1.5,
          lineHeight: 1,
          opacity: line1Opacity,
          transform: `translateY(${line1Y}px)`,
        }}
      >
        {COPY.headline1}
      </div>
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 800,
          fontSize: fontSize * 1.05,
          letterSpacing: -2,
          lineHeight: 1,
          marginTop: width * 0.01,
          background: STAGE_GRADIENT,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          filter: `drop-shadow(0 0 ${width * 0.04}px ${BRAND.pink}88)`,
          opacity: line2Opacity,
          transform: `translateY(${line2Y}px)`,
        }}
      >
        {COPY.headline2}
      </div>
      <div
        style={{
          marginTop: width * 0.04,
          fontFamily: FONT_DISPLAY,
          color: BRAND.muted,
          fontSize: width * 0.034,
          letterSpacing: 1,
          opacity: subOpacity,
        }}
      >
        {COPY.sub}
      </div>
    </div>
  );
};
