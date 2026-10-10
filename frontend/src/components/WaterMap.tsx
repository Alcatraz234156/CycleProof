import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { mockStations, filterStations, getStationTypeLabel } from '../services';
import type { WaterStation, StationType, WaterFilterState, StationStatus } from '../types';

const TYPES: { id: StationType | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All' }, { id: 'CHILLED_DISPENSER', label: 'Chilled' },
  { id: 'MISTING_CANOPY', label: 'Misting' }, { id: 'FILTERED_HYDRANT', label: 'Electrolyte' }, { id: 'EMERGENCY_EYEWASH', label: 'Eyewash' }
];
const STATUS: Record<StationStatus, { label: string; color: string }> = {
  ACTIVE: { label: 'Ready', color: '#1fa89a' },
  REFILL_PENDING: { label: 'Refill pending', color: '#e0a400' },
  MAINTENANCE_REQUIRED: { label: 'Needs maintenance', color: '#ee7f1f' },
  OFFLINE: { label: 'Offline', color: '#8a9a9f' }
};

export const WaterMap: React.FC = () => {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const [filter, setFilter] = useState<WaterFilterState>({ searchQuery: '', stationType: 'ALL', onlyActive: false });
  const [sel, setSel] = useState<WaterStation | null>(mockStations[0]);
  const stations = useMemo(() => filterStations(mockStations, filter), [filter]);

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { center: [13.038, 77.57], zoom: 14, zoomControl: false });
    L.control.zoom({ position: 'bottomright' }).addTo(m);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19, subdomains: 'abcd',
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; layer.current = null; };
  }, []);

  useEffect(() => {
    if (!layer.current) return;
    layer.current.clearLayers();
    stations.forEach((s) => {
      const on = sel?.id === s.id;
      const size = on ? 26 : 16;
      const icon = L.divIcon({
        className: 'pin', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
        html: `<span class="pin__dot${on ? ' is-on' : ''}" style="--c:${STATUS[s.status].color}"></span>`
      });
      L.marker([s.location.lat, s.location.lng], { icon, title: s.name, keyboard: false })
        .on('click', () => setSel(s)).addTo(layer.current as L.LayerGroup);
    });
  }, [stations, sel]);

  const pick = (s: WaterStation) => { setSel(s); map.current?.flyTo([s.location.lat, s.location.lng], 15, { duration: 0.9 }); };
  const set = (p: Partial<WaterFilterState>) => setFilter({ ...filter, ...p });

  return (
    <section>
      <div className="head"><h2>Cold water nearby</h2></div>
      <div className="water">
        <div className="water__side">
          <input className="field" type="search" placeholder="Search by name or place" aria-label="Search stations"
            value={filter.searchQuery} onChange={(e) => set({ searchQuery: e.target.value })} />
          <div className="chips" role="group" aria-label="Station type">
            {TYPES.map((t) => <button key={t.id} aria-pressed={filter.stationType === t.id} onClick={() => set({ stationType: t.id })}>{t.label}</button>)}
          </div>
          <label className="check"><input type="checkbox" checked={filter.onlyActive} onChange={(e) => set({ onlyActive: e.target.checked })} />Ready now only</label>

          {stations.length === 0 ? (
            <p className="empty">No stations match.{' '}
              <button className="link" onClick={() => setFilter({ searchQuery: '', stationType: 'ALL', onlyActive: false })}>Clear filters</button></p>
          ) : (
            <ul className="stations">
              {stations.map((s, k) => {
                const open = sel?.id === s.id, st = STATUS[s.status];
                return (
                  <li key={s.id} style={{ '--k': k } as React.CSSProperties}>
                    <button className="st" aria-pressed={open} onClick={() => pick(s)}>
                      <span className="st__row"><b>{s.name}</b><span className="num">{s.waterTempC}°</span></span>
                      <span className="st__meta"><i style={{ background: st.color }} />{st.label}, {getStationTypeLabel(s.type)}</span>
                      <span className="st__more" data-open={open} aria-hidden={!open}>
                        <span className="st__in">
                          {s.addressHint}{s.mistingActive ? '. Misting is on.' : ''}
                          <span className="meter" aria-hidden="true"><span style={{ width: open ? `${s.capacityRemainingPercent}%` : 0, background: st.color }} /></span>
                          {s.capacityRemainingPercent}% water left, filter {s.filterHealthPercent}%. Checked {s.lastInspection.toLowerCase()}.
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="map"><div ref={el} className="map__canvas" aria-label="Map of water stations" /></div>
      </div>
    </section>
  );
};
