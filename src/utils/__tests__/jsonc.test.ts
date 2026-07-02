import { describe, it, expect } from 'vitest';
import { parseJsonc, stripJsoncComments } from '../jsonc.js';

// ── stripJsoncComments ─────────────────────────────────────────────────────

describe('stripJsoncComments', () => {
  it('returns empty string for empty input', () => {
    expect(stripJsoncComments('')).toBe('');
  });

  it('returns plain JSON unchanged', () => {
    const json = '{"a": 1, "b": "hello"}';
    expect(stripJsoncComments(json)).toBe(json);
  });

  it('removes single-line comment at end of line', () => {
    const input = '{"a": 1 // comment\n}';
    const result = stripJsoncComments(input);
    expect(result).toContain('"a": 1 ');
    expect(result).not.toContain('// comment');
  });

  it('removes single-line comment on its own line', () => {
    const input = '{\n// this is a comment\n"a": 1\n}';
    const result = stripJsoncComments(input);
    expect(result).not.toContain('// this is a comment');
    expect(result).toContain('"a": 1');
  });

  it('preserves newline after single-line comment', () => {
    const input = '{"a": 1 // comment\n,"b": 2}';
    const result = stripJsoncComments(input);
    expect(result).toContain('"b": 2');
  });

  it('removes multi-line comment', () => {
    const input = '{"a": /* remove this */ 1}';
    const result = stripJsoncComments(input);
    expect(result).not.toContain('remove this');
    expect(result).toContain('"a":  1');
  });

  it('removes multi-line comment spanning multiple lines', () => {
    const input = '{\n/* line1\nline2 */\n"a": 1}';
    const result = stripJsoncComments(input);
    expect(result).not.toContain('line1');
    expect(result).not.toContain('line2');
    expect(result).toContain('"a": 1');
  });

  it('does not strip // inside a string', () => {
    const input = '{"url": "http://example.com"}';
    expect(stripJsoncComments(input)).toBe(input);
  });

  it('does not strip /* inside a string', () => {
    const input = '{"regex": "/* not a comment */"}';
    expect(stripJsoncComments(input)).toBe(input);
  });

  it('handles escaped backslash in string', () => {
    const input = '{"path": "C:\\\\Users"}';
    expect(stripJsoncComments(input)).toBe(input);
  });

  it('handles escaped quote in string', () => {
    const input = '{"msg": "say \\"hello\\""}';
    expect(stripJsoncComments(input)).toBe(input);
  });

  it('handles string at end without closing quote (malformed)', () => {
    const input = '{"key": "unclosed';
    // Should not throw — just process until end
    expect(() => stripJsoncComments(input)).not.toThrow();
  });

  it('handles unclosed multi-line comment', () => {
    const input = '{"a": 1 /* unclosed comment';
    expect(() => stripJsoncComments(input)).not.toThrow();
    const result = stripJsoncComments(input);
    expect(result).not.toContain('unclosed comment');
  });

  it('handles comment-start sequences that are incomplete at end', () => {
    // Single / at end — should just pass through as regular char
    const input = '{"a": 1}/';
    const result = stripJsoncComments(input);
    expect(result).toContain('/');
  });

  it('handles multiple single-line comments', () => {
    const input = '// first\n{"a": 1} // second\n// third\n';
    const result = stripJsoncComments(input);
    expect(result).not.toContain('first');
    expect(result).not.toContain('second');
    expect(result).not.toContain('third');
    expect(result).toContain('"a": 1');
  });

  it('handles multiple multi-line comments', () => {
    const input = '/* c1 */{"a": /* c2 */ 1}';
    const result = stripJsoncComments(input);
    expect(result).not.toContain('c1');
    expect(result).not.toContain('c2');
    expect(result).toContain('"a":  1');
  });

  it('preserves string content with escape sequences', () => {
    const input = '{"t": "tab\\there", "n": "new\\nline"}';
    expect(stripJsoncComments(input)).toBe(input);
  });
});

// ── stripJsoncComments - trailing comma removal ────────────────────────────

describe('stripJsoncComments - trailing comma removal', () => {
  it('removes a trailing comma before a closing brace', () => {
    expect(stripJsoncComments('{"a":1,}')).toBe('{"a":1}');
  });

  it('removes a trailing comma before a closing bracket', () => {
    expect(stripJsoncComments('[1,2,]')).toBe('[1,2]');
  });
});

