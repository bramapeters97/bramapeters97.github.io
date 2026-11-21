import { constants, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

/** Initialise only a missing, explicitly selected default working demo database.
 * Existing files are never replaced, even if they contain newer customer edits. */
export function ensureWorkingDemoDatabase(
  workingPath: string,
  seedPath: string,
): "existing" | "copied" | "fresh" {
  if (existsSync(workingPath)) return "existing";
  if (!existsSync(seedPath)) return "fresh";
  mkdirSync(dirname(workingPath), { recursive: true });
  try {
    copyFileSync(seedPath, workingPath, constants.COPYFILE_EXCL);
    return "copied";
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return "existing";
    throw error;
  }
}
