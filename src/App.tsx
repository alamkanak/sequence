import { lazy, Suspense, useEffect, useState } from "react";
import { Landing } from "./components/Landing";
import { loadDemo, restoreProject } from "./core/actions";
import { cn, skin } from "./components/ui";
import { ToastHost } from "./components/Toast";
const Editor = lazy(() =>
  import("./components/Editor").then((m) => ({ default: m.Editor })),
);
export function App() {
  const [route, setRoute] = useState(location.hash),
    [ready, setReady] = useState(false);
  useEffect(() => {
    const update = () => setRoute(location.hash);
    window.addEventListener("hashchange", update);
    void restoreProject().finally(() => setReady(true));
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return (
    <div
      className={cn(
        "min-h-dvh font-sans antialiased [color-scheme:light] [[data-theme=dark]_&]:[color-scheme:dark]",
        skin.app,
      )}
    >
      <ToastHost />
      {route.startsWith("#/editor") ? (
        <Suspense
          fallback={
            <div className="flex h-dvh items-center justify-center text-sm">
              Opening your workspace…
            </div>
          }
        >
          {ready ? (
            <Editor />
          ) : (
            <div className="flex h-dvh items-center justify-center text-sm">
              Restoring your workspace…
            </div>
          )}
        </Suspense>
      ) : (
        <Landing loadSample={loadDemo} />
      )}
    </div>
  );
}
