import { useId } from "react";
import type { RoundResult } from "../shared/chsh.ts";
import { ANTICLOCKWISE, CLOCKWISE, HOT, roundCause } from "../shared/fiction.ts";
import { S } from "../strings.ts";

// The coolant ring: two sections split by a bulkhead, a pump in each, coolant circulating one way round, and the
// relief vent at the junction that unlocks only when both sides are HOT.
// - No props: the station rule's diagram (intro, rule sheet).
// - `idle`: a live round is under way. Neutral: it shows nothing about either sensor (comms are dark).
// - `result`: what the round did. Each half takes its sensor's colour and a COOL/HOT label, each impeller spins
//   the way its pump ran (with an arrow), the vent opens on a double HOT, and the cause plays out: flow round the
//   ring, heat carried to the cool side, a purge out of the vent, a pressure spike where the flows meet, an
//   overheat, or a stopped pump. Decorative here: the station telemetry says the same in words. With reduced
//   motion everything stays put and the arrows, labels and marks carry the meaning.

const CX = 160;
const CY = 120;
const R = 56;
const PUMPS = [104, 216] as const; // Section A (left), Section B (right)

// The two halves, drawn top → bottom: the left one via the left side (anticlockwise on screen), the right one via
// the right side (clockwise). Dashes moving "forward" travel top → bottom along these.
const LEFT_HALF = `M${CX} ${CY - R} A${R} ${R} 0 0 0 ${CX} ${CY + R}`;
const RIGHT_HALF = `M${CX} ${CY - R} A${R} ${R} 0 0 1 ${CX} ${CY + R}`;

type Props = { result?: RoundResult; idle?: boolean; small?: boolean };

