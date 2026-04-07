import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
export {
  latestPatchNotesSummary,
  type PatchNotesSummary,
  type PatchNotesVersion,
} from "./client";

type PatchNotesVersion = "v1.2.0";

export interface VersionNotes {
  patchNotes: string;
  nextUpdate: string;
}

export const availableVersions: PatchNotesVersion[] = ["v1.2.0"];

export const latestVersion: PatchNotesVersion = "v1.2.0";

export const notesIndex: Record<PatchNotesVersion, VersionNotes> = {
  "v1.2.0": {
    patchNotes: "versions/v1.2.0/PATCH_NOTES.md",
    nextUpdate: "versions/v1.2.0/NEXT_UPDATE.md",
  },
};

function packageRoot(): string {
  const thisFile = fileURLToPath(import.meta.url);
  // dist/index.js -> package root
  return path.resolve(path.dirname(thisFile), "..");
}

function resolveVersionFile(
  version: PatchNotesVersion,
  kind: keyof VersionNotes,
): string {
  const relPath = notesIndex[version][kind];
  return path.resolve(packageRoot(), relPath);
}

export async function readPatchNotes(
  version: PatchNotesVersion,
): Promise<string> {
  const target = resolveVersionFile(version, "patchNotes");
  return readFile(target, "utf8");
}

export async function readNextUpdate(
  version: PatchNotesVersion,
): Promise<string> {
  const target = resolveVersionFile(version, "nextUpdate");
  return readFile(target, "utf8");
}

export async function readLatestPatchNotes(): Promise<string> {
  return readPatchNotes(latestVersion);
}

export async function readLatestNextUpdate(): Promise<string> {
  return readNextUpdate(latestVersion);
}
