import { describe, it, expect } from 'vitest';
import { ContextCollector } from '../collector.js';
import {
  injectPendingContext,
  injectContextIntoText,
  createContextInjectorHook,
} from '../injector.js';
import type { OutputPart } from '../types.js';

function makeCollector(): ContextCollector {
  return new ContextCollector();
}

function seedCollector(collector: ContextCollector, sessionId: string, content = 'injected context'): void {
  collector.register(sessionId, {
    id: 'test-entry',
    source: 'custom',
    content,
  });
}

// ── injectPendingContext ───────────────────────────────────────────────────

describe('injectPendingContext', () => {
  it('returns injected:false when no pending context', () => {
    const collector = makeCollector();
    const parts: OutputPart[] = [{ type: 'text', text: 'hello' }];
    const result = injectPendingContext(collector, 'sess1', parts);
    expect(result).toEqual({ injected: false, contextLength: 0, entryCount: 0 });
    expect(parts[0].text).toBe('hello');
  });

  it('returns injected:false when no text part found', () => {
    const collector = makeCollector();
    seedCollector(collector, 'sess1');
    const parts: OutputPart[] = [{ type: 'image', data: 'base64...' } as any];
    const result = injectPendingContext(collector, 'sess1', parts);
    expect(result.injected).toBe(false);
  });

  it('prepends context to text part (default strategy)', () => {
    const collector = makeCollector();
    seedCollector(collector, 'sess1', 'CTX');
    const parts: OutputPart[] = [{ type: 'text', text: 'original' }];
    const result = injectPendingContext(collector, 'sess1', parts);
    expect(result.injected).toBe(true);
    expect(parts[0].text).toMatch(/^CTX/);
    expect(parts[0].text).toContain('original');
  });

  it('appends context with append strategy', () => {
    const collector = makeCollector();
    seedCollector(collector, 'sess1', 'CTX');
    const parts: OutputPart[] = [{ type: 'text', text: 'original' }];
    injectPendingContext(collector, 'sess1', parts, 'append');
    expect(parts[0].text).toMatch(/original/);
    expect(parts[0].text).toMatch(/CTX$/);
  });

  it('wraps context with wrap strategy', () => {
    const collector = makeCollector();
    seedCollector(collector, 'sess1', 'CTX');
    const parts: OutputPart[] = [{ type: 'text', text: 'original' }];
    injectPendingContext(collector, 'sess1', parts, 'wrap');
    expect(parts[0].text).toContain('<injected-context>');
    expect(parts[0].text).toContain('CTX');
    expect(parts[0].text).toContain('original');
  });

  it('returns correct contextLength and entryCount', () => {
    const collector = makeCollector();
    const content = 'hello context';
    seedCollector(collector, 'sess1', content);
    const parts: OutputPart[] = [{ type: 'text', text: 'body' }];
    const result = injectPendingContext(collector, 'sess1', parts);
    expect(result.injected).toBe(true);
    expect(result.contextLength).toBe(content.length);
    expect(result.entryCount).toBe(1);
  });

  it('consumes context (calling again returns injected:false)', () => {
    const collector = makeCollector();
    seedCollector(collector, 'sess1');
    const parts: OutputPart[] = [{ type: 'text', text: 'body' }];
    injectPendingContext(collector, 'sess1', parts);
    // second call — context was consumed
    const parts2: OutputPart[] = [{ type: 'text', text: 'body2' }];
    const result2 = injectPendingContext(collector, 'sess1', parts2);
    expect(result2.injected).toBe(false);
  });

  it('uses first text part when multiple parts present', () => {
    const collector = makeCollector();
    seedCollector(collector, 'sess1', 'CTX');
    const parts: OutputPart[] = [
      { type: 'image', data: 'img' } as any,
      { type: 'text', text: 'first-text' },
      { type: 'text', text: 'second-text' },
    ];
    injectPendingContext(collector, 'sess1', parts);
    expect(parts[1].text).toContain('CTX');
    expect(parts[1].text).toContain('first-text');
    expect(parts[2].text).toBe('second-text');
  });
});

// ── injectContextIntoText ──────────────────────────────────────────────────

describe('injectContextIntoText', () => {
  it('returns original text when no pending context', () => {
    const collector = makeCollector();
    const { result, injectionResult } = injectContextIntoText(collector, 'sess1', 'hello');
    expect(result).toBe('hello');
    expect(injectionResult.injected).toBe(false);
  });

  it('prepends context by default', () => {
    const collector = makeCollector();
    seedCollector(collector, 'sess1', 'CTX');
    const { result } = injectContextIntoText(collector, 'sess1', 'body');
    expect(result).toMatch(/^CTX/);
    expect(result).toContain('body');
  });

  it('appends context with append strategy', () => {
    const collector = makeCollector();
    seedCollector(collector, 'sess1', 'CTX');
    const { result } = injectContextIntoText(collector, 'sess1', 'body', 'append');
    expect(result).toMatch(/^body/);
    expect(result).toMatch(/CTX$/);
  });

  it('wraps context with wrap strategy', () => {
    const collector = makeCollector();
    seedCollector(collector, 'sess1', 'CTX');
    const { result } = injectContextIntoText(collector, 'sess1', 'body', 'wrap');
    expect(result).toContain('<injected-context>');
    expect(result).toContain('</injected-context>');
    expect(result).toContain('body');
  });

  it('returns injectionResult with correct stats', () => {
    const collector = makeCollector();
    seedCollector(collector, 'sess1', 'CONTEXT');
    const { injectionResult } = injectContextIntoText(collector, 'sess1', 'body');
    expect(injectionResult.injected).toBe(true);
    expect(injectionResult.contextLength).toBe('CONTEXT'.length);
    expect(injectionResult.entryCount).toBe(1);
  });
});

// ── createContextInjectorHook ──────────────────────────────────────────────

describe('createContextInjectorHook', () => {
  it('returns an object with expected methods', () => {
    const collector = makeCollector();
    const hook = createContextInjectorHook(collector);
    expect(typeof hook.processUserMessage).toBe('function');
    expect(typeof hook.registerContext).toBe('function');
    expect(typeof hook.hasPending).toBe('function');
    expect(typeof hook.clear).toBe('function');
  });

  it('processUserMessage returns original message when no pending context', () => {
    const collector = makeCollector();
    const hook = createContextInjectorHook(collector);
    const { message, injected } = hook.processUserMessage('sess1', 'hello');
    expect(message).toBe('hello');
    expect(injected).toBe(false);
  });

  it('processUserMessage prepends context when pending', () => {
    const collector = makeCollector();
    const hook = createContextInjectorHook(collector);
    hook.registerContext('sess1', { id: 'ctx1', source: 'custom', content: 'CTX' });
    const { message, injected } = hook.processUserMessage('sess1', 'hello');
    expect(injected).toBe(true);
    expect(message).toContain('CTX');
    expect(message).toContain('hello');
  });

  it('hasPending reflects registered context', () => {
    const collector = makeCollector();
    const hook = createContextInjectorHook(collector);
    expect(hook.hasPending('sess1')).toBe(false);
    hook.registerContext('sess1', { id: 'x', source: 'custom', content: 'data' });
    expect(hook.hasPending('sess1')).toBe(true);
  });

  it('clear removes pending context', () => {
    const collector = makeCollector();
    const hook = createContextInjectorHook(collector);
    hook.registerContext('sess1', { id: 'x', source: 'custom', content: 'data' });
    hook.clear('sess1');
    expect(hook.hasPending('sess1')).toBe(false);
  });
});