// ── parseJsonc ─────────────────────────────────────────────────────────────

describe('parseJsonc', () => {
  it('parses plain JSON', () => {
    const result = parseJsonc('{"a": 1}');
    expect(result).toEqual({ a: 1 });
  });

  it('parses JSON with single-line comment', () => {
    const result = parseJsonc('{\n  "a": 1 // the value\n}');
    expect(result).toEqual({ a: 1 });
  });

  it('parses JSON with multi-line comment', () => {
    const result = parseJsonc('{"a": /* value */ 1}');
    expect(result).toEqual({ a: 1 });
  });

  it('parses JSON with both comment types', () => {
    const input = `{
  // top comment
  "x": 1, /* inline */ "y": 2
  // end
}`;
    expect(parseJsonc(input)).toEqual({ x: 1, y: 2 });
  });

  it('parses arrays', () => {
    const result = parseJsonc('[1, /* two */ 2, 3 // three\n]');
    expect(result).toEqual([1, 2, 3]);
  });

  it('throws on invalid JSON after comment stripping', () => {
    expect(() => parseJsonc('{invalid}')).toThrow();
  });

  it('parses nested objects', () => {
    const result = parseJsonc('{"a": {"b": /* comment */ 42}}');
    expect(result).toEqual({ a: { b: 42 } });
  });

  it('parses boolean and null values', () => {
    const result = parseJsonc('{"t": true, "f": false, "n": null}');
    expect(result).toEqual({ t: true, f: false, n: null });
  });

  it('preserves URL strings', () => {
    const result = parseJsonc('{"url": "https://example.com"}');
    expect(result).toEqual({ url: 'https://example.com' });
  });

  it('handles empty object', () => {
    expect(parseJsonc('{}')).toEqual({});
  });

  it('handles empty array', () => {
    expect(parseJsonc('[]')).toEqual([]);
  });
});

// ── parseJsonc - trailing commas ───────────────────────────────────────────

describe('parseJsonc - trailing commas', () => {
  it('tolerates a trailing comma in an object', () => {
    expect(parseJsonc('{"a":1,}')).toEqual({ a: 1 });
  });

  it('tolerates a trailing comma in an array', () => {
    expect(parseJsonc('[1,2,]')).toEqual([1, 2]);
  });

  it('tolerates trailing commas in nested structures', () => {
    const input = `{
      "list": [1, 2, 3,],
      "obj": { "x": true, },
    }`;
    expect(parseJsonc(input)).toEqual({
      list: [1, 2, 3],
      obj: { x: true },
    });
  });

  it('tolerates a trailing comma followed by whitespace and newlines', () => {
    const input = '{\n  "a": 1,\n  "b": 2,\n}';
    expect(parseJsonc(input)).toEqual({ a: 1, b: 2 });
  });
});

// ── parseJsonc - string preservation ───────────────────────────────────────

describe('parseJsonc - string preservation', () => {
  it('preserves a comma inside a string value', () => {
    expect(parseJsonc('{"a":"1,"}')).toEqual({ a: '1,' });
  });

  it('does not strip a comma-then-brace sequence inside a string', () => {
    // The literal text "x,}" must survive intact as a string value.
    expect(parseJsonc('{"a":"x,}"}')).toEqual({ a: 'x,}' });
  });

  it('preserves a trailing-comma-like pattern inside a string', () => {
    expect(parseJsonc('{"a":"[1,2,]"}')).toEqual({ a: '[1,2,]' });
  });
});

// ── parseJsonc - comment stripping still works ────────────────────────────

describe('parseJsonc - comment stripping still works', () => {
  it('strips single-line comments', () => {
    const input = `{
      // this is a comment
      "a": 1
    }`;
    expect(parseJsonc(input)).toEqual({ a: 1 });
  });

  it('strips multi-line comments', () => {
    const input = `{
      /* block
         comment */
      "a": 1
    }`;
    expect(parseJsonc(input)).toEqual({ a: 1 });
  });

  it('does not strip // inside a string value', () => {
    expect(parseJsonc('{"url":"http://example.com"}')).toEqual({
      url: 'http://example.com',
    });
  });

  it('handles comments and trailing commas together', () => {
    const input = `{
      "a": 1, // trailing comment
      "b": 2, /* another */
    }`;
    expect(parseJsonc(input)).toEqual({ a: 1, b: 2 });
  });
});
