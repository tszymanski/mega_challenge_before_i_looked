import { describe, expect, it } from 'vitest';
import { digestJson } from './api.js';
import { readNight } from './read.js';

describe('digestJson', () => {
  it('returns the Night from readNight as is', () => {
    const r = digestJson('runs', '2026-10-28');
    expect(r.status).toBe(200);
    expect(r.body).toEqual(readNight('runs', '2026-10-28'));
  });
  it('404s with an error for a missing night', () => {
    expect(digestJson('runs', '2020-01-01')).toEqual({ status: 404, body: { error: 'no such night' } });
  });
});
