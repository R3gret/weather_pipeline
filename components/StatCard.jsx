export default function StatCard({ icon, label, value, unit, sub, accent }) {
  return (
    <div className={`stat-card stat-card--${accent}`}>
      <div className="stat-card__icon">{icon}</div>
      <div className="stat-card__body">
        <p className="stat-card__label">{label}</p>
        <p className="stat-card__value">
          {value}
          {unit && <span className="stat-card__unit">{unit}</span>}
        </p>
        {sub && <p className="stat-card__sub">{sub}</p>}
      </div>
    </div>
  );
}
