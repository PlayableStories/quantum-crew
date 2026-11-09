// The ? sheet (K1): the keyboard shortcuts for solo or the TV, from S.keys.
import { S } from "../strings.ts";
import { Sheet } from "./Sheet.tsx";

export function KeysList({ mode }: { mode: "solo" | "tv" }) {
  return (
    <div className="stack keys-list">
      <h2>{S.keys.title}</h2>
      <dl className="keys-list__rows">
        {S.keys[mode].map(([key, what]) => (
          <div key={key + what} className="keys-list__row">
            <dt>
              <kbd>{key}</kbd>
            </dt>
            <dd>{what}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function KeysSheet({ mode, open, onClose }: { mode: "solo" | "tv"; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} label={S.keys.title}>
      <KeysList mode={mode} />
    </Sheet>
  );
}
