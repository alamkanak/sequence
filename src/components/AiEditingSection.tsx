import { ArrowUpRightIcon, CommandIcon } from "./icons";
import { cn, skin } from "./ui";

export const AI_SETUP_URL =
  "https://github.com/alamkanak/sequence#ai-editing-with-mcp";

export function AiEditingSection() {
  return (
    <section
      id="ai-editing"
      className={cn(
        "grid scroll-mt-8 gap-10 border-b py-20 md:grid-cols-2 md:items-center md:gap-16",
        skin.border,
      )}
    >
      <div>
        <p className="mb-4 text-xs font-medium tracking-[0.2em] text-indigo-400 uppercase">
          AI agent editing · MCP
        </p>
        <h2 className="text-4xl leading-tight font-medium tracking-[-0.04em]">
          Your timeline.
          <br />
          Your AI collaborator.
        </h2>
        <p className={cn("mt-5 max-w-lg text-sm leading-relaxed", skin.muted)}>
          Work with Claude Code, Codex, Cursor, or another MCP-compatible agent.
          Sequence’s MCP server lets your agent arrange clips, trim footage, add
          titles, adjust audio, and export your video. Review every edit in the
          same timeline you use by hand.
        </p>
        <a
          href={AI_SETUP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300"
        >
          Connect your AI agent <ArrowUpRightIcon size={17} />
        </a>
        <p className={cn("mt-3 text-xs leading-relaxed", skin.muted)}>
          A local MCP connection. No repository clone or app build needed.
        </p>
      </div>
      <div
        className={cn("rounded-xl border p-6 md:p-8", skin.border, skin.panel)}
      >
        <div className="flex flex-wrap items-center gap-2">
          <CommandIcon size={20} className="mr-1 text-indigo-400" />
          {["Claude Code", "Codex", "Cursor"].map((agent) => (
            <span
              key={agent}
              className={cn(
                "rounded-md border px-2.5 py-1.5 text-xs",
                skin.border,
              )}
            >
              {agent}
            </span>
          ))}
        </div>
        <p className="mt-6 max-w-sm text-xl leading-relaxed font-medium tracking-tight">
          “Trim the opening, add a title, and fade the music out.”
        </p>
        <ol className={cn("mt-7 space-y-4 border-t pt-6", skin.border)}>
          {[
            "Connect your agent to Sequence.",
            "Approve access to your open project.",
            "Ask for an edit. Review it in the timeline.",
          ].map((step, index) => (
            <li key={step} className="flex items-baseline gap-3 text-sm">
              <span className={cn("font-mono text-xs", skin.muted)}>
                0{index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <p className={cn("mt-6 text-xs leading-relaxed", skin.muted)}>
          Rendering stays in your browser. Your connected AI client receives
          project data and any preview images it requests.
        </p>
      </div>
    </section>
  );
}
