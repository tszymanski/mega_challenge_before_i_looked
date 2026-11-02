import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { isNight, parseLine, readNight } from '../src/digest/read.js';

describe('readNight on runs/ (read-only)', () => {
  const night = readNight('runs', '2026-10-28');

  it('reads 2026-10-28: 5 jobs, 1 bad line', () => {
    expect(night).not.toBeNull();
    expect(night!.night).toBe('2026-10-28');
    expect(night!.rows).toHaveLength(5);
    expect(night!.badLines).toBe(1);
    expect(night!.counts).toEqual({ ok: 10, retry: 4, fail: 1 });
  });

  it('sorts rows by job', () => {
    expect(night!.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('folds lines into one row per job', () => {
    const fixtures = night!.rows.find((r) => r.job === 'fixtures/refresh');
    expect(fixtures).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    const sync = night!.rows.find((r) => r.job === 'lane/sync');
    expect(sync).toMatchObject({ runs: 8, retries: 1, lastStatus: 'ok', lastError: 'lock held' });
    expect(sync!.firstAt).toBe('2026-10-28T23:00:06+01:00');
    expect(sync!.lastAt).toBe('2026-10-29T05:00:04+01:00');
    expect(night!.rows.find((r) => r.job === 'notes/backup')).toMatchObject({
      lastStatus: 'fail',
      lastError: 'quota exceeded',
    });
  });

  it('keeps a row whose owner is null', () => {
    const render = night!.rows.find((r) => r.job === 'digest/render');
    expect(render).toMatchObject({ owner: null, runs: 1, lastStatus: 'ok', lastError: null });
  });

  it('reads 2026-10-27', () => {
    const other = readNight('runs', '2026-10-27');
    expect(other).not.toBeNull();
    expect(other!.badLines).toBe(0);
  });
});

describe('readNight edges', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('returns null for a night with no file', () => {
    expect(readNight('runs', '2026-01-01')).toBeNull();
  });

  it('returns null for a night that is not YYYY-MM-DD', () => {
    for (const bad of ['../runs/2026-10-28', '2026-10-28/', '2026-1-28', '2026-13-01', '2026-02-30', '', 'latest']) {
      expect(readNight('runs', bad)).toBeNull();
    }
  });

  it('gives an empty night for an empty file', () => {
    writeFileSync(join(dir, '2026-11-01.jsonl'), '');
    expect(readNight(dir, '2026-11-01')).toEqual({
      night: '2026-11-01',
      rows: [],
      counts: { ok: 0, retry: 0, fail: 0 },
      badLines: 0,
    });
  });

  it('counts wrong-shaped lines as bad and skips blank ones', () => {
    const lines = [
      '{"at":"2026-11-02T01:00:00+01:00","job":"a","status":"ok","owner":"rook"}',
      '',
      '{"at":"2026-11-02T01:00:00+01:00","status":"ok","owner":"rook"}',
      '{"at":"2026-11-02T01:00:00+01:00","job":"a","status":"done","owner":"rook"}',
      '{"at":"2026-11-02T01:00:00+01:00","job":"a","status":"ok"}',
      '{"at":"2026-11-02T01:00:00+01:00","job":"a","status":"ok","owner":null,"error":5}',
      '[1,2]',
      'null',
      'not json',
      '{"at":"2026-11-02T02:00:00+01:00","job":"a","status":"fail","owner":null,"error":"boom"}',
    ];
    writeFileSync(join(dir, '2026-11-02.jsonl'), lines.join('\r\n') + '\r\n');
    const night = readNight(dir, '2026-11-02');
    expect(night!.badLines).toBe(7);
    expect(night!.counts).toEqual({ ok: 1, retry: 0, fail: 1 });
    expect(night!.rows).toEqual([
      {
        job: 'a',
        owner: null,
        runs: 2,
        retries: 0,
        lastStatus: 'fail',
        lastError: 'boom',
        firstAt: '2026-11-02T01:00:00+01:00',
        lastAt: '2026-11-02T02:00:00+01:00',
      },
    ]);
  });

  it('returns null when the night path is a directory', () => {
    mkdirSync(join(dir, '2026-11-03.jsonl'));
    expect(readNight(dir, '2026-11-03')).toBeNull();
  });
});

describe('isNight / parseLine', () => {
  it('accepts real dates only', () => {
    expect(isNight('2026-10-28')).toBe(true);
    expect(isNight('2024-02-29')).toBe(true);
    expect(isNight('2026-02-29')).toBe(false);
  });

  it('keeps error only when present', () => {
    expect(parseLine('{"at":"t","job":"j","status":"retry","owner":"o"}')).toEqual({
      at: 't',
      job: 'j',
      status: 'retry',
      owner: 'o',
    });
  });
});
