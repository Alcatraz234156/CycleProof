import { WaterStation, StationType, WaterFilterState } from '../types';

export const mockStations: WaterStation[] = [
  {
    id: 'WS-01',
    name: 'North Hub Chilled Dispenser #1',
    type: 'CHILLED_DISPENSER',
    status: 'ACTIVE',
    location: { lat: 13.0382, lng: 77.5684 },
    addressHint: 'Adjacent to Crew Trailer Alpha, Shade Zone 1',
    waterTempC: 11.2,
    capacityRemainingPercent: 88,
    filterHealthPercent: 94,
    lastInspection: 'Today at 08:30 AM',
    mistingActive: false
  },
  {
    id: 'WS-02',
    name: 'Sector 4B High-Velocity Misting Canopy',
    type: 'MISTING_CANOPY',
    status: 'ACTIVE',
    location: { lat: 13.0415, lng: 77.5721 },
    addressHint: 'Center of Heavy Machinery Staging Pad',
    waterTempC: 14.0,
    capacityRemainingPercent: 72,
    filterHealthPercent: 91,
    lastInspection: 'Today at 10:15 AM',
    mistingActive: true
  },
  {
    id: 'WS-03',
    name: 'Perimeter Hydrant & Electrolyte Station',
    type: 'FILTERED_HYDRANT',
    status: 'ACTIVE',
    location: { lat: 13.0351, lng: 77.5645 },
    addressHint: 'Gate 4 Logistics Access Corridor',
    waterTempC: 16.5,
    capacityRemainingPercent: 95,
    filterHealthPercent: 87,
    lastInspection: 'Yesterday at 16:00 PM',
    mistingActive: false
  },
  {
    id: 'WS-04',
    name: 'Solar Pad Rapid Relief & Eyewash Pod',
    type: 'EMERGENCY_EYEWASH',
    status: 'ACTIVE',
    location: { lat: 13.0442, lng: 77.5698 },
    addressHint: 'East Inverter Enclosure #7',
    waterTempC: 18.2,
    capacityRemainingPercent: 99,
    filterHealthPercent: 99,
    lastInspection: 'Today at 07:00 AM',
    mistingActive: false
  },
  {
    id: 'WS-05',
    name: 'South Quarry Chilled Hydration Unit #3',
    type: 'CHILLED_DISPENSER',
    status: 'REFILL_PENDING',
    location: { lat: 13.0319, lng: 77.5752 },
    addressHint: 'Lower Quarry Access Road, Berm #2',
    waterTempC: 13.8,
    capacityRemainingPercent: 18,
    filterHealthPercent: 78,
    lastInspection: 'Today at 11:45 AM',
    mistingActive: false
  }
];

export function filterStations(stations: WaterStation[], filter: WaterFilterState): WaterStation[] {
  return stations.filter((station) => {
    if (filter.onlyActive && station.status !== 'ACTIVE') {
      return false;
    }
    if (filter.stationType !== 'ALL' && station.type !== filter.stationType) {
      return false;
    }
    if (filter.searchQuery.trim().length > 0) {
      const query = filter.searchQuery.toLowerCase();
      const matchName = station.name.toLowerCase().includes(query);
      const matchHint = station.addressHint.toLowerCase().includes(query);
      if (!matchName && !matchHint) return false;
    }
    return true;
  });
}

export function getStationTypeLabel(type: StationType): string {
  switch (type) {
    case 'CHILLED_DISPENSER':
      return 'Chilled Dispenser (10-12°C)';
    case 'MISTING_CANOPY':
      return 'Misting Canopy Shelter';
    case 'FILTERED_HYDRANT':
      return 'Rapid Electrolyte Hydrant';
    case 'EMERGENCY_EYEWASH':
      return 'Emergency Relief & Eyewash';
  }
}
