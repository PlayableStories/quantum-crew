// Solo Act III, the crystal plan screen (comms open): event mode's crystal plan, with CORA as the fixed partner at
// Table B and no facilitator. Your plan card (two settings from the list), CORA's read-only plan, the starting line
// (her settings and what you two hold with your plan as it is), clue 1 (the live hint for your weakest case, which
// only ever moves your own setting, and the nudge), the fan with each case's chance, the crystals' rule (in full on
// the first visit, then behind a chip) and, after a wave that didn't pass, engineering's answer on request.
import { useCallback, useEffect, useState } from "react";
import { AiBadge } from "../components/AiBadge.tsx";
import {
  AnswerRow,
  ClueHint,
  CrystalFan,
  CrystalPlanCard,
  CrystalRuleTable,
  answerText,
  planLine,
  rateText,
} from "../components/CrystalPlan.tsx";
import { formatDeg } from "../lib/formatDeg.ts";
import { Rule } from "../components/Rule.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { Sheet } from "../components/Sheet.tsx";
import { answerPlanFor, coraPlan, pairRateFor } from "../shared/crystalPlan.ts";
import { S } from "../strings.ts";
import { CrewRadio } from "./CrewRadio.tsx";
import { answerAvailable, nextWave, useSolo } from "./soloStore.ts";

/** You are always Table A beside CORA: the hint names only your own setting. */
const YOU = { table: "A", name: "" } as const;

export function Tuning() {
  const s = useSolo((st) => st);
  const [sheet, setSheet] = useState<"station" | "rule" | "answer" | null>(null);
  const close = useCallback(() => setSheet(null), []);
  // The crystals' rule: on screen on the first visit (beside the plan; the full rule with its 180° note is in the
  // chip's sheet), then behind the chip. On phones there's no room beside the plan, so the first visit opens it over
  // the screen instead (once).
  const firstVisit = s.act3Batches === 0;
  useEffect(() => {
    if (firstVisit && typeof matchMedia === "function" && matchMedia("(max-width: 599px)").matches) setSheet("rule");
  }, [firstVisit]);
  const cora = coraPlan("B");
  const plans = { a: s.tuning, b: cora };
  const rate = pairRateFor("A", s.tuning, cora);
  const openAnswer = () => {
    s.showAnswer();
    setSheet("answer");
  };
  const rule = <CrystalRuleTable follow={S.tuning.followRule} />;
  return (
    <ScreenLayout
      className="crystal-screen"
      header={<p className="kicker">{S.tuning.kicker}</p>}
      side={
        <>
          <div className="crystal-screen__radio">
            <CrewRadio />
          </div>
          {firstVisit && (
            <div className="panel stack crystal-screen__rule">
              <p className="kicker">{S.event.crystalRule.head}</p>
              {/* Beside the plan: the three lines and the table; the 180° note is in the chip's sheet. */}
              <CrystalRuleTable follow={S.tuning.followRule} fold={false} />
            </div>
          )}
          {/* The station rule, the crystals' rule (after the first visit; on phones always) and engineering's answer. */}
          <div className="row chips crystal-screen__chips">
            <button className="btn btn--ghost chip" aria-haspopup="dialog" onClick={() => setSheet("station")}>
              {S.rule.head}
            </button>
            <button className="btn btn--ghost chip" aria-haspopup="dialog" onClick={() => setSheet("rule")}>
              {S.event.crystalRule.chip}
            </button>
            {answerAvailable(s) && (
              <button className="btn btn--ghost chip chip--fresh" aria-haspopup="dialog" onClick={openAnswer}>
                {S.tuning.answerButton}
              </button>
            )}
          </div>
        </>
      }
      actions={
        <button className="btn btn--primary" onClick={s.beginBatch}>
          {S.tuning.start}
          <small>{S.tuning.startSub(nextWave(s))}</small>
        </button>
      }
    >
      <h1 className="hide-on-phone">{S.tuning.title}</h1>
      <div className="crystal-screen__cards">
        <CrystalPlanCard title={S.event.crystalPlan.head} value={s.tuning} onChange={s.setTuning} like />
        {/* CORA's plan: a read-only card beside yours on wide screens, one line on phones. */}
        <CrystalPlanCard
          title={S.tuning.coraHead}
          value={cora}
          cora
          lead={false}
          note={S.event.crystalPlan.coraSet}
          className="only-split"
        />
      </div>
      <p className="partner-plan only-stacked" role="status">
        <span className="kicker">
          {S.tuning.coraHead}
          <AiBadge />
        </span>{" "}
        <strong>{planLine(cora)}</strong>
        <span className="muted small"> · {S.event.crystalPlan.coraSet}</span>
      </p>
      <p className="start-line">{S.tuning.startCora(formatDeg(cora.greenDeg), formatDeg(cora.redDeg), rateText(rate))}</p>
      {/* Clue 1, from the first visit: the live hint (your own setting only; "Found it" at 80%+) and the nudge. */}
      <ClueHint plans={plans} human={YOU} rate={false} />
      <p className="muted small crystal-screen__nudge">{S.tuning.nudge}</p>
      <CrystalFan a={s.tuning} b={cora} chances />

      <Sheet open={sheet === "station"} onClose={close} label={S.rule.head}>
        <Rule diagram />
      </Sheet>
      <Sheet open={sheet === "rule"} onClose={close} label={S.event.crystalRule.head}>
        <div className="stack">
          <p className="kicker">{S.event.crystalRule.head}</p>
          {rule}
        </div>
      </Sheet>
      <Sheet open={sheet === "answer"} onClose={close} label={S.tuning.answerHead}>
        <div className="stack clues__answer">
          <p className="kicker">{S.tuning.answerHead}</p>
          <p>{answerText()}</p>
          <AnswerRow table="A" plans={plans} onUse={() => s.useAnswer()} />
          <CrystalFan a={answerPlanFor("A")} b={cora} chances />
        </div>
      </Sheet>
    </ScreenLayout>
  );
}
