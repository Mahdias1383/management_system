import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  Edit3,
  GitBranch,
  MapPin,
  Plus,
  Radar,
  Sparkles,
  Train,
  Trash2,
  X,
} from 'lucide-react';
import {
  ActiveSession,
  Language,
  PlatformDatabaseV2,
  QualityTier,
  ThemeMode,
  TrainLine,
  TrainSchedule,
} from '../types/domain';
import {
  normalizeIdentifier,
  parsePositiveInteger,
  parsePositiveNumber,
} from '../services/authService';
import {
  checkAccident,
  computeTrainStationTimings,
} from '../services/collisionEngine';
import { MareyChart } from '../components/MareyChart';
import {
  EnterpriseBackofficeLayout,
  SidebarNavItem,
} from '../layouts/EnterpriseBackofficeLayout';

interface StaffOperationsPortalProps {
  db: PlatformDatabaseV2;
  onUpdateDb: (nextDb: PlatformDatabaseV2) => void;
  session: ActiveSession;
  lang: Language;
  theme: ThemeMode;
  onToggleLang: () => void;
  onToggleTheme: () => void;
  onLogout: () => void;
}

type StaffSidebarSection = 'TOPOLOGY' | 'DISPATCH' | 'MAREY';

interface StationDraft {
  name: string;
  distanceFromPrevKm: string;
}

