/** A bar that drains over `ms`, starting with `left` remaining (default: all of it). Restarts when `id` changes;
 *  freezes when `paused`. */
export function Countdown({ id, ms, left = ms, paused }: { id: string | number; ms: number; left?: number; paused: boolean }) {
  const spent = Math.min(ms, Math.max(0, ms - left));
  return (
    <div className={`countdown ${paused ? "countdown--paused" : ""}`} role="presentation">
      <div key={id} className="countdown__bar" style={{ animationDuration: `${ms}ms`, ...(spent > 0 && { animationDelay: `-${spent}ms` }) }} />
    </div>
  );
}
