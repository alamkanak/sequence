import { useState } from "react";
import type { Clip } from "../core/model";
import type { AudioRange } from "./timeline-audio";
import { dbToGain, duckVolumeRange } from "../core/audio-envelope";
import { NumberField } from "./NumberField";
import { Button, Modal, cn, skin } from "./ui";
export function AudioRangeDialog({
  clip,
  range,
  onClose,
  onApply,
}: {
  clip: Clip;
  range: AudioRange;
  onClose: () => void;
  onApply: (points: Clip["volumeKeyframes"]) => void;
}) {
  const [level, setLevel] = useState(-12),
    [ramp, setRamp] = useState(0.15);
  const [start, setStart] = useState(range.start),
    [end, setEnd] = useState(range.end);
  return (
    <Modal title="Lower audio range" onClose={onClose}>
      <p className={cn("text-xs leading-relaxed", skin.muted)}>
        Set the level for this section. Four volume points keep the surrounding
        audio unchanged and create smooth entry and exit ramps.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <NumberField
          label="Range start (s)"
          value={start}
          onChange={setStart}
          min={0}
          max={clip.duration}
          step={0.01}
        />
        <NumberField
          label="Range end (s)"
          value={end}
          onChange={setEnd}
          min={0}
          max={clip.duration}
          step={0.01}
        />
        <NumberField
          label="Range level (dB)"
          value={level}
          onChange={setLevel}
          min={-60}
          max={12}
          step={0.5}
        />
        <NumberField
          label="Ramp duration (s)"
          value={ramp}
          onChange={setRamp}
          min={0.001}
          max={Math.abs(end - start) / 2}
          step={0.05}
        />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={end <= start}
          onClick={() =>
            onApply(duckVolumeRange(clip, start, end, dbToGain(level), ramp))
          }
        >
          Apply volume change
        </Button>
      </div>
    </Modal>
  );
}