export const StaffOperationsPortal: React.FC<StaffOperationsPortalProps> = ({
  db,
  onUpdateDb,
  session,
  lang,
  theme,
  onToggleLang,
  onToggleTheme,
  onLogout,
}) => {
  const isFa = lang === 'fa';
  const [activeSection, setActiveSection] = useState<StaffSidebarSection>('TOPOLOGY');

  // Corridor Creation State
  const [lineName, setLineName] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [finalLegDistanceKm, setFinalLegDistanceKm] = useState('160');
  const [stationsDraft, setStationsDraft] = useState<StationDraft[]>([
    { name: '', distanceFromPrevKm: '140' },
  ]);
  const [lineFeedback, setLineFeedback] = useState<{
    type: 'success' | 'error';
    msg: string;
  } | null>(null);

  // Corridor Edit Modal State
  const [editingLine, setEditingLine] = useState<TrainLine | null>(null);
  const [editLineName, setEditLineName] = useState('');
  const [editOrigin, setEditOrigin] = useState('');
  const [editDest, setEditDest] = useState('');
  const [editStations, setEditStations] = useState<string[]>([]);

  // Corridor Delete Confirmation Modal State
  const [deletingLine, setDeletingLine] = useState<TrainLine | null>(null);

  // Train Dispatch State
  const [selectedLineName, setSelectedLineName] = useState<string>(
    db.lines[0]?.name_line || ''
  );
  const [trainId, setTrainId] = useState('');
  const [trainName, setTrainName] = useState('');
  const [departureTime, setDepartureTime] = useState('08:30');
  const [speed, setSpeed] = useState('160');
  const [quality, setQuality] = useState<QualityTier>('VIP 5-Star');
  const [ticketCost, setTicketCost] = useState('45');
  const [capacity, setCapacity] = useState('120');
  const [stopTimesMap, setStopTimesMap] = useState<Record<string, string>>({});
  const [trainFeedback, setTrainFeedback] = useState<{
    type: 'success' | 'error';
    msg: string;
  } | null>(null);

  // Marey Simulator State
  const [mareyLineName, setMareyLineName] = useState<string>(
    db.lines[0]?.name_line || ''
  );
  const [simTrainId, setSimTrainId] = useState('SIM-901');
  const [simDeparture, setSimDeparture] = useState('07:10');
  const [simSpeed, setSimSpeed] = useState('190');

  const selectedLineObj = useMemo(
    () =>
      db.lines.find(
        (l) => normalizeIdentifier(l.name_line) === normalizeIdentifier(selectedLineName)
      ) || db.lines[0],
    [db.lines, selectedLineName]
  );

  const mareyLineObj = useMemo(
    () =>
      db.lines.find(
        (l) => normalizeIdentifier(l.name_line) === normalizeIdentifier(mareyLineName)
      ) || db.lines[0],
    [db.lines, mareyLineName]
  );

  // Real-time collision evaluation for Train Dispatch form
  const dispatchSafetyReport = useMemo(() => {
    if (!selectedLineObj) return null;
    const parsedSpeedObj = parsePositiveNumber(speed);
    const parsedSpeed = parsedSpeedObj.valid ? parsedSpeedObj.value : 120;
    const stopRecord: Record<string, number> = {};
    selectedLineObj.list_state.forEach((st) => {
      const val = Number(stopTimesMap[st]);
      stopRecord[st] = Number.isFinite(val) && val >= 0 ? val : 10;
    });

    return checkAccident(
      {
        id_train: trainId.trim() || 'CANDIDATE',
        name_train: trainName.trim() || 'Candidate Service',
        name_line: selectedLineObj.name_line,
        departureTime,
        speed: parsedSpeed,
        list_stop_time: stopRecord,
      },
      db.trains,
      selectedLineObj
    );
  }, [selectedLineObj, trainId, trainName, departureTime, speed, stopTimesMap, db.trains]);

  // Real-time collision evaluation for Marey Chart Simulator
  const simSafetyReport = useMemo(() => {
    if (!mareyLineObj) return null;
    const parsedSpeedObj = parsePositiveNumber(simSpeed);
    const parsedSpeed = parsedSpeedObj.valid ? parsedSpeedObj.value : 160;
    const defaultStops: Record<string, number> = {};
    mareyLineObj.list_state.forEach((st) => {
      defaultStops[st] = 10;
    });

    return checkAccident(
      {
        id_train: simTrainId || 'SIM-901',
        name_train: 'Interactive Simulation Service',
        name_line: mareyLineObj.name_line,
        departureTime: simDeparture,
        speed: parsedSpeed,
        list_stop_time: defaultStops,
      },
      db.trains,
      mareyLineObj
    );
  }, [mareyLineObj, simTrainId, simDeparture, simSpeed, db.trains]);

  const handleAddStationDraft = () => {
    setStationsDraft((prev) => [...prev, { name: '', distanceFromPrevKm: '130' }]);
  };

  const handleRemoveStationDraft = (index: number) => {
    setStationsDraft((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMoveStationDraft = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= stationsDraft.length) return;
    const copy = [...stationsDraft];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    setStationsDraft(copy);
  };

  // Create Railway Corridor
  const handleCreateCorridor = (e: React.FormEvent) => {
    e.preventDefault();
    setLineFeedback(null);

    const trimmedName = lineName.trim();
    const trimmedOrigin = origin.trim();
    const trimmedDest = destination.trim();

    if (!trimmedName || !trimmedOrigin || !trimmedDest) {
      setLineFeedback({
        type: 'error',
        msg: isFa
          ? 'نام مسیر ریلی، ایستگاه مبدأ و ایستگاه مقصد الزامی است.'
          : 'Corridor name, origin station, and destination station are required.',
      });
      return;
    }

    if (normalizeIdentifier(trimmedOrigin) === normalizeIdentifier(trimmedDest)) {
      setLineFeedback({
        type: 'error',
        msg: isFa
          ? 'ایستگاه مبدأ و مقصد نمی‌توانند یکسان باشند.'
          : 'Origin and destination stations cannot be identical.',
      });
      return;
    }

    const duplicateLine = db.lines.some(
      (l) => normalizeIdentifier(l.name_line) === normalizeIdentifier(trimmedName)
    );
    if (duplicateLine) {
      setLineFeedback({
        type: 'error',
        msg: isFa
          ? `مسیر ریلی با نام "${trimmedName}" قبلاً در شبکه ثبت شده است.`
          : `Railway corridor "${trimmedName}" already exists in the network.`,
      });
      return;
    }

    const cleanedStations = stationsDraft
      .map((s) => {
        const parsedDist = parsePositiveNumber(s.distanceFromPrevKm);
        return {
          name: s.name.trim(),
          dist: parsedDist.valid ? parsedDist.value : 120,
        };
      })
      .filter((s) => s.name.length > 0);

    const allStationNorms = [
      normalizeIdentifier(trimmedOrigin),
      ...cleanedStations.map((s) => normalizeIdentifier(s.name)),
      normalizeIdentifier(trimmedDest),
    ];
    if (new Set(allStationNorms).size !== allStationNorms.length) {
      setLineFeedback({
        type: 'error',
        msg: isFa
          ? 'نام ایستگاه‌های میانی، مبدأ و مقصد نباید تکراری باشند.'
          : 'Station names along the corridor must be unique.',
      });
      return;
    }

    const isolatedListState: string[] = [...cleanedStations.map((s) => s.name)];
    const parsedFinalDist = parsePositiveNumber(finalLegDistanceKm);
    const segmentDistancesKm: number[] = [
      ...cleanedStations.map((s) => s.dist),
      parsedFinalDist.valid ? parsedFinalDist.value : 150,
    ];

    const newLine: TrainLine = {
      id: `line_${Date.now()}`,
      name_line: trimmedName,
      origin: trimmedOrigin,
      destination: trimmedDest,
      num_state: isolatedListState.length,
      list_state: isolatedListState,
      segmentDistancesKm,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onUpdateDb({
      ...db,
      lines: [...db.lines, newLine],
      auditLogs: [
        {
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorRole: 'staff',
          actorUsername: session.username,
          action: 'CREATE_RAIL_CORRIDOR',
          detailsEn: `Created corridor ${newLine.name_line} (${newLine.origin} -> ${newLine.destination}) with ${newLine.num_state} intermediate stations.`,
          detailsFa: `ثبت مسیر ریلی ${newLine.name_line} (${newLine.origin} به ${newLine.destination}) با ${newLine.num_state} ایستگاه میانی.`,
        },
        ...db.auditLogs,
      ],
    });

    setLineName('');
    setOrigin('');
    setDestination('');
    setStationsDraft([{ name: '', distanceFromPrevKm: '140' }]);
    setSelectedLineName(newLine.name_line);
    setMareyLineName(newLine.name_line);
    setLineFeedback({
      type: 'success',
      msg: isFa
        ? `مسیر ریلی «${newLine.name_line}» با ${newLine.num_state} ایستگاه میانی با موفقیت ثبت شد.`
        : `Corridor "${newLine.name_line}" created with ${newLine.num_state} intermediate stations.`,
    });
  };

  // Save Edited Corridor
  const handleSaveEditLine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLine) return;

    const trimmedName = editLineName.trim();
    const trimmedOrigin = editOrigin.trim();
    const trimmedDest = editDest.trim();
    const cleanedStations = editStations.map((s) => s.trim()).filter(Boolean);

    if (!trimmedName || !trimmedOrigin || !trimmedDest) return;

    const conflict = db.lines.some(
      (l) =>
        l.id !== editingLine.id &&
        normalizeIdentifier(l.name_line) === normalizeIdentifier(trimmedName)
    );
    if (conflict) return;

    const oldName = editingLine.name_line;
    const isolatedStations = [...cleanedStations];

    onUpdateDb({
      ...db,
      lines: db.lines.map((l) =>
        l.id === editingLine.id
          ? {
              ...l,
              name_line: trimmedName,
              origin: trimmedOrigin,
              destination: trimmedDest,
              num_state: isolatedStations.length,
              list_state: isolatedStations,
              updatedAt: new Date().toISOString(),
            }
          : l
      ),
      trains: db.trains.map((t) =>
        normalizeIdentifier(t.name_line) === normalizeIdentifier(oldName)
          ? { ...t, name_line: trimmedName }
          : t
      ),
      auditLogs: [
        {
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorRole: 'staff',
          actorUsername: session.username,
          action: 'UPDATE_RAIL_CORRIDOR',
          detailsEn: `Updated corridor ${oldName} -> ${trimmedName} (${isolatedStations.length} intermediate stations)`,
          detailsFa: `ویرایش مسیر ریلی ${oldName} به ${trimmedName} (${isolatedStations.length} ایستگاه میانی)`,
        },
        ...db.auditLogs,
      ],
    });

    setEditingLine(null);
  };

  // Confirm Delete Corridor
  const handleConfirmDeleteLine = () => {
    if (!deletingLine) return;
    const targetNameNorm = normalizeIdentifier(deletingLine.name_line);

    onUpdateDb({
      ...db,
      lines: db.lines.filter((l) => l.id !== deletingLine.id),
      trains: db.trains.filter(
        (t) => normalizeIdentifier(t.name_line) !== targetNameNorm
      ),
      auditLogs: [
        {
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorRole: 'staff',
          actorUsername: session.username,
          action: 'DELETE_RAIL_CORRIDOR',
          detailsEn: `Deleted corridor ${deletingLine.name_line} and cascaded associated train schedules.`,
          detailsFa: `حذف مسیر ریلی ${deletingLine.name_line} و سرویس‌های قطار وابسته به آن.`,
        },
        ...db.auditLogs,
      ],
    });

    setDeletingLine(null);
  };

  // Schedule Train Service with Safety Radar Check
  const handleScheduleTrain = (e: React.FormEvent) => {
    e.preventDefault();
    setTrainFeedback(null);

    if (!selectedLineObj) {
      setTrainFeedback({
        type: 'error',
        msg: isFa
          ? 'لطفاً ابتدا یک مسیر ریلی انتخاب کنید.'
          : 'Please select a valid railway corridor first.',
      });
      return;
    }

    const trimmedId = trainId.trim().toUpperCase();
    const trimmedName = trainName.trim();
    const parsedSpeedObj = parsePositiveNumber(speed);
    const parsedCostObj = parsePositiveNumber(ticketCost);
    const parsedCapacityObj = parsePositiveInteger(capacity);

    if (!trimmedId || !trimmedName) {
      setTrainFeedback({
        type: 'error',
        msg: isFa
          ? 'کد قطار و عنوان سرویس الزامی است.'
          : 'Service code and train title are required.',
      });
      return;
    }

    if (!parsedSpeedObj.valid || parsedSpeedObj.value < 40 || parsedSpeedObj.value > 360) {
      setTrainFeedback({
        type: 'error',
        msg: isFa
          ? 'سرعت سیر باید عددی مثبت بین ۴۰ تا ۳۶۰ کیلومتر بر ساعت باشد.'
          : 'Cruising velocity must be between 40 and 360 km/h.',
      });
      return;
    }

    if (!parsedCostObj.valid || !parsedCapacityObj.valid) {
      setTrainFeedback({
        type: 'error',
        msg: isFa
          ? 'بهای بلیط و ظرفیت صندلی باید اعداد مثبت معتبر باشند.'
          : 'Ticket fare and seat capacity must be positive numbers.',
      });
      return;
    }

    const idExists = db.trains.some(
      (t) => normalizeIdentifier(t.id_train) === normalizeIdentifier(trimmedId)
    );
    if (idExists) {
      setTrainFeedback({
        type: 'error',
        msg: isFa
          ? `کد قطار "${trimmedId}" قبلاً در سیستم ثبت شده است.`
          : `Service code "${trimmedId}" is already registered.`,
      });
      return;
    }

    if (dispatchSafetyReport && dispatchSafetyReport.hasConflict) {
      setTrainFeedback({
        type: 'error',
        msg: isFa
          ? `ثبت قطار به دلیل خطر برخورد یا تداخل سکوی ایستگاهی توسط رادار ایمنی مسدود شد! (${dispatchSafetyReport.conflicts.length} تداخل زمانی-مکانی)`
          : `Dispatch blocked by Automated Collision Radar! (${dispatchSafetyReport.conflicts.length} temporal-spatial conflict(s) detected)`,
      });
      return;
    }

    const isolatedStopRecord: Record<string, number> = {};
    selectedLineObj.list_state.forEach((st) => {
      const val = Number(stopTimesMap[st]);
      isolatedStopRecord[st] = Number.isFinite(val) && val >= 0 ? val : 10;
    });

    const newTrain: TrainSchedule = {
      id: `trn_${Date.now()}`,
      id_train: trimmedId,
      name_train: trimmedName,
      name_line: selectedLineObj.name_line,
      departureTime,
      speed: parsedSpeedObj.value,
      list_stop_time: isolatedStopRecord,
      quality,
      cost_ticket: parsedCostObj.value,
      totalCapacity: parsedCapacityObj.value,
      capacity: parsedCapacityObj.value,
      status: 'Scheduled',
      createdAt: new Date().toISOString(),
    };

    onUpdateDb({
      ...db,
      trains: [...db.trains, newTrain],
      auditLogs: [
        {
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorRole: 'staff',
          actorUsername: session.username,
          action: 'DISPATCH_TRAIN_SCHEDULE',
          detailsEn: `Scheduled train ${newTrain.id_train} (${newTrain.name_train}) on ${newTrain.name_line} departing ${newTrain.departureTime}.`,
          detailsFa: `زمانبندی قطار ${newTrain.id_train} (${newTrain.name_train}) در خط ${newTrain.name_line} ساعت ${newTrain.departureTime}.`,
        },
        ...db.auditLogs,
      ],
    });

    setTrainId('');
    setTrainName('');
    setTrainFeedback({
      type: 'success',
      msg: isFa
        ? `سرویس ریلی «${newTrain.id_train} - ${newTrain.name_train}» پس از تأیید ایمنی ثبت شد.`
        : `Train service "${newTrain.id_train} - ${newTrain.name_train}" verified conflict-free and dispatched.`,
    });
  };

  const handleRemoveTrain = (train: TrainSchedule) => {
    onUpdateDb({
      ...db,
      trains: db.trains.filter((t) => t.id !== train.id),
      auditLogs: [
        {
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          actorRole: 'staff',
          actorUsername: session.username,
          action: 'REMOVE_TRAIN_SCHEDULE',
          detailsEn: `Removed train service ${train.id_train} (${train.name_train}) from ${train.name_line}.`,
          detailsFa: `حذف سرویس قطار ${train.id_train} (${train.name_train}) از خط ${train.name_line}.`,
        },
        ...db.auditLogs,
      ],
    });
  };

  const navItems: SidebarNavItem[] = [
    {
      id: 'TOPOLOGY',
      labelFa: 'نمای کلی شبکه و خطوط ریلی',
      labelEn: 'Corridor & Line Topology',
      badgeCount: db.lines.length,
      icon: <GitBranch className="w-4 h-4" />,
    },
    {
      id: 'DISPATCH',
      labelFa: 'مدیریت ناوگان و زمانبندی سیر',
      labelEn: 'Fleet & Timetable Dispatch',
      badgeCount: db.trains.length,
      icon: <Train className="w-4 h-4" />,
    },
    {
      id: 'MAREY',
      labelFa: 'رادار ایمنی و نمودار زمان-مسافت',
      labelEn: 'Collision Radar & Marey Chart',
      icon: <Radar className="w-4 h-4" />,
    },
  ];

  const activeMeta = {
    TOPOLOGY: {
      titleFa: 'مهندسی شبکه و مدیریت خطوط ریلی',
      titleEn: 'Railway Network & Corridor Topology Management',
      subtitleFa: 'تعریف کریدورهای ریلی، ایستگاه‌های میانی و فواصل بلاک‌های مسیر با ایزولاسیون کامل داده‌ها',
      subtitleEn: 'Configure national rail corridors, ordered station nodes, and block distances with isolated state',
    },
    DISPATCH: {
      titleFa: 'زمانبندی ناوگان و کنترل ایمنی اعزام قطارها',
      titleEn: 'Fleet Timetable Dispatch & Automated Collision Guard',
      subtitleFa: 'ثبت سرویس‌های مسافری جدید با بررسی بلادرنگ تداخل سکوی ایستگاهی و سبقت در بلاک‌های ریلی',
      subtitleEn: 'Schedule passenger trains with real-time platform occupancy and track block headway verification',
    },
    MAREY: {
      titleFa: 'رادار گرافیکی ماری و شبیه‌ساز تداخل سیر',
      titleEn: "Interactive Marey's Time-Distance Diagram & Safety Radar",
      subtitleFa: 'تحلیل بصری دیاگرام زمان-مسافت و شبیه‌سازی سناریوهای حرکت قطارها پیش از صدور مجوز سیر',
      subtitleEn: 'Visual trajectory analysis and real-time train dispatch conflict simulation across corridors',
    },
  }[activeSection];

  const parsedDispatchSpeed = parsePositiveNumber(speed);
  const parsedSimSpeed = parsePositiveNumber(simSpeed);

  return (
    <EnterpriseBackofficeLayout
      lang={lang}
      theme={theme}
      session={session}
      portalTitleFa={activeMeta.titleFa}
      portalTitleEn={activeMeta.titleEn}
      portalSubtitleFa={activeMeta.subtitleFa}
      portalSubtitleEn={activeMeta.subtitleEn}
      navItems={navItems}
      activeTabId={activeSection}
      onSelectTab={(id) => setActiveSection(id as StaffSidebarSection)}
      onLogout={onLogout}
      onToggleLang={onToggleLang}
      onToggleTheme={onToggleTheme}
    >
      {/* =====================================================================
          SECTION 1: CORRIDOR & LINE TOPOLOGY
          ===================================================================== */}
      {activeSection === 'TOPOLOGY' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 5 Cols: Create New Railway Corridor */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 h-fit">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {isFa ? 'تعریف مسیر ریلی جدید' : 'Create New Railway Corridor'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isFa
                    ? 'مشخصات مبدأ، مقصد و ترتیب ایستگاه‌های میانی مسیر را وارد کنید'
                    : 'Define origin, destination, and ordered intermediate stations'}
                </p>
              </div>
            </div>

            {lineFeedback && (
              <div
                className={`mb-4 p-3 rounded-lg border text-xs flex items-center gap-2 ${
                  lineFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                }`}
              >
                {lineFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{lineFeedback.msg}</span>
              </div>
            )}

            <form onSubmit={handleCreateCorridor} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isFa ? 'عنوان مسیر ریلی (یکتا)' : 'Corridor Name (Unique)'}
                </label>
                <input
                  type="text"
                  value={lineName}
                  onChange={(e) => setLineName(e.target.value)}
                  placeholder={
                    isFa
                      ? 'مثال: کریدور سریع‌السیر تهران-اهواز'
                      : 'e.g., Tehran-Ahvaz Southern Express'
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isFa ? 'ایستگاه مبدأ' : 'Origin Terminal'}
                  </label>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder={isFa ? 'تهران' : 'Tehran'}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isFa ? 'ایستگاه مقصد' : 'Destination Terminal'}
                  </label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder={isFa ? 'اهواز' : 'Ahvaz'}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Dynamic Intermediate Stations Builder */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isFa
                      ? `ایستگاه‌های میانی مسیر (${stationsDraft.filter((s) => s.name.trim()).length} ایستگاه فعال)`
                      : `Intermediate Stations (${stationsDraft.filter((s) => s.name.trim()).length} active)`}
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStationDraft}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isFa ? 'افزودن ایستگاه میانی' : 'Add Station Node'}</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {stationsDraft.map((st, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-400 w-5">
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={st.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStationsDraft((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, name: val } : item
                            )
                          );
                        }}
                        placeholder={isFa ? 'نام ایستگاه میانی' : 'Station name'}
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                      />
                      <div className="w-24 relative" dir="ltr">
                        <input
                          type="number"
                          min={10}
                          max={1500}
                          value={st.distanceFromPrevKm}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStationsDraft((prev) =>
                              prev.map((item, i) =>
                                i === idx
                                  ? { ...item, distanceFromPrevKm: val }
                                  : item
                              )
                            );
                          }}
                          className="w-full px-2 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pr-7"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-mono">
                          km
                        </span>
                      </div>

                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleMoveStationDraft(idx, -1)}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                          title={isFa ? 'جابجایی به بالا' : 'Move Up'}
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveStationDraft(idx, 1)}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                          title={isFa ? 'جابجایی به پایین' : 'Move Down'}
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveStationDraft(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                          title={isFa ? 'حذف ایستگاه' : 'Remove Station'}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isFa
                    ? 'مسافت قطعه پایانی تا مقصد (کیلومتر)'
                    : 'Final Segment Distance to Destination (km)'}
                </label>
                <input
                  type="number"
                  min={10}
                  max={1500}
                  dir="ltr"
                  value={finalLegDistanceKm}
                  onChange={(e) => setFinalLegDistanceKm(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                {isFa ? 'ثبت کریدور در شبکه ریلی' : 'Register Railway Corridor'}
              </button>
            </form>
          </div>

          {/* Right 7 Cols: Active Railway Corridors */}
          <div className="lg:col-span-7 space-y-4">
            {db.lines.map((line) => {
              const lineTrainsCount = db.trains.filter(
                (t) =>
                  normalizeIdentifier(t.name_line) ===
                  normalizeIdentifier(line.name_line)
              ).length;
              const totalKm = (line.segmentDistancesKm || []).reduce(
                (acc, v) => acc + v,
                0
              );

              return (
                <div
                  key={line.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {line.name_line}
                        </h3>
                        <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          {line.num_state} {isFa ? 'ایستگاه میانی' : 'intermediate stops'}
                        </span>
                        <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {totalKm} km · {lineTrainsCount}{' '}
                          {isFa ? 'قطار فعال' : 'active trains'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {isFa
                          ? `مبدأ: ${line.origin} ← مقصد: ${line.destination}`
                          : `Origin: ${line.origin} -> Destination: ${line.destination}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLine(line);
                          setEditLineName(line.name_line);
                          setEditOrigin(line.origin);
                          setEditDest(line.destination);
                          setEditStations([...line.list_state]);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{isFa ? 'ویرایش مسیر' : 'Edit Corridor'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingLine(line)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isFa ? 'حذف' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Visual Route Node Diagram */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 overflow-x-auto">
                    <div className="flex items-center min-w-max gap-2 py-1">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{line.origin}</span>
                      </div>

                      {line.list_state.map((st, idx) => (
                        <React.Fragment key={`${line.id}-st-${idx}`}>
                          <div className="flex flex-col items-center px-1">
                            <span className="text-[10px] font-mono text-slate-400">
                              {line.segmentDistancesKm?.[idx] ?? 120} km
                            </span>
                            <div className="w-10 h-0.5 bg-slate-300 dark:bg-slate-700" />
                          </div>
                          <div className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200">
                            {st}
                          </div>
                        </React.Fragment>
                      ))}

                      <div className="flex flex-col items-center px-1">
                        <span className="text-[10px] font-mono text-slate-400">
                          {line.segmentDistancesKm?.[line.list_state.length] ?? 140} km
                        </span>
                        <div className="w-10 h-0.5 bg-slate-300 dark:bg-slate-700" />
                      </div>

                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{line.destination}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 2: FLEET & TIMETABLE DISPATCH
          ===================================================================== */}
      {activeSection === 'DISPATCH' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 5 Cols: Schedule New Train Service */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 h-fit">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Train className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {isFa ? 'تعریف و زمانبندی سرویس قطار جدید' : 'Dispatch New Train Service'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isFa
                      ? 'بررسی خودکار عدم تداخل زمانی و مکانی پیش از ثبت نهایی در جدول سیر'
                      : 'Real-time safety verification before committing to timetable'}
                  </p>
                </div>
              </div>

              {trainFeedback && (
                <div
                  className={`mb-4 p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    trainFeedback.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                  }`}
                >
                  {trainFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{trainFeedback.msg}</span>
                </div>
              )}

              <form onSubmit={handleScheduleTrain} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isFa ? 'انتخاب کریدور ریلی' : 'Select Railway Corridor'}
                  </label>
                  <select
                    value={selectedLineObj?.name_line || ''}
                    onChange={(e) => setSelectedLineName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  >
                    {db.lines.map((l) => (
                      <option key={l.id} value={l.name_line}>
                        {l.name_line} ({l.origin} → {l.destination})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {isFa ? 'کد یکتای قطار' : 'Unique Service Code'}
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={trainId}
                      onChange={(e) => setTrainId(e.target.value)}
                      placeholder="TR-505"
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {isFa ? 'نام قطار / سرویس' : 'Service Title'}
                    </label>
                    <input
                      type="text"
                      value={trainName}
                      onChange={(e) => setTrainName(e.target.value)}
                      placeholder={isFa ? 'فدک ۵ ستاره ویژه' : 'Royal Express 505'}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {isFa ? 'ساعت حرکت از مبدأ' : 'Origin Departure Time'}
                    </label>
                    <input
                      type="time"
                      dir="ltr"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {isFa ? 'سرعت سیر (km/h)' : 'Cruising Speed (km/h)'}
                    </label>
                    <input
                      type="number"
                      min={40}
                      max={350}
                      dir="ltr"
                      value={speed}
                      onChange={(e) => setSpeed(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Dynamic Intermediate Station Dwell Time Inputs */}
                {selectedLineObj && selectedLineObj.list_state.length > 0 && (
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span>
                        {isFa
                          ? 'مدت توقف در ایستگاه‌های میانی (دقیقه)'
                          : 'Intermediate Station Dwell Times (Minutes)'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedLineObj.list_state.map((stName) => (
                        <div
                          key={stName}
                          className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-800"
                        >
                          <span className="text-xs text-slate-700 dark:text-slate-300 truncate">
                            {stName}
                          </span>
                          <input
                            type="number"
                            min={0}
                            max={180}
                            dir="ltr"
                            value={stopTimesMap[stName] ?? '10'}
                            onChange={(e) =>
                              setStopTimesMap((prev) => ({
                                ...prev,
                                [stName]: e.target.value,
                              }))
                            }
                            className="w-16 px-2 py-1 text-xs font-mono text-center rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {isFa ? 'کلاس سالن' : 'Service Class'}
                    </label>
                    <select
                      value={quality}
                      onChange={(e) => setQuality(e.target.value as QualityTier)}
                      className="w-full px-2 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    >
                      <option value="VIP 5-Star">VIP 5-Star</option>
                      <option value="Business 4-Star">Business 4-Star</option>
                      <option value="Economy 3-Star">Economy 3-Star</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {isFa ? 'بهای بلیط ($)' : 'Ticket Fare ($)'}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min={1}
                      dir="ltr"
                      value={ticketCost}
                      onChange={(e) => setTicketCost(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {isFa ? 'ظرفیت کل صندلی' : 'Seat Capacity'}
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={1200}
                      dir="ltr"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Live Collision & Safety Guard Status Box */}
                {dispatchSafetyReport && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs ${
                      dispatchSafetyReport.hasConflict
                        ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold mb-1">
                      <span className="flex items-center gap-1.5">
                        {dispatchSafetyReport.hasConflict ? (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                        {dispatchSafetyReport.hasConflict
                          ? isFa
                            ? 'هشدار رادار ایمنی: احتمال برخورد یا تداخل سکوی ایستگاه!'
                            : 'Safety Radar Alert: Track or Platform Collision Detected!'
                          : isFa
                          ? 'تأیید رادار ایمنی: مسیر و زمانبندی کاملاً ایمن است'
                          : 'Safety Radar Verified: Zero Track or Platform Conflicts'}
                      </span>
                    </div>

                    {dispatchSafetyReport.hasConflict && (
                      <div className="space-y-2 mt-2">
                        {dispatchSafetyReport.conflicts.map((c, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded bg-red-950/20 border border-red-500/20 text-[11px]"
                          >
                            <div className="font-semibold">
                              {isFa ? c.descriptionFa : c.descriptionEn}
                            </div>
                            <div className="font-mono text-[10px] opacity-80 mt-0.5">
                              {c.locationLabel} · Window: {c.overlapWindowFormatted}
                            </div>
                          </div>
                        ))}

                        {dispatchSafetyReport.suggestedSafeDeparture && (
                          <button
                            type="button"
                            onClick={() =>
                              setDepartureTime(
                                dispatchSafetyReport.suggestedSafeDeparture
                              )
                            }
                            className="w-full mt-1 py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>
                              {isFa
                                ? `اعمال نزدیک‌ترین زمان حرکت ایمن پیشنهادی (${dispatchSafetyReport.suggestedSafeDeparture})`
                                : `Apply Suggested Safe Departure Slot (${dispatchSafetyReport.suggestedSafeDeparture})`}
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors cursor-pointer"
                >
                  {isFa ? 'ثبت نهایی قطار در جدول سیر' : 'Commit Train to Timetable'}
                </button>
              </form>
            </div>

            {/* Right 7 Cols: Live Marey Preview + Active Fleet Table */}
            <div className="lg:col-span-7 space-y-6">
              {selectedLineObj && (
                <MareyChart
                  line={selectedLineObj}
                  trains={db.trains}
                  candidateTrain={{
                    id_train: trainId.trim() || 'PREVIEW',
                    name_train: trainName.trim() || 'Candidate Service',
                    departureTime,
                    speed: parsedDispatchSpeed.valid ? parsedDispatchSpeed.value : 140,
                    list_stop_time: Object.fromEntries(
                      selectedLineObj.list_state.map((s) => [
                        s,
                        Number(stopTimesMap[s] ?? 10),
                      ])
                    ),
                  }}
                  conflicts={dispatchSafetyReport?.conflicts || []}
                  lang={lang}
                />
              )}

              {/* Active Fleet Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {isFa
                      ? `ناوگان فعال در جدول سیر (${db.trains.length} رام قطار)`
                      : `Active Scheduled Fleet (${db.trains.length} Services)`}
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-start">
                    <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-4 text-start">
                          {isFa ? 'کد و نام قطار' : 'Train Service'}
                        </th>
                        <th className="py-3 px-4 text-start">
                          {isFa ? 'مسیر ریلی' : 'Corridor'}
                        </th>
                        <th className="py-3 px-4 text-start">
                          {isFa ? 'حرکت / سرعت' : 'Dep / Velocity'}
                        </th>
                        <th className="py-3 px-4 text-start">
                          {isFa ? 'بها / ظرفیت صندلی' : 'Fare / Seats'}
                        </th>
                        <th className="py-3 px-4 text-end">
                          {isFa ? 'عملیات' : 'Actions'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {db.trains.map((t) => (
                        <tr
                          key={t.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                        >
                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                              {t.id_train}
                            </div>
                            <div className="text-slate-700 dark:text-slate-300 font-medium">
                              {t.name_train}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            {t.name_line}
                          </td>
                          <td className="py-3 px-4 font-mono">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {t.departureTime}
                            </span>{' '}
                            · <span className="text-slate-500">{t.speed} km/h</span>
                          </td>
                          <td className="py-3 px-4 font-mono">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              ${t.cost_ticket.toFixed(2)}
                            </span>{' '}
                            ·{' '}
                            <span className="text-slate-500">
                              {t.capacity}/{t.totalCapacity}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveTrain(t)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                              title={isFa ? 'حذف سرویس قطار' : 'Remove Train Service'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SECTION 3: COLLISION RADAR & MAREY CHART SIMULATOR
          ===================================================================== */}
      {activeSection === 'MAREY' && mareyLineObj && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isFa ? 'انتخاب کریدور جهت تحلیل رادار' : 'Select Corridor to Analyze'}
                </label>
                <select
                  value={mareyLineObj.name_line}
                  onChange={(e) => setMareyLineName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                >
                  {db.lines.map((l) => (
                    <option key={l.id} value={l.name_line}>
                      {l.name_line}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isFa ? 'کد قطار آزمایشی (شبیه‌ساز)' : 'Simulated Train Code'}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={simTrainId}
                  onChange={(e) => setSimTrainId(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isFa ? 'زمان حرکت آزمایشی' : 'Simulated Departure Time'}
                </label>
                <input
                  type="time"
                  dir="ltr"
                  value={simDeparture}
                  onChange={(e) => setSimDeparture(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isFa ? 'سرعت آزمایشی (km/h)' : 'Simulated Velocity (km/h)'}
                </label>
                <input
                  type="number"
                  min={50}
                  max={350}
                  dir="ltr"
                  value={simSpeed}
                  onChange={(e) => setSimSpeed(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>
            </div>

            {simSafetyReport && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs">
                  <Activity
                    className={`w-4 h-4 ${
                      simSafetyReport.hasConflict
                        ? 'text-red-500'
                        : 'text-emerald-500'
                    }`}
                  />
                  <span className="font-semibold">
                    {simSafetyReport.hasConflict
                      ? isFa
                        ? `تشخیص ${simSafetyReport.conflicts.length} نقطه برخورد در شبیه‌سازی! زمان حرکت ایمن پیشنهادی: ${simSafetyReport.suggestedSafeDeparture}`
                        : `Detected ${simSafetyReport.conflicts.length} collision conflict(s)! Suggested safe slot: ${simSafetyReport.suggestedSafeDeparture}`
                      : isFa
                      ? 'مسیر شبیه‌سازی‌شده بدون هیچ‌گونه تداخل سکوی ایستگاهی یا برخورد در بلاک ریلی است.'
                      : 'Simulated trajectory is 100% clear of station platform overlaps and segment overtakes.'}
                  </span>
                </div>

                {simSafetyReport.hasConflict &&
                  simSafetyReport.suggestedSafeDeparture && (
                    <button
                      type="button"
                      onClick={() =>
                        setSimDeparture(simSafetyReport.suggestedSafeDeparture)
                      }
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      {isFa
                        ? `انتقال به ساعت ایمن (${simSafetyReport.suggestedSafeDeparture})`
                        : `Snap to Safe Slot (${simSafetyReport.suggestedSafeDeparture})`}
                    </button>
                  )}
              </div>
            )}
          </div>

          <MareyChart
            line={mareyLineObj}
            trains={db.trains}
            candidateTrain={{
              id_train: simTrainId || 'SIM-901',
              name_train: 'Simulation Candidate',
              departureTime: simDeparture,
              speed: parsedSimSpeed.valid ? parsedSimSpeed.value : 180,
              list_stop_time: Object.fromEntries(
                mareyLineObj.list_state.map((s) => [s, 10])
              ),
            }}
            conflicts={simSafetyReport?.conflicts || []}
            lang={lang}
          />

          {/* Station Arrival/Departure Breakdown */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
              {isFa
                ? 'جدول محاسباتی زمان ورود و خروج ایستگاه‌ها (بر اساس معادلات دیفرانسیل حرکت)'
                : 'Computed Station-by-Station Arrival & Departure Matrix'}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 text-start">
                      {isFa ? 'ترتیب ایستگاه' : 'Station Sequence'}
                    </th>
                    <th className="py-2.5 px-3 text-start">
                      {isFa ? 'مسافت از مبدأ' : 'Cumulative Distance'}
                    </th>
                    <th className="py-2.5 px-3 text-start">
                      {isFa ? 'زمان ورود' : 'Arrival Time'}
                    </th>
                    <th className="py-2.5 px-3 text-start">
                      {isFa ? 'توقف در ایستگاه' : 'Dwell Duration'}
                    </th>
                    <th className="py-2.5 px-3 text-start">
                      {isFa ? 'زمان خروج' : 'Departure Time'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                  {computeTrainStationTimings(
                    {
                      departureTime: simDeparture,
                      speed: parsedSimSpeed.valid ? parsedSimSpeed.value : 180,
                      list_stop_time: Object.fromEntries(
                        mareyLineObj.list_state.map((s) => [s, 10])
                      ),
                    },
                    mareyLineObj
                  ).map((node) => (
                    <tr key={node.stationIndex}>
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-900 dark:text-slate-100">
                        #{node.stationIndex + 1} · {node.stationName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {node.distanceFromOriginKm} km
                      </td>
                      <td className="py-2.5 px-3 text-blue-600 dark:text-blue-400 font-bold">
                        {node.arrivalFormatted}
                      </td>
                      <td className="py-2.5 px-3 text-amber-600 dark:text-amber-400">
                        {node.stopMinutes} min
                      </td>
                      <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-bold">
                        {node.departureFormatted}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Corridor Modal */}
      {editingLine && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isFa ? 'ویرایش مسیر ریلی' : 'Edit Railway Corridor'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingLine(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditLine} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isFa ? 'نام مسیر ریلی' : 'Corridor Name'}
                </label>
                <input
                  type="text"
                  value={editLineName}
                  onChange={(e) => setEditLineName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isFa ? 'ایستگاه مبدأ' : 'Origin Station'}
                  </label>
                  <input
                    type="text"
                    value={editOrigin}
                    onChange={(e) => setEditOrigin(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isFa ? 'ایستگاه مقصد' : 'Destination Station'}
                  </label>
                  <input
                    type="text"
                    value={editDest}
                    onChange={(e) => setEditDest(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isFa
                    ? 'ایستگاه‌های میانی (با ویرگول جدا کنید)'
                    : 'Intermediate Stations (comma-separated)'}
                </label>
                <input
                  type="text"
                  value={editStations.join(', ')}
                  onChange={(e) =>
                    setEditStations(e.target.value.split(',').map((s) => s.trim()))
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingLine(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium cursor-pointer"
                >
                  {isFa ? 'انصراف' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                >
                  {isFa ? 'ذخیره تغییرات' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Corridor Confirmation Modal */}
      {deletingLine && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
              {isFa ? 'تأیید حذف مسیر ریلی' : 'Confirm Corridor Deletion'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
              {isFa
                ? `آیا از حذف مسیر «${deletingLine.name_line}» و تمامی قطارهای زمانبندی‌شده روی این خط اطمینان دارید؟`
                : `Are you sure you want to delete corridor "${deletingLine.name_line}" and cascade-delete all associated train schedules?`}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingLine(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium cursor-pointer"
              >
                {isFa ? 'انصراف' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteLine}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
              >
                {isFa ? 'حذف قطعی مسیر' : 'Delete Corridor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </EnterpriseBackofficeLayout>
  );
};
