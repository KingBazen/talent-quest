import { Composition } from "remotion";
import { Promo } from "./Promo";

const FPS = 30;
const DURATION = 450; // 15 seconds

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="PromoReels"
        component={Promo}
        durationInFrames={DURATION}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ layout: "vertical" as const }}
      />
      <Composition
        id="PromoSquare"
        component={Promo}
        durationInFrames={DURATION}
        fps={FPS}
        width={1080}
        height={1080}
        defaultProps={{ layout: "square" as const }}
      />
      <Composition
        id="PromoLandscape"
        component={Promo}
        durationInFrames={DURATION}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ layout: "horizontal" as const }}
      />
    </>
  );
};
