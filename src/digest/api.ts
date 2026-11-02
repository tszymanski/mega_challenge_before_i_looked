import { readNight } from './read.js';
import type { Night } from './types.js';

export type DigestJson = { status: 200; body: Night } | { status: 404; body: { error: string } };

// The JSON for a night: the Night from readNight as is, so it never disagrees with the page.
export function digestJson(runsDir: string, night: string): DigestJson {
  const found = readNight(runsDir, night);
  if (found === null) return { status: 404, body: { error: 'no such night' } };
  return { status: 200, body: found };
}
