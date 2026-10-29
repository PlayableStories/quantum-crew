import { S } from "../strings.ts";

/** A small "AI" pill with a robot head, next to CORA's name wherever it appears (and a bot seat's in event mode). */
export function AiBadge() {
  return (
    <span className="ai-badge">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 1v2.5" />
        <circle cx="8" cy="1.6" r="1" />
        <rect x="2.5" y="4" width="11" height="9" rx="2.5" />
        <circle cx="5.8" cy="8.3" r="1.1" className="ai-badge__eye" />
        <circle cx="10.2" cy="8.3" r="1.1" className="ai-badge__eye" />
      </svg>
      {S.crew.badge}
    </span>
  );
}

/** A seat's name, with the AI badge when the seat is CORA rather than a person. */
export function SeatName({ name, bot }: { name: string; bot: boolean }) {
  return (
    <span className="seat-name">
      {name}
      {bot && <AiBadge />}
    </span>
  );
}

/** CORA's name with her badge. */
export const CrewName = () => <SeatName name={S.crew.name} bot />;
