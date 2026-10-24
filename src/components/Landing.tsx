import { useState } from "react";
import {
  StackSimpleIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  PlayIcon,
  LockKeyIcon,
  LightningIcon,
  CheckCircleIcon,
  FilmStripIcon,
  WaveformIcon,
  TextTIcon,
  PlusIcon,
  ListIcon,
  XIcon,
} from "./icons";
import { loadDemo } from "../core/actions";
import { ThemePicker, cn, skin } from "./ui";
import { AiEditingSection, AI_SETUP_URL } from "./AiEditingSection";
import { landing, landingAction } from "./landing-ui";

const asset = (name: string) => `${import.meta.env.BASE_URL}demo/${name}`;

function ProductPreview() {
  return (
    <div
      role="img"
      aria-label="Sequence workspace with a sunset film, media library, properties, and a multitrack timeline"
      className={cn(
        "overflow-hidden rounded-xl border shadow-xl shadow-black/5 md:rounded-2xl",
        skin.border,
        skin.panel,
      )}
    >
      <div
        className={cn(
          "flex h-12 items-center justify-between border-b px-4 text-xs",
          skin.border,
        )}
      >
        <div className="flex items-center gap-2 font-medium">
          <StackSimpleIcon size={18} weight="fill" />
          <span>Sequence</span>
          <span className={cn("ml-4 hidden font-normal sm:block", skin.muted)}>
            A quieter kind of motion
          </span>
        </div>
        <span className="rounded-md bg-indigo-600 px-3 py-1.5 text-white">
          Export <ArrowUpRightIcon className="ml-1 inline" size={12} />
        </span>
      </div>
      <div className="flex">
        <div
          className={cn(
            "hidden w-40 shrink-0 border-r p-3 sm:block",
            skin.border,
          )}
        >
          <div className="mb-4 flex gap-4 text-xs">
            <span>Media</span>
            <span className={skin.muted}>Elements</span>
          </div>
          <div
            className={cn(
              "mb-4 rounded-md border py-2 text-center text-xs",
              skin.border,
            )}
          >
            <PlusIcon className="mr-1 inline" size={12} />
            Import media
          </div>
          {["dusk", "coast"].map((name) => (
            <div key={name} className="mb-3">
              <img
                src={asset(`${name}.jpg`)}
                alt=""
                width={960}
                height={540}
                className="aspect-video w-full rounded-md object-cover"
              />
              <p className={cn("mt-1 text-xs", skin.muted)}>{name}.mp4</p>
            </div>
          ))}
          <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 p-2 text-xs text-emerald-700 [[data-theme=dark]_&]:text-emerald-300">
            <WaveformIcon size={18} />
            ambient.wav
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative aspect-video overflow-hidden bg-zinc-950">
            <img
              src={asset("dusk.jpg")}
              alt="A sunset film with a title, video clips, and an audio track in the Sequence editor"
              width={960}
              height={540}
              fetchPriority="high"
              className="size-full object-cover"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/10 px-4 text-white">
              <p className="text-center text-xl font-medium tracking-tight sm:text-3xl md:text-4xl">
                Find your own pace.
              </p>
              <p className="text-xs text-white/90">A film about making space</p>
            </div>
          </div>
          <div
            className={cn(
              "flex h-10 items-center justify-between px-4 text-xs",
              skin.muted,
            )}
          >
            <span className="font-mono">00:03:12 / 00:11:00</span>
            <PlayIcon size={14} weight="fill" />
            <span>960 × 540</span>
          </div>
        </div>
        <div
          className={cn(
            "hidden w-44 shrink-0 border-l p-3 text-xs lg:block",
            skin.border,
          )}
        >
          <p className="mb-5 font-medium">Properties</p>
          <p className={cn("mb-2", skin.muted)}>Transform</p>
          <div className="grid grid-cols-2 gap-2">
            {["X 50%", "Y 50%", "Scale 100%", "Angle 0°"].map((label) => (
              <span
                key={label}
                className={cn("rounded border p-1.5", skin.border, skin.raised)}
              >
                {label}
              </span>
            ))}
          </div>
          <p className={cn("mt-5 mb-2", skin.muted)}>Animation</p>
          <div className={cn("rounded border p-2", skin.border)}>
            Enter · Fade
          </div>
          <div className={cn("mt-2 rounded border p-2", skin.border)}>
            Exit · Fade
          </div>
        </div>
      </div>
      <div className={cn("border-t p-3 sm:p-4", skin.border, skin.raised)}>
        <div className={cn("mb-3 flex justify-between text-xs", skin.muted)}>
          <span>Timeline</span>
          <span className="flex w-3/4 justify-between sm:w-4/5">
            {["00:00", "00:03", "00:06", "00:09"].map((time) => (
              <span key={time}>{time}</span>
            ))}
          </span>
        </div>
        <div className="relative space-y-1.5 pl-4 sm:pl-16">
          <div className="ml-4 w-2/5 truncate rounded bg-violet-500/15 px-2 py-1.5 text-xs text-violet-800 [[data-theme=dark]_&]:text-violet-300">
            <TextTIcon size={12} className="mr-1 inline" />
            Find your own pace.
          </div>
          <div className="flex gap-1 text-xs text-indigo-800 [[data-theme=dark]_&]:text-indigo-300">
            <div className="w-1/2 rounded border border-indigo-500/40 bg-indigo-500/15 px-2 py-2">
              <FilmStripIcon size={12} className="mr-1 inline" />
              dusk.mp4
            </div>
            <div className="flex-1 rounded bg-indigo-500/10 px-2 py-2">
              coast.mp4
            </div>
          </div>
          <div className="rounded bg-emerald-500/10 px-2 py-1.5 text-xs text-emerald-800 [[data-theme=dark]_&]:text-emerald-300">
            <WaveformIcon size={12} className="mr-1 inline" />
            ambient.wav
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-[38%] w-px bg-indigo-500" />
        </div>
      </div>
    </div>
  );
}

