const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export interface WeatherRecord {
  time: string;
  temperature_c: number;
  relative_humidity: number;
  wind_speed_kmh: number;
  apparent_temperature_c: number;
  risk_level: 'lower' | 'moderate' | 'high' | 'very_high';
}

export interface WeatherResponse {
  latitude: number;
  longitude: number;
  hourly: WeatherRecord[];
  source: string;
}

export interface ShiftPlanResponse {
  recommendations: string[];
  higher_risk_hours: string[];
  moderate_risk_hours: string[];
  limitations: string;
}

export interface WaterPoint {
  point_id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
  last_reported_at: string | null;
  report_count: number;
  confidence: string;
  mapped_source: string;
}

export interface WaterPointsResponse {
  points: WaterPoint[];
  radius_m: number;
}

export interface WaterPointReportResponse {
  point_id: string;
  status: string;
  last_reported_at: string | null;
  report_count: number;
  confidence: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...init?.headers
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `API request failed (${response.status})`);
  }
  return payload as T;
}

export function getCoordinates(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location access is not available in this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, () => {
      reject(new Error('Location access is required to load local weather and water points.'));
    }, { enableHighAccuracy: false, timeout: 10000 });
  });
}

export function getWeather(latitude: number, longitude: number): Promise<WeatherResponse> {
  return request(`/weather?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`);
}

export function createShiftPlan(hourlyRisk: WeatherRecord[]): Promise<{ plan: ShiftPlanResponse }> {
  return request('/shift-plan', {
    method: 'POST',
    body: JSON.stringify({ hourly_risk: hourlyRisk })
  });
}

export function getWaterPoints(latitude: number, longitude: number): Promise<WaterPointsResponse> {
  return request(`/water-points?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`);
}

export function reportWaterPoint(pointId: string, status: 'Working' | 'Dry / not working' | 'Unable to verify'): Promise<WaterPointReportResponse> {
  return request(`/water-points/${encodeURIComponent(pointId)}/reports`, {
    method: 'POST',
    body: JSON.stringify({ status })
  });
}
