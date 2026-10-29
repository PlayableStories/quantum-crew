// Act III strategy phase (comms open): one dial per sensor reading. Your own dials come first and large. The
// crewmate's dials are locked at their setting (the optimal Table B one): one reference line here, the full locked
// dials in a Sheet. Engineering's hint, once available, also opens in a Sheet.
import { useCallback, useState } from "react";
import { AiBadge, CrewName } from "../components/AiBadge.tsx";
import { Dial, formatDeg } from "../components/Dial.tsx";
import { RuleChip } from "../components/RuleChip.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { SensorLight } from "../components/SensorLight.tsx";
import { Sheet } from "../components/Sheet.tsx";
import { OPTIMAL_TUNING } from "../shared/chsh.ts";
import { COOL, HOT } from "../shared/fiction.ts";
import { S } from "../strings.ts";
import { CrewRadio } from "./CrewRadio.tsx";
import { hintAvailable, useSolo } from "./soloStore.ts";

export function Tuning() {
  const s = useSolo((st) => st);
  const [sheet, setSheet] = useState<"dials" | "hint" | null>(null);
  const close = useCallback(() => setSheet(null), []);
  const crew = OPTIMAL_TUNING.B;
  const openHint = () => {
    s.showHint();
    setSheet("hint");
  };
  return (
    <ScreenLayout
      header={<p className="kicker">{S.tuning.kicker}</p>}
      side={
        <>
          <CrewRadio />
          <div className="crew-dials">
            <p className="crew-dials__line">
              <CrewName />
              {S.crew.dialsLine(formatDeg(crew.greenDeg), formatDeg(crew.redDeg))}
            </p>
            <button className="btn btn--ghost crew-dials__btn" aria-haspopup="dialog" onClick={() => setSheet("dials")}>
              {S.crew.seeDials}
            </button>
          </div>
          {hintAvailable(s) && (
            <button className="btn btn--ghost" aria-haspopup="dialog" onClick={openHint}>
              {S.tuning.hintButton}
            </button>
          )}
          <RuleChip />
        </>
      }
      actions={
        <button className="btn btn--primary" onClick={s.beginBatch}>
          {S.tuning.start(s.act3Batches + 1)}
        </button>
      }
    >
      <h1 className="hide-on-phone">{S.tuning.title}</h1>
      <div className="panel stack">
        <p className="kicker">{S.tuning.yours}</p>
        <div className="row">
          <Dial
            value={s.tuning.greenDeg}
            onChange={(d) => s.setDial(COOL, d)}
            label={<SensorLight light={COOL} small />}
          />
          <Dial value={s.tuning.redDeg} onChange={(d) => s.setDial(HOT, d)} label={<SensorLight light={HOT} small />} />
        </div>
      </div>

      <Sheet open={sheet === "dials"} onClose={close} label={S.crew.dialsHead(S.crew.name)}>
        <div className="panel stack dials--locked">
          <p className="kicker">
            {S.crew.dialsHead(S.crew.name)} <AiBadge />
          </p>
          <div className="row">
            <Dial value={crew.greenDeg} small label={<SensorLight light={COOL} small />} />
            <Dial value={crew.redDeg} small label={<SensorLight light={HOT} small />} />
          </div>
        </div>
      </Sheet>
      <Sheet open={sheet === "hint"} onClose={close} label={S.tuning.hintButton}>
        <div className="panel stack">
          <p className="kicker">{S.tuning.hintButton}</p>
          <p role="status">{S.tuning.hint}</p>
        </div>
      </Sheet>
    </ScreenLayout>
  );
}
