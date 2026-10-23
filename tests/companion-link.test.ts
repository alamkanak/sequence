import { describe, expect, it } from "vitest";
import {
  parseCompanionLink,
  withoutCompanionCredentials,
} from "../src/core/companion-link";

const token = "a".repeat(48);
const editor = "https://alamkanak.github.io/sequence/";
const link = (bridge: string, secret = token) =>
  `${editor}#/editor?${new URLSearchParams({ bridge, token: secret })}`;

describe("MCP pairing links", () => {
  it("pairs a hosted editor with only an explicit loopback endpoint", () => {
    expect(parseCompanionLink(link("ws://127.0.0.1:4174/bridge"))).toEqual({
      endpoint: "ws://127.0.0.1:4174/bridge",
      token,
    });
    expect(parseCompanionLink(`${editor}#/editor`)).toBeNull();
  });

  it.each([
    "ws://attacker.example:4174/bridge",
    "ws://127.0.0.1.attacker.example:4174/bridge",
    "ws://192.168.1.1:4174/bridge",
    "https://127.0.0.1:4174/bridge",
    "ws://127.0.0.1:4174/other",
    "ws://127.0.0.1:0/bridge",
    "ws://127.0.0.1:4174/bridge?token=other",
    "ws://user:password@127.0.0.1:4174/bridge",
    "ws://127.0.0.1:4174/bridge#secret",
  ])("rejects an unsafe endpoint: %s", (endpoint) => {
    expect(() => parseCompanionLink(link(endpoint))).toThrow();
  });

  it("rejects partial pairing links and malformed tokens", () => {
    expect(() =>
      parseCompanionLink(link("ws://127.0.0.1:4174/bridge", "bad")),
    ).toThrow();
    expect(() =>
      parseCompanionLink(`${editor}#/editor?token=${token}`),
    ).toThrow();
    expect(() =>
      parseCompanionLink(`${editor}#/editor?bridge=ws://127.0.0.1:4174/bridge`),
    ).toThrow();
  });

  it("retains legacy local links", () => {
    expect(
      parseCompanionLink(`http://127.0.0.1:4174/#/editor?token=${token}`)
        ?.endpoint,
    ).toBe("ws://127.0.0.1:4174/bridge");
  });

  it("removes credentials while preserving unrelated route settings", () => {
    expect(
      withoutCompanionCredentials(link("ws://127.0.0.1:4174/bridge")),
    ).toBe(`${editor}#/editor`);
    expect(
      withoutCompanionCredentials(
        `${link("ws://127.0.0.1:4174/bridge")}&tab=media`,
      ),
    ).toBe(`${editor}#/editor?tab=media`);
  });
});
