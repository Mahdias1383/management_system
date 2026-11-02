import React from 'react';
import { Language, SafetyConflict, TrainLine, TrainSchedule } from '../types/domain';
import { computeTrainStationTimings, formatMinutesToTime } from '../services/collisionEngine';

interface MareyChartProps {
  line: TrainLine;
  trains: TrainSchedule[];
  candidateTrain?: {
    id_train: string;
    name_train: string;
    departureTime: string;
    speed: number;
    list_stop_time: Record<string, number>;
  } | null;
  conflicts?: SafetyConflict[];
  lang: Language;
}

const TRAIN_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Violet
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];

export const MareyChart: React.FC<MareyChartProps> = ({
  line,
  trains,
  candidateTrain,
  conflicts = [],
  lang,
}) => {
  const isFa = lang === 'fa';
  const lineTrains = trains.filter(
    (t) => t.name_line.trim().toLowerCase() === line.name_line.trim().toLowerCase()
  );

  // Calculate station cumulative distances
  const allStations = [line.origin, ...line.list_state, line.destination];
  const stationDistances: number[] = [0];
  let cumDist = 0;
  for (let i = 0; i < allStations.length - 1; i++) {
    const d =
      line.segmentDistancesKm && Number.isFinite(line.segmentDistancesKm[i]) && line.segmentDistancesKm[i] > 0
        ? line.segmentDistancesKm[i]
        : 100;
    cumDist += d;
    stationDistances.push(cumDist);
  }
  const totalDistanceKm = Math.max(100, cumDist);

  // Compute timings for all active trains on this line + optional candidate train
  const plottedSeries = lineTrains.map((t, idx) => ({
    id: t.id_train,
    name: t.name_train,
    isCandidate: false,
    color: TRAIN_COLORS[idx % TRAIN_COLORS.length],
    timings: computeTrainStationTimings(t, line),
  }));

  if (candidateTrain && candidateTrain.id_train.trim()) {
    plottedSeries.push({
      id: `${candidateTrain.id_train} (${isFa ? 'پیشنهادی' : 'Candidate'})`,
      name: candidateTrain.name_train || candidateTrain.id_train,
      isCandidate: true,
      color: conflicts.length > 0 ? '#EF4444' : '#22C55E',
      timings: computeTrainStationTimings(candidateTrain, line),
    });
  }

  // Determine min and max time window in minutes
  let minMin = 360; // default 06:00
  let maxMin = 1320; // default 22:00

  if (plottedSeries.length > 0) {
    const allArr = plottedSeries.flatMap((s) => s.timings.map((n) => n.arrivalMinutes));
    const allDep = plottedSeries.flatMap((s) => s.timings.map((n) => n.departureMinutes));
    minMin = Math.max(0, Math.floor((Math.min(...allArr) - 30) / 60) * 60);
    maxMin = Math.ceil((Math.max(...allDep) + 45) / 60) * 60;
    if (maxMin - minMin < 240) {
      maxMin = minMin + 240;
    }
  }

  const svgWidth = 860;
  const svgHeight = 360;
  const padLeft = 155;
  const padRight = 35;
  const padTop = 32;
  const padBottom = 42;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const timeToX = (mins: number) => {
    const ratio = (mins - minMin) / Math.max(1, maxMin - minMin);
    return padLeft + Math.max(0, Math.min(1, ratio)) * plotW;
  };

  const distToY = (km: number) => {
    const ratio = km / totalDistanceKm;
    return padTop + ratio * plotH;
  };

  // Generate hourly grid ticks
  const timeTicks: number[] = [];
  const stepMins = maxMin - minMin > 720 ? 120 : 60;
  for (let m = minMin; m <= maxMin; m += stepMins) {
    timeTicks.push(m);
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {isFa
              ? `نمودار زمان-مسافت ماری (Marey's Time-Distance Diagram) — ${line.name_line}`
              : `Marey's Time-Distance Train Schedule Graph — ${line.name_line}`}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isFa
              ? 'شیب خطوط نشان‌دهنده سرعت قطار، خطوط افقی زمان توقف در ایستگاه و تقاطع خطوط نشان‌دهنده برخورد یا سبقت غیرمجاز است.'
              : 'Line slope represents train velocity; horizontal plateaus show station dwell times; line intersections indicate collisions/overtakes.'}
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {plottedSeries.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-1 rounded-sm"
                style={{ backgroundColor: s.color }}
              />
              <span className="font-mono text-slate-700 dark:text-slate-300">{s.id}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto" dir="ltr">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full min-w-[680px] h-auto select-none"
        >
          {/* Background plot area */}
          <rect
            x={padLeft}
            y={padTop}
            width={plotW}
            height={plotH}
            className="fill-slate-50/70 dark:fill-slate-950/60 stroke-slate-200 dark:stroke-slate-800"
            rx={6}
          />

          {/* Vertical time grid lines */}
          {timeTicks.map((t) => {
            const x = timeToX(t);
            return (
              <g key={`tick-${t}`}>
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={padTop + plotH}
                  className="stroke-slate-200/80 dark:stroke-slate-800/80"
                  strokeDasharray="3 3"
                />
                <text
                  x={x}
                  y={padTop + plotH + 20}
                  textAnchor="middle"
                  className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono"
                >
                  {formatMinutesToTime(t)}
                </text>
              </g>
            );
          })}

          {/* Horizontal station lines */}
          {allStations.map((stName, idx) => {
            const km = stationDistances[idx];
            const y = distToY(km);
            return (
              <g key={`st-${idx}`}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={padLeft + plotW}
                  y2={y}
                  className="stroke-slate-300 dark:stroke-slate-700/80"
                  strokeWidth={idx === 0 || idx === allStations.length - 1 ? 1.5 : 1}
                />
                <text
                  x={padLeft - 10}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-700 dark:fill-slate-300 text-[11px] font-medium"
                >
                  {stName.length > 20 ? `${stName.slice(0, 19)}…` : stName}
                </text>
                <text
                  x={padLeft + 6}
                  y={y - 4}
                  className="fill-slate-400 dark:fill-slate-500 text-[9px] font-mono"
                >
                  {km} km
                </text>
              </g>
            );
          })}

          {/* Train trajectories */}
          {plottedSeries.map((series) => {
            const points: string[] = [];
            series.timings.forEach((node) => {
              const y = distToY(node.distanceFromOriginKm);
              const xArr = timeToX(node.arrivalMinutes);
              const xDep = timeToX(node.departureMinutes);
              points.push(`${xArr},${y}`);
              if (node.stopMinutes > 0) {
                points.push(`${xDep},${y}`);
              }
            });

            return (
              <g key={series.id}>
                <polyline
                  fill="none"
                  stroke={series.color}
                  strokeWidth={series.isCandidate ? 3 : 2.25}
                  strokeDasharray={series.isCandidate ? '6 3' : undefined}
                  points={points.join(' ')}
                />
                {series.timings.map((node, nIdx) => {
                  const y = distToY(node.distanceFromOriginKm);
                  const xArr = timeToX(node.arrivalMinutes);
                  const xDep = timeToX(node.departureMinutes);
                  return (
                    <g key={`${series.id}-node-${nIdx}`}>
                      <circle
                        cx={xArr}
                        cy={y}
                        r={3.5}
                        fill={series.color}
                        className="stroke-white dark:stroke-slate-900"
                        strokeWidth={1.5}
                      >
                        <title>{`${series.id} @ ${node.stationName}: Arr ${node.arrivalFormatted} / Dep ${node.departureFormatted}`}</title>
                      </circle>
                      {node.stopMinutes > 0 && (
                        <circle
                          cx={xDep}
                          cy={y}
                          r={3.5}
                          fill={series.color}
                          className="stroke-white dark:stroke-slate-900"
                          strokeWidth={1.5}
                        />
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Highlight conflict zones if candidate train has collisions */}
          {conflicts.length > 0 &&
            plottedSeries
              .filter((s) => s.isCandidate)
              .map((cand) =>
                cand.timings.slice(1).map((node, idx) => (
                  <circle
                    key={`warn-${idx}`}
                    cx={timeToX(node.arrivalMinutes)}
                    cy={distToY(node.distanceFromOriginKm)}
                    r={9}
                    className="fill-red-500/20 stroke-red-500"
                    strokeWidth={1.5}
                  />
                ))
              )}
        </svg>
      </div>
    </div>
  );
};
