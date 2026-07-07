import { describe, it, expect } from 'vitest';
import {
  uriToPath,
  formatPosition,
  formatRange,
  formatLocation,
  formatHover,
  formatLocations,
  formatDocumentSymbols,
  formatWorkspaceSymbols,
  formatDiagnostics,
  formatCodeActions,
  formatWorkspaceEdit,
  countEdits,
} from '../utils.js';
import type { Location, DocumentSymbol, SymbolInformation, Diagnostic, CodeAction, WorkspaceEdit, Range, Hover } from '../client.js';

// ── uriToPath ──────────────────────────────────────────────────────────────

describe('uriToPath', () => {
  it('strips file:// prefix', () => {
    expect(uriToPath('file:///home/user/project/src/index.ts')).toBe('/home/user/project/src/index.ts');
  });

  it('decodes percent-encoded chars', () => {
    expect(uriToPath('file:///home/user/my%20project/file.ts')).toBe('/home/user/my project/file.ts');
  });

  it('returns malformed percent-encoding raw path segment', () => {
    // %ZZ is invalid percent-encoding — should not throw, just return raw
    const result = uriToPath('file:///path/%ZZfile.ts');
    expect(result).toBe('/path/%ZZfile.ts');
  });

  it('returns non-file URIs unchanged', () => {
    expect(uriToPath('untitled:///foo')).toBe('untitled:///foo');
    expect(uriToPath('/absolute/path')).toBe('/absolute/path');
  });
});

// ── formatPosition ─────────────────────────────────────────────────────────

describe('formatPosition', () => {
  it('converts 0-based to 1-based', () => {
    expect(formatPosition(0, 0)).toBe('1:1');
    expect(formatPosition(9, 14)).toBe('10:15');
  });
});

// ── formatRange ────────────────────────────────────────────────────────────

describe('formatRange', () => {
  const range: Range = { start: { line: 2, character: 4 }, end: { line: 2, character: 10 } };

  it('shows single position when start equals end', () => {
    const same: Range = { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };
    expect(formatRange(same)).toBe('1:1');
  });

  it('shows range when start differs from end', () => {
    expect(formatRange(range)).toBe('3:5-3:11');
  });
});

// ── formatLocation ─────────────────────────────────────────────────────────

describe('formatLocation', () => {
  it('formats a standard location', () => {
    const loc: Location = {
      uri: 'file:///project/src/app.ts',
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
    };
    const result = formatLocation(loc);
    expect(result).toContain('/project/src/app.ts');
    expect(result).toContain('1:1');
  });

  it('returns "Unknown location" when uri is missing', () => {
    expect(formatLocation({} as Location)).toBe('Unknown location');
  });

  it('returns path without range when range is missing', () => {
    const loc = { uri: 'file:///foo.ts' } as Location;
    expect(formatLocation(loc)).toBe('/foo.ts');
  });
});

// ── formatHover ────────────────────────────────────────────────────────────

describe('formatHover', () => {
  it('returns fallback for null', () => {
    expect(formatHover(null)).toBe('No hover information available');
  });

  it('formats string contents', () => {
    const hover: Hover = { contents: 'hello world' };
    expect(formatHover(hover)).toBe('hello world');
  });

  it('formats MarkupContent', () => {
    const hover: Hover = { contents: { kind: 'markdown', value: '**bold**' } };
    expect(formatHover(hover)).toBe('**bold**');
  });

  it('formats array of strings', () => {
    const hover: Hover = { contents: ['line one', 'line two'] as any };
    expect(formatHover(hover)).toContain('line one');
    expect(formatHover(hover)).toContain('line two');
  });

  it('formats array with MarkupContent items', () => {
    const hover: Hover = {
      contents: [{ kind: 'plaintext', value: 'type info' }, 'doc text'] as any,
    };
    const result = formatHover(hover);
    expect(result).toContain('type info');
    expect(result).toContain('doc text');
  });

  it('appends range when present', () => {
    const hover: Hover = {
      contents: 'info',
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 4 } },
    };
    expect(formatHover(hover)).toContain('Range:');
  });

  it('returns fallback for empty string contents', () => {
    const hover: Hover = { contents: '' };
    expect(formatHover(hover)).toBe('No hover information available');
  });
});

// ── formatLocations ────────────────────────────────────────────────────────

