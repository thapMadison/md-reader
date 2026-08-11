import '@testing-library/jest-dom/vitest';

// jsdom implements no layout, so it ships no scrollIntoView at all — calling it
// throws rather than doing nothing. Stubbed here rather than guarded at the call
// site with `?.()`: the app is entitled to assume a real DOM method exists, and
// an optional call there would be a test-shaped hole in production code.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
