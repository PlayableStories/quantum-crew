// The emotional peak: during a lull, a supply pod from engineering brings the Entanglement Tool, in a look the game
// hasn't used before. (Solo copy is S.pod; the event phone keeps S.tool.)
// Background: William's Entanglement Shader asset if present, else a slow conic shimmer.
import { useEffect } from "react";
import { atlasUrl, isVideo } from "../assets/atlas/manifest.ts";
import { playSfx } from "../audio/sfx.ts";
import { ScreenLayout } from "../components/ScreenLayout.tsx";
import { Crystals, EntanglementSurface, hasEntanglementShader } from "../components/EntanglementSurface.tsx";
import { S } from "../strings.ts";
import { CrewRadio } from "./CrewRadio.tsx";
import { useSolo } from "./soloStore.ts";

export function ToolReveal() {
  const openTool = useSolo((s) => s.openTool);
  const art = atlasUrl("entanglement-reveal");
  useEffect(() => playSfx("reveal", "solo"), []);
  return (
    <ScreenLayout
      className="reveal"
      header={<p className="kicker">{S.pod.kicker}</p>}
      side={
        <>
          <div className="stack">
            {S.pod.lines.map((l) => (
              <p key={l}>{l}</p>
            ))}
          </div>
          <CrewRadio />
        </>
      }
      actions={
        <button className="btn btn--primary" onClick={openTool}>
          {S.pod.go}
        </button>
      }
    >
      <RevealField art={art} />
      <Crystals />
      <h1 className="reveal__title">{S.pod.title}</h1>
    </ScreenLayout>
  );
}

/** Behind the reveal: an added image/video, else the live Entanglement Shader film, else a conic shimmer. */
export function RevealField({ art }: { art: string | undefined }) {
  const live = !art && hasEntanglementShader();
  return (
    <div className={`reveal__field ${art || live ? "reveal__field--art" : ""}`} aria-hidden="true">
      {art ? (
        isVideo(art) ? <video src={art} autoPlay loop muted playsInline /> : <img src={art} alt="" />
      ) : (
        live && <EntanglementSurface mode="film" />
      )}
    </div>
  );
}
