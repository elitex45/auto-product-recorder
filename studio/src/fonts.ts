import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import type { Theme } from "./types";

/** CSS font stacks. The theme's own fonts load under these names; Inter (bundled) is the fallback. */
export const fonts = (theme: Theme) => ({
  display: theme.displayFont ? "Display, Inter, sans-serif" : "Inter, sans-serif",
  body: theme.bodyFont ? "Body, Inter, sans-serif" : "Inter, sans-serif",
});

/** Holds the render until Inter and the theme's fonts are loaded, so no frame shows a fallback font. */
export function useThemeFonts(theme: Theme) {
  const [handle] = useState(() => delayRender("Loading fonts"));
  useEffect(() => {
    const faces = [new FontFace("Inter", `url(${staticFile("fonts/Inter.ttf")})`, { weight: "100 900" })];
    if (theme.displayFont) faces.push(new FontFace("Display", `url(${staticFile(theme.displayFont)})`, { weight: "100 900" }));
    if (theme.bodyFont) faces.push(new FontFace("Body", `url(${staticFile(theme.bodyFont)})`, { weight: "100 900" }));
    Promise.all(faces.map((f) => f.load().then((l) => document.fonts.add(l))))
      .catch((e) => console.error(e))
      .finally(() => continueRender(handle));
  }, [handle, theme.displayFont, theme.bodyFont]);
}
