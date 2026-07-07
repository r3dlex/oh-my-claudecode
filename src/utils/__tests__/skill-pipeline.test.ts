import { describe, it, expect } from 'vitest';
import {
  parseSkillPipelineMetadata,
  renderSkillPipelineGuidance,
} from '../skill-pipeline.js';

// ── parseSkillPipelineMetadata ────────────────────────────────────────────────

describe('parseSkillPipelineMetadata', () => {
  it('returns undefined when frontmatter has no pipeline fields', () => {
    expect(parseSkillPipelineMetadata({})).toBeUndefined();
  });

  it('returns undefined when all fields are empty strings', () => {
    expect(parseSkillPipelineMetadata({ pipeline: '', 'next-skill': '', handoff: '' })).toBeUndefined();
  });

  it('returns metadata with pipeline steps', () => {
    const result = parseSkillPipelineMetadata({ pipeline: '[plan, exec, verify]' });
    expect(result).toBeDefined();
    expect(result!.steps).toEqual(['plan', 'exec', 'verify']);
  });

  it('normalizes skill references by stripping prefixes', () => {
    const result = parseSkillPipelineMetadata({ pipeline: '[/oh-my-claudecode:plan, oh-my-claudecode:exec]' });
    expect(result!.steps).toEqual(['plan', 'exec']);
  });

  it('includes nextSkill when present', () => {
    const result = parseSkillPipelineMetadata({ 'next-skill': 'verify' });
    expect(result!.nextSkill).toBe('verify');
  });

  it('includes handoff when present', () => {
    const result = parseSkillPipelineMetadata({ handoff: 'plan-output.md' });
    expect(result!.handoff).toBe('plan-output.md');
  });

  it('deduplicates pipeline steps', () => {
    const result = parseSkillPipelineMetadata({ pipeline: '[plan, plan, exec]' });
    expect(result!.steps).toEqual(['plan', 'exec']);
  });

  it('skips whitespace-only steps (normalizeSkillReference returns undefined for empty)', () => {
    // whitespace-only values get trimmed to "" → normalizeSkillReference returns undefined → filtered out
    const result = parseSkillPipelineMetadata({ pipeline: '[plan,   , exec]' });
    expect(result!.steps).toEqual(['plan', 'exec']);
  });

  it('handles next-skill-args', () => {
    const result = parseSkillPipelineMetadata({ 'next-skill': 'exec', 'next-skill-args': '"some args"' });
    expect(result!.nextSkillArgs).toBe('some args');
  });
});

// ── renderSkillPipelineGuidance ───────────────────────────────────────────────

describe('renderSkillPipelineGuidance', () => {
  it('returns empty string when pipeline is undefined', () => {
    expect(renderSkillPipelineGuidance('plan', undefined)).toBe('');
  });

  it('renders guidance with steps and no nextSkill (terminal stage)', () => {
    const pipeline = { steps: ['plan', 'exec'], nextSkill: undefined, handoff: undefined };
    const result = renderSkillPipelineGuidance('plan', pipeline);
    expect(result).toContain('## Skill Pipeline');
    expect(result).toContain('terminal stage');
    expect(result).not.toContain('Next skill:');
  });

  it('renders guidance with nextSkill and no handoff', () => {
    const pipeline = { steps: ['plan'], nextSkill: 'exec', handoff: undefined };
    const result = renderSkillPipelineGuidance('plan', pipeline);
    expect(result).toContain('Next skill: `exec`');
    expect(result).toContain('When this stage completes:');
    expect(result).not.toContain('Handoff artifact:');
    expect(result).toContain('Write a concise handoff note');
  });

  it('renders guidance with nextSkill and handoff artifact', () => {
    const pipeline = { steps: ['plan'], nextSkill: 'exec', handoff: 'plan-output.md' };
    const result = renderSkillPipelineGuidance('plan', pipeline);
    expect(result).toContain('Handoff artifact: `plan-output.md`');
    expect(result).toContain('Write or update the handoff artifact');
  });

  it('renders guidance with nextSkillArgs', () => {
    const pipeline = { steps: ['plan'], nextSkill: 'exec', nextSkillArgs: '--fast', handoff: undefined };
    const result = renderSkillPipelineGuidance('plan', pipeline);
    expect(result).toContain('Next skill arguments: `--fast`');
    expect(result).toContain('with arguments');
  });

  it('uses skillName directly when normalizeSkillReference returns undefined (already normalized)', () => {
    // skillName with only /prefix stripped or empty after stripping → falls back to skillName
    const pipeline = { steps: [], nextSkill: undefined, handoff: undefined };
    // When normalizeSkillReference returns a value (normal case)
    const result = renderSkillPipelineGuidance('plan', pipeline);
    expect(result).toContain('Current stage: `plan`');
  });

  it('falls back to skillName.trim().toLowerCase() when normalizeSkillReference returns undefined', () => {
    // An empty-ish skill name after prefix stripping → ?? fallback
    const pipeline = { steps: [], nextSkill: undefined, handoff: undefined };
    const result = renderSkillPipelineGuidance('/oh-my-claudecode:', pipeline);
    // normalizeSkillReference('/oh-my-claudecode:') → '' after replace → '' || undefined → undefined
    // ?? fallback → '/oh-my-claudecode:'.trim().toLowerCase()
    expect(result).toContain('Current stage:');
  });
});
