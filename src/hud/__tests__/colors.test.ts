import { describe, it, expect } from 'vitest';
import {
  RESET,
  green,
  yellow,
  red,
  cyan,
  magenta,
  blue,
  dim,
  bold,
  white,
  brightCyan,
  brightMagenta,
  brightBlue,
  getContextColor,
  getRalphColor,
  getTodoColor,
  getModelTierColor,
  getDurationColor,
  coloredBar,
  coloredValue,
} from '../colors.js';

// ── Basic color wrappers ───────────────────────────────────────────────────

describe('color wrappers', () => {
  it('green wraps with green ANSI and resets', () => {
    const result = green('hello');
    expect(result).toContain('\x1b[32m');
    expect(result).toContain('hello');
    expect(result).toContain(RESET);
  });

  it('yellow wraps with yellow ANSI', () => {
    expect(yellow('x')).toContain('\x1b[33m');
  });

  it('red wraps with red ANSI', () => {
    expect(red('x')).toContain('\x1b[31m');
  });

  it('cyan wraps with cyan ANSI', () => {
    expect(cyan('x')).toContain('\x1b[36m');
  });

  it('magenta wraps with magenta ANSI', () => {
    expect(magenta('x')).toContain('\x1b[35m');
  });

  it('blue wraps with blue ANSI', () => {
    expect(blue('x')).toContain('\x1b[34m');
  });

  it('dim wraps with dim ANSI', () => {
    expect(dim('x')).toContain('\x1b[2m');
  });

  it('bold wraps with bold ANSI', () => {
    expect(bold('x')).toContain('\x1b[1m');
  });

  it('white wraps with white ANSI', () => {
    expect(white('x')).toContain('\x1b[37m');
  });

  it('brightCyan wraps with bright cyan ANSI', () => {
    expect(brightCyan('x')).toContain('\x1b[96m');
  });

  it('brightMagenta wraps with bright magenta ANSI', () => {
    expect(brightMagenta('x')).toContain('\x1b[95m');
  });

  it('brightBlue wraps with bright blue ANSI', () => {
    expect(brightBlue('x')).toContain('\x1b[94m');
  });
});

// ── getContextColor ────────────────────────────────────────────────────────

describe('getContextColor', () => {
  it('returns RED at 85%', () => {
    expect(getContextColor(85)).toBe('\x1b[31m');
  });

  it('returns RED above 85%', () => {
    expect(getContextColor(95)).toBe('\x1b[31m');
    expect(getContextColor(100)).toBe('\x1b[31m');
  });

  it('returns YELLOW at 70%', () => {
    expect(getContextColor(70)).toBe('\x1b[33m');
  });

  it('returns YELLOW between 70 and 85', () => {
    expect(getContextColor(75)).toBe('\x1b[33m');
    expect(getContextColor(84)).toBe('\x1b[33m');
  });

  it('returns GREEN below 70%', () => {
    expect(getContextColor(0)).toBe('\x1b[32m');
    expect(getContextColor(50)).toBe('\x1b[32m');
    expect(getContextColor(69)).toBe('\x1b[32m');
  });
});

// ── getRalphColor ──────────────────────────────────────────────────────────

describe('getRalphColor', () => {
  const max = 10;

  it('returns GREEN well below warning threshold', () => {
    // warning = floor(10*0.7) = 7, critical = floor(10*0.9) = 9
    expect(getRalphColor(1, max)).toBe('\x1b[32m');
    expect(getRalphColor(6, max)).toBe('\x1b[32m');
  });

  it('returns YELLOW at warning threshold', () => {
    expect(getRalphColor(7, max)).toBe('\x1b[33m');
    expect(getRalphColor(8, max)).toBe('\x1b[33m');
  });

  it('returns RED at critical threshold', () => {
    expect(getRalphColor(9, max)).toBe('\x1b[31m');
    expect(getRalphColor(10, max)).toBe('\x1b[31m');
  });

  it('handles small maxIterations (1)', () => {
    // warning = floor(1*0.7) = 0, critical = floor(1*0.9) = 0
    // iteration=0 >= critical=0 → RED
    expect(getRalphColor(0, 1)).toBe('\x1b[31m');
  });
});

// ── getTodoColor ───────────────────────────────────────────────────────────

describe('getTodoColor', () => {
  it('returns DIM when total is 0', () => {
    expect(getTodoColor(0, 0)).toBe('\x1b[2m');
  });

  it('returns GREEN when >= 80% complete', () => {
    expect(getTodoColor(8, 10)).toBe('\x1b[32m');
    expect(getTodoColor(10, 10)).toBe('\x1b[32m');
  });

  it('returns YELLOW when >= 50% but < 80%', () => {
    expect(getTodoColor(5, 10)).toBe('\x1b[33m');
    expect(getTodoColor(7, 10)).toBe('\x1b[33m');
  });

  it('returns CYAN when < 50%', () => {
    expect(getTodoColor(0, 10)).toBe('\x1b[36m');
    expect(getTodoColor(4, 10)).toBe('\x1b[36m');
  });

  it('handles 1-of-1 complete', () => {
    expect(getTodoColor(1, 1)).toBe('\x1b[32m');
  });
});

