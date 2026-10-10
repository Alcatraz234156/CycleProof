import { EnvironmentalTelemetry, HeatRiskLevel, WorkRestCycle, ThermalAlert } from '../types';

export const mockTelemetry: EnvironmentalTelemetry = {
  ambientTempC: 38.6,
  relativeHumidity: 62,
  wetBulbGlobeTempC: 32.4,
  heatIndexC: 43.1,
  uvIndex: 9.8,
  solarRadiationWm2: 890,
  windSpeedKmh: 9.4,
  recordedAt: 'Live Telemetry - Sector 4B'
};

export function getHeatRiskLevel(wbgtC: number): HeatRiskLevel {
  if (wbgtC >= 32.2) return 'CRITICAL';
  if (wbgtC >= 31.1) return 'EXTREME';
  if (wbgtC >= 29.4) return 'HIGH';
  if (wbgtC >= 26.7) return 'MODERATE';
  return 'LOW';
}

export function getWorkRestRecommendation(riskLevel: HeatRiskLevel): WorkRestCycle {
  switch (riskLevel) {
    case 'CRITICAL':
      return {
        riskLevel: 'CRITICAL',
        workMinutes: 15,
        restMinutes: 45,
        hydrationMlPerHour: 1000,
        ppeAdvisory: 'Heavy cooling vests required; limit direct sunlight exposure to essential tasks only.',
        mandatoryShade: true
      };
    case 'EXTREME':
      return {
        riskLevel: 'EXTREME',
        workMinutes: 20,
        restMinutes: 40,
        hydrationMlPerHour: 950,
        ppeAdvisory: 'Ventilated headgear, UV protective eyewear, electrolyte replenishment.',
        mandatoryShade: true
      };
    case 'HIGH':
      return {
        riskLevel: 'HIGH',
        workMinutes: 30,
        restMinutes: 30,
        hydrationMlPerHour: 800,
        ppeAdvisory: 'Breathable lightweight high-vis garments, mandatory cool hydration breaks.',
        mandatoryShade: true
      };
    case 'MODERATE':
      return {
        riskLevel: 'MODERATE',
        workMinutes: 45,
        restMinutes: 15,
        hydrationMlPerHour: 600,
        ppeAdvisory: 'Standard summer high-vis uniform; frequent water refills.',
        mandatoryShade: false
      };
    case 'LOW':
    default:
      return {
        riskLevel: 'LOW',
        workMinutes: 50,
        restMinutes: 10,
        hydrationMlPerHour: 450,
        ppeAdvisory: 'Standard PPE with active hydration awareness.',
        mandatoryShade: false
      };
  }
}

export const activeThermalAlerts: ThermalAlert[] = [
  {
    id: 'ALT-882',
    level: 'CRITICAL',
    title: 'Severe Wet Bulb Globe Temperature Alert',
    description: 'WBGT has crossed 32.2°C at Sector 4B. Mandatory 15m work / 45m shade protocol active.',
    timestamp: '10 mins ago',
    actionRequired: 'Reroute outdoor heavy machinery crews to shaded staging canopy #3.'
  },
  {
    id: 'ALT-883',
    level: 'HIGH',
    title: 'Elevated Solar Irradiance Warning',
    description: 'UV Index 9.8 (Very High). High risk of thermal exhaustion and rapid dehydration.',
    timestamp: '25 mins ago',
    actionRequired: 'Replenish iced electrolyte dispensers at Gate 7 and West Pavilion.'
  }
];

export const RISK_COLOR: Record<HeatRiskLevel, string> = {
  LOW: '#1fa89a',
  MODERATE: '#e0a400',
  HIGH: '#ee7f1f',
  EXTREME: '#e5502b',
  CRITICAL: '#c4261e'
};

export const RISK_LABEL: Record<HeatRiskLevel, string> = {
  LOW: 'Low',
  MODERATE: 'Moderate',
  HIGH: 'High',
  EXTREME: 'Extreme',
  CRITICAL: 'Critical'
};
