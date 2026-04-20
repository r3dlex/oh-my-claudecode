import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
  vi.resetModules();
});

describe('getHomeEnvVar', () => {
  it('returns $HOME on non-Windows platforms', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    vi.resetModules();
    const { getHomeEnvVar } = await import('../hooks.js');
    expect(getHomeEnvVar()).toBe('$HOME');
  });

  it('returns %USERPROFILE% on Windows', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    vi.resetModules();
    const { getHomeEnvVar } = await import('../hooks.js');
    expect(getHomeEnvVar()).toBe('%USERPROFILE%');
  });
});

describe('isWindows', () => {
  it('returns false on non-Windows platforms', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
    vi.resetModules();
    const { isWindows } = await import('../hooks.js');
    expect(isWindows()).toBe(false);
  });

  it('returns true on win32', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    vi.resetModules();
    const { isWindows } = await import('../hooks.js');
    expect(isWindows()).toBe(true);
  });
});

describe('MIN_NODE_VERSION', () => {
  it('is 20', async () => {
    const { MIN_NODE_VERSION } = await import('../hooks.js');
    expect(MIN_NODE_VERSION).toBe(20);
  });
});
