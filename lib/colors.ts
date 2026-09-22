export function withAlpha(color: string, alpha: number): string {
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    throw new RangeError('alpha must be between 0 and 1');
  }

  const alphaHex = Math.round(alpha * 0xff).toString(16).padStart(2, '0');
  const hex = color.match(/^#([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i);

  if (hex) {
    const digits = hex[1];
    const rgb = digits.length <= 4
      ? digits.slice(0, 3).split('').map((digit) => digit.repeat(2)).join('')
      : digits.slice(0, 6);
    return `#${rgb}${alphaHex}`;
  }

  const rgb = color.match(/^rgba?\(\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^,\)]+?)(?:\s*,\s*[^\)]+)?\s*\)$/i);
  if (rgb) {
    return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`;
  }

  // Named, platform, and dynamic colors are already valid React Native colors.
  // Keeping them opaque is safer than manufacturing an invalid color string.
  return color;
}
