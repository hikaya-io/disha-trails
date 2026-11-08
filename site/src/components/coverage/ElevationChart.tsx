'use client'
/**
 * A trail's elevation profile, the chart andrewpham.dev draws under its trail maps: the profile
 * line over a stack of shifted copies (the "ridge lines"), a tooltip with distance and height,
 * and a marker that follows the pointer here or on the map. Ported from me
 * src/components/ElevationProfile.tsx without its race parts (stages, loops, progress).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import {
  type ActiveElement,
  type Chart,
  CategoryScale,
  Chart as ChartJS,
  type ChartEvent,
  type ChartOptions,
  LinearScale,
  LineElement,
  type Plugin,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { formatDistance, formatHeight, type TrailRoute, type Units } from '@/lib/trail-route'

const RIDGE_LINES = 12
const PROFILE_COLOR = 'rgba(113, 113, 122, 0.9)' // zinc-500
const RIDGE = { r: 161, g: 161, b: 170 } // zinc-400
const RIDGE_ALPHA = { light: { line: 0.3, fill: 0.05 }, dark: { line: 0.16, fill: 0.04 } }
const ACCENT = { light: '#7c3aed', dark: '#8b5cf6' }

type Theme = 'light' | 'dark'
type PluginOptions = { theme: Theme; scrubIndex: number | null }

/** The pluginOptions this file sets on the chart, read back by the plugins. */
const optionsOf = (chart: Chart) =>
  (chart.options.plugins as unknown as { dishaProfile?: PluginOptions }).dishaProfile

/** The ridge lines: copies of the profile, each shifted down, clamped to the axis floor. */
const ridgePlugin: Plugin<'line'> = {
  id: 'dishaRidge',
  beforeDatasetsDraw(chart) {
    const opts = optionsOf(chart)
    const meta = chart.getDatasetMeta(0)
    const data = chart.data.datasets[0]?.data as number[] | undefined
    const y = chart.scales.y
    if (!opts || !meta?.data.length || !data?.length || !y) return
    const alpha = RIDGE_ALPHA[opts.theme]
    const lo = Math.min(...data)
    const hi = Math.max(...data)
    if (hi <= lo) return
    const step = (hi - lo) / (RIDGE_LINES + 1)
    const { ctx } = chart
    const { left, right, top, bottom } = chart.chartArea
    const trace = (offset: number) => {
      for (let j = 0; j < meta.data.length; j++) {
        const py = y.getPixelForValue(Math.max(data[j] - offset, y.min))
        if (j === 0) ctx.moveTo(meta.data[j].x, py)
        else {
          const prevY = y.getPixelForValue(Math.max(data[j - 1] - offset, y.min))
          ctx.quadraticCurveTo((meta.data[j - 1].x + meta.data[j].x) / 2, prevY, meta.data[j].x, py)
        }
      }
    }
    ctx.save()
    ctx.beginPath()
    ctx.rect(left, top, right - left, bottom - top)
    ctx.clip()
    ctx.beginPath()
    trace(0)
    ctx.lineTo(meta.data[meta.data.length - 1].x, bottom)
    ctx.lineTo(meta.data[0].x, bottom)
    ctx.closePath()
    ctx.fillStyle = `rgba(${RIDGE.r}, ${RIDGE.g}, ${RIDGE.b}, ${alpha.fill})`
    ctx.fill()
    ctx.lineWidth = 1
    ctx.lineJoin = 'round'
    ctx.strokeStyle = `rgba(${RIDGE.r}, ${RIDGE.g}, ${RIDGE.b}, ${alpha.line})`
    for (let i = RIDGE_LINES; i >= 1; i--) {
      ctx.beginPath()
      trace(i * step)
      ctx.stroke()
    }
    ctx.restore()
  },
}

