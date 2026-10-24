import { createRoot } from "react-dom/client";
import { Docs } from "./Docs";
import { ErrorBoundary } from "../components/ErrorBoundary";
import "../tailwind.css";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <Docs />
  </ErrorBoundary>,
);
