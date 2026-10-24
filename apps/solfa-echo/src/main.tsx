import {render} from "preact";
import {useEffect, useState} from "preact/hooks";
import SaysScreen from "./games/says/SaysScreen";
import HostApp from "./live/host/HostApp";
import PlayerApp from "./live/player/PlayerApp";
import "./style.css";

// Hash routes, since the static host has no SPA fallback: #/host for the board, #/join/<code> for students
function App() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const update = () => setHash(location.hash);
    addEventListener("hashchange", update);
    return () => removeEventListener("hashchange", update);
  }, []);

  if (hash.startsWith("#/host")) return <HostApp />;
  const join = hash.match(/^#\/join(?:\/([^/?]*))?/);
  if (join) return <PlayerApp key={join[1] ?? ""} initialCode={(join[1] ?? "").toUpperCase()} />;
  return <SaysScreen />;
}

render(<App />, document.getElementById("app")!);
