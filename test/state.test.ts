import { describe, it, expect } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadState, saveState } from "../src/state.js";

describe("state", () => {
  it("returns an empty object when the file does not exist", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "pokemon-vahti-"));
    const statePath = path.join(dir, "state.json");
    const state = await loadState(statePath);
    expect(state).toEqual({});
    await rm(dir, { recursive: true, force: true });
  });

  it("round-trips saved state", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "pokemon-vahti-"));
    const statePath = path.join(dir, "state.json");
    const state = { "shop:url": { available: true, lastSeen: "2026-01-01T00:00:00.000Z" } };
    await saveState(state, statePath);
    const loaded = await loadState(statePath);
    expect(loaded).toEqual(state);
    await rm(dir, { recursive: true, force: true });
  });
});
