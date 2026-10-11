import { flagUrl } from '../lib/quiz'

interface Props {
  code: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// width = image size for normal screens; retina screens get the next size up.
// `box` reserves the space (so the layout doesn't jump while loading); `img` only sets
// MAX sizes, so every flag keeps its real shape — square Switzerland, long Qatar,
// Nepal's pennants — instead of being cropped into a 3:2 rectangle.
const SIZES = {
  sm: { width: 160, retina: 320, box: 'h-6 w-9', img: 'max-h-6 max-w-9' },
  md: { width: 320, retina: 640, box: 'h-20 w-32 sm:h-24 sm:w-40', img: 'max-h-20 max-w-32 sm:max-h-24 sm:max-w-40' },
  lg: { width: 640, retina: 1280, box: 'h-40 w-full sm:h-52', img: 'max-h-40 max-w-full sm:max-h-52' },
} as const

// Generic alt text on purpose: the country name would give the answer away.
export function Flag({ code, size = 'md', className = '' }: Props) {
  const s = SIZES[size]
  return (
    <span className={`flex shrink-0 items-center justify-center ${s.box} ${className}`}>
      <img
        src={flagUrl(code, s.width)}
        srcSet={`${flagUrl(code, s.retina)} 2x`}
        alt="Flag"
        draggable={false}
        // drop-shadow (not box-shadow) follows the flag's outline, so Nepal gets no square box
        className={`h-auto w-auto drop-shadow-[0_4px_10px_rgb(0_0_0/0.5)] select-none ${s.img}`}
      />
    </span>
  )
}
