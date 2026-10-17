// Act III strategy phase (comms open): one dial per sensor reading. The crewmate's dials are shown, locked at their
// setting (the optimal Table B one); the player tunes only their own.
import { Dial } from "../components/Dial.tsx";
import { Rule } from "../components/Rule.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { SensorLight } from "../components/SensorLight.tsx";
import { StabilityMeter } from "../components/StabilityMeter.tsx";
import { OPTIMAL_TUNING, winRate } from "../shared/chsh.ts";
import { COOL, HOT } from "../shared/fiction.ts";
import { S } from "../strings.ts";
import { CrewRadio } from "./CrewRadio.tsx";
import { hintAvailable, useSolo } from "./soloStore.ts";

export function Tuning() {
  const s = useSolo((st) => st);
  return (
    <ScreenLayout
      header={<p className="kicker">{S.tuning.kicker}</p>}
      actions={
        <button className="btn btn--primary" onClick={s.beginBatch}>
          {S.tuning.start(s.act3Batches + 1)}
        </button>
      }
    >
      <h1>{S.tuning.title}</h1>
      <CrewRadio />
      <div className="panel stack dials--locked">
        <p className="kicker">{S.crew.dialsHead(S.crew.name)}</p>
        <div className="row">
          <Dial value={OPTIMAL_TUNING.B.greenDeg} small label={<SensorLight light={COOL} small />} />
          <Dial value={OPTIMAL_TUNING.B.redDeg} small label={<SensorLight light={HOT} small />} />
        </div>
      </div>
      <Rule />
      <p className="kicker">{S.tuning.yours}</p>
      <div className="row panel">
        <Dial
          value={s.tuning.greenDeg}
          onChange={(d) => s.setDial(COOL, d)}
          label={<SensorLight light={COOL} small />}
        />
        <Dial value={s.tuning.redDeg} onChange={(d) => s.setDial(HOT, d)} label={<SensorLight light={HOT} small />} />
      </div>
      {s.act3.length > 0 && (
        <div className="panel">
          <StabilityMeter value={winRate(s.act3)} label={S.readout.actSoFar(s.act3.length)} showCeiling showLimit />
        </div>
      )}
      {hintAvailable(s) &&
        (s.hintShown ? (
          <p className="panel" role="status">
            {S.tuning.hint}
          </p>
        ) : (
          <button className="btn btn--ghost" onClick={s.showHint}>
            {S.tuning.hintButton}
          </button>
        ))}
    </ScreenLayout>
  );
}
