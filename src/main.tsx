import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

function syncAppViewportVars() {
  const vv = window.visualViewport;
  const height = vv?.height ?? window.innerHeight;
  const width = vv?.width ?? window.innerWidth;
  // Use px so we can do reliable calc() math in components.
  document.documentElement.style.setProperty("--app-height", `${Math.round(height)}px`);
  document.documentElement.style.setProperty("--app-width", `${Math.round(width)}px`);
}

syncAppViewportVars();

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", syncAppViewportVars);
  window.visualViewport.addEventListener("scroll", syncAppViewportVars);
}
window.addEventListener("resize", syncAppViewportVars);

createRoot(document.getElementById("root")!).render(<App />);
