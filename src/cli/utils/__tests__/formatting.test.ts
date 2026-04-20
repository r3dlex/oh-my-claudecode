import { describe, it, expect } from 'vitest';
import {
  renderTable,
  colors,
  formatCostWithColor,
  formatTokenCount,
  formatDuration,
  type TableColumn,
} from '../formatting.js';

// ── renderTable ────────────────────────────────────────────────────────────

describe('renderTable', () => {
  const columns: TableColumn[] = [
    { header: 'Name', field: 'name', width: 10, align: 'left' },
    { header: 'Value', field: 'value', width: 8, align: 'right' },
  ];

  it('renders header row and separator', () => {
    const result = renderTable([], columns);
    expect(result).toContain('Name');
    expect(result).toContain('Value');
    expect(result).toContain('---');
  });

  it('renders data rows', () => {
    const data = [{ name: 'foo', value: 42 }];
    const result = renderTable(data, columns);
    expect(result).toContain('foo');
    expect(result).toContain('42');
  });

  it('uses format function when provided', () => {
    const cols: TableColumn[] = [
      { header: 'Cost', field: 'cost', width: 12, format: (v) => `$${v.toFixed(2)}` },
    ];
    const result = renderTable([{ cost: 1.5 }], cols);
    expect(result).toContain('$1.50');
  });

  it('uses empty string for missing fields', () => {
    const cols: TableColumn[] = [
      { header: 'X', field: 'x', width: 5 },
    ];
    const result = renderTable([{ y: 1 }], cols);
    // should not throw and should produce output
    expect(typeof result).toBe('string');
  });

  it('respects center alignment', () => {
    const cols: TableColumn[] = [
      { header: 'H', field: 'v', width: 10, align: 'center' },
    ];
    const result = renderTable([{ v: 'hi' }], cols);
    // 'hi' (2 chars) centered in 10-wide column — has padding on both sides
    expect(result).toContain('   hi');
  });

  it('respects left alignment (default)', () => {
    const cols: TableColumn[] = [
      { header: 'H', field: 'v', width: 10 },
    ];
    const result = renderTable([{ v: 'hello' }], cols);
    // left-aligned: text starts at beginning of column
    expect(result).toMatch(/hello\s+/);
  });
});

// ── colors ─────────────────────────────────────────────────────────────────

describe('colors', () => {
  it('wraps text with ANSI red escape', () => {
    expect(colors.red('x')).toMatch(/\x1b\[31m.*\x1b\[0m/);
  });

  it('wraps text with ANSI green escape', () => {
    expect(colors.green('x')).toMatch(/\x1b\[32m.*\x1b\[0m/);
  });

  it('wraps text with ANSI yellow escape', () => {
    expect(colors.yellow('x')).toMatch(/\x1b\[33m.*\x1b\[0m/);
  });

  it('wraps text with ANSI blue escape', () => {
    expect(colors.blue('x')).toMatch(/\x1b\[34m.*\x1b\[0m/);
  });

  it('wraps text with bold escape', () => {
    expect(colors.bold('x')).toMatch(/\x1b\[1m.*\x1b\[0m/);
  });

  it('wraps text with gray escape', () => {
    expect(colors.gray('x')).toMatch(/\x1b\[90m.*\x1b\[0m/);
  });
});

// ── formatCostWithColor ────────────────────────────────────────────────────

describe('formatCostWithColor', () => {
  it('uses green for cost below $1', () => {
    const result = formatCostWithColor(0.5);
    expect(result).toContain('\x1b[32m'); // green
    expect(result).toContain('$0.5000');
  });

  it('uses yellow for cost between $1 and $5', () => {
    const result = formatCostWithColor(2.5);
    expect(result).toContain('\x1b[33m'); // yellow
    expect(result).toContain('$2.5000');
  });

  it('uses red for cost $5 and above', () => {
    const result = formatCostWithColor(5.0);
    expect(result).toContain('\x1b[31m'); // red
    expect(result).toContain('$5.0000');
  });

  it('uses red for large costs', () => {
    expect(formatCostWithColor(100)).toContain('\x1b[31m');
  });

  it('uses green for zero cost', () => {
    expect(formatCostWithColor(0)).toContain('\x1b[32m');
  });

  it('formats to 4 decimal places', () => {
    expect(formatCostWithColor(0.123456)).toContain('$0.1235');
  });
});

// ── formatTokenCount ───────────────────────────────────────────────────────

describe('formatTokenCount', () => {
  it('shows raw count for < 1000', () => {
    expect(formatTokenCount(0)).toBe('0');
    expect(formatTokenCount(999)).toBe('999');
  });

  it('shows k suffix for thousands', () => {
    expect(formatTokenCount(1000)).toBe('1.0k');
    expect(formatTokenCount(1500)).toBe('1.5k');
    expect(formatTokenCount(999999)).toBe('1000.0k');
  });

  it('shows M suffix for millions', () => {
    expect(formatTokenCount(1_000_000)).toBe('1.00M');
    expect(formatTokenCount(2_500_000)).toBe('2.50M');
  });
});

// ── formatDuration ─────────────────────────────────────────────────────────

describe('formatDuration', () => {
  it('shows seconds for < 60s', () => {
    expect(formatDuration(5000)).toBe('5s');
    expect(formatDuration(59000)).toBe('59s');
  });

  it('shows minutes and seconds for < 1h', () => {
    expect(formatDuration(60_000)).toBe('1m 0s');
    expect(formatDuration(90_000)).toBe('1m 30s');
  });

  it('shows hours and minutes for >= 1h', () => {
    expect(formatDuration(3_600_000)).toBe('1h 0m');
    expect(formatDuration(5_400_000)).toBe('1h 30m');
    expect(formatDuration(7_200_000)).toBe('2h 0m');
  });

  it('handles zero duration', () => {
    expect(formatDuration(0)).toBe('0s');
  });
});
