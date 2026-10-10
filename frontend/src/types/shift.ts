import { HeatRiskLevel } from './heatRisk';

export type ShiftType = 'MORNING_CREW' | 'MIDDAY_PEAK' | 'TWILIGHT_EXTENDED';

export interface ShiftInterval {
  timeLabel: string;
  projectedTempC: number;
  riskLevel: HeatRiskLevel;
  requiredRestMinutes: number;
  waterCheckScheduled: boolean;
}

export interface ShiftPlan {
  id: string;
  name: string;
  type: ShiftType;
  startTime: string;
  endTime: string;
  crewSize: number;
  leadSupervisor: string;
  workZone: string;
  peakHeatWindow: string;
  intervals: ShiftInterval[];
  overallRisk: HeatRiskLevel;
}
