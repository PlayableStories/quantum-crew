import { RadioLine } from "../components/RadioLine.tsx";
import { crewLines } from "./crew.ts";
import { useSolo } from "./soloStore.ts";

/** The solo crewmate's radio: whatever crew.ts picks for the current state (nothing while comms are dark). */
export function CrewRadio() {
  const s = useSolo((st) => st);
  return <RadioLine lines={crewLines(s)} />;
}
