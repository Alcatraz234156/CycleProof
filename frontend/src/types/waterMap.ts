export type StationType = 'CHILLED_DISPENSER' | 'MISTING_CANOPY' | 'FILTERED_HYDRANT' | 'EMERGENCY_EYEWASH';
export type StationStatus = 'ACTIVE' | 'MAINTENANCE_REQUIRED' | 'REFILL_PENDING' | 'OFFLINE';

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface WaterStation {
  id: string;
  name: string;
  type: StationType;
  status: StationStatus;
  location: GeoCoordinates;
  addressHint: string;
  waterTempC: number;
  capacityRemainingPercent: number;
  filterHealthPercent: number;
  lastInspection: string;
  mistingActive: boolean;
}

export interface WaterFilterState {
  searchQuery: string;
  stationType: StationType | 'ALL';
  onlyActive: boolean;
}
