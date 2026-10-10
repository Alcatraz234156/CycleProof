export type HeatRiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' | 'CRITICAL';

export interface EnvironmentalTelemetry {
  ambientTempC: number;
  relativeHumidity: number;
  wetBulbGlobeTempC: number;
  heatIndexC: number;
  uvIndex: number;
  solarRadiationWm2: number;
  windSpeedKmh: number;
  recordedAt: string;
}

export interface WorkRestCycle {
  riskLevel: HeatRiskLevel;
  workMinutes: number;
  restMinutes: number;
  hydrationMlPerHour: number;
  ppeAdvisory: string;
  mandatoryShade: boolean;
}

export interface ThermalAlert {
  id: string;
  level: HeatRiskLevel;
  title: string;
  description: string;
  timestamp: string;
  actionRequired: string;
}