/** The scrub marker: a vertical line and a dot where the pointer is, here or on the map. */
const scrubPlugin: Plugin<'line'> = {
  id: 'dishaScrub',
  afterDatasetsDraw(chart) {
    const opts = optionsOf(chart)
    const index = opts?.scrubIndex
    const data = chart.data.datasets[0]?.data as number[] | undefined
    if (!opts || index == null || data?.[index] == null) return
    const x = chart.scales.x.getPixelForValue(index)
    const { top, bottom, left, right } = chart.chartArea
    if (x < left || x > right) return
    const { ctx } = chart
    const color = ACCENT[opts.theme]
    ctx.save()
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.moveTo(x, top)
    ctx.lineTo(x, bottom)
    ctx.stroke()
    ctx.beginPath()
    ctx.fillStyle = color
    ctx.strokeStyle = opts.theme === 'dark' ? '#18181b' : '#ffffff'
    ctx.lineWidth = 2
    ctx.arc(x, chart.scales.y.getPixelForValue(data[index]), 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  },
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  ridgePlugin,
  scrubPlugin,
)

/** The sample nearest a distance along the route. */
function indexAtKm(profile: TrailRoute['profile'], km: number): number {
  let best = 0
  for (let i = 1; i < profile.length; i++) {
    if (Math.abs(profile[i][0] - km) < Math.abs(profile[best][0] - km)) best = i
  }
  return best
}

export function ElevationChart({
  route,
  units,
  scrubKm,
  onScrub,
}: {
  route: TrailRoute
  units: Units
  /** The distance to mark, from the pointer here or on the map. */
  scrubKm: number | null
  onScrub: (km: number | null) => void
}) {
  const chartRef = useRef<ChartJS<'line'> | null>(null)
  const { resolvedTheme } = useTheme()
  const theme: Theme = resolvedTheme === 'dark' ? 'dark' : 'light'
  const [visible, setVisible] = useState(true)
  const { profile } = route

  const scrubIndex = scrubKm == null ? null : indexAtKm(profile, scrubKm)
  useEffect(() => {
    chartRef.current?.update('none')
  }, [scrubIndex, theme, units])

  const onHover = useCallback(
    (event: ChartEvent, _active: ActiveElement[], chart: Chart) => {
      const { left, right } = chart.chartArea
      if (event.x == null || event.x < left || event.x > right) return onScrub(null)
      const index = Math.round(chart.scales.x.getValueForPixel(event.x) as number)
      if (index >= 0 && index < profile.length) onScrub(profile[index][0])
    },
    [onScrub, profile],
  )

  const data = useMemo(
    () => ({
      labels: profile.map(([km]) => km),
      datasets: [
        {
          data: profile.map(([, m]) => m),
          borderColor: PROFILE_COLOR,
          borderWidth: 1.8,
          pointRadius: 0,
          tension: 0.2,
        },
      ],
    }),
    [profile],
  )

  const options = useMemo<ChartOptions<'line'>>(() => {
    // Ink-soft, solid: the panel lets the map through, so faint labels would get lost on it.
    // The axis fits the route's own heights, with a little room below, so the climbs fill the
    // short panel instead of sitting on a floor at 0 m.
    const heights = profile.map((p) => p[1])
    const low = Math.min(...heights)
    const high = Math.max(...heights)
    const pad = Math.max(30, (high - low) * 0.05)
    const yMin = Math.max(0, Math.floor((low - pad) / 100) * 100)
    const yMax = Math.ceil((high + pad) / 100) * 100
    const tick = theme === 'dark' ? '#d4d4d8' : '#3f3f46'
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      layout: { padding: { bottom: 4 } },
      interaction: { mode: 'index', intersect: false },
      onHover,
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          callbacks: {
            title: (items) => formatDistance(profile[items[0].dataIndex][0], units),
            label: (item) => formatHeight(item.raw as number, units),
          },
        },
        dishaProfile: { theme, scrubIndex } as unknown as PluginOptions,
      } as ChartOptions<'line'>['plugins'],
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            maxTicksLimit: 5,
            font: { size: 10 },
            color: tick,
            callback: (_value, index) => formatDistance(profile[index][0], units),
          },
        },
        y: {
          min: yMin,
          max: yMax,
          grid: {
            color: theme === 'dark' ? 'rgba(161, 161, 170, 0.1)' : 'rgba(113, 113, 122, 0.1)',
          },
          ticks: {
            maxTicksLimit: 3,
            font: { size: 10 },
            color: tick,
            callback: (value) => formatHeight(value as number, units),
          },
        },
      },
    }
  }, [onHover, profile, scrubIndex, theme, units])

  if (!visible) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setVisible(true)}
          className="pointer-events-auto min-h-9 border border-bg/40 bg-bg/45 px-3 font-mono text-[11px] text-ink backdrop-blur-md hover:text-ink-soft pointer-coarse:min-h-11"
          aria-label="Show the elevation profile"
        >
          elevation
        </button>
      </div>
    )
  }
  return (
    // Frosted glass: a light tint and a blur, so the map reads through while the line stays clear.
    <div className="pointer-events-auto border border-bg/40 bg-bg/45 backdrop-blur-md backdrop-saturate-150">
      <div className="flex items-center justify-between px-3 font-mono text-[11px] text-ink-soft">
        <span>elevation</span>
        <button
          type="button"
          onClick={() => {
            setVisible(false)
            onScrub(null)
          }}
          className="min-h-7 underline underline-offset-4 hover:text-ink pointer-coarse:min-h-11"
          aria-label="Hide the elevation profile"
        >
          hide
        </button>
      </div>
      <div className="h-24 px-2 pb-2 sm:h-28" onMouseLeave={() => onScrub(null)}>
        <Line
          ref={chartRef}
          data={data}
          options={options}
          aria-label={`Elevation profile of the route, ${formatDistance(route.lengthKm, units)} long`}
          role="img"
        />
      </div>
    </div>
  )
}
