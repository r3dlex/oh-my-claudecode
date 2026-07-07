import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  getBoulderFilePath,
  readBoulderState,
  writeBoulderState,
  appendSessionId,
  clearBoulderState,
  findPlannerPlans,
  getPlanProgress,
  getPlanName,
  createBoulderState,
  getPlanSummaries,
  hasBoulder,
  getActivePlanPath,
} from '../storage.js';
import type { BoulderState } from '../types.js';

// Temporary directory per test-group — cleaned up after each test
let tmpDir: string;

function setup(): string {
  tmpDir = mkdtempSync(join(tmpdir(), 'boulder-test-'));
  return tmpDir;
}

function cleanup(): void {
  if (tmpDir) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

function makeBoulderState(overrides: Partial<BoulderState> = {}): BoulderState {
  const now = new Date().toISOString();
  return {
    active_plan: '/path/to/plan.md',
    started_at: now,
    session_ids: ['sess-1'],
    plan_name: 'plan',
    active: true,
    updatedAt: now,
    ...overrides,
  };
}

// ── getBoulderFilePath ─────────────────────────────────────────────────────

describe('getBoulderFilePath', () => {
  it('returns path inside .omc/boulder.json', () => {
    const p = getBoulderFilePath('/some/project');
    expect(p).toContain('.omc');
    expect(p).toContain('boulder.json');
  });
});

// ── readBoulderState / writeBoulderState ───────────────────────────────────

describe('readBoulderState', () => {
  afterEach(cleanup);

  it('returns null when file does not exist', () => {
    const dir = setup();
    expect(readBoulderState(dir)).toBeNull();
  });

  it('reads back what was written', () => {
    const dir = setup();
    const state = makeBoulderState();
    writeBoulderState(dir, state);
    const read = readBoulderState(dir);
    expect(read).not.toBeNull();
    expect(read!.plan_name).toBe('plan');
    expect(read!.session_ids).toContain('sess-1');
  });
});

describe('writeBoulderState', () => {
  afterEach(cleanup);

  it('returns true on success', () => {
    const dir = setup();
    const ok = writeBoulderState(dir, makeBoulderState());
    expect(ok).toBe(true);
  });

  it('creates directory tree if absent', () => {
    const dir = setup();
    const state = makeBoulderState();
    writeBoulderState(dir, state);
    const read = readBoulderState(dir);
    expect(read).not.toBeNull();
  });
});

// ── appendSessionId ────────────────────────────────────────────────────────

describe('appendSessionId', () => {
  afterEach(cleanup);

  it('returns null when no boulder state exists', () => {
    const dir = setup();
    expect(appendSessionId(dir, 'new-sess')).toBeNull();
  });

  it('appends a new session id', () => {
    const dir = setup();
    writeBoulderState(dir, makeBoulderState({ session_ids: ['sess-1'] }));
    const updated = appendSessionId(dir, 'sess-2');
    expect(updated!.session_ids).toContain('sess-2');
  });

  it('does not duplicate an existing session id', () => {
    const dir = setup();
    writeBoulderState(dir, makeBoulderState({ session_ids: ['sess-1'] }));
    appendSessionId(dir, 'sess-1');
    const state = readBoulderState(dir);
    expect(state!.session_ids.filter(s => s === 'sess-1')).toHaveLength(1);
  });
});

// ── clearBoulderState ──────────────────────────────────────────────────────

describe('clearBoulderState', () => {
  afterEach(cleanup);

  it('returns true and removes the file', () => {
    const dir = setup();
    writeBoulderState(dir, makeBoulderState());
    expect(clearBoulderState(dir)).toBe(true);
    expect(readBoulderState(dir)).toBeNull();
  });

  it('returns true when file already absent', () => {
    const dir = setup();
    expect(clearBoulderState(dir)).toBe(true);
  });
});

// ── findPlannerPlans ───────────────────────────────────────────────────────

describe('findPlannerPlans', () => {
  afterEach(cleanup);

  it('returns empty array when plans directory does not exist', () => {
    const dir = setup();
    expect(findPlannerPlans(dir)).toEqual([]);
  });

  it('returns markdown plan files', () => {
    const dir = setup();
    const plansDir = join(dir, '.omc', 'plans');
    mkdirSync(plansDir, { recursive: true });
    writeFileSync(join(plansDir, 'plan-a.md'), '# Plan A');
    writeFileSync(join(plansDir, 'plan-b.md'), '# Plan B');
    writeFileSync(join(plansDir, 'notes.txt'), 'ignore me');
    const plans = findPlannerPlans(dir);
    expect(plans).toHaveLength(2);
    expect(plans.every(p => p.endsWith('.md'))).toBe(true);
  });
});

// ── getPlanProgress ────────────────────────────────────────────────────────

describe('getPlanProgress', () => {
  afterEach(cleanup);

  it('returns complete:true for non-existent file', () => {
    const result = getPlanProgress('/does/not/exist.md');
    expect(result).toEqual({ total: 0, completed: 0, isComplete: true });
  });

  it('counts unchecked and checked boxes', () => {
    const dir = setup();
    const planPath = join(dir, 'plan.md');
    writeFileSync(planPath, `
# My Plan
- [x] Task one
- [X] Task two
- [ ] Task three
- [ ] Task four
`);
    const progress = getPlanProgress(planPath);
    expect(progress.total).toBe(4);
    expect(progress.completed).toBe(2);
    expect(progress.isComplete).toBe(false);
  });

  it('marks complete when all tasks done', () => {
    const dir = setup();
    const planPath = join(dir, 'plan.md');
    writeFileSync(planPath, '- [x] Done\n- [X] Also done\n');
    const progress = getPlanProgress(planPath);
    expect(progress.isComplete).toBe(true);
  });

  it('marks complete when no checkboxes', () => {
    const dir = setup();
    const planPath = join(dir, 'plan.md');
    writeFileSync(planPath, '# Just prose\n\nNo tasks here.\n');
    expect(getPlanProgress(planPath).isComplete).toBe(true);
  });
});

// ── getPlanName ────────────────────────────────────────────────────────────

describe('getPlanName', () => {
  it('extracts name without extension', () => {
    expect(getPlanName('/some/path/.omc/plans/my-plan.md')).toBe('my-plan');
    expect(getPlanName('simple.md')).toBe('simple');
  });
});

// ── createBoulderState ─────────────────────────────────────────────────────

describe('createBoulderState', () => {
  it('creates state with correct shape', () => {
    const state = createBoulderState('/path/plans/task.md', 'sess-abc');
    expect(state.active_plan).toBe('/path/plans/task.md');
    expect(state.plan_name).toBe('task');
    expect(state.session_ids).toEqual(['sess-abc']);
    expect(state.active).toBe(true);
    expect(typeof state.started_at).toBe('string');
  });
});

// ── getPlanSummaries ───────────────────────────────────────────────────────

describe('getPlanSummaries', () => {
  afterEach(cleanup);

  it('returns empty array when no plans exist', () => {
    const dir = setup();
    expect(getPlanSummaries(dir)).toEqual([]);
  });

  it('returns summary for each plan', () => {
    const dir = setup();
    const plansDir = join(dir, '.omc', 'plans');
    mkdirSync(plansDir, { recursive: true });
    writeFileSync(join(plansDir, 'plan-x.md'), '- [x] Done\n- [ ] Pending\n');
    const summaries = getPlanSummaries(dir);
    expect(summaries).toHaveLength(1);
    expect(summaries[0].name).toBe('plan-x');
    expect(summaries[0].progress.total).toBe(2);
    expect(summaries[0].progress.completed).toBe(1);
  });
});

// ── hasBoulder ─────────────────────────────────────────────────────────────

describe('hasBoulder', () => {
  afterEach(cleanup);

  it('returns false when no boulder state', () => {
    const dir = setup();
    expect(hasBoulder(dir)).toBe(false);
  });

  it('returns true after writing state', () => {
    const dir = setup();
    writeBoulderState(dir, makeBoulderState());
    expect(hasBoulder(dir)).toBe(true);
  });
});

// ── getActivePlanPath ──────────────────────────────────────────────────────

describe('getActivePlanPath', () => {
  afterEach(cleanup);

  it('returns null when no boulder state', () => {
    const dir = setup();
    expect(getActivePlanPath(dir)).toBeNull();
  });

  it('returns active_plan from state', () => {
    const dir = setup();
    writeBoulderState(dir, makeBoulderState({ active_plan: '/path/plan.md' }));
    expect(getActivePlanPath(dir)).toBe('/path/plan.md');
  });
});
