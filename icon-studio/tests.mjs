import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

// Exercise the independent browser modules without a framework or dependencies.
const window = {};
const sandbox = { window, Blob, TextEncoder, Uint8Array, Uint32Array, DataView };
for (const file of ["icons.js", "export.js"]) runInNewContext(readFileSync(new URL(file, import.meta.url), "utf8"), sandbox, { filename: file });
const studio = window.SequenceStudio;
const exports = window.SequenceStudioExport;

test("all ten concepts produce distinct, self-contained vector marks", () => {
  assert.equal(studio.concepts.length, 10);
  const marks = studio.concepts.map((concept) => studio.svg({ ...studio.defaults, concept: concept.id }));
  assert.equal(new Set(marks).size, 10);
  for (const mark of marks) {
    assert.match(mark, /viewBox="0 0 64 64"/);
    assert.doesNotMatch(mark, /<image|<script|<foreignObject|href=|url\(/);
  }
});

test("recipes reject untrusted geometry and color strings before SVG construction", () => {
  for (const patch of [{ bg: '<script>' }, { concept: '__proto__' }, { version: 2 }, { scale: 113 }, { radius: -1 }, { scale: 80.5 }, { twoTone: 'false' }]) {
    assert.throws(() => studio.normalize({ ...studio.defaults, ...patch }));
  }
  const normalized = studio.normalize({ ...studio.defaults, fg: '#ff00aa', arbitrary: 'ignored' });
  assert.equal(normalized.fg, '#FF00AA');
  assert.equal(normalized.arbitrary, undefined);
});

test("maskable export caps symbol scale and fills the tile without rounded corners", () => {
  const mark = studio.svg({ ...studio.defaults, scale: 112, transparent: true }, { maskable: true, transparent: false });
  assert.match(mark, /scale\(0\.75\)/);
  assert.match(mark, /rx="0"/);
});

test("ZIP has valid local / central offsets, UTF-8 names, lengths, and known CRC32", async () => {
  const data = Buffer.from(await (await exports.zip([{ path: 'public/é.txt', data: '123456789' }, { path: 'empty.txt', data: '' }])).arrayBuffer());
  assert.equal(data.readUInt32LE(0), 0x04034b50);
  assert.equal(data.readUInt16LE(6), 0x0800);
  assert.equal(data.readUInt32LE(14), 0xcbf43926); // Published CRC32 check vector.
  const firstNameLength = data.readUInt16LE(26);
  assert.equal(data.subarray(30, 30 + firstNameLength).toString(), 'public/é.txt');
  assert.equal(data.subarray(30 + firstNameLength, 39 + firstNameLength).toString(), '123456789');
  const end = data.length - 22;
  assert.equal(data.readUInt32LE(end), 0x06054b50);
  assert.equal(data.readUInt16LE(end + 10), 2);
  const directory = data.readUInt32LE(end + 16);
  assert.equal(data.readUInt32LE(directory), 0x02014b50);
  assert.equal(data.readUInt32LE(directory + 42), 0);
  assert.equal(data.readUInt32LE(directory + 16), 0xcbf43926);
  const second = directory + 46 + firstNameLength;
  assert.equal(data.readUInt32LE(second), 0x02014b50);
  assert.equal(data.readUInt32LE(second + 42), 30 + firstNameLength + 9);
  assert.equal(data.readUInt32LE(second + 16), 0);
  assert.equal(data.readUInt32LE(end + 12), end - directory);
});

test("ICO directory sizes and offsets point to the original image payloads", async () => {
  const images = [16, 32, 48].map(size => ({ size, bytes: Uint8Array.from([137, 80, 78, 71, size]) }));
  const data = Buffer.from(await exports.ico(images).arrayBuffer());
  assert.equal(data.readUInt16LE(2), 1);
  assert.equal(data.readUInt16LE(4), 3);
  images.forEach(({ size, bytes }, index) => {
    const entry = 6 + index * 16;
    assert.equal(data[entry], size);
    assert.equal(data[entry + 1], size);
    assert.equal(data.readUInt16LE(entry + 6), 32);
    const offset = data.readUInt32LE(entry + 12);
    const length = data.readUInt32LE(entry + 8);
    assert.deepEqual(data.subarray(offset, offset + length), Buffer.from(bytes));
  });
});
