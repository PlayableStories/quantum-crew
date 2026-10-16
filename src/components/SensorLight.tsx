import type { Light } from "../shared/chsh.ts";
import { COOL } from "../shared/fiction.ts";
import { S } from "../strings.ts";

// COOL is blue with a snowflake, HOT is orange with a flame: the reading never relies on colour alone.
export function SensorLight({ light, label, small = false }: { light: Light | null; label?: string; small?: boolean }) {
  const cls = light === null ? "light--off" : `light--${light}`;
  return (
    <div className={`light ${cls} ${small ? "light--small" : ""}`} aria-live="polite">
      {label && <span className="kicker">{label}</span>}
      <div className="light__bulb">
        {light === null ? (
          "…"
        ) : (
          <>
            <LightIcon light={light} />
            {!small && <span>{S.light[light]}</span>}
          </>
        )}
      </div>
      {small && light !== null && <strong>{S.light[light]}</strong>}
    </div>
  );
}

export function LightIcon({ light }: { light: Light }) {
  return (
    <svg className="light__icon" viewBox="0 0 24 24" aria-hidden="true">
      {light === COOL ? (
        // Snowflake: three crossed bars with little chevrons.
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M3.3 7l17.4 10M3.3 17l17.4-10" />
          <path d="M9.5 3.8 12 6l2.5-2.2M9.5 20.2 12 18l2.5 2.2" />
        </g>
      ) : (
        // Flame.
        <path
          fill="currentColor"
          d="M12 2c.6 3.2 2.4 4.9 4 6.7 1.5 1.7 2.5 3.4 2.5 5.8A6.5 6.5 0 0 1 5.5 14.5c0-2.4 1.1-4.1 2.6-5.3-.1 1.6.4 2.9 1.5 3.6C9.4 8.5 10.5 5 12 2Z"
        />
      )}
    </svg>
  );
}
