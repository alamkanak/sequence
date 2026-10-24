import { renderToString } from "react-dom/server";
import { Landing } from "./components/Landing";
import { Docs } from "./docs/Docs";

/** Build-time HTML for everyone, using the same components as the browser. */
export function render(page: "landing" | "docs") {
  return renderToString(page === "landing" ? <Landing /> : <Docs />);
}
