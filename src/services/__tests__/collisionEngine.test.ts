import { describe, it, expect } from 'vitest';
import {
  parseTimeToMinutes,
  formatMinutesToTime,
  computeTrainStationTimings,
  checkAccident,
} from '../collisionEngine';
import { TrainLine, TrainSchedule } from '../../types/domain';

describe('collisionEngine Mathematical Verification', () => {
  describe('parseTimeToMinutes & formatMinutesToTime', () => {
    it('converts HH:mm string to minutes from midnight', () => {
      expect(parseTimeToMinutes('00:00')).toBe(0);
      expect(parseTimeToMinutes('07:30')).toBe(450);
      expect(parseTimeToMinutes('12:00')).toBe(720);
      expect(parseTimeToMinutes('23:59')).toBe(1439);
    });

    it('falls back to 480 (08:00) on malformed inputs', () => {
      expect(parseTimeToMinutes('invalid')).toBe(480);
      expect(parseTimeToMinutes('')).toBe(480);
    });

    it('formats minutes from midnight back to HH:mm string', () => {
      expect(formatMinutesToTime(0)).toBe('00:00');
      expect(formatMinutesToTime(450)).toBe('07:30');
      expect(formatMinutesToTime(720)).toBe('12:00');
      expect(formatMinutesToTime(1439)).toBe('23:59');
    });

    it('handles next-day overflow with (+1d) tag', () => {
      expect(formatMinutesToTime(1500)).toBe('01:00 (+1d)');
    });
  });

  describe('computeTrainStationTimings', () => {
    const mockLine: TrainLine = {
      id: 'line_test',
      name_line: 'Test Corridor',
      origin: 'Alpha',
      destination: 'Gamma',
      num_state: 1,
      list_state: ['Beta'],
      segmentDistancesKm: [100, 100],
      createdAt: '2026-11-03T00:00:00.000Z',
      updatedAt: '2026-11-03T00:00:00.000Z',
    };

    it('calculates station arrival and departure times accurately based on speed and dwell', () => {
      const train = {
        departureTime: '08:00', // 480 min
        speed: 100, // 100 km/h -> 100km takes 60 min
        list_stop_time: { Beta: 15 },
      };

      const timings = computeTrainStationTimings(train, mockLine);
      expect(timings.length).toBe(3); // Alpha, Beta, Gamma

      // Origin Alpha: 08:00 dep
      expect(timings[0].stationName).toBe('Alpha');
      expect(timings[0].departureMinutes).toBe(480);

      // Intermediate Beta: arr = 480 + 60 = 540 (09:00), dwell = 15, dep = 555 (09:15)
      expect(timings[1].stationName).toBe('Beta');
      expect(timings[1].arrivalMinutes).toBe(540);
      expect(timings[1].departureMinutes).toBe(555);

      // Destination Gamma: arr = 555 + 60 = 615 (10:15)
      expect(timings[2].stationName).toBe('Gamma');
      expect(timings[2].arrivalMinutes).toBe(615);
    });
  });

  describe('checkCollision', () => {
    const mockLine: TrainLine = {
      id: 'line_test',
      name_line: 'Test Corridor',
      origin: 'Alpha',
      destination: 'Gamma',
      num_state: 1,
      list_state: ['Beta'],
      segmentDistancesKm: [100, 100],
      createdAt: '2026-11-03T00:00:00.000Z',
      updatedAt: '2026-11-03T00:00:00.000Z',
    };

    const existingTrain: TrainSchedule = {
      id: 'trn_1',
      id_train: 'TR-101',
      name_train: 'Express 1',
      name_line: 'Test Corridor',
      departureTime: '08:00',
      speed: 100,
      list_stop_time: { Beta: 15 },
      quality: 'VIP 5-Star',
      cost_ticket: 50,
      totalCapacity: 100,
      capacity: 100,
      status: 'Scheduled',
      createdAt: '2026-11-03T00:00:00.000Z',
    };

    it('detects headway safety violation when departure times are within 5 minutes', () => {
      const candidate: TrainSchedule = {
        ...existingTrain,
        id: 'trn_candidate',
        id_train: 'TR-102',
        departureTime: '08:02', // only 2 min headway (safety buffer is 5 min)
      };

      const result = checkAccident(candidate, [existingTrain], mockLine);
      expect(result.hasConflict).toBe(true);
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.suggestedSafeDeparture).toBeDefined();
    });

    it('approves schedules with adequate safety buffer', () => {
      const safeCandidate: TrainSchedule = {
        ...existingTrain,
        id: 'trn_safe',
        id_train: 'TR-103',
        departureTime: '08:30', // 30 min headway
      };

      const result = checkAccident(safeCandidate, [existingTrain], mockLine);
      expect(result.hasConflict).toBe(false);
      expect(result.conflicts.length).toBe(0);
    });
  });
});