// ── getModelTierColor ──────────────────────────────────────────────────────

describe('getModelTierColor', () => {
  it('returns CYAN for undefined model', () => {
    expect(getModelTierColor(undefined)).toBe('\x1b[36m');
  });

  it('returns MAGENTA for opus models', () => {
    expect(getModelTierColor('claude-opus-4-6')).toBe('\x1b[35m');
    expect(getModelTierColor('claude-opus-4')).toBe('\x1b[35m');
  });

  it('returns YELLOW for sonnet models', () => {
    expect(getModelTierColor('claude-sonnet-4-6')).toBe('\x1b[33m');
    expect(getModelTierColor('claude-sonnet-3-5')).toBe('\x1b[33m');
  });

  it('returns GREEN for haiku models', () => {
    expect(getModelTierColor('claude-haiku-4-5')).toBe('\x1b[32m');
    expect(getModelTierColor('claude-haiku-3')).toBe('\x1b[32m');
  });

  it('returns CYAN for unknown models', () => {
    expect(getModelTierColor('gpt-4')).toBe('\x1b[36m');
    expect(getModelTierColor('gemini-pro')).toBe('\x1b[36m');
  });

  it('is case-insensitive', () => {
    expect(getModelTierColor('CLAUDE-OPUS-4')).toBe('\x1b[35m');
    expect(getModelTierColor('Claude-Sonnet-4')).toBe('\x1b[33m');
  });
});

// ── getDurationColor ───────────────────────────────────────────────────────

describe('getDurationColor', () => {
  it('returns GREEN for < 2 minutes', () => {
    expect(getDurationColor(0)).toBe('\x1b[32m');
    expect(getDurationColor(60_000)).toBe('\x1b[32m');
    expect(getDurationColor(119_999)).toBe('\x1b[32m');
  });

  it('returns YELLOW for 2-5 minutes', () => {
    expect(getDurationColor(120_000)).toBe('\x1b[33m');
    expect(getDurationColor(299_999)).toBe('\x1b[33m');
  });

  it('returns RED for >= 5 minutes', () => {
    expect(getDurationColor(300_000)).toBe('\x1b[31m');
    expect(getDurationColor(600_000)).toBe('\x1b[31m');
  });
});

// ── coloredBar ─────────────────────────────────────────────────────────────

describe('coloredBar', () => {
  it('returns a string with filled and empty block chars', () => {
    const bar = coloredBar(50, 10);
    expect(bar).toContain('█');
    expect(bar).toContain('░');
    expect(bar).toContain(RESET);
  });

  it('full bar at 100%', () => {
    const bar = coloredBar(100, 4);
    expect(bar).toContain('████');
    expect(bar).not.toContain('░');
  });

  it('empty bar at 0%', () => {
    const bar = coloredBar(0, 4);
    expect(bar).not.toContain('█');
    expect(bar).toContain('░░░░');
  });

  it('uses default width of 10', () => {
    const bar = coloredBar(100);
    expect(bar).toContain('██████████');
  });

  it('clamps percent to 0-100', () => {
    const above = coloredBar(150, 4);
    expect(above).toContain('████');
    const below = coloredBar(-10, 4);
    expect(below).not.toContain('█');
  });

  it('handles non-finite percent gracefully', () => {
    expect(() => coloredBar(NaN, 4)).not.toThrow();
    expect(() => coloredBar(Infinity, 4)).not.toThrow();
  });

  it('handles non-finite width gracefully', () => {
    expect(() => coloredBar(50, NaN)).not.toThrow();
  });

  it('uses RED color at high percentage (>= 85)', () => {
    const bar = coloredBar(90, 10);
    expect(bar).toContain('\x1b[31m');
  });

  it('uses GREEN color at low percentage (< 70)', () => {
    const bar = coloredBar(30, 10);
    expect(bar).toContain('\x1b[32m');
  });
});

// ── coloredValue ───────────────────────────────────────────────────────────

describe('coloredValue', () => {
  it('formats value/total with color', () => {
    const result = coloredValue(3, 10, (v, t) => (v / t < 0.5 ? '\x1b[32m' : '\x1b[31m'));
    expect(result).toContain('3/10');
    expect(result).toContain(RESET);
  });

  it('applies the provided color function', () => {
    const alwaysRed = () => '\x1b[31m';
    const result = coloredValue(5, 5, alwaysRed);
    expect(result).toContain('\x1b[31m');
    expect(result).toContain('5/5');
  });
});
