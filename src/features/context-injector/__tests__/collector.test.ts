import { describe, it, expect } from 'vitest';
import { ContextCollector } from '../collector.js';

function seedEntry(
  collector: ContextCollector,
  sessionId: string,
  id: string,
  content: string,
  priority?: 'critical' | 'high' | 'normal' | 'low',
): void {
  collector.register(sessionId, { id, source: 'custom', content, priority });
}

// ── hasPending ────────────────────────────────────────────────────────────────

describe('ContextCollector.hasPending', () => {
  it('returns false for a session that does not exist', () => {
    const c = new ContextCollector();
    expect(c.hasPending('nonexistent')).toBe(false);
  });

  it('returns true after registering an entry', () => {
    const c = new ContextCollector();
    seedEntry(c, 's1', 'e1', 'ctx');
    expect(c.hasPending('s1')).toBe(true);
  });

  it('returns false after clearing', () => {
    const c = new ContextCollector();
    seedEntry(c, 's1', 'e1', 'ctx');
    c.clear('s1');
    expect(c.hasPending('s1')).toBe(false);
  });
});

// ── getEntryCount ─────────────────────────────────────────────────────────────

describe('ContextCollector.getEntryCount', () => {
  it('returns 0 for a session that does not exist', () => {
    const c = new ContextCollector();
    expect(c.getEntryCount('nonexistent')).toBe(0);
  });

  it('returns correct count for multiple entries', () => {
    const c = new ContextCollector();
    seedEntry(c, 's1', 'e1', 'a');
    seedEntry(c, 's1', 'e2', 'b');
    expect(c.getEntryCount('s1')).toBe(2);
  });

  it('deduplicates entries with the same source:id', () => {
    const c = new ContextCollector();
    seedEntry(c, 's1', 'e1', 'first');
    seedEntry(c, 's1', 'e1', 'replaced'); // same id → overwrites
    expect(c.getEntryCount('s1')).toBe(1);
  });
});

// ── removeEntry ───────────────────────────────────────────────────────────────

describe('ContextCollector.removeEntry', () => {
  it('returns false when session does not exist', () => {
    const c = new ContextCollector();
    expect(c.removeEntry('ghost', 'test', 'e1')).toBe(false);
  });

  it('returns false when entry does not exist in session', () => {
    const c = new ContextCollector();
    seedEntry(c, 's1', 'e1', 'ctx');
    expect(c.removeEntry('s1', 'custom', 'e_missing')).toBe(false);
  });

  it('returns true when entry is found and removed', () => {
    const c = new ContextCollector();
    seedEntry(c, 's1', 'e1', 'ctx');
    expect(c.removeEntry('s1', 'custom', 'e1')).toBe(true);
    expect(c.getEntryCount('s1')).toBe(0);
  });
});

// ── getActiveSessions ─────────────────────────────────────────────────────────

describe('ContextCollector.getActiveSessions', () => {
  it('returns empty array when no sessions exist', () => {
    const c = new ContextCollector();
    expect(c.getActiveSessions()).toEqual([]);
  });

  it('returns registered session IDs', () => {
    const c = new ContextCollector();
    seedEntry(c, 'sess-a', 'e1', 'a');
    seedEntry(c, 'sess-b', 'e1', 'b');
    const sessions = c.getActiveSessions();
    expect(sessions).toContain('sess-a');
    expect(sessions).toContain('sess-b');
    expect(sessions).toHaveLength(2);
  });

  it('excludes cleared sessions', () => {
    const c = new ContextCollector();
    seedEntry(c, 's1', 'e1', 'ctx');
    c.clear('s1');
    expect(c.getActiveSessions()).not.toContain('s1');
  });
});

// ── getPending — empty session map via direct private access ──────────────────

describe('ContextCollector.getPending', () => {
  it('returns empty result when session has been removed entirely', () => {
    const c = new ContextCollector();
    // Accessing private map to set up a session that exists but is empty
    const sessions = (c as unknown as { sessions: Map<string, Map<string, unknown>> }).sessions;
    sessions.set('ghost', new Map()); // empty map — size === 0
    const result = c.getPending('ghost');
    expect(result.hasContent).toBe(false);
    expect(result.merged).toBe('');
    expect(result.entries).toHaveLength(0);
  });

  it('returns merged content for a real session', () => {
    const c = new ContextCollector();
    seedEntry(c, 's1', 'e1', 'hello');
    const result = c.getPending('s1');
    expect(result.hasContent).toBe(true);
    expect(result.merged).toBe('hello');
    expect(result.entries).toHaveLength(1);
  });
});

// ── sortEntries / priority ordering ───────────────────────────────────────────

describe('ContextCollector priority sorting', () => {
  it('places critical entries before low entries', () => {
    const c = new ContextCollector();
    seedEntry(c, 's1', 'low-entry', 'low content', 'low');
    seedEntry(c, 's1', 'critical-entry', 'critical content', 'critical');
    const { entries } = c.getPending('s1');
    expect(entries[0].priority).toBe('critical');
    expect(entries[1].priority).toBe('low');
  });

  it('breaks ties by timestamp (earlier first)', () => {
    const c = new ContextCollector();
    seedEntry(c, 's1', 'first', 'first content', 'normal');
    seedEntry(c, 's1', 'second', 'second content', 'normal');
    const { entries } = c.getPending('s1');
    expect(entries[0].id).toBe('first');
    expect(entries[1].id).toBe('second');
  });

  it('orders: critical > high > normal > low', () => {
    const c = new ContextCollector();
    seedEntry(c, 's1', 'n', 'normal', 'normal');
    seedEntry(c, 's1', 'l', 'low', 'low');
    seedEntry(c, 's1', 'h', 'high', 'high');
    seedEntry(c, 's1', 'c', 'critical', 'critical');
    const { entries } = c.getPending('s1');
    expect(entries.map(e => e.priority)).toEqual(['critical', 'high', 'normal', 'low']);
  });
});

// ── consume ───────────────────────────────────────────────────────────────────

describe('ContextCollector.consume', () => {
  it('returns context and clears it', () => {
    const c = new ContextCollector();
    seedEntry(c, 's1', 'e1', 'data');
    const result = c.consume('s1');
    expect(result.hasContent).toBe(true);
    expect(c.hasPending('s1')).toBe(false);
  });

  it('returns empty result when nothing to consume', () => {
    const c = new ContextCollector();
    const result = c.consume('empty-session');
    expect(result.hasContent).toBe(false);
  });
});
