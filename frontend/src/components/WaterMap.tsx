import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getCoordinates, getWaterPoints, mockStations, filterStations, getStationTypeLabel, reportWaterPoint, WaterPoint } from '../services';
import { WaterStation, StationType, WaterFilterState } from '../types';

export const WaterMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [filter, setFilter] = useState<WaterFilterState>({
    searchQuery: '',
    stationType: 'ALL',
    onlyActive: false
  });

  const [selectedStation, setSelectedStation] = useState<WaterStation | null>(mockStations[0]);
  const [stations, setStations] = useState<WaterStation[]>(mockStations);
  const [error, setError] = useState('');
  const filteredStations = filterStations(stations, filter);

  useEffect(() => {
    getCoordinates()
      .then(({ coords }) => getWaterPoints(coords.latitude, coords.longitude))
      .then(({ points }) => {
        const mapped = points.map((point: WaterPoint): WaterStation => ({
          id: point.point_id,
          name: point.name,
          type: 'FILTERED_HYDRANT',
          status: point.status === 'Working' ? 'ACTIVE' : point.status === 'Dry / not working' ? 'OFFLINE' : 'REFILL_PENDING',
          location: { lat: point.latitude, lng: point.longitude },
          addressHint: `${point.confidence} confidence · ${point.report_count} reports`,
          waterTempC: 0,
          capacityRemainingPercent: 100,
          filterHealthPercent: 100,
          lastInspection: point.last_reported_at || 'Not yet reported',
          mistingActive: false
        }));
        setStations(mapped);
        setSelectedStation(mapped[0] || null);
      })
      .catch((cause: Error) => setError(cause.message));
  }, []);

  const submitReport = async (status: 'Working' | 'Dry / not working' | 'Unable to verify') => {
    if (!selectedStation) return;
    try {
      const updated = await reportWaterPoint(selectedStation.id, status);
      setStations((current) => current.map((station) => station.id === selectedStation.id
        ? { ...station, status: updated.status === 'Working' ? 'ACTIVE' : updated.status === 'Dry / not working' ? 'OFFLINE' : 'REFILL_PENDING' }
        : station));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to submit report.');
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center around station clusters (e.g. 13.038, 77.570)
      const map = L.map(mapContainerRef.current, {
        center: [13.038, 77.570],
        zoom: 14,
        zoomControl: true,
        attributionControl: false
      });

      // Dark tile layer (CartoDB Dark Matter)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync Markers with Filtered Stations
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    filteredStations.forEach((station) => {
      // Custom HTML Marker Icon
      const isMisting = station.type === 'MISTING_CANOPY';
      const isSelected = selectedStation?.id === station.id;

      const color = isSelected ? '#ff4d2e' : isMisting ? '#0e9f8f' : '#2f6fe4';
      const size = isSelected ? 22 : 14;

      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 0 0 ${isSelected ? 2 : 1}px ${isSelected ? '#161513' : 'rgba(0,0,0,.28)'}"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });

      const marker = L.marker([station.location.lat, station.location.lng], { icon: customIcon });

      marker.bindPopup(`<strong>${station.name}</strong><br/><span style="color:#6d675d">${station.waterTempC}°C · ${station.capacityRemainingPercent}% left</span>`);

      marker.on('click', () => {
        setSelectedStation(station);
      });

      markersLayerRef.current?.addLayer(marker);
    });
  }, [filteredStations, selectedStation]);

  const handleStationClick = (station: WaterStation) => {
    setSelectedStation(station);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([station.location.lat, station.location.lng], 15, { duration: 1 });
    }
  };

  return (
    <section className="sec">
      <div className="sec__head">
        <div>
          <div className="eyebrow">Water &amp; shade</div>
          <h2>Cold water,<br />within walking distance.</h2>
        </div>
      </div>

      <div className="water">
        <div>
          <div className="find">
            <input placeholder="Search stations…" aria-label="Search stations" value={filter.searchQuery}
              onChange={(e) => setFilter({ ...filter, searchQuery: e.target.value })} />
            <select aria-label="Station type" value={filter.stationType}
              onChange={(e) => setFilter({ ...filter, stationType: e.target.value as StationType | 'ALL' })}>
              <option value="ALL">All types</option>
              <option value="CHILLED_DISPENSER">Chilled</option>
              <option value="MISTING_CANOPY">Misting</option>
              <option value="FILTERED_HYDRANT">Electrolyte</option>
              <option value="EMERGENCY_EYEWASH">Eyewash</option>
            </select>
          </div>
          <ul className="stations">
            {filteredStations.map((st) => (
              <li key={st.id}>
                <button className="st" aria-pressed={selectedStation?.id === st.id} onClick={() => handleStationClick(st)}>
                  <div className="st__row"><span className="st__name">{st.name}</span><span className="st__temp num">{st.waterTempC}°</span></div>
                  <div className="st__meta">{getStationTypeLabel(st.type)}</div>
                  {selectedStation?.id === st.id && (
                    <div className="st__more">
                      {st.addressHint} · {st.status === 'ACTIVE' ? 'active' : 'refill pending'}{st.mistingActive ? ' · misting on' : ''}
                      <div className="meter"><span style={{ width: `${st.capacityRemainingPercent}%` }} /></div>
                      {st.capacityRemainingPercent}% water left · filter {st.filterHealthPercent}%
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="map">
          <div ref={mapContainerRef} className="map__canvas" />
          <div className="map__count">{filteredStations.length} stations</div>
        </div>
      </div>
      {error && <div className="headsup"><b>Using demo water data —</b><span>{error}</span></div>}
      {selectedStation && <div className="actions">
        <button className="btn" onClick={() => submitReport('Working')}>Report working</button>
        <button className="link" onClick={() => submitReport('Dry / not working')}>Report dry / not working</button>
      </div>}
    </section>
  );
};
