import { describe, it, expect } from 'vitest';
import {
  builtInMagicKeywords,
  createMagicKeywordProcessor,
  detectMagicKeywords,
  extractPromptText,
} from '../magic-keywords.js';

describe('builtInMagicKeywords', () => {
  it('defines four keyword groups', () => {
    expect(builtInMagicKeywords).toHaveLength(4);
  });

  it('ultrawork triggers include ultrawork, ulw, uw', () => {
    const uw = builtInMagicKeywords.find(k => k.triggers.includes('ultrawork'));
    expect(uw).toBeDefined();
    expect(uw!.triggers).toContain('ulw');
    expect(uw!.triggers).toContain('uw');
  });

  it('search triggers contain at least 10 verbs', () => {
    const search = builtInMagicKeywords.find(k => k.triggers.includes('search'));
    expect(search!.triggers.length).toBeGreaterThanOrEqual(10);
  });
});

describe('detectMagicKeywords', () => {
  it('detects ultrawork trigger', () => {
    expect(detectMagicKeywords('please ultrawork on this')).toContain('ultrawork');
  });

  it('detects ulw shorthand', () => {
    expect(detectMagicKeywords('ulw my task')).toContain('ulw');
  });

  it('detects analyze trigger', () => {
    const result = detectMagicKeywords('analyze the codebase');
    expect(result).toContain('analyze');
  });

  it('detects ultrathink trigger', () => {
    const result = detectMagicKeywords('ultrathink about this problem');
    expect(result).toContain('ultrathink');
  });

  it('detects search trigger', () => {
    const result = detectMagicKeywords('search for the bug');
    expect(result).toContain('search');
  });

  it('does not detect keywords inside code blocks', () => {
    const prompt = '```\nultrawork\n```';
    expect(detectMagicKeywords(prompt)).not.toContain('ultrawork');
  });

  it('does not detect keywords in inline code', () => {
    const prompt = 'the `ultrawork` command does X';
    expect(detectMagicKeywords(prompt)).not.toContain('ultrawork');
  });

  it('ignores informational "what is ultrawork" context', () => {
    const result = detectMagicKeywords('what is ultrawork?');
    expect(result).not.toContain('ultrawork');
  });

  it('ignores informational "how to use ultrawork" context', () => {
    const result = detectMagicKeywords('how to use ultrawork in my project');
    expect(result).not.toContain('ultrawork');
  });

  it('returns empty array for plain prompt', () => {
    expect(detectMagicKeywords('just do the task')).toEqual([]);
  });

  it('respects custom config overrides for ultrawork triggers', () => {
    const result = detectMagicKeywords('hyperdrive my task', {
      ultrawork: ['hyperdrive'],
    });
    expect(result).toContain('hyperdrive');
  });

  it('respects custom config overrides for search triggers', () => {
    const result = detectMagicKeywords('scour the codebase', {
      search: ['scour'],
    });
    expect(result).toContain('scour');
  });

  it('respects custom config for analyze triggers', () => {
    const result = detectMagicKeywords('dissect this issue', {
      analyze: ['dissect'],
    });
    expect(result).toContain('dissect');
  });

  it('respects custom config for ultrathink triggers', () => {
    const result = detectMagicKeywords('contemplate the solution', {
      ultrathink: ['contemplate'],
    });
    expect(result).toContain('contemplate');
  });
});

describe('createMagicKeywordProcessor', () => {
  it('returns a function', () => {
    const processor = createMagicKeywordProcessor();
    expect(typeof processor).toBe('function');
  });

  it('prepends ultrawork mode message when ultrawork detected', () => {
    const processor = createMagicKeywordProcessor();
    const result = processor('ultrawork on this');
    expect(result).toContain('ultrawork-mode');
    expect(result).toContain('ULTRAWORK MODE ENABLED');
  });

  it('does not modify prompt without magic keywords', () => {
    const processor = createMagicKeywordProcessor();
    const prompt = 'just write a function';
    const result = processor(prompt);
    expect(result).toBe(prompt);
  });

  it('appends search-mode instructions when search keyword found', () => {
    const processor = createMagicKeywordProcessor();
    const result = processor('search for the auth bug');
    expect(result).toContain('search-mode');
    expect(result).toContain('MAXIMIZE SEARCH EFFORT');
  });

  it('does NOT append search-mode when no search command present', () => {
    const processor = createMagicKeywordProcessor();
    const result = processor('fix the auth bug');
    expect(result).not.toContain('search-mode');
  });

  it('appends analyze-mode instructions when analyze keyword found', () => {
    const processor = createMagicKeywordProcessor();
    const result = processor('analyze the performance issue');
    expect(result).toContain('analyze-mode');
    expect(result).toContain('ANALYSIS MODE');
  });

  it('prepends ultrathink mode message when ultrathink detected', () => {
    const processor = createMagicKeywordProcessor();
    const result = processor('ultrathink about the architecture');
    expect(result).toContain('ULTRATHINK MODE');
  });

  it('provides planner-specific message for planner agents', () => {
    const processor = createMagicKeywordProcessor();
    const result = processor('ultrawork on this', 'planner');
    expect(result).toContain('YOU ARE A PLANNER');
  });

  it('provides standard message for non-planner agents', () => {
    const processor = createMagicKeywordProcessor();
    const result = processor('ultrawork on this', 'executor');
    expect(result).not.toContain('YOU ARE A PLANNER');
    expect(result).toContain('ULTRAWORK MODE ENABLED');
  });

  it('removes trigger word from cleaned prompt', () => {
    const processor = createMagicKeywordProcessor();
    const result = processor('ultrawork fix the bug');
    // trigger word removed — cleaned prompt appended after header
    expect(result).toContain('fix the bug');
    expect(result).not.toMatch(/\bultrawork\b.*fix the bug/);
  });

  it('respects custom trigger config', () => {
    const processor = createMagicKeywordProcessor({ ultrawork: ['powermode'] });
    const result = processor('powermode on this task');
    expect(result).toContain('ultrawork-mode');
  });
});

describe('extractPromptText', () => {
  it('extracts text from single text part', () => {
    const parts = [{ type: 'text', text: 'hello world' }];
    expect(extractPromptText(parts)).toBe('hello world');
  });

  it('joins multiple text parts with newlines', () => {
    const parts = [
      { type: 'text', text: 'first' },
      { type: 'text', text: 'second' },
    ];
    expect(extractPromptText(parts)).toBe('first\nsecond');
  });

  it('ignores non-text parts', () => {
    const parts = [
      { type: 'image', url: 'http://example.com/img.png' },
      { type: 'text', text: 'caption' },
    ];
    expect(extractPromptText(parts)).toBe('caption');
  });

  it('returns empty string for empty array', () => {
    expect(extractPromptText([])).toBe('');
  });

  it('handles text part with undefined text', () => {
    const parts = [{ type: 'text' }];
    expect(extractPromptText(parts)).toBe('');
  });
});
