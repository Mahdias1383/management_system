import { CollisionCheckResult, SafetyConflict, StationNodeTiming, TrainLine, TrainSchedule } from '../types/domain';

const MANDATORY_HEADWAY_BUFFER_MINUTES = 5;

/**
 * Parses "HH:mm" into minutes from midnight (0..1439+).
 */
export function parseTimeToMinutes(timeStr: string): number {
  const cleaned = String(timeStr || '08:00').trim();
  const parts = cleaned.split(':');
  if (parts.length !== 2) return 480; // default 08:00
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || minutes < 0) {
    return 480;
  }
  return Math.round(hours * 60 + minutes);
}

/**
 * Formats minutes from midnight into "HH:mm" (or "HH:mm (+1d)" if >= 1440).
 */
export function formatMinutesToTime(totalMinutes: number): string {
  const rounded = Math.round(totalMinutes);
  const normalized = ((rounded % 1440) + 1440) % 1440;
  const dayOffset = Math.floor(rounded / 1440);
  const hh = String(Math.floor(normalized / 60)).padStart(2, '0');
  const mm = String(normalized % 60).padStart(2, '0');
  if (dayOffset > 0) {
    return `${hh}:${mm} (+${dayOffset}d)`;
  }
  return `${hh}:${mm}`;
}

/**
 * Formats minutes into strict 24h HH:mm for HTML time inputs.
 */
