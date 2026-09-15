/**
 * Test environment setup.
 *
 * The browser always provides Web Crypto; Node 18 does not expose it globally,
 * and `generateUid` needs `randomUUID`. The stand-in is deliberately sequential
 * so a whole tree can be compared by value between runs.
 */
if (typeof globalThis.crypto === 'undefined') {
  let n = 0;
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => {
        n += 1;
        return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
      },
    },
  });
}

export {};
