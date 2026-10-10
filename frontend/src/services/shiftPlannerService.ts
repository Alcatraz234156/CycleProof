import { ShiftPlan } from '../types';

export const mockShifts: ShiftPlan[] = [
  {
    id: 'SH-MORNING',
    name: 'Shift Alpha (Early Morning Crew)',
    type: 'MORNING_CREW',
    startTime: '06:00',
    endTime: '14:00',
    crewSize: 32,
    leadSupervisor: 'Marcus Vance (Safety Officer #12)',
    workZone: 'Sector 4 North Terminal & Rail Yard',
    peakHeatWindow: '12:00 - 14:00',
    overallRisk: 'MODERATE',
    intervals: [
      { timeLabel: '06:00 - 08:00', projectedTempC: 27.5, riskLevel: 'LOW', requiredRestMinutes: 10, waterCheckScheduled: false },
      { timeLabel: '08:00 - 10:00', projectedTempC: 30.8, riskLevel: 'MODERATE', requiredRestMinutes: 15, waterCheckScheduled: true },
      { timeLabel: '10:00 - 12:00', projectedTempC: 34.2, riskLevel: 'HIGH', requiredRestMinutes: 30, waterCheckScheduled: true },
      { timeLabel: '12:00 - 14:00', projectedTempC: 38.6, riskLevel: 'CRITICAL', requiredRestMinutes: 45, waterCheckScheduled: true }
    ]
  },
  {
    id: 'SH-MIDDAY',
    name: 'Shift Bravo (Midday High-Heat Roster)',
    type: 'MIDDAY_PEAK',
    startTime: '10:00',
    endTime: '18:00',
    crewSize: 18,
    leadSupervisor: 'Dr. Elena Rostova (Occupational Health)',
    workZone: 'Sector 4B Solar Farm & Concrete Decking',
    peakHeatWindow: '11:30 - 15:30',
    overallRisk: 'CRITICAL',
    intervals: [
      { timeLabel: '10:00 - 12:00', projectedTempC: 34.5, riskLevel: 'HIGH', requiredRestMinutes: 30, waterCheckScheduled: true },
      { timeLabel: '12:00 - 14:00', projectedTempC: 38.6, riskLevel: 'CRITICAL', requiredRestMinutes: 45, waterCheckScheduled: true },
      { timeLabel: '14:00 - 16:00', projectedTempC: 37.9, riskLevel: 'CRITICAL', requiredRestMinutes: 45, waterCheckScheduled: true },
      { timeLabel: '16:00 - 18:00', projectedTempC: 33.1, riskLevel: 'HIGH', requiredRestMinutes: 20, waterCheckScheduled: false }
    ]
  },
  {
    id: 'SH-TWILIGHT',
    name: 'Shift Charlie (Cooling Twilight Shift)',
    type: 'TWILIGHT_EXTENDED',
    startTime: '16:00',
    endTime: '00:00',
    crewSize: 26,
    leadSupervisor: 'Kenji Sato (Logistics Lead)',
    workZone: 'Sector 2 Pipeline & Water Reservoir',
    peakHeatWindow: '16:00 - 17:30',
    overallRisk: 'MODERATE',
    intervals: [
      { timeLabel: '16:00 - 18:00', projectedTempC: 33.0, riskLevel: 'HIGH', requiredRestMinutes: 20, waterCheckScheduled: true },
      { timeLabel: '18:00 - 20:00', projectedTempC: 29.5, riskLevel: 'MODERATE', requiredRestMinutes: 15, waterCheckScheduled: false },
      { timeLabel: '20:00 - 22:00', projectedTempC: 26.8, riskLevel: 'LOW', requiredRestMinutes: 10, waterCheckScheduled: false },
      { timeLabel: '22:00 - 00:00', projectedTempC: 25.1, riskLevel: 'LOW', requiredRestMinutes: 10, waterCheckScheduled: false }
    ]
  }
];

export function getShiftById(id: string): ShiftPlan | undefined {
  return mockShifts.find((s) => s.id === id);
}
