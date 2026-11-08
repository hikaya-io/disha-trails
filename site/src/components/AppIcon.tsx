import clsx from 'clsx'

/**
 * The Disha app icon, drawn inline from the web version in the brand book (violet 700 tile,
 * two ranges, arrow-D). Do not recolor or tint it. iOS rounds the tile to about 22%, so the
 * wrapper does the same.
 */
export function AppIcon({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span
      className={clsx('inline-block shrink-0 overflow-hidden rounded-[22%]', className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" focusable="false">
        <rect width="100" height="100" fill="#6D28D9" />
        <g transform="translate(0 14)">
          <path
            fill="#FFFFFF"
            fillOpacity="0.231"
            d="M0 70 L22 48 L34 58 L52 36 L72 56 L84 46 L100 60 V100 H0 Z"
          />
          <path
            fill="#FFFFFF"
            fillOpacity="0.42"
            d="M0 84 L18 70 L36 80 L58 64 L78 78 L100 70 V100 H0 Z"
          />
        </g>
        <g transform="translate(50 50) scale(0.66) translate(-52 -50)">
          <path
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="13"
            strokeLinejoin="round"
            strokeLinecap="round"
            d="M22 18 H48 L82 50 L48 82 H22 Z"
          />
        </g>
      </svg>
    </span>
  )
}
