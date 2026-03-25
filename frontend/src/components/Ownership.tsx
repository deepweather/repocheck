import type { OwnershipAnalysis } from "../types";

interface Props {
  ownership: OwnershipAnalysis;
}

export default function Ownership({ ownership }: Props) {
  return (
    <section className="analytics-section">
      <div className="analytics-section__header">
        <h2 className="section-title">Ownership & risk</h2>
        <div className="ownership-summary">
          <span className="ownership-stat">
            <strong className={ownership.bus_factor_1_pct > 50 ? "bad" : ownership.bus_factor_1_pct > 30 ? "warn" : ""}>
              {ownership.bus_factor_1_pct}%
            </strong> single-owner files
          </span>
          <span className="ownership-stat">{ownership.total_files_analyzed} files analyzed</span>
        </div>
      </div>

      <div className="ownership-grid">
        {ownership.directory_ownership.length > 0 && (
          <div className="ownership-card">
            <h3>Knowledge map</h3>
            <div className="ownership-table">
              {ownership.directory_ownership.map((d) => (
                <div key={d.path} className="ownership-row">
                  <span className="ownership-row__dir">{d.path}/</span>
                  <span className="ownership-row__contribs">{d.contributors}</span>
                  <div className="ownership-row__owners">
                    {d.top_contributors.map((tc, i) => (
                      <span key={i} className="ownership-owner" style={{ opacity: 1 - i * 0.25 }}>
                        {tc.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {ownership.hotspot_files.length > 0 && (
          <div className="ownership-card">
            <h3>Bug hotspots</h3>
            <div className="ownership-table">
              {ownership.hotspot_files.map((f) => (
                <div key={f.path} className="ownership-row">
                  <span className="ownership-row__file">{f.path}</span>
                  <span className="ownership-row__bugs bad">{f.bug_changes} fixes</span>
                  <span className="ownership-row__owner">{f.top_contributor}</span>
                  <span className="ownership-row__contribs">{f.contributors} devs</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
