/** Convert a flat tile index to [x, y] coordinates for a row-major grid. */
export function idxToXY(idx, width) {
  return [idx % width, Math.floor(idx / width)];
}

/** Get the integer tile coordinate from a (possibly fractional) position. */
export function tileOf(v) {
  return Math.floor(v);
}

/** Fisher-Yates shuffle in place. Returns the same array for chaining. */
export function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}