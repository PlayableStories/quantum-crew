import { useCallback, useState } from "react";
import { ATLAS_ASSETS, assetPresent, assetProvenance } from "../assets/atlas/manifest.ts";
import { S } from "../strings.ts";
import { Sheet } from "./Sheet.tsx";

/** The short credits; "How the art was made" opens every Atlas asset (engine, parameters, job) in a Sheet. */
export function CreditsList() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <div className="stack">
      <p>{S.credits.lead}</p>
      <p className="muted">{S.credits.simulated}</p>
      <button className="btn btn--ghost" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {S.credits.how}
      </button>
      <a href={S.credits.learnUrl} target="_blank" rel="noreferrer">
        {S.credits.learn}
      </a>
      <Sheet open={open} onClose={close} label={S.credits.assets}>
        <AssetList />
      </Sheet>
    </div>
  );
}

/** Every Atlas asset from the manifest, with engine and parameters. */
function AssetList() {
  return (
    <div className="panel stack">
      <p className="kicker">{S.credits.assets}</p>
      <ul className="assets">
        {ATLAS_ASSETS.map((a) => {
          const prov = assetProvenance(a.key);
          const params = a.params ?? prov?.params;
          return (
            <li key={a.key}>
              <span>
                <code>{a.key}</code> · {a.engine}
                {a.engineId ? ` (${a.engineId})` : ""}
              </span>
              <span className="muted small">{a.use}</span>
              {params && <span className="small">{JSON.stringify(params)}</span>}
              {prov && <span className="muted small">{S.credits.job(prov.jobId)}</span>}
              {!assetPresent(a.key) && <span className="muted small">{S.credits.pending}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