export function Landing() {
  const [loading, setLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  async function demo() {
    if (loading) return;
    setLoading(true);
    setDemoError(null);
    try {
      await loadDemo();
      location.hash = "/editor";
    } catch {
      setDemoError(
        "The sample couldn’t open. Please try again or open the editor to start a project.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={cn(
        "min-h-dvh [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-4 [&_a]:focus-visible:outline-indigo-500",
        skin.app,
      )}
    >
      <a
        href="#main-content"
        className="sr-only fixed top-4 left-4 z-50 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white focus:not-sr-only"
      >
        Skip to content
      </a>
      <header className={cn("border-b", skin.border)}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-4 px-5 py-4 sm:gap-x-4 sm:px-8 lg:gap-x-8 lg:py-5">
          <a
            href="#/"
            aria-label="Sequence home"
            className="mr-auto flex w-fit items-center gap-2 text-lg font-semibold tracking-tight sm:text-xl"
          >
            <StackSimpleIcon
              size={28}
              weight="fill"
              className="size-6 text-indigo-600 sm:size-7 [[data-theme=dark]_&]:text-indigo-400"
            />
            Sequence
          </a>
          <nav
            id="landing-navigation"
            aria-label="Main navigation"
            className={cn(
              "order-last w-full flex-col gap-4 rounded-xl border p-4 lg:order-none lg:flex lg:w-auto lg:flex-row lg:items-center lg:gap-8 lg:rounded-none lg:border-0 lg:p-0",
              skin.border,
              menuOpen ? "flex" : "hidden",
            )}
            onKeyDown={(event) => {
              if (event.key === "Escape" && menuOpen) {
                setMenuOpen(false);
                document.getElementById("landing-menu-toggle")?.focus();
              }
            }}
          >
            <div className="flex flex-col gap-1 text-sm font-medium text-zinc-600 lg:flex-row lg:gap-8 [[data-theme=dark]_&]:text-zinc-400">
              {[
                ["#features", "Features"],
                ["#ai-editing", "AI editing"],
                ["#privacy", "Privacy"],
                [`${import.meta.env.BASE_URL}docs/mcp/`, "Docs"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex min-h-11 items-center transition-colors hover:text-indigo-600 [[data-theme=dark]_&]:hover:text-indigo-300"
                >
                  {label}
                </a>
              ))}
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className={cn("text-sm lg:hidden", skin.muted)}>
                Appearance
              </span>
              <ThemePicker className="h-11" />
            </div>
          </nav>
          <a href="#/editor" className={cn(landingAction(), "px-3 sm:px-5")}>
            Open editor{" "}
            <ArrowRightIcon
              size={16}
              className="hidden sm:block"
              aria-hidden="true"
            />
          </a>
          <button
            id="landing-menu-toggle"
            type="button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="landing-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
            className={cn(landingAction("secondary"), "w-11 px-0 lg:hidden")}
          >
            {menuOpen ? (
              <XIcon size={20} aria-hidden="true" />
            ) : (
              <ListIcon size={20} aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-6xl px-5 outline-none sm:px-8"
      >
        <section
          aria-labelledby="hero-heading"
          className="pt-14 pb-10 text-center md:pt-20 md:pb-12"
        >
          <p
            className={cn(
              "mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/15 bg-indigo-500/5 px-4 py-1.5",
              landing.eyebrow,
            )}
          >
            <span
              className="size-1.5 rounded-full bg-indigo-500"
              aria-hidden="true"
            />
            Local video editing. AI ready.
          </p>
          <h1
            id="hero-heading"
            className="text-[2.75rem] leading-[1.08] font-semibold tracking-[-0.045em] text-balance sm:text-6xl lg:text-7xl"
          >
            Make room for
            <br />
            <span className="text-indigo-600 [[data-theme=dark]_&]:text-indigo-400">
              your next story.
            </span>
          </h1>
          <p className={cn("mx-auto mt-6 max-w-2xl text-pretty", landing.body)}>
            A focused video editor, right in your browser. Shape your story by
            hand or with your AI agent, and render it on your own device.
          </p>
          <div className="mx-auto mt-8 flex max-w-sm flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center">
            <a href="#/editor" className={landingAction()}>
              Open editor <ArrowRightIcon size={18} aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={() => void demo()}
              disabled={loading}
              aria-busy={loading}
              className={landingAction("secondary")}
            >
              <PlayIcon size={16} weight="fill" aria-hidden="true" />
              {loading ? "Opening sample…" : "Try sample project"}
            </button>
          </div>
          {demoError && (
            <p
              role="alert"
              className="mx-auto mt-4 max-w-lg text-sm text-red-700 [[data-theme=dark]_&]:text-red-300"
            >
              {demoError}
            </p>
          )}
          <ul
            aria-label="Getting started"
            className={cn(
              "mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2",
              landing.note,
            )}
          >
            {["No sign-up", "No media uploads", "Free & open source"].map(
              (text) => (
                <li key={text} className="flex items-center gap-1.5">
                  <CheckCircleIcon size={16} aria-hidden="true" />
                  {text}
                </li>
              ),
            )}
          </ul>
        </section>

        <figure aria-label="Sequence editor preview">
          <ProductPreview />
          <figcaption className={cn("mt-4 text-center", landing.note)}>
            Your footage, titles, and audio. Together on one timeline.
          </figcaption>
        </figure>

        <section
          id="features"
          aria-labelledby="features-heading"
          className={cn(landing.section, "border-b", skin.border)}
        >
          <div className="max-w-2xl">
            <p className={landing.eyebrow}>The editor</p>
            <h2 id="features-heading" className={cn("mt-3", landing.heading)}>
              Everything your story needs.
            </h2>
            <p className={cn("mt-4", landing.body)}>
              A clear timeline, precise controls, and space to focus on the
              edit.
            </p>
          </div>
          <div className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
            {[
              {
                Icon: FilmStripIcon,
                title: "Every layer, in its place.",
                text: "Arrange footage, music, titles, and shapes on a multitrack timeline. Snap, split, and trim with precision.",
              },
              {
                Icon: LightningIcon,
                title: "Keep your ideas moving.",
                text: "Preview your composition as you work, with browser-native decoding and GPU compositing.",
              },
              {
                Icon: LockKeyIcon,
                title: "Your media stays local.",
                text: "Import from disk and render on your device. Your source files stay on your computer.",
              },
            ].map(({ Icon, title, text }) => (
              <div key={title}>
                <div className="flex size-14 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 [[data-theme=dark]_&]:text-indigo-300">
                  <Icon size={30} weight="regular" aria-hidden="true" />
                </div>
                <h3 className={cn("mt-5", landing.title)}>{title}</h3>
                <p className={cn("mt-3", landing.body)}>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <AiEditingSection />

        <section
          id="workflow"
          aria-labelledby="workflow-heading"
          className={cn(
            landing.section,
            "grid gap-10 border-b md:grid-cols-2 md:gap-16",
            skin.border,
          )}
        >
          <div>
            <p className={landing.eyebrow}>How it works</p>
            <h2 id="workflow-heading" className={cn("mt-3", landing.heading)}>
              From first clip to final cut.
            </h2>
            <p className={cn("mt-4 max-w-md", landing.body)}>
              Bring an idea. Leave with a finished video. Your whole workflow
              lives in one workspace.
            </p>
          </div>
          <ol className="space-y-8">
            {[
              {
                title: "Import your media",
                text: "Drop in videos, audio, images, and GIFs. Start arranging them on the timeline.",
              },
              {
                title: "Make it your own",
                text: "Layer text and shapes, add motion and transitions, and find the right soundtrack.",
              },
              {
                title: "Export your story",
                text: "Choose your settings, render on your device, and download the finished video.",
              },
            ].map(({ title, text }, index) => (
              <li key={title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-sm font-semibold text-indigo-600 [[data-theme=dark]_&]:text-indigo-300"
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className={landing.title}>{title}</h3>
                  <p className={cn("mt-2", landing.body)}>{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="privacy"
          aria-labelledby="privacy-heading"
          className={cn(
            landing.section,
            "grid gap-10 md:grid-cols-2 md:gap-16",
          )}
        >
          <div>
            <p className={landing.eyebrow}>Local by design</p>
            <h2 id="privacy-heading" className={cn("mt-3", landing.heading)}>
              Your files. Your workspace.
            </h2>
            <p className={cn("mt-4 max-w-md", landing.body)}>
              Editing shouldn’t start with an upload. Sequence previews and
              renders your media in your browser.
            </p>
          </div>
          <div className="space-y-6">
            <div>
              <h3 className={landing.title}>Your media stays on your device</h3>
              <p className={cn("mt-2", landing.body)}>
                Import directly from disk, work locally, and export without
                sending your source files to a rendering service.
              </p>
            </div>
            <div>
              <h3 className={landing.title}>You choose your AI connection</h3>
              <p className={cn("mt-2", landing.body)}>
                AI editing is optional. When connected, your AI client receives
                project data and any preview images it requests.
              </p>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="start-heading"
          className={cn(
            "mb-16 rounded-2xl border px-6 py-10 text-center md:mb-24 md:px-12 md:py-14",
            skin.border,
            skin.panel,
          )}
        >
          <h2 id="start-heading" className={landing.heading}>
            The next frame is yours.
          </h2>
          <p className={cn("mx-auto mt-4 max-w-lg", landing.body)}>
            Open a workspace and start putting your story together.
          </p>
          <a href="#/editor" className={cn("mt-6", landingAction())}>
            Open editor <ArrowRightIcon size={18} aria-hidden="true" />
          </a>
          <p className={cn("mx-auto mt-5 max-w-xl", landing.note)}>
            Best in desktop Chrome or Edge. Export formats depend on your
            browser. SDR editing and export; convert HDR media before importing.
          </p>
        </section>
      </main>

      <footer className={cn("border-t", skin.border)}>
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <a
            href="#/"
            className="flex w-fit items-center gap-2 text-sm font-semibold"
          >
            <StackSimpleIcon size={20} weight="fill" aria-hidden="true" />
            Sequence
          </a>
          <p className={landing.note}>Made for making. Locally.</p>
          <nav
            aria-label="Footer navigation"
            className={cn("flex gap-6", landing.note)}
          >
            <a
              href={AI_SETUP_URL}
              className="inline-flex items-center gap-1.5 hover:text-indigo-600 [[data-theme=dark]_&]:hover:text-indigo-300"
            >
              Documentation <ArrowUpRightIcon size={14} aria-hidden="true" />
            </a>
            <a
              href="https://github.com/alamkanak/sequence"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-indigo-600 [[data-theme=dark]_&]:hover:text-indigo-300"
            >
              GitHub <ArrowUpRightIcon size={14} aria-hidden="true" />
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