export function formatMinutesToInputTime(totalMinutes: number): string {
  const rounded = Math.round(totalMinutes);
  const normalized = ((rounded % 1440) + 1440) % 1440;
  const hh = String(Math.floor(normalized / 60)).padStart(2, '0');
  const mm = String(normalized % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Computes exact arrival and departure timestamps for every station node along a TrainLine.
 * For each station i in {0, ..., n} along the route (Origin to Destination):
 * Arrival Time A_i and Departure Time D_i = A_i + stopTime_i
 * where travel time between station i-1 and i is delta_t_i = (distance_i / speed) * 60 minutes.
 */
export function computeTrainStationTimings(
  train: Pick<TrainSchedule, 'departureTime' | 'speed' | 'list_stop_time'>,
  line: TrainLine
): StationNodeTiming[] {
  const allStations = [line.origin, ...line.list_state, line.destination];
  const speed = Math.max(1, Number(train.speed) || 100);
  const startMinutes = parseTimeToMinutes(train.departureTime);

  const timings: StationNodeTiming[] = [];
  let cumulativeDistanceKm = 0;
  let currentClockMinutes = startMinutes;

  for (let i = 0; i < allStations.length; i++) {
    const stationName = allStations[i];
    if (i === 0) {
      // Origin station: train is ready and departs at departureTime
      timings.push({
        stationIndex: 0,
        stationName,
        distanceFromOriginKm: 0,
        arrivalMinutes: currentClockMinutes,
        departureMinutes: currentClockMinutes,
        stopMinutes: 0,
        arrivalFormatted: formatMinutesToTime(currentClockMinutes),
        departureFormatted: formatMinutesToTime(currentClockMinutes),
      });
    } else {
      const segDist =
        line.segmentDistancesKm && Number.isFinite(line.segmentDistancesKm[i - 1]) && line.segmentDistancesKm[i - 1] > 0
          ? line.segmentDistancesKm[i - 1]
          : 100;
      cumulativeDistanceKm += segDist;
      const travelTimeMinutes = (segDist / speed) * 60;
      const arrivalMinutes = currentClockMinutes + travelTimeMinutes;

      // Intermediate stations have stop durations from list_stop_time; destination has 0 stop
      const isDestination = i === allStations.length - 1;
      const rawStop = !isDestination && train.list_stop_time ? Number(train.list_stop_time[stationName] ?? 0) : 0;
      const stopMinutes = Number.isFinite(rawStop) && rawStop >= 0 ? rawStop : 0;
      const departureMinutes = arrivalMinutes + stopMinutes;

      timings.push({
        stationIndex: i,
        stationName,
        distanceFromOriginKm: Math.round(cumulativeDistanceKm * 10) / 10,
        arrivalMinutes: Math.round(arrivalMinutes * 100) / 100,
        departureMinutes: Math.round(departureMinutes * 100) / 100,
        stopMinutes,
        arrivalFormatted: formatMinutesToTime(arrivalMinutes),
        departureFormatted: formatMinutesToTime(departureMinutes),
      });

      currentClockMinutes = departureMinutes;
    }
  }

  return timings;
}

/**
 * Temporal-Spatial Railway Collision Detection Engine (`checkAccident`)
 * Detects:
 * 1. Station Platform Collision: Two trains on the same line occupy the same intermediate station i
 *    during overlapping time intervals ([A_{1,i}, D_{1,i}] \cap [A_{2,i}, D_{2,i}] != empty)
 *    with headway safety check.
 * 2. Track Segment Overtake / Head-to-Tail Collision: On segment (i-1 -> i), Train A departs before Train B
 *    (D_{A, i-1} < D_{B, i-1}), but Train B arrives at station i before or at the same time as Train A
 *    plus a mandatory 5-minute safety headway buffer (A_{B, i} <= A_{A, i} + 5), OR their departures/arrivals
 *    violate the 5-minute headway buffer on the same block.
 */
export function checkAccident(
  candidateTrain: Pick<TrainSchedule, 'id_train' | 'name_train' | 'name_line' | 'departureTime' | 'speed' | 'list_stop_time'>,
  existingTrains: TrainSchedule[],
  line: TrainLine
): CollisionCheckResult {
  const candidateTimings = computeTrainStationTimings(candidateTrain, line);
  const normalizedLineName = line.name_line.trim().toLowerCase();
  const normalizedCandidateId = candidateTrain.id_train.trim().toLowerCase();

  const relevantTrains = existingTrains.filter(
    (t) =>
      t.name_line.trim().toLowerCase() === normalizedLineName &&
      t.id_train.trim().toLowerCase() !== normalizedCandidateId
  );

  const conflicts: SafetyConflict[] = [];

  for (const otherTrain of relevantTrains) {
    const otherTimings = computeTrainStationTimings(otherTrain, line);
    const numNodes = Math.min(candidateTimings.length, otherTimings.length);

    // 1. Check Station Platform Collision at intermediate stations (1 .. numNodes - 2)
    for (let i = 1; i < numNodes - 1; i++) {
      const cNode = candidateTimings[i];
      const oNode = otherTimings[i];

      // Exact interval overlap [A_{1,i}, D_{1,i}] \cap [A_{2,i}, D_{2,i}] != empty
      const overlapStart = Math.max(cNode.arrivalMinutes, oNode.arrivalMinutes);
      const overlapEnd = Math.min(cNode.departureMinutes, oNode.departureMinutes);

      if (overlapStart <= overlapEnd) {
        conflicts.push({
          id: `CONF-ST-${candidateTrain.id_train}-${otherTrain.id_train}-${i}`,
          type: 'STATION_PLATFORM_OVERLAP',
          severity: 'CRITICAL',
          candidateTrainId: candidateTrain.id_train,
          conflictingTrainId: otherTrain.id_train,
          conflictingTrainName: otherTrain.name_train,
          lineName: line.name_line,
          locationLabel: cNode.stationName,
          overlapWindowFormatted: `${formatMinutesToTime(overlapStart)} – ${formatMinutesToTime(overlapEnd)}`,
          descriptionEn: `Station Platform Collision at "${cNode.stationName}": ${candidateTrain.id_train} (${cNode.arrivalFormatted}–${cNode.departureFormatted}) overlaps with ${otherTrain.id_train} (${oNode.arrivalFormatted}–${oNode.departureFormatted}).`,
          descriptionFa: `تداخل سکوی ایستگاهی در ایستگاه «${cNode.stationName}»: قطار ${candidateTrain.id_train} (${cNode.arrivalFormatted} تا ${cNode.departureFormatted}) با قطار ${otherTrain.id_train} (${oNode.arrivalFormatted} تا ${oNode.departureFormatted}) همپوشانی زمانی دارد.`,
          suggestedSafeDepartureTime: '',
        });
      }
    }

    // 2. Check Track Segment Overtake / Head-to-Tail Collision on each segment (i-1 -> i)
    for (let i = 1; i < numNodes; i++) {
      const cPrev = candidateTimings[i - 1];
      const cCurr = candidateTimings[i];
      const oPrev = otherTimings[i - 1];
      const oCurr = otherTimings[i];

      const segmentName = `${cPrev.stationName} → ${cCurr.stationName}`;

      // Case A: Existing train departs at or before Candidate train, and Candidate overtakes or violates 5-min headway
      // Also check near-simultaneous departure within 5-minute safety headway
      const depDiff = Math.abs(cPrev.departureMinutes - oPrev.departureMinutes);
      const arrDiff = Math.abs(cCurr.arrivalMinutes - oCurr.arrivalMinutes);

      const otherDepartsFirstAndCandidateCatchesUp =
        oPrev.departureMinutes <= cPrev.departureMinutes &&
        cCurr.arrivalMinutes <= oCurr.arrivalMinutes + MANDATORY_HEADWAY_BUFFER_MINUTES;

      const candidateDepartsFirstAndOtherCatchesUp =
        cPrev.departureMinutes <= oPrev.departureMinutes &&
        oCurr.arrivalMinutes <= cCurr.arrivalMinutes + MANDATORY_HEADWAY_BUFFER_MINUTES;

      const headwayViolationAtSegmentEntry = depDiff < MANDATORY_HEADWAY_BUFFER_MINUTES;

      if (
        otherDepartsFirstAndCandidateCatchesUp ||
        candidateDepartsFirstAndOtherCatchesUp ||
        headwayViolationAtSegmentEntry
      ) {
        const windowStr = `${formatMinutesToTime(Math.min(cPrev.departureMinutes, oPrev.departureMinutes))} – ${formatMinutesToTime(Math.max(cCurr.arrivalMinutes, oCurr.arrivalMinutes))}`;
        conflicts.push({
          id: `CONF-SEG-${candidateTrain.id_train}-${otherTrain.id_train}-${i}`,
          type: 'TRACK_SEGMENT_OVERTAKE',
          severity: 'CRITICAL',
          candidateTrainId: candidateTrain.id_train,
          conflictingTrainId: otherTrain.id_train,
          conflictingTrainName: otherTrain.name_train,
          lineName: line.name_line,
          locationLabel: segmentName,
          overlapWindowFormatted: windowStr,
          descriptionEn: `Track Segment Collision / Headway Violation on "${segmentName}": ${candidateTrain.id_train} (Dep ${cPrev.departureFormatted} → Arr ${cCurr.arrivalFormatted}) conflicts with ${otherTrain.id_train} (Dep ${oPrev.departureFormatted} → Arr ${oCurr.arrivalFormatted}, min 5m headway required, actual gap ${Math.round(arrDiff)}m).`,
          descriptionFa: `برخورد بلاک ریلی / نقض سرفاصله ایمنی ۵ دقیقه‌ای در قطعه «${segmentName}»: قطار ${candidateTrain.id_train} (حرکت ${cPrev.departureFormatted} ← ورود ${cCurr.arrivalFormatted}) با قطار ${otherTrain.id_train} (حرکت ${oPrev.departureFormatted} ← ورود ${oCurr.arrivalFormatted}) دچار برخورد یا سبقت غیرمجاز می‌شود.`,
          suggestedSafeDepartureTime: '',
        });
      }
    }
  }

  // Compute suggested safe departure time if there is any conflict
  let suggestedSafeDeparture = candidateTrain.departureTime;
  if (conflicts.length > 0) {
    const baseDepMinutes = parseTimeToMinutes(candidateTrain.departureTime);
    // Search forward in 10-minute increments up to 24 hours for a conflict-free slot
    for (let offset = 10; offset <= 1440; offset += 10) {
      const candidateMinutes = (baseDepMinutes + offset) % 1440;
      const testTimeStr = formatMinutesToInputTime(candidateMinutes);
      const testCandidate = { ...candidateTrain, departureTime: testTimeStr };
      const probe = checkAccidentWithoutSuggestion(testCandidate, relevantTrains, line);
      if (!probe) {
        suggestedSafeDeparture = testTimeStr;
        break;
      }
    }
    conflicts.forEach((c) => {
      c.suggestedSafeDepartureTime = suggestedSafeDeparture;
    });
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
    candidateTimings,
    suggestedSafeDeparture,
  };
}

function checkAccidentWithoutSuggestion(
  candidateTrain: Pick<TrainSchedule, 'id_train' | 'name_train' | 'name_line' | 'departureTime' | 'speed' | 'list_stop_time'>,
  relevantTrains: TrainSchedule[],
  line: TrainLine
): boolean {
  const candidateTimings = computeTrainStationTimings(candidateTrain, line);
  for (const otherTrain of relevantTrains) {
    const otherTimings = computeTrainStationTimings(otherTrain, line);
    const numNodes = Math.min(candidateTimings.length, otherTimings.length);

    for (let i = 1; i < numNodes - 1; i++) {
      const cNode = candidateTimings[i];
      const oNode = otherTimings[i];
      if (Math.max(cNode.arrivalMinutes, oNode.arrivalMinutes) <= Math.min(cNode.departureMinutes, oNode.departureMinutes)) {
        return true;
      }
    }

    for (let i = 1; i < numNodes; i++) {
      const cPrev = candidateTimings[i - 1];
      const cCurr = candidateTimings[i];
      const oPrev = otherTimings[i - 1];
      const oCurr = otherTimings[i];

      const depDiff = Math.abs(cPrev.departureMinutes - oPrev.departureMinutes);
      if (
        depDiff < MANDATORY_HEADWAY_BUFFER_MINUTES ||
        (oPrev.departureMinutes <= cPrev.departureMinutes &&
          cCurr.arrivalMinutes <= oCurr.arrivalMinutes + MANDATORY_HEADWAY_BUFFER_MINUTES) ||
        (cPrev.departureMinutes <= oPrev.departureMinutes &&
          oCurr.arrivalMinutes <= cCurr.arrivalMinutes + MANDATORY_HEADWAY_BUFFER_MINUTES)
      ) {
        return true;
      }
    }
  }
  return false;
}
