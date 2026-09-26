import type React from "react";
import { Easing } from "remotion";
import type { Transition } from "./types";

const ease = Easing.bezier(0.33, 0, 0.2, 1);

/**
 * Style for a scene that is `t` of the way in (0 = gone, 1 = fully there).
 * `leaving` picks the exit version, so e.g. zoomIn grows in and keeps growing out, like a camera flying through.
 */
export function transitionStyle(kind: Transition, t: number, leaving: boolean): React.CSSProperties {
  const p = ease(t);
  const gone = 1 - p;
  switch (kind) {
    case "none":
      return {};
    case "fade":
      return { opacity: p };
    case "zoomIn": // from small to normal; leaves by growing past the camera
      return { opacity: p, transform: `scale(${leaving ? 1 + gone * 0.5 : 0.6 + p * 0.4})`, filter: `blur(${gone * 10}px)` };
    case "zoomOut": // from big to normal; leaves by shrinking away
      return { opacity: p, transform: `scale(${leaving ? 1 - gone * 0.3 : 1.35 - p * 0.35})`, filter: `blur(${gone * 10}px)` };
    case "slideUp":
      return { opacity: p, transform: `translateY(${(leaving ? -1 : 1) * gone * 140}px)` };
    case "slideLeft":
      return { opacity: p, transform: `translateX(${(leaving ? -1 : 1) * gone * 260}px)` };
    case "blur":
    default:
      return { opacity: p, filter: `blur(${gone * 14}px)`, transform: `scale(${leaving ? 1 + gone * 0.06 : 0.96 + p * 0.04})` };
  }
}
