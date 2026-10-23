import { useState } from "react";
import {
  StackSimpleIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  PlayIcon,
  LockKeyIcon,
  LightningIcon,
  CommandIcon,
  FilmStripIcon,
  WaveformIcon,
  TextTIcon,
  PlusIcon,
} from "./icons";
import { loadDemo } from "../core/actions";
import { store } from "../core/store";
import { Button, ThemePicker, cn, skin } from "./ui";
const asset = (name: string) => `${import.meta.env.BASE_URL}demo/${name}`;
function ProductPreview() {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border shadow-2xl shadow-black/15",
        skin.border,
        skin.panel,
      )}
    >
      <div
        className={cn(
          "flex h-11 items-center justify-between border-b px-4",
          skin.border,
        )}
      >
        <div className="flex items-center gap-3 text-xs">
          <StackSimpleIcon size={15} weight="fill" />
          <span className="font-medium">Sequence</span>
          <span className={cn("ml-4 hidden sm:block", skin.muted)}>
            A quieter kind of motion
          </span>
        </div>
        <span className="rounded-md bg-indigo-500/15 px-2.5 py-1 text-xs text-indigo-400">
          Export <ArrowUpRightIcon className="ml-1 inline" size={10} />
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
            <PlusIcon className="mr-1 inline" size={11} />
            Import media
          </div>
          {["dusk", "coast"].map((n) => (
            <div key={n} className="mb-3">
              <img
                src={asset(n + ".jpg")}
                alt="Original demo landscape"
                className="aspect-video w-full rounded-md object-cover"
              />
              <p className={cn("mt-1 text-xs", skin.muted)}>{n}.mp4</p>
            </div>
          ))}
          <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 p-2 text-xs text-emerald-400">
            <WaveformIcon size={17} />
            ambient.wav
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative aspect-video overflow-hidden bg-zinc-950">
            <img
              src={asset("dusk.jpg")}
              alt="A cinematic sun setting above mountain silhouettes, edited in Sequence"
              className="size-full object-cover"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
              <p className="text-center text-2xl font-medium tracking-tight md:text-4xl">
                Find your own pace.
              </p>
              <p className="text-xs tracking-[0.25em] text-white/60">
                A FILM ABOUT MAKING SPACE
              </p>
            </div>
          </div>
          <div
            className={cn(
              "flex h-10 items-center justify-between px-4 text-xs",
              skin.muted,
            )}
          >
            <span className="font-mono text-indigo-400">
              00:03:12 / 00:11:00
            </span>
            <PlayIcon size={13} weight="fill" />
            <span>960 × 540</span>
          </div>
        </div>
        <div
          className={cn(
            "hidden w-48 shrink-0 border-l p-3 text-xs lg:block",
            skin.border,
          )}
        >
          <p className="mb-5">Properties</p>
          <p className={cn("mb-2", skin.muted)}>Transform</p>
          <div className="grid grid-cols-2 gap-2">
            {["X 50%", "Y 50%", "Scale 100%", "Angle 0°"].map((s) => (
              <span
                key={s}
                className={cn(
                  "rounded border p-1.5 text-xs",
                  skin.border,
                  skin.raised,
                )}
              >
                {s}
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
      <div className={cn("border-t px-4 py-3", skin.border, skin.raised)}>
        <div className={cn("mb-3 flex justify-between text-xs", skin.muted)}>
          <span>Timeline</span>
          <span>00:00　　　 00:03　　　 00:06　　　 00:09</span>
        </div>
        <div className="space-y-1.5">
          <div className="ml-20 w-2/5 rounded bg-violet-500/20 px-2 py-1.5 text-xs text-violet-400">
            <TextTIcon size={9} className="mr-1 inline" />
            Find your own pace.
          </div>
          <div className="ml-16 flex gap-1">
            <div className="w-1/2 rounded border border-indigo-400/40 bg-indigo-500/20 px-2 py-2 text-xs text-indigo-400">
              <FilmStripIcon size={10} className="mr-1 inline" />
              dusk.mp4
            </div>
            <div className="w-5/12 rounded bg-indigo-500/15 px-2 py-2 text-xs text-indigo-400">
              coast.mp4
            </div>
          </div>
          <div className="ml-16 w-11/12 rounded bg-emerald-500/15 px-2 py-1.5 text-xs text-emerald-500">
            <WaveformIcon size={10} className="mr-1 inline" />
            ambient.wav
          </div>
        </div>
      </div>
    </div>
  );
}
export function Landing() {
  const [loading, setLoading] = useState(false);
  const open = () => (location.hash = "/editor");
  async function demo() {
    setLoading(true);
    try {
      await loadDemo();
      open();
    } catch (e) {
      store.patch({ error: String(e) });
      open();
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className={cn("min-h-dvh", skin.app)}>
      <nav className={cn("border-b", skin.border)}>
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-6">
          <a
            href="#/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <StackSimpleIcon size={25} weight="fill" />
            Sequence
          </a>
          <div
            className={cn(
              "hidden items-center gap-7 text-sm md:flex",
              skin.muted,
            )}
          >
            <a className="hover:text-indigo-400" href="#features">
              The editor
            </a>
            <a className="hover:text-indigo-400" href="#privacy">
              Local by design
            </a>
            <a className="hover:text-indigo-400" href="#workflow">
              Your workflow
            </a>
          </div>
          <div className="flex items-center gap-3">
            <ThemePicker />
            <Button textSize="sm" onClick={open} className="rounded-full px-4">
              Open editor <ArrowUpRightIcon size={16} />
            </Button>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-6">
        <section className="pt-20 pb-14 md:pt-28">
          <div
            className={cn(
              "mb-7 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
              skin.border,
              skin.muted,
            )}
          >
            <span className="size-1.5 rounded-full bg-indigo-400" />
            Your device. Your footage. Your space.
          </div>
          <h1 className="max-w-4xl text-5xl leading-[1.07] font-medium tracking-[-0.055em] md:text-7xl lg:text-[82px]">
            Make room for
            <br />
            your next story.
          </h1>
          <p
            className={cn(
              "mt-6 max-w-lg text-base leading-relaxed md:text-lg",
              skin.muted,
            )}
          >
            A focused video editor that lives in your browser.
            <br className="hidden sm:block" />
            From the first cut to the final frame, all on your device.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              textSize="sm"
              variant="primary"
              onClick={open}
              className="px-5 py-3"
            >
              Start creating <ArrowRightIcon size={15} />
            </Button>
            <Button
              textSize="sm"
              variant="ghost"
              onClick={() => void demo()}
              disabled={loading}
              className="px-4 py-3"
            >
              <PlayIcon size={13} weight="fill" />
              {loading ? "Opening sample…" : "Explore a sample project"}
            </Button>
          </div>
          <p className={cn("mt-4 text-xs", skin.muted)}>
            No sign-up. No uploads. Just open and edit.
          </p>
        </section>
        <button
          aria-label="Open sample project"
          onClick={() => void demo()}
          disabled={loading}
          className="block w-full text-left"
        >
          <ProductPreview />
        </button>
        <section
          id="features"
          className={cn(
            "grid gap-10 border-b py-20 md:grid-cols-3",
            skin.border,
          )}
        >
          {[
            {
              Icon: FilmStripIcon,
              title: "Every layer, in its place.",
              text: "Arrange footage, music, titles, and shapes on a precise multitrack timeline. Snap, split, trim, and find the rhythm.",
            },
            {
              Icon: LightningIcon,
              title: "Built to keep you moving.",
              text: "Browser-native decoding and GPU compositing, with a dedicated media worker. A focused interface that stays out of your way.",
            },
            {
              Icon: LockKeyIcon,
              title: "Your work stays yours.",
              text: "Import directly from disk. Preview and render locally. Your media never needs to leave your computer.",
            },
          ].map(({ Icon, title, text }) => (
            <div key={title}>
              <Icon size={23} weight="light" className={skin.muted} />
              <h2 className="mt-5 text-lg font-medium tracking-tight">
                {title}
              </h2>
              <p className={cn("mt-3 text-sm leading-relaxed", skin.muted)}>
                {text}
              </p>
            </div>
          ))}
        </section>
        <section
          id="workflow"
          className={cn(
            "grid gap-12 border-b py-20 md:grid-cols-2",
            skin.border,
          )}
        >
          <div>
            <p
              className={cn(
                "mb-4 text-xs tracking-[0.2em] uppercase",
                skin.muted,
              )}
            >
              Less friction. More making.
            </p>
            <h2 className="text-4xl leading-tight font-medium tracking-[-0.04em]">
              An idea to a finished film.
              <br />
              Without leaving your browser.
            </h2>
          </div>
          <div className="space-y-6">
            {[
              {
                n: "01",
                title: "Bring your world in.",
                text: "Videos, audio, images, and GIFs. Drop them in and start arranging.",
              },
              {
                n: "02",
                title: "Make every frame yours.",
                text: "Compose text and shapes directly in the preview. Add motion, transitions, and music.",
              },
              {
                n: "03",
                title: "Take your story with you.",
                text: "Choose your export settings, render on your device, and download the finished file.",
              },
            ].map((s) => (
              <div key={s.n} className="flex gap-5">
                <span className={cn("pt-1 font-mono text-xs", skin.muted)}>
                  {s.n}
                </span>
                <div>
                  <h3 className="text-sm font-medium">{s.title}</h3>
                  <p className={cn("mt-1 text-xs leading-relaxed", skin.muted)}>
                    {s.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section
          id="privacy"
          className="flex flex-col justify-between gap-8 py-20 md:flex-row md:items-center"
        >
          <div>
            <p
              className={cn(
                "mb-3 text-xs tracking-[0.2em] uppercase",
                skin.muted,
              )}
            >
              A little more focus
            </p>
            <h2 className="text-4xl font-medium tracking-[-0.04em]">
              The next frame is yours.
            </h2>
            <p
              className={cn(
                "mt-4 max-w-lg text-xs leading-relaxed",
                skin.muted,
              )}
            >
              Best experienced in desktop Chrome or Edge. Export formats depend
              on your browser. SDR editing and export; HDR sources require
              explicit conversion.
            </p>
          </div>
          <Button
            textSize="sm"
            onClick={open}
            variant="primary"
            className="self-start px-5 py-3 md:self-auto"
          >
            Open Sequence <ArrowRightIcon size={15} />
          </Button>
        </section>
      </main>
      <footer className={cn("border-t", skin.border)}>
        <div
          className={cn(
            "mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs",
            skin.muted,
          )}
        >
          <span className="flex items-center gap-2">
            <StackSimpleIcon size={16} weight="fill" />
            Sequence
          </span>
          <span>Made for making. Locally.</span>
          <span className="hidden items-center gap-1 sm:flex">
            <CommandIcon size={11} />
            Keyboard friendly
          </span>
        </div>
      </footer>
    </div>
  );
}
