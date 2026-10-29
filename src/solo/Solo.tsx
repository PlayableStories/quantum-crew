// Solo mode: one screen per phase of the store. Act III screens get the Entanglement Tool's look.
import { Batch } from "./Batch.tsx";
import { Ceiling } from "./Ceiling.tsx";
import { Debrief } from "./Debrief.tsx";
import { Intro } from "./Intro.tsx";
import { Plan } from "./Plan.tsx";
import { Readout } from "./Readout.tsx";
import { Resolution } from "./Resolution.tsx";
import { Storm } from "./Storm.tsx";
import { ToolReveal } from "./ToolReveal.tsx";
import { Tuning } from "./Tuning.tsx";
import { QuantumBackdrop } from "../components/QuantumBackdrop.tsx";
import { useSolo, type Phase } from "./soloStore.ts";

const QUANTUM_PHASES: Phase[] = ["toolReveal", "act3Plan", "act3Batch", "act3Readout"];

export function Solo() {
  const phase = useSolo((s) => s.phase);
  return (
    <div className={`solo ${QUANTUM_PHASES.includes(phase) ? "quantum" : ""}`}>
      {QUANTUM_PHASES.includes(phase) && <QuantumBackdrop />}
      {screenFor(phase)}
    </div>
  );
}

function screenFor(phase: Phase) {
  switch (phase) {
    case "intro":
      return <Intro />;
    case "act2Plan":
      return <Plan />;
    case "act1Batch":
    case "act2Batch":
    case "act3Batch":
      return <Batch />;
    case "act2Readout":
    case "act3Readout":
      return <Readout />;
    case "ceiling":
      return <Ceiling />;
    case "toolReveal":
      return <ToolReveal />;
    case "storm":
      return <Storm />;
    case "act3Plan":
      return <Tuning />;
    case "resolution":
      return <Resolution />;
    case "debrief":
      return <Debrief />;
  }
}
