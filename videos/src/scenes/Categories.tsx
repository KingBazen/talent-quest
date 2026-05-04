import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { BRAND, COPY, FONT_DISPLAY } from "../brand";

type Layout = "vertical" | "square" | "horizontal";

export const Categories: React.FC<{ layout: Layout }> = ({ layout }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const cols = layout === "horizontal" ? 6 : layout === "square" ? 3 : 2;
  const gap = width * 0.025;

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
          gap,
          width: "100%",
          maxWidth: layout === "horizontal" ? width * 0.85 : width * 0.92,
        }}
      >
        {COPY.categories.map((cat, i) => {
          const delay = i * 4;
          const pop = spring({
            frame: frame - delay,
            fps,
            config: { damping: 14, stiffness: 180 },
          });
          const scale = interpolate(pop, [0, 1], [0.6, 1]);
          const opacity = interpolate(frame - delay, [0, 8], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={cat}
              style={{
                aspectRatio: "1 / 1",
                borderRadius: width * 0.025,
                background:
                  "linear-gradient(135deg, rgba(255,39,115,0.18), rgba(139,92,246,0.14))",
                border: "1px solid rgba(255,255,255,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: width * 0.028,
                color: BRAND.fg,
                textAlign: "center",
                padding: width * 0.015,
                transform: `scale(${scale})`,
                opacity,
                backdropFilter: "blur(8px)",
                boxShadow: `0 0 ${width * 0.03}px rgba(255,39,115,0.25)`,
              }}
            >
              {cat}
            </div>
          );
        })}
      </div>
    </div>
  );
};
