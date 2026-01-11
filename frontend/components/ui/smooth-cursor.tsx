import { FC, useEffect, useRef, useState } from "react"

interface Position {
  x: number
  y: number
}

export interface SmoothCursorProps {
  cursor?: React.ReactNode
  springConfig?: {
    damping: number
    stiffness: number
    mass: number
    restDelta: number
  }
}

const DefaultCursorSVG: FC = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={50}
      height={54}
      viewBox="0 0 50 54"
      fill="none"
      style={{ scale: 0.5 }}
    >
      <g filter="url(#filter0_d_91_7928)">
        <path
          d="M42.6817 41.1495L27.5103 6.79925C26.7269 5.02557 24.2082 5.02558 23.3927 6.79925L7.59814 41.1495C6.75833 42.9759 8.52712 44.8902 10.4125 44.1954L24.3757 39.0496C24.8829 38.8627 25.4385 38.8627 25.9422 39.0496L39.8121 44.1954C41.6849 44.8902 43.4884 42.9759 42.6817 41.1495Z"
          fill="black"
        />
        <path
          d="M43.7146 40.6933L28.5431 6.34306C27.3556 3.65428 23.5772 3.69516 22.3668 6.32755L6.57226 40.6778C5.3134 43.4156 7.97238 46.298 10.803 45.2549L24.7662 40.109C25.0221 40.0147 25.2999 40.0156 25.5494 40.1082L39.4193 45.254C42.2261 46.2953 44.9254 43.4347 43.7146 40.6933Z"
          stroke="white"
          strokeWidth={2.25825}
        />
      </g>
      <defs>
        <filter
          id="filter0_d_91_7928"
          x={0.602397}
          y={0.952444}
          width={49.0584}
          height={52.428}
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity={0} result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy={2.25825} />
          <feGaussianBlur stdDeviation={2.25825} />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_91_7928"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_91_7928"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  )
}

export function SmoothCursor({ cursor = <DefaultCursorSVG /> }: SmoothCursorProps) {
  const [enabled, setEnabled] = useState(false)
  const [pos, setPos] = useState<Position>({ x: 0, y: 0 })
  const mounted = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Enable only for sufficiently large screens and fine pointer devices
    const isLarge = window.innerWidth >= 768
    const hasFinePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches
    if (!isLarge || !hasFinePointer) return

    setEnabled(true)
    mounted.current = true

    const handleMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY })
    }

    // Hide native cursor globally, and also inject a style that forces interactive elements
    // (buttons, anchors, inputs, etc.) to hide their default pointer when our custom cursor is active.
    const prevBodyCursor = document.body.style.cursor
    document.body.style.cursor = 'none'

    // Add a class on the root element so we can scope CSS changes to when cursor is active
    const root = document.documentElement
    root.classList.add('custom-cursor-active')

    // Inject stylesheet to hide cursor on interactive elements (use !important to override inline styles)
    const styleId = 'smooth-cursor-style'
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style')
      styleEl.id = styleId
      styleEl.innerHTML = `
        .custom-cursor-active button,
        .custom-cursor-active a,
        .custom-cursor-active [role="button"],
        .custom-cursor-active input,
        .custom-cursor-active textarea,
        .custom-cursor-active select,
        .custom-cursor-active summary {
          cursor: none !important;
        }
      `
      document.head.appendChild(styleEl)
    }

    window.addEventListener('mousemove', handleMove)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      document.body.style.cursor = prevBodyCursor || 'auto'
      root.classList.remove('custom-cursor-active')
      const style = document.getElementById(styleId)
      if (style && style.parentNode) style.parentNode.removeChild(style)
      mounted.current = false
    }
  }, [])

  if (!enabled) return null

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        transform: 'translate(-50%, -50%) rotate(-40deg)',
        zIndex: 100,
        pointerEvents: 'none',
      }}
    >
      {cursor}
    </div>
  )
}
