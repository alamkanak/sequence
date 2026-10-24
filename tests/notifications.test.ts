import { beforeEach, describe, expect, it } from "vitest";
import { notifications } from "../src/core/notifications";
beforeEach(() =>
  notifications.get().forEach((item) => notifications.dismiss(item.id)),
);
describe("reusable notifications", () => {
  it("deduplicates repeated errors and keeps important errors until dismissed", () => {
    const id = notifications.show("Storage unavailable", { tone: "error" });
    expect(notifications.show("Storage unavailable", { tone: "error" })).toBe(
      id,
    );
    expect(notifications.get()).toHaveLength(1);
    expect(notifications.get()[0].duration).toBe(0);
    notifications.dismiss(id);
    expect(notifications.get()).toEqual([]);
  });
  it("replaces a connection notice as status changes and bounds the visible stack", () => {
    notifications.show("Connected", { id: "mcp", tone: "success" });
    notifications.show("Disconnected", { id: "mcp", tone: "warning" });
    expect(notifications.get().map((item) => item.message)).toEqual([
      "Disconnected",
    ]);
    for (let index = 0; index < 8; index++)
      notifications.show(`Message ${index}`);
    expect(notifications.get()).toHaveLength(5);
  });
});
