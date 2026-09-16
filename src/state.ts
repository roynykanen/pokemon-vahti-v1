import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export interface StateEntry {
  available: boolean;
  lastSeen: string;
  /** Milloin viimeksi lähetettiin Discord-ilmoitus tästä tuotteesta saatavilla-tilassa. */
  lastNotifiedAt?: string;
}

export type State = Record<string, StateEntry>;

const DEFAULT_STATE_PATH = path.resolve(process.cwd(), "data/state.json");

export async function loadState(statePath = DEFAULT_STATE_PATH): Promise<State> {
  try {
    const raw = await readFile(statePath, "utf-8");
    return JSON.parse(raw) as State;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw err;
  }
}

export async function saveState(state: State, statePath = DEFAULT_STATE_PATH): Promise<void> {
  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(statePath, JSON.stringify(state, null, 2) + "\n", "utf-8");
}
