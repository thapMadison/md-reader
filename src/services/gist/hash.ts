/**
 * FNV-1a over the UTF-8 bytes of a string, as 8 hex characters.
 *
 * Used to answer one question: has this file's content changed since it was
 * last synced? Comparing a stored hash against the current content makes that a
 * fact. The alternative — comparing timestamps — cannot, because the local
 * clock and GitHub's clock are different clocks, and because a file re-saved
 * with identical bytes would look changed and prompt a pointless "push?".
 *
 * Not cryptographic, and not required to be: the inputs are the user's own
 * documents, and the only consequence of a collision is a missed "you have
 * unpushed edits" prompt. Chosen over SubtleCrypto because that API is async,
 * unavailable on insecure origins, and would make a hot comparison path
 * awaitable for no benefit at this stakes level.
 */

// TextEncoder is used rather than iterating charCodeAt, for the same reason
// idbStorage measures bytes that way: charCodeAt walks UTF-16 code units, so a
// surrogate pair — every emoji — hashes as two lone halves. Two genuinely
// different documents can then collide far more easily than the digest width
// suggests.
const encoder = new TextEncoder();

export function contentHash(content: string): string {
  const bytes = encoder.encode(content);
  // 32-bit FNV-1a. The offset basis and prime are the standard constants.
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    // `Math.imul` for a true 32-bit multiply. Plain `hash * 16777619` exceeds
    // 2^53 and silently loses the low bits to float rounding — which are
    // precisely the bits the next iteration mixes.
    hash = Math.imul(hash, 0x01000193);
  }
  // `>>> 0` reinterprets the sign bit as magnitude, so the result is one
  // unsigned value rather than sometimes-negative.
  return (hash >>> 0).toString(16).padStart(8, '0');
}