export function RingDiagram({ result, idle = false, small = false }: Props) {
  const R_ = S.ring;
  const id = useId().replace(/:/g, "");
  const live = !!result;
  const cause = result ? roundCause(result) : null;
  const ventOpen = !!result && result.x === HOT && result.y === HOT;
  const cls = ["ring", small ? "ring--small" : "", idle ? "ring--idle" : "", cause ? `ring--live ring--${cause}` : ""];

  // Which way each half's coolant moves. CLOCKWISE on the left half runs bottom → top (against the path); on the
  // right half it runs top → bottom (with the path).
  const halfForward = (side: 0 | 1, pump: 0 | 1) => (side === 0 ? pump === ANTICLOCKWISE : pump === CLOCKWISE);
  // Where opposing flows meet: A clockwise with B anticlockwise pushes both halves up to the vent; the other way, down.
  const meetTop = !!result && result.a === CLOCKWISE && result.b === ANTICLOCKWISE;

  // Live and idle rings are wider, so each side's labels (section, sensor, pump) can sit outside the ring at a size
  // that stays legible on a phone (CSS keeps their text at 15 units; at phone width that renders above 12px).
  const wide = live || idle;
  const LX = wide ? 18 : 62;
  const RX = wide ? 302 : 258;

  return (
    <svg
      className={cls.filter(Boolean).join(" ")}
      viewBox={wide ? "-42 0 404 190" : "0 0 320 190"}
      {...(live || idle ? { "aria-hidden": true } : { role: "img", "aria-label": R_.label })}
    >
      <defs>
        <marker id={`${id}-head`} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0 0L10 5L0 10z" className="ring__head" />
        </marker>
      </defs>

      {/* Bulkhead between the sections */}
      <line className="ring__bulkhead" x1={CX} y1="54" x2={CX} y2="186" />
      <text className="ring__section" x={LX} y={wide ? 66 : 80} textAnchor="middle">{R_.a}</text>
      <text className="ring__section" x={RX} y={wide ? 66 : 80} textAnchor="middle">{R_.b}</text>

      {result ? (
        <>
          {/* Each half in its sensor's colour, labelled COOL / HOT (never colour alone) */}
          <path className={`ring__half ring__half--${result.x === HOT ? "hot" : "cool"}`} d={LEFT_HALF} />
          <path className={`ring__half ring__half--${result.y === HOT ? "hot" : "cool"}`} d={RIGHT_HALF} />
          <text className={`ring__reading ring__reading--${result.x === HOT ? "hot" : "cool"}`} x={LX} y="86" textAnchor="middle">
            {S.light[result.x]}
          </text>
          <text className={`ring__reading ring__reading--${result.y === HOT ? "hot" : "cool"}`} x={RX} y="86" textAnchor="middle">
            {S.light[result.y]}
          </text>
          {/* Each pump's direction in words, under its sensor */}
          {([0, 1] as const).map((side) => {
            const pump = side === 0 ? result.a : result.b;
            return (
              <text key={side} className="ring__pump-word" x={side === 0 ? LX : RX} y="106" textAnchor="middle">
                {pump === null ? R_.notSet : S.pump[pump]}
              </text>
            );
          })}

          {/* The coolant: dashes along each half, moving the way that half's pump drives it */}
          {cause !== "slow" &&
            ([0, 1] as const).map((side) => {
              const pump = side === 0 ? result.a! : result.b!;
              return (
                <path
                  key={side}
                  className={`ring__flow-dash ${halfForward(side, pump) ? "ring__flow-dash--fwd" : "ring__flow-dash--rev"}`}
                  d={side === 0 ? LEFT_HALF : RIGHT_HALF}
                />
              );
            })}

          {/* What the round did */}
          {cause === "spike" && (
            // Placed by the outer group; the inner one pulses about its own centre.
            <g transform={`translate(${CX} ${meetTop ? CY - R : CY + R})`}>
              <g className="ring__burst">
                <path d="M0 -16L4 -5L15 -8L7 1L14 11L2 6L-4 16L-6 5L-16 6L-8 -2L-14 -11L-3 -6z" />
              </g>
            </g>
          )}
          {cause === "purge" && (
            <g className="ring__purge">
              {[-8, 0, 8].map((dx, i) => (
                <path key={dx} className="ring__purge-puff" style={{ animationDelay: `${i * 0.2}s` }} d={`M${CX + dx} 22v-16`} markerEnd={`url(#${id}-head)`} />
              ))}
            </g>
          )}
          {cause === "overheat" && <circle className="ring__glow" cx={CX} cy={CY} r={R} />}
        </>
      ) : (
        <>
          <circle className="ring__pipe" cx={CX} cy={CY} r={R} />
          {!idle && (
            <>
              <path className="ring__flow" d="M128 67 l14 -4 -4 14" />
              <path className="ring__flow" d="M192 173 l-14 4 4 -14" />
            </>
          )}
        </>
      )}

      {/* A pump in each section: a housing with a three-blade impeller, spinning the way the pump ran */}
      {PUMPS.map((cx, side) => {
        const pump = result ? (side === 0 ? result.a : result.b) : null;
        const spin = pump === null ? "" : pump === CLOCKWISE ? "ring__impeller--cw" : "ring__impeller--acw";
        return (
          <g key={cx} className={`ring__pump ${result && pump === null ? "ring__pump--stopped" : ""}`}>
            <circle cx={cx} cy={CY} r="16" />
            <g className={`ring__impeller ${spin}`}>
              {[0, 120, 240].map((deg) => (
                <path key={deg} d={`M${cx} ${CY}q2 -8 9 -9`} transform={`rotate(${deg} ${cx} ${CY})`} />
              ))}
            </g>
            {result && pump !== null && (
              <path
                className="ring__dir"
                markerEnd={`url(#${id}-head)`}
                d={
                  pump === CLOCKWISE
                    ? `M${cx - 15} ${CY - 17} A23 23 0 0 1 ${cx + 15} ${CY - 17}`
                    : `M${cx + 15} ${CY - 17} A23 23 0 0 0 ${cx - 15} ${CY - 17}`
                }
              />
            )}
          </g>
        );
      })}

      {/* The relief vent where the sections meet */}
      <line className="ring__vent-pipe" x1={CX} y1="64" x2={CX} y2="38" />
      <rect className={`ring__vent ${ventOpen ? "ring__vent--open" : ""}`} x="148" y="24" width="24" height="14" rx="3" />
      {!ventOpen && <path className="ring__grate" d="M154 26v10M160 26v10M166 26v10" />}
      {result ? (
        // Beside the vent, so a purge can rise out of it.
        <text className="ring__note" x={CX + 18} y="35">
          <tspan className="ring__label">{ventOpen ? R_.ventOpen : R_.ventLocked}</tspan>
        </text>
      ) : (
        <text className="ring__note" x={CX} y="14" textAnchor="middle">
          <tspan className="ring__label">{R_.vent}</tspan>
          {!idle && <> · {R_.ventNote}</>}
        </text>
      )}
    </svg>
  );
}
