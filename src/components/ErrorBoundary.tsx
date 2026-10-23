import { Component, type ReactNode } from "react";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    if (this.state.error)
      return (
        <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-zinc-950 p-10 text-zinc-100">
          <h1 className="text-xl">The workspace needs a fresh start.</h1>
          <p className="max-w-lg text-center text-sm text-zinc-400">
            {this.state.error}
          </p>
          <button
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm"
            onClick={() => location.reload()}
          >
            Reload saved project
          </button>
        </main>
      );
    return this.props.children;
  }
}
