const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });
/** Wrap at natural glyph widths. Never compress glyphs to fit a text box. */
export function wrapText(
  text: string,
  width: number,
  measure: (text: string) => number,
) {
  const result: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    const words = paragraph.trim().split(/\s+/);
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= width) {
        line = candidate;
        continue;
      }
      if (line) {
        result.push(line);
        line = "";
      }
      for (const { segment } of graphemes.segment(word)) {
        if (line && measure(line + segment) > width) {
          result.push(line);
          line = "";
        }
        line += segment;
      }
    }
    result.push(line);
  }
  return result;
}