describe('formatLocations', () => {
  it('returns "No locations found" for null', () => {
    expect(formatLocations(null)).toBe('No locations found');
  });

  it('returns "No locations found" for empty array', () => {
    expect(formatLocations([])).toBe('No locations found');
  });

  it('formats a single location', () => {
    const loc: Location = {
      uri: 'file:///src/foo.ts',
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
    };
    expect(formatLocations(loc)).toContain('foo.ts');
  });

  it('formats an array of locations', () => {
    const locs: Location[] = [
      { uri: 'file:///a.ts', range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } },
      { uri: 'file:///b.ts', range: { start: { line: 1, character: 0 }, end: { line: 1, character: 0 } } },
    ];
    const result = formatLocations(locs);
    expect(result).toContain('a.ts');
    expect(result).toContain('b.ts');
  });
});

// ── formatDocumentSymbols ──────────────────────────────────────────────────

describe('formatDocumentSymbols', () => {
  it('returns "No symbols found" for null', () => {
    expect(formatDocumentSymbols(null)).toBe('No symbols found');
  });

  it('returns "No symbols found" for empty array', () => {
    expect(formatDocumentSymbols([])).toBe('No symbols found');
  });

  it('formats DocumentSymbol with range', () => {
    const sym: DocumentSymbol = {
      name: 'MyClass',
      kind: 5, // Class
      range: { start: { line: 0, character: 0 }, end: { line: 10, character: 1 } },
      selectionRange: { start: { line: 0, character: 6 }, end: { line: 0, character: 13 } },
    };
    const result = formatDocumentSymbols([sym]);
    expect(result).toContain('Class: MyClass');
  });

  it('recursively formats children', () => {
    const child: DocumentSymbol = {
      name: 'myMethod',
      kind: 6, // Method
      range: { start: { line: 1, character: 2 }, end: { line: 3, character: 3 } },
      selectionRange: { start: { line: 1, character: 2 }, end: { line: 1, character: 10 } },
    };
    const parent: DocumentSymbol = {
      name: 'MyClass',
      kind: 5,
      range: { start: { line: 0, character: 0 }, end: { line: 10, character: 1 } },
      selectionRange: { start: { line: 0, character: 6 }, end: { line: 0, character: 13 } },
      children: [child],
    };
    const result = formatDocumentSymbols([parent]);
    expect(result).toContain('MyClass');
    expect(result).toContain('myMethod');
    // child is indented
    expect(result).toContain('  Method: myMethod');
  });

  it('formats SymbolInformation (no range, has location)', () => {
    const sym: SymbolInformation = {
      name: 'myFunc',
      kind: 12, // Function
      location: {
        uri: 'file:///src/lib.ts',
        range: { start: { line: 5, character: 0 }, end: { line: 5, character: 0 } },
      },
    };
    const result = formatDocumentSymbols([sym]);
    expect(result).toContain('Function: myFunc');
    expect(result).toContain('lib.ts');
  });

  it('shows containerName for SymbolInformation', () => {
    const sym: SymbolInformation = {
      name: 'myMethod',
      kind: 6,
      containerName: 'MyClass',
      location: {
        uri: 'file:///src/lib.ts',
        range: { start: { line: 2, character: 0 }, end: { line: 2, character: 0 } },
      },
    };
    const result = formatDocumentSymbols([sym]);
    expect(result).toContain('(in MyClass)');
  });
});

// ── formatWorkspaceSymbols ─────────────────────────────────────────────────

describe('formatWorkspaceSymbols', () => {
  it('returns "No symbols found" for null', () => {
    expect(formatWorkspaceSymbols(null)).toBe('No symbols found');
  });

  it('returns "No symbols found" for empty array', () => {
    expect(formatWorkspaceSymbols([])).toBe('No symbols found');
  });

  it('formats symbols with location', () => {
    const sym: SymbolInformation = {
      name: 'IFoo',
      kind: 11, // Interface
      location: {
        uri: 'file:///src/types.ts',
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
      },
    };
    const result = formatWorkspaceSymbols([sym]);
    expect(result).toContain('Interface: IFoo');
    expect(result).toContain('types.ts');
  });
});

// ── formatDiagnostics ──────────────────────────────────────────────────────

