// Full screen for the TV (key F): the browser's Fullscreen API on the whole page, so no browser frame shows. It needs
// a user gesture (a key press counts). Webkit's prefixed calls cover older Safari.
type Doc = {
  fullscreenElement?: Element | null;
  webkitFullscreenElement?: Element | null;
  exitFullscreen?: () => Promise<void>;
  webkitExitFullscreen?: () => void;
  documentElement: { requestFullscreen?: () => Promise<void>; webkitRequestFullscreen?: () => void };
};

/** Enters full screen, or leaves it if it's on. Never throws (a refused request is ignored). */
export function toggleFullscreen(doc: Doc = document as unknown as Doc): void {
  try {
    if (doc.fullscreenElement ?? doc.webkitFullscreenElement) {
      if (doc.exitFullscreen) void doc.exitFullscreen().catch(() => {});
      else doc.webkitExitFullscreen?.();
      return;
    }
    const el = doc.documentElement;
    if (el.requestFullscreen) void el.requestFullscreen().catch(() => {});
    else el.webkitRequestFullscreen?.();
  } catch {
    // Not allowed here (an iframe without permission, an old browser): the TV stays as it is.
  }
}
