// CycleProof — Organizations (Feature 3)
// Recipient, transporter, and processor registry with claim association, performance ratio, and gap tracking.

import React, { useState, useMemo } from 'react';
import type { OrgType } from '../types';
import type { AppStateReturn } from '../store/useAppState';

export interface OrganizationsProps {
  state: AppStateReturn['state'];
  onClaimSelect: (id: string) => void;
  onNavigate: (tab: string) => void;
}

type SortOption = 'name' | 'discrepancies-desc' | 'status';

function timeAgo(isoStr: string): string {
  const ms = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const ALL_TYPES: ('All' | OrgType)[] = [
  'All',
  'Collection Center',
  'E-Waste Recycler',
  'Processing Facility',
  'Material Recovery Facility',
  'Dispatch Destination',
];

export const Organizations: React.FC<OrganizationsProps> = ({
  state,
  onClaimSelect,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'All' | OrgType>('All');
  const [sort, setSort] = useState<SortOption>('discrepancies-desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredOrgs = useMemo(() => {
    return state.organizations
      .filter((org) => {
        const matchesQuery =
          org.name.toLowerCase().includes(query.toLowerCase()) ||
          org.location.toLowerCase().includes(query.toLowerCase()) ||
          org.registrationId.toLowerCase().includes(query.toLowerCase());
        const matchesType = selectedType === 'All' || org.type === selectedType;
        return matchesQuery && matchesType;
      })
      .sort((a, b) => {
        if (sort === 'discrepancies-desc') return b.openDiscrepancies - a.openDiscrepancies;
        if (sort === 'status') return a.status.localeCompare(b.status);
        return a.name.localeCompare(b.name);
      });
  }, [state.organizations, query, selectedType, sort]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <section>
      <div className="cp-page-heading">
        <p className="cp-eyebrow">RECYCLING CHAIN ENTITIES</p>
        <h1>Organizations &amp;<br />Facilities.</h1>
        <p className="lead">
          Directory of registered e-waste collection hubs, shredding facilities, recovery units, and dispatch endpoints across the verification ledger.
        </p>
      </div>

      <div className="cp-panel" style={{ marginBottom: '1.5rem' }}>
        <div className="cp-claims-header">
          <div style={{ flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              className="field"
              placeholder="Search facility name, city, or registration ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search organizations"
            />
          </div>
          <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
            <span style={{ fontSize: '.78rem', color: 'var(--muted)', fontWeight: 700 }}>Sort:</span>
            <select
              className="cp-sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
            >
              <option value="discrepancies-desc">Open discrepancies ↓</option>
              <option value="name">Name (A–Z)</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>

        <div className="cp-filter-row" style={{ marginTop: '.8rem' }}>
          {ALL_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={selectedType === t ? 'active' : ''}
              onClick={() => setSelectedType(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="cp-org-grid">
        {filteredOrgs.length === 0 ? (
          <div className="cp-panel" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 1rem' }}>
            <p style={{ fontWeight: 600 }}>No organizations match the filter criteria.</p>
            <small className="cp-muted">Try clearing the search query or selecting 'All' facility types.</small>
          </div>
        ) : (
          filteredOrgs.map((org) => {
            const isExpanded = expandedId === org.id;
            const matchRatio =
              org.totalClaimedTonnes > 0
                ? Math.min(100, Math.round((org.totalRecordedTonnes / org.totalClaimedTonnes) * 100))
                : 0;

            const orgClaims = state.claims.filter((c) => org.claimIds.includes(c.id));

            return (
              <div
                key={org.id}
                className={`cp-org-card ${isExpanded ? 'is-expanded' : ''}`}
                onClick={() => toggleExpand(org.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '.8rem' }}>
                  <div>
                    <h3 className="cp-org-name">{org.name}</h3>
                    <p className="cp-org-meta">
                      📍 {org.location} &nbsp;•&nbsp; ID: <code style={{ fontSize: '.76rem', color: 'var(--water)' }}>{org.registrationId}</code>
                    </p>
                  </div>
                  <span
                    className={`cp-status ${
                      org.status === 'Active'
                        ? 'reconciled'
                        : org.status === 'Under Review'
                        ? 'needs-review'
                        : 'open'
                    }`}
                  >
                    {org.status}
                  </span>
                </div>

                <div style={{ display: 'inline-block', fontSize: '.72rem', fontWeight: 800, color: 'var(--muted)', background: 'rgba(12,43,51,.06)', padding: '.2rem .6rem', borderRadius: '999px', marginBottom: '.8rem' }}>
                  {org.type}
                </div>

                <div className="cp-org-stats">
                  <div className="cp-org-stat">
                    <span>Claims</span>
                    <b>{org.claimIds.length}</b>
                  </div>
                  <div className="cp-org-stat">
                    <span>Claimed</span>
                    <b>{org.totalClaimedTonnes} t</b>
                  </div>
                  <div className="cp-org-stat">
                    <span>Recorded</span>
                    <b>{org.totalRecordedTonnes} t</b>
                  </div>
                  <div className="cp-org-stat">
                    <span>Discrepancies</span>
                    <b style={{ color: org.openDiscrepancies > 0 ? '#a33720' : '#087b70' }}>
                      {org.openDiscrepancies}
                    </b>
                  </div>
                  <div className="cp-org-stat">
                    <span>Doc Gaps</span>
                    <b style={{ color: org.evidenceGaps > 0 ? '#a33720' : '#087b70' }}>
                      {org.evidenceGaps}
                    </b>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '.8rem', fontSize: '.72rem', color: 'var(--muted)' }}>
                  <span>Contact: {org.contactName}</span>
                  <span>Active {timeAgo(org.lastActivityIso)}</span>
                </div>

                {isExpanded && (
                  <div className="cp-org-expand" onClick={(e) => e.stopPropagation()}>
                    <div style={{ marginBottom: '.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.78rem', fontWeight: 700, marginBottom: '.3rem' }}>
                        <span>Reconciled Mass Ratio</span>
                        <span>{matchRatio}% matched</span>
                      </div>
                      <div className="cp-org-perf-bar">
                        <div
                          className="cp-org-perf-fill"
                          style={{
                            width: `${matchRatio}%`,
                            background: matchRatio > 85 ? '#1fa89a' : matchRatio > 50 ? '#ffb627' : '#e5502b',
                          }}
                        />
                      </div>
                    </div>

                    <p className="cp-eyebrow" style={{ marginBottom: '.4rem' }}>ASSOCIATED CLAIMS</p>
                    <div style={{ display: 'grid', gap: '.4rem' }}>
                      {orgClaims.map((claim) => (
                        <div
                          key={claim.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '.5rem .8rem',
                            borderRadius: '12px',
                            background: 'rgba(255,255,255,.5)',
                            fontSize: '.82rem',
                          }}
                        >
                          <div>
                            <b style={{ color: 'var(--water)' }}>{claim.id}</b>
                            <span style={{ marginLeft: '.6rem', color: 'var(--muted)' }}>
                              {claim.claimed} t claimed • {claim.period}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="btn cp-small-button"
                            style={{ padding: '.3rem .7rem', fontSize: '.72rem' }}
                            onClick={() => {
                              onClaimSelect(claim.id);
                              onNavigate('CLAIMS');
                            }}
                          >
                            Inspect claim →
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <p className="cp-disclaimer">
        Disclaimer: All organizational identifiers, compliance metrics, and processing facility records are fictional demonstration assets.
      </p>
    </section>
  );
};

export default Organizations;