describe('formatDiagnostics', () => {
  it('returns "No diagnostics" for empty array', () => {
    expect(formatDiagnostics([])).toBe('No diagnostics');
  });

  it('formats error diagnostic', () => {
    const diag: Diagnostic = {
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
      severity: 1,
      message: 'Type error',
    };
    const result = formatDiagnostics([diag]);
    expect(result).toContain('Error');
    expect(result).toContain('Type error');
  });

  it('includes source and code when present', () => {
    const diag: Diagnostic = {
      range: { start: { line: 2, character: 4 }, end: { line: 2, character: 10 } },
      severity: 2,
      message: 'Unused variable',
      source: 'eslint',
      code: 'no-unused-vars',
    };
    const result = formatDiagnostics([diag]);
    expect(result).toContain('[eslint]');
    expect(result).toContain('(no-unused-vars)');
  });

  it('includes filePath in location when provided', () => {
    const diag: Diagnostic = {
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
      severity: 1,
      message: 'error',
    };
    const result = formatDiagnostics([diag], '/src/app.ts');
    expect(result).toContain('/src/app.ts');
  });
});

// ── formatCodeActions ──────────────────────────────────────────────────────

describe('formatCodeActions', () => {
  it('returns "No code actions available" for null', () => {
    expect(formatCodeActions(null)).toBe('No code actions available');
  });

  it('returns "No code actions available" for empty array', () => {
    expect(formatCodeActions([])).toBe('No code actions available');
  });

  it('formats numbered list of actions', () => {
    const actions: CodeAction[] = [
      { title: 'Fix typo', kind: 'quickfix' },
      { title: 'Extract function', kind: 'refactor', isPreferred: true },
    ];
    const result = formatCodeActions(actions);
    expect(result).toContain('1. Fix typo');
    expect(result).toContain('2. Extract function');
    expect(result).toContain('(preferred)');
    expect(result).toContain('[quickfix]');
  });
});

// ── formatWorkspaceEdit ────────────────────────────────────────────────────

describe('formatWorkspaceEdit', () => {
  it('returns "No edits" for null', () => {
    expect(formatWorkspaceEdit(null)).toBe('No edits');
  });

  it('returns "No edits" for empty edit', () => {
    expect(formatWorkspaceEdit({})).toBe('No edits');
  });

  it('formats changes', () => {
    const edit: WorkspaceEdit = {
      changes: {
        'file:///src/foo.ts': [
          { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } }, newText: 'bar' },
        ],
      },
    };
    const result = formatWorkspaceEdit(edit);
    expect(result).toContain('foo.ts');
    expect(result).toContain('bar');
  });

  it('truncates long newText', () => {
    const longText = 'x'.repeat(100);
    const edit: WorkspaceEdit = {
      changes: {
        'file:///src/foo.ts': [
          { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, newText: longText },
        ],
      },
    };
    const result = formatWorkspaceEdit(edit);
    expect(result).toContain('...');
  });

  it('formats documentChanges', () => {
    const edit = {
      documentChanges: [
        {
          textDocument: { uri: 'file:///src/bar.ts' } as any,
          edits: [
            { range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } }, newText: 'hello' },
          ],
        },
      ],
    } as WorkspaceEdit;
    const result = formatWorkspaceEdit(edit);
    expect(result).toContain('bar.ts');
    expect(result).toContain('hello');
  });
});

// ── countEdits ─────────────────────────────────────────────────────────────

describe('countEdits', () => {
  it('returns zero for null', () => {
    expect(countEdits(null)).toEqual({ files: 0, edits: 0 });
  });

  it('counts changes', () => {
    const edit: WorkspaceEdit = {
      changes: {
        'file:///a.ts': [
          { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, newText: '' },
          { range: { start: { line: 1, character: 0 }, end: { line: 1, character: 0 } }, newText: '' },
        ],
        'file:///b.ts': [
          { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, newText: '' },
        ],
      },
    };
    expect(countEdits(edit)).toEqual({ files: 2, edits: 3 });
  });

  it('counts documentChanges', () => {
    const edit = {
      documentChanges: [
        {
          textDocument: { uri: 'file:///a.ts' } as any,
          edits: [
            { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, newText: '' },
          ],
        },
      ],
    } as WorkspaceEdit;
    expect(countEdits(edit)).toEqual({ files: 1, edits: 1 });
  });

  it('counts both changes and documentChanges', () => {
    const edit: WorkspaceEdit = {
      changes: {
        'file:///a.ts': [
          { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, newText: '' },
        ],
      },
      documentChanges: [
        {
          textDocument: { uri: 'file:///b.ts' } as any,
          edits: [
            { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, newText: '' },
            { range: { start: { line: 1, character: 0 }, end: { line: 1, character: 0 } }, newText: '' },
          ],
        },
      ],
    };
    expect(countEdits(edit)).toEqual({ files: 2, edits: 3 });
  });
});
