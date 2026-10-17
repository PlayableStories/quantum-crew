import { Rule } from "../components/Rule.tsx";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { StationVisual } from "../components/StationVisual.tsx";
import { S } from "../strings.ts";
import { useSolo } from "./soloStore.ts";

export function Intro() {
  const start = useSolo((s) => s.start);
  return (
    <ScreenLayout
      header={<p className="kicker">{S.intro.kicker}</p>}
      actions={
        <button className="btn btn--primary" onClick={start}>
          {S.intro.go}
        </button>
      }
    >
      <h1>{S.title}</h1>
      <StationVisual rate={null} />
      <div className="stack">
        {S.intro.lines.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>
      <Rule diagram />
      <p>
        <strong>{S.intro.survival}</strong>
      </p>
    </ScreenLayout>
  );
}
