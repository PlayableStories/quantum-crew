import { S } from "../strings.ts";

// The coolant ring next to the station rule: two sections split by a bulkhead, a pump in each, coolant
// circulating one way round, and the relief vent (grated, locked) at the junction that unlocks only when both
// sides are HOT.
export function RingDiagram() {
  const R = S.ring;
  return (
    <svg className="ring" viewBox="0 0 320 190" role="img" aria-label={R.label}>
      {/* Bulkhead between the sections */}
      <line className="ring__bulkhead" x1="160" y1="54" x2="160" y2="186" />
      <text className="ring__section" x="62" y="80" textAnchor="middle">{R.a}</text>
      <text className="ring__section" x="258" y="80" textAnchor="middle">{R.b}</text>

      {/* The ring of coolant, with flow arrows going clockwise */}
      <circle className="ring__pipe" cx="160" cy="120" r="56" />
      <path className="ring__flow" d="M128 67 l14 -4 -4 14" />
      <path className="ring__flow" d="M192 173 l-14 4 4 -14" />

      {/* A pump in each section: a housing with a three-blade impeller */}
      {[104, 216].map((cx) => (
        <g key={cx} className="ring__pump">
          <circle cx={cx} cy="120" r="16" />
          {[0, 120, 240].map((deg) => (
            <path key={deg} d={`M${cx} 120q2 -8 9 -9`} transform={`rotate(${deg} ${cx} 120)`} />
          ))}
        </g>
      ))}

      {/* The relief vent where the sections meet, locked */}
      <line className="ring__vent-pipe" x1="160" y1="64" x2="160" y2="38" />
      <rect className="ring__vent" x="148" y="24" width="24" height="14" rx="3" />
      <path className="ring__grate" d="M154 26v10M160 26v10M166 26v10" />
      <text className="ring__note" x="160" y="14" textAnchor="middle">
        <tspan className="ring__label">{R.vent}</tspan> · {R.ventNote}
      </text>
    </svg>
  );
}
