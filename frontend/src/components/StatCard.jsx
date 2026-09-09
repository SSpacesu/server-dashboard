function getDotColor(value, warningAt, dangerAt) {
  if (value >= dangerAt) return 'var(--danger)'
  if (value >= warningAt) return 'var(--warning)'
  return 'var(--success)'
}

function StatCard({ label, value, unit, warningAt = 50, dangerAt = 80, subValue }) {
  const isPercent = unit === '%' && typeof value === 'number'

  return (
    <div className="stat-card">
      <span className="stat-card-label">
        {isPercent && (
          <span
            className="stat-card-dot"
            style={{ backgroundColor: getDotColor(value, warningAt, dangerAt) }}
          />
        )}
        {label}
      </span>
      <span className="stat-card-value">
        {value}
        {unit && <span className="stat-card-unit">{unit}</span>}
      </span>
      {subValue && <span className="stat-card-subvalue">{subValue}</span>}
    </div>
  )
}

export default StatCard
