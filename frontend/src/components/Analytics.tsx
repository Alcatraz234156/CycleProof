// CycleProof — Analytics Core Screen
// Visual charts for quantity reconciliation, document completeness, and discrepancy classification.
// Pure CSS implementation adhering strictly to the ShiftCool liquid glass aesthetic.

import React, { useState, useMemo } from 'react';
import type { AppStateReturn } from '../store/useAppState';

export interface AnalyticsProps {
  state: AppStateReturn['state'];
}

type TimeframeFilter = 'ALL' | 'OCT_2026' | 'SEP_2026';

export const Analytics: React.FC<AnalyticsProps> = ({ state }) => {
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('ALL');

  const filteredClaims = useMemo(() => {
    if (timeframe === 'OCT_2026') return state.claims.filter((c) => c.period.includes('Oct'));
    if (timeframe === 'SEP_2026') return state.claims.filter((c) => c.period.includes('Sep'));
    return state.claims;
  }, [state.claims, timeframe]);

  // Calculations
  const totalClaimed = filteredClaims.reduce((acc, c) => acc + c.claimed, 0);
  const totalDispatched = filteredClaims.reduce((acc, c) => acc + (c.dispatched ?? 0), 0);
  const matchRate = totalClaimed > 0 ? Math.round((totalDispatched / totalClaimed) * 100) : 0;

  const claimIds = useMemo(() => new Set(filteredClaims.map((c) => c.id)), [filteredClaims]);
  const relatedDiscrepancies = useMemo(
    () => state.discrepancies.filter((d) => claimIds.has(d.claimId)),
    [state.discrepancies, claimIds]
  );

  const openDiscrepancies = relatedDiscrepancies.filter((d) => d.status === 'Open').length;
  const underReviewDiscrepancies = relatedDiscrepancies.filter((d) => d.status === 'Under Review').length;
  const resolvedDiscrepancies = relatedDiscrepancies.filter((d) => d.status === 'Resolved').length;
  const totalDisc = relatedDiscrepancies.length;

  return (
    <section>
      <div className="cp-page-heading">
        <p className="cp-eyebrow">QUANTITY RECONCILIATION &amp; TRENDS</p>
        <h1>Operational<br />Analytics.</h1>
        <p className="lead">
          System-wide evidence reconciliation rates, material balance across facilities, and audit status distribution.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="cp-filter-row" style={{ margin: 0 }}>
          <button
            type="button"
            className={timeframe === 'ALL' ? 'active' : ''}
            onClick={() => setTimeframe('ALL')}
          >
            All reporting cycles
          </button>
          <button
            type="button"
            className={timeframe === 'OCT_2026' ? 'active' : ''}
            onClick={() => setTimeframe('OCT_2026')}
          >
            Oct 2026 batch
          </button>
          <button
            type="button"
            className={timeframe === 'SEP_2026' ? 'active' : ''}
            onClick={() => setTimeframe('SEP_2026')}
          >
            Sep 2026 batch
          </button>
        </div>
        <span style={{ fontSize: '.8rem', color: 'var(--muted)', fontWeight: 600 }}>
          Analyzing {filteredClaims.length} active claims
        </span>
      </div>

      {/* Top metrics summary */}
      <div className="cp-metrics" style={{ marginBottom: '2rem' }}>
        <article className="cp-metric">
          <span className="cp-metric-label">Claimed volume <span>⚖</span></span>
          <strong>{totalClaimed.toLocaleString()} t</strong>
          <small>Gross declared mass</small>
        </article>
        <article className="cp-metric">
          <span className="cp-metric-label">Verified dispatch <span>✓</span></span>
          <strong>{totalDispatched.toLocaleString()} t</strong>
          <small>Documented physical movement</small>
        </article>
        <article className="cp-metric">
          <span className="cp-metric-label">Reconciliation index <span>◌</span></span>
          <strong style={{ color: matchRate > 80 ? '#087b70' : '#a33720' }}>{matchRate}%</strong>
          <small>Dispatched vs claimed ratio</small>
        </article>
        <article className="cp-metric">
          <span className="cp-metric-label">Open discrepancies <span>!</span></span>
          <strong style={{ color: openDiscrepancies > 0 ? '#a33720' : '#087b70' }}>{openDiscrepancies}</strong>
          <small>Unresolved verification alerts</small>
        </article>
      </div>

      <div className="cp-analytics-charts">
        {/* Chart 1: Evidence Completeness */}
        <div className="cp-panel">
          <div className="cp-panel-head">
            <div>
              <p className="cp-eyebrow">CHAIN OF CUSTODY INTEGRITY</p>
              <h3>Supporting Evidence Completeness</h3>
              <small>Ratio of attached verifiable records against required audit dossier per claim</small>
            </div>
          </div>

          <div className="cp-chart-bar-h" style={{ marginTop: '1.2rem' }}>
            {filteredClaims.map((claim) => {
              const pct = claim.evidenceCount > 0 ? Math.round((claim.evidenceAttached / claim.evidenceCount) * 100) : 0;
              const barColor = pct === 100 ? '#1fa89a' : pct >= 60 ? '#ffb627' : '#e5502b';
              return (
                <div key={claim.id} className="cp-chart-bar-row">
                  <span className="cp-chart-bar-label" title={`${claim.id} — ${claim.partner}`}>
                    <b>{claim.id}</b> <small style={{ color: 'var(--muted)' }}>({claim.partner.slice(0, 14)}…)</small>
                  </span>
                  <div className="cp-chart-bar-track">
                    <div
                      className="cp-chart-bar-fill"
                      style={{ width: `${pct}%`, background: barColor }}
                    >
                      <span className="cp-chart-bar-val">
                        {claim.evidenceAttached}/{claim.evidenceCount} ({pct}%)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Material Balance Comparison */}
        <div className="cp-panel">
          <div className="cp-panel-head">
            <div>
              <p className="cp-eyebrow">MASS COMPARISON</p>
              <h3>Claimed vs Verified Dispatched Tonnage</h3>
              <small>Visual comparison of declared tonnage vs documented physical dispatches</small>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '1rem', marginTop: '1.2rem' }}>
            {filteredClaims.map((claim) => {
              const maxVal = Math.max(claim.claimed, claim.dispatched ?? 0, 1);
              const claimedPct = (claim.claimed / maxVal) * 100;
              const dispPct = claim.dispatched !== null ? (claim.dispatched / maxVal) * 100 : 0;
              return (
                <div
                  key={claim.id}
                  style={{
                    background: 'rgba(255,255,255,.4)',
                    padding: '1rem',
                    borderRadius: '16px',
                    border: '1px solid var(--line)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.4rem', fontSize: '.84rem' }}>
                    <b>{claim.id} — {claim.partner}</b>
                    <span style={{ color: 'var(--muted)' }}>
                      Variance: {claim.dispatched !== null ? `${claim.claimed - claim.dispatched} t` : 'Data pending'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gap: '.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', fontSize: '.75rem' }}>
                      <span style={{ width: '80px', color: 'var(--muted)' }}>Claimed</span>
                      <div style={{ flex: 1, height: '12px', background: 'rgba(12,43,51,.08)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${claimedPct}%`, height: '100%', background: '#ffb627' }} />
                      </div>
                      <b style={{ width: '50px', textAlign: 'right' }}>{claim.claimed} t</b>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', fontSize: '.75rem' }}>
                      <span style={{ width: '80px', color: 'var(--muted)' }}>Dispatched</span>
                      <div style={{ flex: 1, height: '12px', background: 'rgba(12,43,51,.08)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${dispPct}%`, height: '100%', background: '#0c2b33' }} />
                      </div>
                      <b style={{ width: '50px', textAlign: 'right' }}>
                        {claim.dispatched !== null ? `${claim.dispatched} t` : '—'}
                      </b>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 3: Discrepancy Status Breakdown */}
        <div className="cp-panel">
          <div className="cp-panel-head">
            <div>
              <p className="cp-eyebrow">AUDIT RESOLUTION PROGRESS</p>
              <h3>Investigation Status Breakdown</h3>
              <small>Proportion of flagged inconsistencies currently being investigated vs resolved</small>
            </div>
          </div>

          {totalDisc === 0 ? (
            <p className="cp-empty">No discrepancies recorded for the selected timeframe.</p>
          ) : (
            <div style={{ marginTop: '1.2rem' }}>
              <div className="cp-chart-stacked">
                <div
                  className="cp-chart-stacked-seg"
                  style={{
                    flex: openDiscrepancies,
                    background: '#e5502b',
                    display: openDiscrepancies > 0 ? 'flex' : 'none',
                  }}
                  title={`Open: ${openDiscrepancies}`}
                >
                  <span>Open ({openDiscrepancies})</span>
                </div>
                <div
                  className="cp-chart-stacked-seg"
                  style={{
                    flex: underReviewDiscrepancies,
                    background: '#2a6fdb',
                    display: underReviewDiscrepancies > 0 ? 'flex' : 'none',
                  }}
                  title={`Under Review: ${underReviewDiscrepancies}`}
                >
                  <span>In Review ({underReviewDiscrepancies})</span>
                </div>
                <div
                  className="cp-chart-stacked-seg"
                  style={{
                    flex: resolvedDiscrepancies,
                    background: '#1fa89a',
                    display: resolvedDiscrepancies > 0 ? 'flex' : 'none',
                  }}
                  title={`Resolved: ${resolvedDiscrepancies}`}
                >
                  <span>Resolved ({resolvedDiscrepancies})</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', justifyContent: 'center', fontSize: '.8rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                  <i style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#e5502b', display: 'inline-block' }} />
                  Open ({openDiscrepancies})
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                  <i style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2a6fdb', display: 'inline-block' }} />
                  Under Review ({underReviewDiscrepancies})
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                  <i style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#1fa89a', display: 'inline-block' }} />
                  Resolved ({resolvedDiscrepancies})
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="cp-disclaimer">
        Chart note: All data points represent synthetic verification telemetry processed locally in-browser.
      </p>
    </section>
  );
};

export default Analytics;

