import type { Clip } from "../core/model";
import {
  gainToDb,
  dbToGain,
  formatDb,
  putVolumePoint,
  setClipVolume,
  sourceTime,
  volumeAt,
  normalizeVolumePoints,
} from "../core/audio-envelope";
import { transport } from "../engine/transport";
import { NumberField } from "./NumberField";
import { Button, IconButton, cn, skin } from "./ui";
import { DiamondIcon, TrashIcon } from "./icons";

export function VolumeControls({
  clip,
  onChange,
}: {
  clip: Clip;
  onChange: (patch: Partial<Clip>) => void;
}) {
  const points = clip.volumeKeyframes.filter(
    (k) =>
      k.time >= clip.in - 1e-7 &&
      k.time <= sourceTime(clip, clip.duration) + 1e-7,
  );
  return (
    <>
      <NumberField
        label="Volume (%)"
        value={clip.volume * 100}
        min={0}
        max={400}
        onChange={(value) => onChange(setClipVolume(clip, value / 100))}
      />
      <Button
        className="w-full"
        onClick={() => {
          const local = Math.max(
            0,
            Math.min(clip.duration, transport.time - clip.start),
          );
          onChange({
            volumeKeyframes: putVolumePoint(
              clip,
              local,
              volumeAt(clip, sourceTime(clip, local)),
            ),
          });
        }}
      >
        <DiamondIcon size={16} /> Add volume point at playhead
      </Button>
      <p className={cn("text-xs leading-relaxed", skin.muted)}>
        Option/Alt-click the timeline volume line to add a point; drag points to
        shape the level. Press R and drag across audio to lower a range.
      </p>
      {points.length > 0 && (
        <div
          className="max-h-72 space-y-3 overflow-y-auto"
          aria-label="Volume keyframes"
        >
          {points.map((point, i) => (
            <div
              key={point.time}
              className={cn("space-y-2 rounded-lg border p-2", skin.border)}
            >
              <div className="flex items-center justify-between text-xs">
                <button
                  className="text-indigo-500"
                  onClick={() =>
                    transport.seek(
                      clip.start + (point.time - clip.in) / clip.speed,
                    )
                  }
                >
                  Point {i + 1} · {formatDb(point.value)}
                </button>
                <IconButton
                  size="sm"
                  label={`Remove volume point ${i + 1}`}
                  onClick={() =>
                    onChange({
                      volumeKeyframes: clip.volumeKeyframes.filter(
                        (k) => k.time !== point.time,
                      ),
                    })
                  }
                >
                  <TrashIcon size={16} />
                </IconButton>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="Time (s)"
                  ariaLabel={`Volume point ${i + 1} time (s)`}
                  value={(point.time - clip.in) / clip.speed}
                  min={0}
                  max={clip.duration}
                  step={0.01}
                  onChange={(local) =>
                    onChange({
                      volumeKeyframes: normalizeVolumePoints([
                        ...clip.volumeKeyframes.filter(
                          (k) => k.time !== point.time,
                        ),
                        { ...point, time: sourceTime(clip, local) },
                      ]),
                    })
                  }
                />
                <NumberField
                  label="Level (dB)"
                  ariaLabel={`Volume point ${i + 1} level (dB)`}
                  value={Math.max(-60, gainToDb(point.value))}
                  min={-60}
                  max={12}
                  step={0.5}
                  onChange={(db) =>
                    onChange({
                      volumeKeyframes: clip.volumeKeyframes.map((k) =>
                        k.time === point.time
                          ? { ...k, value: dbToGain(db) }
                          : k,
                      ),
                    })
                  }
                />
              </div>
            </div>
          ))}
          <Button
            variant="ghost"
            onClick={() => onChange({ volumeKeyframes: [] })}
          >
            Clear volume automation
          </Button>
        </div>
      )}
    </>
  );
}
