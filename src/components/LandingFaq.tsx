import { PlusIcon } from "./icons";
import { cn, skin } from "./ui";
import { landing } from "./landing-ui";

const questions = [
  {
    question: "Is Sequence a free online video editor with no watermark?",
    answer:
      "Yes. The browser editor is free and open source, and exports do not add a watermark. Optional AI clients and their providers may have their own subscriptions or usage costs.",
  },
  {
    question: "Can I edit videos without signing up or installing an app?",
    answer:
      "Yes. Open the editor in desktop Chrome or Edge and import your files to edit by hand. No account, download, or app installation is required. Optional agent editing uses a local MCP companion and requires Node.js 24 or newer.",
  },
  {
    question: "Can I edit a video without uploading it?",
    answer:
      "Yes. Manual editing, previews, and rendering happen on your device. The browser saves your media and project locally. If you choose to connect an AI agent, that client receives project data and any preview images it requests.",
  },
  {
    question: "Can Claude Code or Codex edit my video?",
    answer:
      "Yes. Sequence's MCP server lets Claude Code, Codex, Cursor, and other compatible AI agents inspect your project, arrange and trim clips, add titles, adjust audio, preview frames, and export. Approve the connection in the editor and review every change on the same timeline you edit by hand.",
  },
  {
    question: "Which browsers and video export formats are supported?",
    answer:
      "Desktop Chrome or Edge provides the best support. You can export MP4 or WebM when the required codecs are available in your browser and device. Exports are currently SDR; convert HDR footage before importing it.",
  },
];

export function LandingFaq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className={cn(landing.section, "border-t", skin.border)}
    >
      <div className="max-w-2xl">
        <p className={landing.eyebrow}>Before your first edit</p>
        <h2 id="faq-heading" className={cn("mt-3", landing.heading)}>
          Questions about free browser video editing.
        </h2>
      </div>
      <div className="mt-8">
        {questions.map(({ question, answer }) => (
          <details
            key={question}
            className={cn("group border-b py-5", skin.border)}
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-5 text-base font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
              {question}
              <PlusIcon
                size={20}
                aria-hidden="true"
                className="mt-1 shrink-0 transition-transform group-open:rotate-45"
              />
            </summary>
            <p className={cn("mt-4 max-w-3xl", landing.body)}>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
