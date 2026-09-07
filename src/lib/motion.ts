/**
 * Shared motion ingredients (animate / emil-design-eng house style).
 * Non-component constants live here — never next to components, so
 * react-refresh's only-export-components rule stays satisfied.
 */

/**
 * Strong ease-out house curve, mirroring `--ease-out` in index.css.
 * Kept as a JS tuple because Motion can't read CSS vars for easing.
 */
export const PAGE_EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]
