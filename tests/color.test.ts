import { describe, expect, it } from "vitest";
import { hexToHsv, hsvToHex, rgbToHex } from "../src/core/color";

describe("color picker conversion", () => {
  it("preserves RGB bytes through HSV, including grayscale and hue boundaries", () => {
    for (let red = 0; red <= 255; red += 17)
      for (let green = 0; green <= 255; green += 17)
        for (let blue = 0; blue <= 255; blue += 17) {
          const hex = rgbToHex([red, green, blue]);
          expect(hsvToHex(hexToHsv(hex))).toBe(hex);
        }
  });
  it("wraps the hue slider endpoint and clamps RGB channels", () => {
    expect(hsvToHex({ h: 360, s: 1, v: 1 })).toBe("#ff0000");
    expect(rgbToHex([-4, 128.7, 300])).toBe("#0081ff");
  });
});
