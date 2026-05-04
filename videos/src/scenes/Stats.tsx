import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { BRAND, COPY, FONT_DISPLAY, STAGE_GRADIENT } from "../brand";

type Layout = "vertical" | "square" | "horizontal";

export const Stats: React.FC<{ layout: Layout }> = ({ layout }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const cols = layout === "horizontal" ? 4 : 2;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: width * 0.06,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: width * 0.025,
          width: "100%",
          maxWidth: layout === "horizontal" ? width * 0.85 : width * 0.9,
        }}
      >
        {COPY.stats.map((s, i) => {
          const delay = i * 5;
          const pop = spring({
            frame: frame - delay,
            fps,
            config: { damping: 14, stiffness: 160 },
          });
          const y = interpolate(pop, [0, 1], [30, 0]);
          const opacity = interpolate(frame - delay, [0, 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={s.label}
              style={{
                borderRadius: width * 0.025,
                padding: width * 0.03,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                textAlign: "center",
                transform: `translateY(${y}px)`,
                opacity,
                backdropFilter: "blur(8px)",
              }}
            >
              <div
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 800,
                  fontSize: width * 0.075,
                  background: STAGE_GRADIENT,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: -1,
                  lineHeight: 1,
                }}
              >
                {s.num}
              </div>
              <div
                style={{
                  marginTop: width * 0.01,
                  fontFamily: FONT_DISPLAY,
                  color: BRAND.muted,
                  fontSize: width * 0.022,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                {s.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
