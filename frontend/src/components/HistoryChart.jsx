import { useRef, useState } from 'react'

const WIDTH = 300
const HEIGHT = 100
const Y_GRID_LINES = [0, 25, 50, 75, 100]
const TIME_TICKS = [45, 30, 15]

function buildPoints(records, key) {
  if (records.length === 0) return ''

  const step = records.length > 1 ? WIDTH / (records.length - 1) : 0

  return records
    .map((record, index) => {
      const x = index * step
      const y = HEIGHT - (record[key] / 100) * HEIGHT
      return `${x},${y}`
    })
    .join(' ')
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function HistoryChart({ history }) {
  // history arrives newest-first from the API; chart reads left-to-right chronologically
  const records = [...history].reverse()
  const svgRef = useRef(null)
  const [hoverIndex, setHoverIndex] = useState(null)

  const cpuPoints = buildPoints(records, 'cpu_percent')
  const ramPoints = buildPoints(records, 'ram_percent')

  const oldestTimestamp = records.length > 0 ? new Date(records[0].timestamp).getTime() : 0
  const newestTimestamp = records.length > 0 ? new Date(records[records.length - 1].timestamp).getTime() : 0

  // Use the actual elapsed time between the oldest and newest samples, since the backend stores
  // records on a 15-second interval rather than one minute apart.
  const minutesAgo = records.length > 1 ? Math.max((newestTimestamp - oldestTimestamp) / 60000, 0) : 0

  const timeTicks = [
    ...(minutesAgo >= 60 ? [{ minutes: 60, label: '1hr' }] : []),
    ...TIME_TICKS.filter(minutes => minutes > 0 && minutes < minutesAgo && minutes < 60).map(minutes => ({
      minutes,
      label: `${minutes}m`,
    })),
    { minutes: 0, label: 'now' },
  ]

  const handleMouseMove = event => {
    if (records.length === 0) return

    const rect = svgRef.current.getBoundingClientRect()
    const ratio = (event.clientX - rect.left) / rect.width
    const index = Math.round(ratio * (records.length - 1))

    setHoverIndex(Math.min(Math.max(index, 0), records.length - 1))
  }

  const handleMouseLeave = () => setHoverIndex(null)

  const hoveredRecord = hoverIndex !== null ? records[hoverIndex] : null
  const hoverStep = records.length > 1 ? WIDTH / (records.length - 1) : 0
  const hoverX = hoverIndex !== null ? hoverIndex * hoverStep : 0
  const hoverLeftPercent = hoverIndex !== null ? (hoverX / WIDTH) * 100 : 0

  return (
    <div className="history-chart">
      {records.length === 0 ? (
        <p className="history-chart-empty">No history yet</p>
      ) : (
        <>
          <div className="history-chart-body">
            <div className="history-chart-plot">
              <div className="history-chart-canvas">
                <svg
                  ref={svgRef}
                  className="history-chart-svg"
                  viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                  preserveAspectRatio="none"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                >
                  {Y_GRID_LINES.map(value => (
                    <line
                      key={value}
                      className="history-chart-gridline"
                      x1="0"
                      x2={WIDTH}
                      y1={HEIGHT - (value / 100) * HEIGHT}
                      y2={HEIGHT - (value / 100) * HEIGHT}
                    />
                  ))}
                  <polyline points={cpuPoints} className="history-chart-line history-chart-line-cpu" />
                  <polyline points={ramPoints} className="history-chart-line history-chart-line-ram" />
                  {hoveredRecord && (
                    <line
                      className="history-chart-hover-line"
                      x1={hoverX}
                      x2={hoverX}
                      y1="0"
                      y2={HEIGHT}
                    />
                  )}
                </svg>
                {hoveredRecord && (
                  <>
                    {/* HTML dots, not SVG circles, so they aren't stretched into ovals by the SVG's non-uniform scaling */}
                    <div
                      className="history-chart-hover-dot history-chart-hover-dot-cpu"
                      style={{ left: `${hoverLeftPercent}%`, top: `${100 - hoveredRecord.cpu_percent}%` }}
                    />
                    <div
                      className="history-chart-hover-dot history-chart-hover-dot-ram"
                      style={{ left: `${hoverLeftPercent}%`, top: `${100 - hoveredRecord.ram_percent}%` }}
                    />
                  </>
                )}
                {hoveredRecord && (
                  <div
                    className="history-chart-tooltip"
                    style={{ left: `${hoverLeftPercent}%` }}
                  >
                    <div className="history-chart-tooltip-time">{formatTime(hoveredRecord.timestamp)}</div>
                    <div className="history-chart-tooltip-row">
                      <span className="history-chart-swatch history-chart-swatch-cpu" />
                      CPU {hoveredRecord.cpu_percent}%
                    </div>
                    <div className="history-chart-tooltip-row">
                      <span className="history-chart-swatch history-chart-swatch-ram" />
                      RAM {hoveredRecord.ram_percent}%
                    </div>
                  </div>
                )}
              </div>
              <div className="history-chart-x-axis">
                {timeTicks.map(({ minutes, label }) => (
                  <span
                    key={minutes}
                    style={{ left: `${((minutesAgo - minutes) / (minutesAgo || 1)) * 100}%` }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="history-chart-y-axis">
              {Y_GRID_LINES.slice()
                .reverse()
                .map(value => (
                  <span key={value} style={{ top: `${100 - value}%` }}>
                    {value}%
                  </span>
                ))}
            </div>
          </div>
          <div className="history-chart-legend">
            <span className="history-chart-legend-item">
              <span className="history-chart-swatch history-chart-swatch-cpu" />
              CPU
            </span>
            <span className="history-chart-legend-item">
              <span className="history-chart-swatch history-chart-swatch-ram" />
              RAM
            </span>
          </div>
        </>
      )}
    </div>
  )
}

export default HistoryChart

