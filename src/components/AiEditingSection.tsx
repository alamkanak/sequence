import { ArrowUpRightIcon, CommandIcon } from "./icons";
import { cn, skin } from "./ui";
import { landing, landingAction } from "./landing-ui";

export const AI_SETUP_URL = `${import.meta.env.BASE_URL}docs/mcp/`;

export function AiEditingSection() {
  return (
    <section
      id="ai-editing"
      aria-labelledby="ai-heading"
      className={cn(
        landing.section,
        "grid items-center gap-10 border-b md:grid-cols-2 md:gap-16",
        skin.border,
      )}
    >
      <div>
        <p className={landing.eyebrow}>AI editing</p>
        <h2 id="ai-heading" className={cn("mt-3", landing.heading)}>
          AI video editing with MCP.
        </h2>
        <p className={cn("mt-4 max-w-lg", landing.body)}>
          Connect Claude Code, Codex, Cursor, or another AI agent through the
          Model Context Protocol (MCP). Ask it to arrange clips, trim footage,
          add titles, or adjust audio. Review every change in the same timeline
          you use by hand.
        </p>
        <a
          href={AI_SETUP_URL}
          className={cn("mt-6", landingAction("secondary"))}
        >
          Set up AI editing <ArrowUpRightIcon size={16} aria-hidden="true" />
        </a>
        <p className={cn("mt-3", landing.note)}>
          Connect through Sequence’s local MCP server. No app build needed.
        </p>
      </div>
      <div
        className={cn("rounded-2xl border p-6 md:p-8", skin.border, skin.panel)}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CommandIcon
            size={20}
            className="text-indigo-600 [[data-theme=dark]_&]:text-indigo-300"
            aria-hidden="true"
          />
          An edit, in your own words
        </div>
        <blockquote
          className={cn("mt-5 rounded-xl bg-indigo-500/5 p-5", landing.title)}
        >
          “Trim the opening, add a title, and fade the music out.”
        </blockquote>
        <ol className="mt-6 space-y-4">
          {[
            "Connect your agent to Sequence.",
            "Approve access to your open project.",
            "Ask for an edit. Review the result.",
          ].map((step, index) => (
            <li
              key={step}
              className="flex items-baseline gap-3 text-base leading-relaxed"
            >
              <span
                aria-hidden="true"
                className="text-sm font-semibold text-indigo-600 [[data-theme=dark]_&]:text-indigo-300"
              >
                0{index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <p className={cn("mt-6 border-t pt-5", skin.border, landing.note)}>
          Works with Claude Code, Codex, Cursor, and other MCP clients.
          Rendering stays in your browser.
        </p>
      </div>
    </section>
  );
}
