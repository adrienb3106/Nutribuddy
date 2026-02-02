export default function HomePage() {
  return (
    <section className="hero">
      <div className="hero-card">
        <div className="badge">CIQUAL-ready</div>
        <h1 className="hero-title">Nutrition data, personalized for you.</h1>
        <p className="hero-subtitle">
          Nutribuddy connects a powerful food database with your dietary
          preferences. Filter quickly, stay consistent, and keep your profile in
          sync across devices.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <a className="button" href="/foods">
            Explore foods
          </a>
          <a className="button secondary" href="/profile">
            Set preferences
          </a>
        </div>
      </div>
      <div className="hero-card">
        <h2 className="section-title">Why it helps</h2>
        <div className="grid">
          <div className="card">
            <strong>Smart filters</strong>
            <p className="notice">Calories, macros, and restrictions in seconds.</p>
          </div>
          <div className="card">
            <strong>Profile-aware</strong>
            <p className="notice">Save your dietary rules once.</p>
          </div>
          <div className="card">
            <strong>Fast lookup</strong>
            <p className="notice">Built on CIQUAL data with clean API access.</p>
          </div>
        </div>
      </div>
    </section>
  );
}