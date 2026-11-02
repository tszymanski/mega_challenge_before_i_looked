// Plan morning-digest § 1 (#1). Contract every part of § 2 builds against; the reader is #2.

/** A run-log line's status. */
export type RunStatus = 'ok' | 'retry' | 'fail';

/** One parsed line of runs/<night>.jsonl. */
export type RunLine = {
  at: string; // ISO 8601 with the log's own offset; never converted to UTC for display
  job: string;
  status: RunStatus;
  owner: string | null; // null is kept; views show it as "—"
  error?: string;
};

/** One row per job for a night. */
export type DigestRow = {
  job: string;
  owner: string | null; // owner of the job's last line
  runs: number; // lines for this job
  retries: number; // lines with status "retry"
  lastStatus: RunStatus;
  lastError: string | null; // error of the last line that had one
  firstAt: string; // `at` of the first line, as written in the log
  lastAt: string; // `at` of the last line, as written in the log
};

/** What the page (§ 2a), the JSON (§ 2b) and the board (§ 2c) all read. */
export type Night = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[]; // sorted by job; the page and the JSON keep this order
  counts: Record<RunStatus, number>; // lines per status, for the board link
  badLines: number; // lines that did not parse: counted, never thrown
};

/**
 * Reads runs/<night>.jsonl.
 * - Returns null when there is no file for that night, or `night` is not YYYY-MM-DD (no path tricks).
 * - An empty file gives a Night with no rows ("nothing ran").
 * - Never throws on bad lines.
 */
export type ReadNight = (runsDir: string, night: string) => Night | null;
