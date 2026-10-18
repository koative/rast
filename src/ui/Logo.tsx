/**
 * Rast mark: an R drawn on a raster grid whose pixels shrink column by column, left to right, the way an
 * image does as it is compressed, set in ink on a graphite tile so colour stays with the photographs and
 * the one action cyan. public/favicon.svg and the app icons are the same drawing.
 */
const R_ROWS = ['XXX.', 'X..X', 'X..X', 'XXX.', 'X.X.', 'X..X']
const PITCH = 4.5
const CELL = [4.3, 4.05, 3.75, 3.4]
const ORIGIN_X = 16 - (PITCH * 4) / 2
const ORIGIN_Y = 16 - (PITCH * 6) / 2

const CELLS = R_ROWS.flatMap((row, y) =>
  [...row].flatMap((c, x) => {
    if (c !== 'X') return []
    const size = CELL[x]
    const inset = (PITCH - size) / 2
    return [{ x: ORIGIN_X + x * PITCH + inset, y: ORIGIN_Y + y * PITCH + inset, size }]
  }),
)

export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="logo-mark">
      <rect width="32" height="32" rx="8" fill="#2a2a2a" />
      {CELLS.map((c) => (
        <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={c.size} height={c.size} rx="0.45" fill="var(--ink)" />
      ))}
    </svg>
  )
}

export function Wordmark() {
  return (
    <span className="wordmark">
      <LogoMark />
      <span>Rast</span>
    </span>
  )
}
