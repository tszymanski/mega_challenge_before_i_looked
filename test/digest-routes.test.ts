import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

let dir: string;
let app: ReturnType<typeof createApp>;

const line = (job: string, status: string, at: string) =>
  JSON.stringify({ at, job, status, owner: 'ana' });

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  writeFileSync(
    join(dir, '2026-01-02.jsonl'),
    [line('backup', 'ok', '2026-01-02T01:00:00+01:00'), line('sync', 'fail', '2026-01-02T02:00:00+01:00')].join('\n') + '\n',
  );
  writeFileSync(join(dir, '2026-01-03.jsonl'), '');
  writeFileSync(
    join(dir, '2026-01-04.jsonl'),
    [line('backup', 'ok', '2026-01-04T01:00:00+01:00'), 'not json {'].join('\n') + '\n',
  );
  app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: dir });
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('GET /digest/:night', () => {
  it('renders a night with its jobs', async () => {
    const res = await app.request('/digest/2026-01-02');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('backup');
    expect(html).toContain('sync');
  });

  it('404s for a night with no file', async () => {
    expect((await app.request('/digest/2026-02-01')).status).toBe(404);
  });

  it('says "nothing ran" for an empty night', async () => {
    const res = await app.request('/digest/2026-01-03');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('still renders a night with a bad line', async () => {
    const res = await app.request('/digest/2026-01-04');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('backup');
  });
});

describe('GET /api/digest/:night', () => {
  it('returns the Night as is', async () => {
    const res = await app.request('/api/digest/2026-01-02');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ night: '2026-01-02', counts: { ok: 1, retry: 0, fail: 1 }, badLines: 0 });
    expect(body.rows.map((r: { job: string }) => r.job)).toEqual(['backup', 'sync']);
  });

  it('404s with an error body for a night with no file', async () => {
    const res = await app.request('/api/digest/2026-02-01');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no such night' });
  });

  it('returns no rows for an empty night', async () => {
    const res = await app.request('/api/digest/2026-01-03');
    expect(await res.json()).toEqual({ night: '2026-01-03', rows: [], counts: { ok: 0, retry: 0, fail: 0 }, badLines: 0 });
  });

  it('counts a bad line without failing', async () => {
    const body = await (await app.request('/api/digest/2026-01-04')).json();
    expect(body.badLines).toBe(1);
    expect(body.rows).toHaveLength(1);
  });
});
