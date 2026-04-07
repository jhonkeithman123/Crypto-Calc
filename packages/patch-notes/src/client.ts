export type PatchNotesVersion = "v1.2.0";

export interface PatchNotesSummary {
  version: PatchNotesVersion;
  date: string;
  highlights: string[];
}

export const latestPatchNotesSummary: PatchNotesSummary = {
  version: "v1.2.0",
  date: "2026-04-07",
  highlights: [
    "Fixed mobile error handling, logic edge cases, and UI stability issues.",
    "Added full Base Converter flow with step-by-step breakdown.",
    "Added mobile About panel with creator links and update checks.",
    "Rolled out shared galaxy visual elements across mobile and web.",
    "Added web /convert and /about pages for feature parity.",
  ],
};
