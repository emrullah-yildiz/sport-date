import { expect, it } from "vitest";
import { connectionLabels, toggleConnection } from "./connection-preferences";

it("adds independent choices and removes only the chosen option", () => {
  const both = toggleConnection(["dating"], "friendship");
  const all = toggleConnection(both, "group");
  expect(all).toEqual(["dating", "friendship", "group"]);
  expect(toggleConnection(all, "friendship")).toEqual(["dating", "group"]);
  expect(toggleConnection(["dating"], "dating")).toEqual([]);
  expect(connectionLabels(all)).toBe("Dating, Friendship, Community");
});
