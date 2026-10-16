import { S } from "../strings.ts";

/** The crewmate on the radio. Renders nothing when there's nothing to say (always the case while comms are dark). */
export function RadioLine({ lines }: { lines: readonly string[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="radio-line panel" role="status">
      <p className="radio-line__who kicker">
        <svg className="radio-line__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 21h10V10H7zM9 10 15 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="15" r="2.4" fill="currentColor" />
        </svg>
        {S.comms.radio} · {S.crew.name}
      </p>
      {lines.map((l) => (
        <p key={l} className="radio-line__text">
          “{l}”
        </p>
      ))}
    </div>
  );
}

/** The radio while a batch runs: no voice, just static. */
export function CommsDark() {
  return (
    <div className="comms-dark" role="status" aria-label={`${S.comms.dark}. ${S.comms.darkSub}`}>
      <span className="comms-dark__static" aria-hidden="true" />
      <span className="comms-dark__text">
        <strong>{S.comms.dark}</strong> · {S.comms.darkSub}
      </span>
    </div>
  );
}
