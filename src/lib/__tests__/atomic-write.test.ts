import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  ensureDirSync,
  atomicWriteJson,
  atomicWriteSync,
  atomicWriteFileSync,
  atomicWriteJsonSync,
  safeReadJson,
} from '../atomic-write.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'atomic-write-test-'));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// ── ensureDirSync ──────────────────────────────────────────────────────────

describe('ensureDirSync', () => {
  it('creates a new directory', () => {
    const dir = join(tmpDir, 'new-dir');
    expect(existsSync(dir)).toBe(false);
    ensureDirSync(dir);
    expect(existsSync(dir)).toBe(true);
  });

  it('creates nested directories', () => {
    const dir = join(tmpDir, 'a', 'b', 'c');
    ensureDirSync(dir);
    expect(existsSync(dir)).toBe(true);
  });

  it('is a no-op if directory already exists', () => {
    ensureDirSync(tmpDir); // already exists
    expect(existsSync(tmpDir)).toBe(true);
  });

  it('does not throw if called twice on the same path', () => {
    const dir = join(tmpDir, 'idempotent');
    ensureDirSync(dir);
    expect(() => ensureDirSync(dir)).not.toThrow();
  });
});

// ── atomicWriteJson (async) ────────────────────────────────────────────────

describe('atomicWriteJson', () => {
  it('writes JSON to file', async () => {
    const filePath = join(tmpDir, 'data.json');
    await atomicWriteJson(filePath, { key: 'value', num: 42 });
    const content = readFileSync(filePath, 'utf-8');
    expect(JSON.parse(content)).toEqual({ key: 'value', num: 42 });
  });

  it('overwrites existing file', async () => {
    const filePath = join(tmpDir, 'overwrite.json');
    await atomicWriteJson(filePath, { first: true });
    await atomicWriteJson(filePath, { second: true });
    const content = readFileSync(filePath, 'utf-8');
    expect(JSON.parse(content)).toEqual({ second: true });
  });

  it('creates parent directories if needed', async () => {
    const filePath = join(tmpDir, 'nested', 'deep', 'file.json');
    await atomicWriteJson(filePath, { ok: true });
    expect(existsSync(filePath)).toBe(true);
  });

  it('writes null', async () => {
    const filePath = join(tmpDir, 'null.json');
    await atomicWriteJson(filePath, null);
    const content = readFileSync(filePath, 'utf-8');
    expect(JSON.parse(content)).toBeNull();
  });

  it('writes arrays', async () => {
    const filePath = join(tmpDir, 'array.json');
    await atomicWriteJson(filePath, [1, 2, 3]);
    const content = readFileSync(filePath, 'utf-8');
    expect(JSON.parse(content)).toEqual([1, 2, 3]);
  });

  it('produces pretty-printed JSON', async () => {
    const filePath = join(tmpDir, 'pretty.json');
    await atomicWriteJson(filePath, { a: 1 });
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('\n');
  });
});

// ── atomicWriteSync ────────────────────────────────────────────────────────

describe('atomicWriteSync', () => {
  it('writes string content to file', () => {
    const filePath = join(tmpDir, 'sync.txt');
    atomicWriteSync(filePath, 'hello world');
    expect(readFileSync(filePath, 'utf-8')).toBe('hello world');
  });

  it('overwrites existing file', () => {
    const filePath = join(tmpDir, 'sync-overwrite.txt');
    atomicWriteSync(filePath, 'first');
    atomicWriteSync(filePath, 'second');
    expect(readFileSync(filePath, 'utf-8')).toBe('second');
  });

  it('creates parent directories if needed', () => {
    const filePath = join(tmpDir, 'a', 'b', 'sync.txt');
    atomicWriteSync(filePath, 'content');
    expect(existsSync(filePath)).toBe(true);
  });

  it('writes empty string', () => {
    const filePath = join(tmpDir, 'empty.txt');
    atomicWriteSync(filePath, '');
    expect(readFileSync(filePath, 'utf-8')).toBe('');
  });
});

