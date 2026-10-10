// CycleProof — EvidenceManager (Evidence Management Core Screen)
// Local browser-side CSV ingest, flexible column mapping, validation preview, and evidence inventory.

import React, { useState, useRef, useMemo } from 'react';
import type { ChangeEvent } from 'react';
import type { AppStateReturn } from '../store/useAppState';

export interface EvidenceManagerProps {
  state: AppStateReturn['state'];
  importEvidenceFromCSV: AppStateReturn['importEvidenceFromCSV'];
  onNavigate: (tab: string) => void;
}

type EvidenceFilter = 'ALL' | 'PRESENT' | 'MISSING';

export const EvidenceManager: React.FC<EvidenceManagerProps> = ({
  state,
  importEvidenceFromCSV,
  onNavigate,
}) => {
  const [fileName, setFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvDataRows, setCsvDataRows] = useState<string[][]>([]);
  const [csvError, setCsvError] = useState('');
  const [notice, setNotice] = useState('');
  const [targetClaimId, setTargetClaimId] = useState<string>(state.claims[0]?.id ?? '');

  // Column mapping states
  const [mapping, setMapping] = useState({
    reference_id: '',
    record_type: '',
    quantity_tonnes: '',
    date: '',
    source: '',
  });

  // Evidence vault browser filter states
  const [vaultClaimFilter, setVaultClaimFilter] = useState('ALL');
  const [vaultDocStatus, setVaultDocStatus] = useState<EvidenceFilter>('ALL');
  const [vaultSearch, setVaultSearch] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvError('');
    setNotice('');

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setCsvError('Please upload a standard comma-separated (.csv) file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = String(reader.result ?? '').replace(/^\uFEFF/, '');
        const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);

        if (lines.length < 2) {
          setCsvError('The CSV file must contain a header row and at least one data row.');
          return;
        }

        const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
        const rows = lines.slice(1).map((line) =>
          line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
        );

        setFileName(file.name);
        setCsvHeaders(headers);
        setCsvDataRows(rows);

        // Auto-detect mappings based on header names
        const autoMap = {
          reference_id: headers.find((h) => /ref|ticket|id/i.test(h)) || headers[0] || '',
          record_type: headers.find((h) => /type|stage/i.test(h)) || headers[1] || '',
          quantity_tonnes: headers.find((h) => /quant|ton|mass|weight/i.test(h)) || headers[2] || '',
          date: headers.find((h) => /date|time/i.test(h)) || headers[3] || '',
          source: headers.find((h) => /source|partner|facility|issuer/i.test(h)) || '',
        };
        setMapping(autoMap);
        setNotice(`Successfully read ${rows.length} rows from ${file.name}. Review column mapping below.`);
      } catch (err) {
        setCsvError('Could not parse file contents. Please verify the CSV format.');
      }
    };
    reader.onerror = () => setCsvError('Failed to read file from disk.');
    reader.readAsText(file);
  };

  const handleExecuteImport = () => {
    if (!targetClaimId) {
      setCsvError('Please select a destination claim to associate records with.');
      return;
    }
    if (csvDataRows.length === 0) {
      setCsvError('No rows available to import.');
      return;
    }

    // Convert rows using mappings
    const structuredRows: Record<string, string>[] = csvDataRows.map((row) => {
      const getVal = (colName: string) => {
        const idx = csvHeaders.indexOf(colName);
        return idx !== -1 ? row[idx] ?? '' : '';
      };

      return {
        reference_id: getVal(mapping.reference_id) || `REC-${Math.floor(1000 + Math.random() * 9000)}`,
        record_type: getVal(mapping.record_type) || 'Received',
        quantity_tonnes: getVal(mapping.quantity_tonnes) || '0',
        date: getVal(mapping.date) || new Date().toISOString().split('T')[0],
        source: getVal(mapping.source) || 'Uploaded Manifest',
      };
    });

    importEvidenceFromCSV(targetClaimId, structuredRows);
    setNotice(`Successfully imported ${structuredRows.length} records into claim ${targetClaimId}!`);
    setCsvDataRows([]);
    setCsvHeaders([]);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadSampleTemplate = () => {
    const csvContent = [
      'reference_id,record_type,quantity_tonnes,date,source',
      'WB-1089,Received,34.5,2026-10-02,BridgeTech Weighbridge',
      'REC-4412,Processed,28.0,2026-10-04,Gujarat E-Recyclers',
      'DSP-8901,Dispatched,26.2,2026-10-06,Nova Logistics Hub',
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cycleproof_evidence_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filter evidence vault
  const filteredVault = useMemo(() => {
    return state.evidence.filter((item) => {
      const matchesClaim = vaultClaimFilter === 'ALL' || item.claimId === vaultClaimFilter;
      const matchesStatus =
        vaultDocStatus === 'ALL' ||
        (vaultDocStatus === 'PRESENT' && !item.missing) ||
        (vaultDocStatus === 'MISSING' && item.missing);
      const matchesSearch =
        item.reference.toLowerCase().includes(vaultSearch.toLowerCase()) ||
        item.source.toLowerCase().includes(vaultSearch.toLowerCase()) ||
        item.type.toLowerCase().includes(vaultSearch.toLowerCase());
      return matchesClaim && matchesStatus && matchesSearch;
    });
  }, [state.evidence, vaultClaimFilter, vaultDocStatus, vaultSearch]);

  return (
    <section>
      <div className="cp-page-heading">
        <p className="cp-eyebrow">SOURCE RECORDS &amp; MANIFESTS</p>
        <h1>Evidence Vault.</h1>
        <p className="lead">
          Import weighbridge weight receipts, processing batch summaries, and chain-of-custody documentation directly into claim dossiers.
        </p>
      </div>

      {/* Top Upload + Checklist Grid */}
      <div className="cp-upload-layout">
        <div className="cp-panel cp-upload-panel">
          <div className="cp-upload-icon">↑</div>
          <p className="cp-eyebrow">BROWSER-LOCAL INGESTION</p>
          <h2>Bring in a record.</h2>
          <p className="cp-muted">
            Upload CSV manifests exported from weighbridges, shredder facilities, or haulers. Files are parsed purely within your browser memory; zero cloud upload.
          </p>

          <input
            ref={fileInputRef}
            className="cp-file-input"
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
          />

          <div style={{ display: 'flex', gap: '.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => fileInputRef.current?.click()}>
              Choose CSV file
            </button>
            <button
              type="button"
              className="cp-text-button"
              onClick={downloadSampleTemplate}
              style={{ fontSize: '.84rem' }}
            >
              ↓ Download template (.csv)
            </button>
          </div>

          {fileName && <p className="cp-file-name">✓ Loaded: {fileName}</p>}
          {csvError && <p className="cp-error" role="alert">{csvError}</p>}
          {notice && <p className="cp-notice" role="status">{notice}</p>}

          <div className="cp-file-hint">
            <b>Recommended schema headers</b>
            <span>reference_id, record_type, quantity_tonnes, date, source</span>
          </div>
        </div>

        <div className="cp-panel cp-evidence-side">
          <p className="cp-eyebrow">VERIFICATION PROTOCOL</p>
          <h3>What makes a record valid?</h3>
          {[
            ['01', 'Source entity authenticity', 'Must carry issuer stamp, facility ID, or calibrated scale certification.'],
            ['02', 'Unit standardized mass', 'Net metric tonnage verified across tare weight and gross weight fields.'],
            ['03', 'Sequential timestamping', 'Chronologically aligned between collection, intake, and recovery dates.'],
            ['04', 'Direct claim linkage', 'Corresponds unequivocally to a specific reported e-waste batch ID.'],
          ].map(([num, title, desc]) => (
            <div className="cp-check-row" key={num}>
              <span>{num}</span>
              <div>
                <b>{title}</b>
                <small>{desc}</small>
              </div>
              <i>↗</i>
            </div>
          ))}
          <p className="cp-disclaimer">
            Review note: Attached files validate claims within this browser testbed. Discrepancies prompt audit review before certification.
          </p>
        </div>
      </div>

      {/* CSV Preview and Column Mapping Section */}
      {csvDataRows.length > 0 && (
        <div className="cp-panel cp-preview">
          <div className="cp-panel-head">
            <div>
              <p className="cp-eyebrow">FIELD MAPPING &amp; TARGET SELECTION</p>
              <h3>Map columns for {fileName}</h3>
              <small>Assign your CSV column names to CycleProof's evidence schema</small>
            </div>
            <button
              type="button"
              className="cp-text-button"
              onClick={() => {
                setCsvDataRows([]);
                setCsvHeaders([]);
                setFileName('');
              }}
            >
              Clear file ×
            </button>
          </div>

          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '.8rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '.84rem', fontWeight: 700 }}>Associate with Claim:</span>
            <select
              className="cp-sort-select"
              value={targetClaimId}
              onChange={(e) => setTargetClaimId(e.target.value)}
            >
              {state.claims.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} — {c.partner} ({c.period})
                </option>
              ))}
            </select>
          </div>

          <div className="cp-col-map">
            <div className="cp-col-map-row">
              <span className="cp-col-map-field">Reference ID:</span>
              <select
                className="cp-col-map-select"
                value={mapping.reference_id}
                onChange={(e) => setMapping({ ...mapping, reference_id: e.target.value })}
              >
                {csvHeaders.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div className="cp-col-map-row">
              <span className="cp-col-map-field">Material Stage:</span>
              <select
                className="cp-col-map-select"
                value={mapping.record_type}
                onChange={(e) => setMapping({ ...mapping, record_type: e.target.value })}
              >
                {csvHeaders.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div className="cp-col-map-row">
              <span className="cp-col-map-field">Quantity (Tonnes):</span>
              <select
                className="cp-col-map-select"
                value={mapping.quantity_tonnes}
                onChange={(e) => setMapping({ ...mapping, quantity_tonnes: e.target.value })}
              >
                {csvHeaders.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div className="cp-col-map-row">
              <span className="cp-col-map-field">Date:</span>
              <select
                className="cp-col-map-select"
                value={mapping.date}
                onChange={(e) => setMapping({ ...mapping, date: e.target.value })}
              >
                {csvHeaders.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div className="cp-col-map-row">
              <span className="cp-col-map-field">Source Facility:</span>
              <select
                className="cp-col-map-select"
                value={mapping.source}
                onChange={(e) => setMapping({ ...mapping, source: e.target.value })}
              >
                <option value="">(None / Default)</option>
                {csvHeaders.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ margin: '1rem 0' }}>
            <button className="btn" onClick={handleExecuteImport}>
              Confirm &amp; Import {csvDataRows.length} Records →
            </button>
          </div>

          <p className="cp-eyebrow" style={{ marginTop: '1.5rem' }}>PREVIEW OF FIRST 6 ROWS</p>
          <div className="cp-table-scroll">
            <table className="cp-table">
              <thead>
                <tr>
                  {csvHeaders.map((h, i) => (
                    <th key={i}>{h || `Col ${i + 1}`}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvDataRows.slice(0, 6).map((r, i) => (
                  <tr key={i}>
                    {csvHeaders.map((_, colIdx) => (
                      <td key={colIdx}>{r[colIdx] || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Evidence Vault Inventory Table */}
      <div className="cp-panel" style={{ marginTop: '2rem' }}>
        <div className="cp-panel-head">
          <div>
            <p className="cp-eyebrow">VERIFIED REPOSITORY</p>
            <h3>All Registered Evidence Records</h3>
            <small>{filteredVault.length} records matching current filter</small>
          </div>
        </div>

        <div className="cp-ev-filters">
          <input
            type="text"
            className="field"
            placeholder="Search by ticket ref, doc type, or facility…"
            value={vaultSearch}
            onChange={(e) => setVaultSearch(e.target.value)}
            style={{ maxWidth: '320px', padding: '.45rem .9rem', fontSize: '.82rem' }}
          />

          <select
            value={vaultClaimFilter}
            onChange={(e) => setVaultClaimFilter(e.target.value)}
          >
            <option value="ALL">All Claims</option>
            {state.claims.map((c) => (
              <option key={c.id} value={c.id}>{c.id} ({c.partner.slice(0, 16)}…)</option>
            ))}
          </select>

          <div className="cp-filter-row" style={{ margin: 0 }}>
            <button
              type="button"
              className={vaultDocStatus === 'ALL' ? 'active' : ''}
              onClick={() => setVaultDocStatus('ALL')}
            >
              All
            </button>
            <button
              type="button"
              className={vaultDocStatus === 'PRESENT' ? 'active' : ''}
              onClick={() => setVaultDocStatus('PRESENT')}
            >
              Verified (Present)
            </button>
            <button
              type="button"
              className={vaultDocStatus === 'MISSING' ? 'active' : ''}
              onClick={() => setVaultDocStatus('MISSING')}
            >
              Missing Gaps ⚠
            </button>
          </div>
        </div>

        <div className="cp-table-scroll">
          <table className="cp-table">
            <thead>
              <tr>
                <th>Reference / Document</th>
                <th>Claim ID</th>
                <th>Material Stage</th>
                <th>Recorded Quantity</th>
                <th>Source / Facility</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredVault.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                    No evidence records found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredVault.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <b>{item.reference}</b>
                      <small>{item.type}</small>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="cp-text-button"
                        style={{ padding: 0, fontSize: '.8rem', color: 'var(--water)' }}
                        onClick={() => onNavigate('CLAIMS')}
                      >
                        {item.claimId}
                      </button>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{item.stage}</span>
                    </td>
                    <td>
                      {item.quantityTonnes !== null ? (
                        <b>{item.quantityTonnes} t</b>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>—</span>
                      )}
                    </td>
                    <td>{item.source}</td>
                    <td>
                      {item.missing ? (
                        <span className="cp-status needs-review">Missing Evidence ⚠</span>
                      ) : (
                        <span className="cp-status reconciled">Verified ✓</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default EvidenceManager;