// ── atomicWriteFileSync ────────────────────────────────────────────────────

describe('atomicWriteFileSync', () => {
  it('writes string content atomically', () => {
    const filePath = join(tmpDir, 'file-sync.txt');
    atomicWriteFileSync(filePath, 'atomic content');
    expect(readFileSync(filePath, 'utf-8')).toBe('atomic content');
  });

  it('overwrites existing file', () => {
    const filePath = join(tmpDir, 'file-sync-overwrite.txt');
    atomicWriteFileSync(filePath, 'original');
    atomicWriteFileSync(filePath, 'replaced');
    expect(readFileSync(filePath, 'utf-8')).toBe('replaced');
  });

  it('creates nested directories if needed', () => {
    const filePath = join(tmpDir, 'nested', 'file-sync.txt');
    atomicWriteFileSync(filePath, 'deep');
    expect(existsSync(filePath)).toBe(true);
  });

  it('handles multi-line content', () => {
    const filePath = join(tmpDir, 'multiline.txt');
    const content = 'line1\nline2\nline3';
    atomicWriteFileSync(filePath, content);
    expect(readFileSync(filePath, 'utf-8')).toBe(content);
  });
});

// ── atomicWriteJsonSync ────────────────────────────────────────────────────

describe('atomicWriteJsonSync', () => {
  it('serializes and writes JSON synchronously', () => {
    const filePath = join(tmpDir, 'sync.json');
    atomicWriteJsonSync(filePath, { x: 1, y: 'hello' });
    const content = readFileSync(filePath, 'utf-8');
    expect(JSON.parse(content)).toEqual({ x: 1, y: 'hello' });
  });

  it('handles arrays', () => {
    const filePath = join(tmpDir, 'array-sync.json');
    atomicWriteJsonSync(filePath, ['a', 'b', 'c']);
    expect(JSON.parse(readFileSync(filePath, 'utf-8'))).toEqual(['a', 'b', 'c']);
  });

  it('produces pretty-printed output', () => {
    const filePath = join(tmpDir, 'pretty-sync.json');
    atomicWriteJsonSync(filePath, { nested: { key: 'value' } });
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('\n');
    expect(content).toContain('  ');
  });
});

// ── safeReadJson ───────────────────────────────────────────────────────────

describe('safeReadJson', () => {
  it('reads and parses existing JSON file', async () => {
    const filePath = join(tmpDir, 'readable.json');
    atomicWriteJsonSync(filePath, { hello: 'world' });
    const result = await safeReadJson<{ hello: string }>(filePath);
    expect(result).toEqual({ hello: 'world' });
  });

  it('returns null for non-existent file', async () => {
    const filePath = join(tmpDir, 'nonexistent.json');
    const result = await safeReadJson(filePath);
    expect(result).toBeNull();
  });

  it('returns null for invalid JSON', async () => {
    const filePath = join(tmpDir, 'invalid.json');
    atomicWriteFileSync(filePath, 'not valid json {{{');
    const result = await safeReadJson(filePath);
    expect(result).toBeNull();
  });

  it('returns null for empty file', async () => {
    const filePath = join(tmpDir, 'empty.json');
    atomicWriteFileSync(filePath, '');
    const result = await safeReadJson(filePath);
    expect(result).toBeNull();
  });

  it('reads arrays', async () => {
    const filePath = join(tmpDir, 'array.json');
    atomicWriteJsonSync(filePath, [1, 2, 3]);
    const result = await safeReadJson<number[]>(filePath);
    expect(result).toEqual([1, 2, 3]);
  });

  it('reads null value', async () => {
    const filePath = join(tmpDir, 'null.json');
    atomicWriteJsonSync(filePath, null);
    const result = await safeReadJson(filePath);
    expect(result).toBeNull();
  });
});
