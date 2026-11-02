import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  Edit3,
  GitBranch,
  Plus,
  ShieldCheck,
  Sparkles,
  Train,
  Trash2,
} from 'lucide-react';
import {
  Language,
  PlatformDatabaseV2,
  QualityTier,
  TrainLine,
  TrainSchedule,
} from '../types/domain';
import { normalizeIdentifier, parsePositiveInteger, parsePositiveNumber } from '../services/authService';
import { checkAccident, computeTrainStationTimings } from '../services/collisionEngine';
import { deepClone } from '../services/storageAndMigration';
import { MareyChart } from './MareyChart';

interface StaffPortalProps {
  db: PlatformDatabaseV2;
  onUpdateDb: (nextDb: PlatformDatabaseV2) => void;
  lang: Language;
  actorUsername: string;
  notify: (msgEn: string, msgFa: string, type?: 'success' | 'error') => void;
}

export const StaffPortal: React.FC<StaffPortalProps> = ({
  db,
  onUpdateDb,
  lang,
  actorUsername,
  notify,
}) => {
  const isFa = lang === 'fa';
  const [subTab, setSubTab] = useState<'LINES' | 'TRAINS' | 'SIMULATOR'>('LINES');

  // --- CREATE LINE STATE ---
  const [lineName, setLineName] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [stationsInput, setStationsInput] = useState<string[]>(['Semnan', 'Shahroud']);
  const [distancesInput, setDistancesInput] = useState<number[]>([150, 180, 160]);

  // --- EDIT LINE MODAL STATE ---
  const [editingLine, setEditingLine] = useState<TrainLine | null>(null);
  const [editLineName, setEditLineName] = useState('');
  const [editOrigin, setEditOrigin] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [editStations, setEditStations] = useState<string[]>([]);
  const [editDistances, setEditDistances] = useState<number[]>([]);
  const [deletingLine, setDeletingLine] = useState<TrainLine | null>(null);

  // --- ADD TRAIN & LIVE COLLISION SIMULATOR STATE ---
  const [selectedLineName, setSelectedLineName] = useState<string>(
    db.lines[0]?.name_line || ''
  );
  const [trainId, setTrainId] = useState('TR-108');
  const [trainName, setTrainName] = useState('Aria High-Speed 108');
  const [departureTime, setDepartureTime] = useState('07:05'); // Default intentionally near TR-101 (07:00) so staff can immediately test collision detection!
  const [speed, setSpeed] = useState('190');
  const [quality, setQuality] = useState<QualityTier>('VIP 5-Star');
  const [costTicket, setCostTicket] = useState('68');
  const [capacity, setCapacity] = useState('150');
  const [stopTimesMap, setStopTimesMap] = useState<Record<string, number>>({});

  const selectedLineObj =
    db.lines.find(
      (l) => normalizeIdentifier(l.name_line) === normalizeIdentifier(selectedLineName)
    ) || db.lines[0];

  // Synchronize dynamic station stop time inputs whenever selected line changes
  useEffect(() => {
    if (!selectedLineObj) return;
    const nextStops: Record<string, number> = {};
    selectedLineObj.list_state.forEach((st) => {
      nextStops[st] = stopTimesMap[st] !== undefined ? stopTimesMap[st] : 10;
    });
    setStopTimesMap(nextStops);
  }, [selectedLineObj?.id]);

  // Real-time Collision Detection Preview (`checkAccident`)
  const liveCollisionResult = selectedLineObj
    ? checkAccident(
        {
          id_train: trainId || 'CANDIDATE',
          name_train: trainName || 'Candidate Train',
          name_line: selectedLineObj.name_line,
          departureTime,
          speed: Math.max(20, Number(speed) || 120),
          list_stop_time: stopTimesMap,
        },
        db.trains,
        selectedLineObj
      )
    : null;

  // --- HANDLERS FOR RAILWAY LINES ---
  const handleStationCountChange = (newCount: number) => {
    const clamped = Math.max(0, Math.min(10, newCount));
    const nextSt = [...stationsInput];
    while (nextSt.length < clamped) nextSt.push(`Station ${nextSt.length + 1}`);
    nextSt.length = clamped;
    setStationsInput(nextSt);

    const nextDist = [...distancesInput];
    while (nextDist.length < clamped + 1) nextDist.push(120);
    nextDist.length = clamped + 1;
    setDistancesInput(nextDist);
  };

  const handleCreateLine = (e: React.FormEvent) => {
    e.preventDefault();
    const trimName = lineName.trim();
    const trimOrigin = origin.trim();
    const trimDest = destination.trim();

    if (!trimName || !trimOrigin || !trimDest) {
      notify(
        'Line Name, Origin, and Destination are required.',
        'نام خط، ایستگاه مبدا و ایستگاه مقصد الزامی هستند.',
        'error'
      );
      return;
    }

    const normLine = normalizeIdentifier(trimName);
    if (db.lines.some((l) => normalizeIdentifier(l.name_line) === normLine)) {
      notify(
        `Line "${trimName}" already exists! Please enter a unique line name.`,
        `خط ریلی «${trimName}» قبلاً ثبت شده است! نام یکتا وارد کنید.`,
        'error'
      );
      return;
    }

    const cleanedStations = stationsInput.map((s) => s.trim()).filter(Boolean);
    if (cleanedStations.length !== stationsInput.length) {
      notify(
        'All intermediate station names must be non-empty.',
        'نام تمام ایستگاه‌های میانی باید وارد شود.',
        'error'
      );
      return;
    }

    const nextDb = deepClone(db);
    const newLine: TrainLine = {
      id: `line_${Date.now()}`,
      name_line: trimName,
      origin: trimOrigin,
      destination: trimDest,
      num_state: cleanedStations.length,
      list_state: [...cleanedStations], // Cloned array
      segmentDistancesKm: distancesInput.map((d) => (Number.isFinite(d) && d > 0 ? d : 100)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    nextDb.lines.push(newLine);
    nextDb.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      timestamp: newLine.createdAt,
      actorRole: 'staff',
      actorUsername,
      action: 'LINE_CREATED',
      detailsEn: `Created railway line "${newLine.name_line}" (${newLine.origin} -> ${newLine.destination}) with ${newLine.num_state} intermediate stations.`,
      detailsFa: `خط ریلی «${newLine.name_line}» (${newLine.origin} به ${newLine.destination}) با ${newLine.num_state} ایستگاه میانی ایجاد شد.`,
    });

    onUpdateDb(nextDb);
    setLineName('');
    setOrigin('');
    setDestination('');
    setSelectedLineName(newLine.name_line);
    notify(
      `Railway Line "${newLine.name_line}" created.`,
      `خط ریلی «${newLine.name_line}» با موفقیت ثبت شد.`
    );
  };

  const openEditLineModal = (line: TrainLine) => {
    setEditingLine(line);
    setEditLineName(line.name_line);
    setEditOrigin(line.origin);
    setEditDestination(line.destination);
    setEditStations([...line.list_state]);
    setEditDistances([...line.segmentDistancesKm]);
  };

  const moveEditStation = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= editStations.length) return;
    const next = [...editStations];
    const temp = next[idx];
    next[idx] = next[target];
    next[target] = temp;
    setEditStations(next);
  };

  const handleSaveLineUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLine) return;

    const trimName = editLineName.trim();
    const trimOrigin = editOrigin.trim();
    const trimDest = editDestination.trim();
    if (!trimName || !trimOrigin || !trimDest) {
      notify('Line fields cannot be empty.', 'فیلدهای خط ریلی نمی‌توانند خالی باشند.', 'error');
      return;
    }

    const normNew = normalizeIdentifier(trimName);
    if (
      db.lines.some(
        (l) => l.id !== editingLine.id && normalizeIdentifier(l.name_line) === normNew
      )
    ) {
      notify('Another line already uses this name.', 'خط دیگری با این نام وجود دارد.', 'error');
      return;
    }

    const cleanedStations = editStations.map((s) => s.trim()).filter(Boolean);
    const nextDb = deepClone(db);
    const idx = nextDb.lines.findIndex((l) => l.id === editingLine.id);
    if (idx !== -1) {
      const oldName = nextDb.lines[idx].name_line;
      nextDb.lines[idx] = {
        ...nextDb.lines[idx],
        name_line: trimName,
        origin: trimOrigin,
        destination: trimDest,
        num_state: cleanedStations.length,
        list_state: [...cleanedStations],
        segmentDistancesKm: editDistances.slice(0, cleanedStations.length + 1),
        updatedAt: new Date().toISOString(),
      };

      // Cascade line rename to assigned trains
      nextDb.trains.forEach((t) => {
        if (normalizeIdentifier(t.name_line) === normalizeIdentifier(oldName)) {
          t.name_line = trimName;
        }
      });

      nextDb.auditLogs.unshift({
        id: `aud_${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorRole: 'staff',
        actorUsername,
        action: 'LINE_UPDATED',
        detailsEn: `Updated line "${oldName}" -> "${trimName}".`,
        detailsFa: `اطلاعات خط ریلی «${trimName}» بروزرسانی شد.`,
      });

      onUpdateDb(nextDb);
      setEditingLine(null);
      notify(`Updated line "${trimName}".`, `خط ریلی «${trimName}» با موفقیت بروزرسانی شد.`);
    }
  };

  const handleConfirmDeleteLine = () => {
    if (!deletingLine) return;
    const nextDb = deepClone(db);
    nextDb.lines = nextDb.lines.filter((l) => l.id !== deletingLine.id);
    // Cascade remove trains on that line
    nextDb.trains = nextDb.trains.filter(
      (t) => normalizeIdentifier(t.name_line) !== normalizeIdentifier(deletingLine.name_line)
    );
    nextDb.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorRole: 'staff',
      actorUsername,
      action: 'LINE_REMOVED',
      detailsEn: `Deleted line "${deletingLine.name_line}" and its associated train schedules.`,
      detailsFa: `خط ریلی «${deletingLine.name_line}» و قطارهای مرتبط با آن حذف شدند.`,
    });
    onUpdateDb(nextDb);
    setDeletingLine(null);
    notify(
      `Deleted line "${deletingLine.name_line}".`,
      `خط ریلی «${deletingLine.name_line}» با موفقیت حذف شد.`
    );
  };

  // --- HANDLERS FOR TRAINS ---
  const handleAddTrain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLineObj) {
      notify('Please create and select a railway line first.', 'ابتدا یک خط ریلی انتخاب کنید.', 'error');
      return;
    }

    const trimId = trainId.trim().toUpperCase();
    const trimName = trainName.trim();
    if (!trimId || !trimName) {
      notify('Train ID and Train Name are required.', 'شناسه قطار و نام قطار الزامی است.', 'error');
      return;
    }

    if (db.trains.some((t) => normalizeIdentifier(t.id_train) === normalizeIdentifier(trimId))) {
      notify(
        `Train ID "${trimId}" already exists! Please enter a unique ID.`,
        `شناسه قطار «${trimId}» تکراری است! شناسه دیگری وارد کنید.`,
        'error'
      );
      return;
    }

    const parsedSpeed = parsePositiveNumber(speed);
    const parsedCost = parsePositiveNumber(costTicket);
    const parsedCap = parsePositiveInteger(capacity);

    if (!parsedSpeed.valid || !parsedCost.valid || !parsedCap.valid) {
      notify(
        'Speed, Ticket Price, and Seat Capacity must be valid positive numbers.',
        'سرعت، قیمت بلیط و ظرفیت صندلی باید اعداد مثبت معتبر باشند.',
        'error'
      );
      return;
    }

    // Run mandatory `checkAccident` guard before scheduling!
    const collisionCheck = checkAccident(
      {
        id_train: trimId,
        name_train: trimName,
        name_line: selectedLineObj.name_line,
        departureTime,
        speed: parsedSpeed.value,
        list_stop_time: { ...stopTimesMap },
      },
      db.trains,
      selectedLineObj
    );

    if (collisionCheck.hasConflict) {
      notify(
        `DISPATCH BLOCKED BY SAFETY ENGINE: ${collisionCheck.conflicts[0].descriptionEn} Suggested safe departure: ${collisionCheck.suggestedSafeDeparture}`,
        `مسدودسازی توسط موتور ایمنی (checkAccident): ${collisionCheck.conflicts[0].descriptionFa} زمان حرکت ایمن پیشنهادی: ${collisionCheck.suggestedSafeDeparture}`,
        'error'
      );
      return;
    }

    const nextDb = deepClone(db);
    const newTrain: TrainSchedule = {
      id: `trn_${Date.now()}`,
      id_train: trimId,
      name_train: trimName,
      name_line: selectedLineObj.name_line,
      departureTime,
      speed: parsedSpeed.value,
      list_stop_time: { ...stopTimesMap }, // Isolated dictionary copy
      quality,
      cost_ticket: parsedCost.value,
      totalCapacity: parsedCap.value,
      capacity: parsedCap.value,
      status: 'Scheduled',
      createdAt: new Date().toISOString(),
    };

    nextDb.trains.push(newTrain);
    nextDb.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      timestamp: newTrain.createdAt,
      actorRole: 'staff',
      actorUsername,
      action: 'TRAIN_DISPATCH_SCHEDULED',
      detailsEn: `Scheduled train ${newTrain.id_train} (${newTrain.name_train}) on "${newTrain.name_line}" at ${newTrain.departureTime} — verified conflict-free by checkAccident.`,
      detailsFa: `قطار ${newTrain.id_train} (${newTrain.name_train}) در خط «${newTrain.name_line}» ساعت ${newTrain.departureTime} پس از تایید ایمنی ثبت شد.`,
    });

    onUpdateDb(nextDb);
    setTrainId(`TR-${Math.floor(109 + Math.random() * 800)}`);
    notify(
      `Train ${newTrain.id_train} scheduled conflict-free!`,
      `قطار ${newTrain.id_train} بدون هیچ تداخل ایمنی با موفقیت زمانبندی شد!`
    );
  };

  const handleRemoveTrain = (trn: TrainSchedule) => {
    const nextDb = deepClone(db);
    nextDb.trains = nextDb.trains.filter((t) => t.id !== trn.id);
    nextDb.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorRole: 'staff',
      actorUsername,
      action: 'TRAIN_REMOVED',
      detailsEn: `Removed train ${trn.id_train} (${trn.name_train}) from line "${trn.name_line}".`,
      detailsFa: `قطار ${trn.id_train} (${trn.name_train}) از خط «${trn.name_line}» حذف شد.`,
    });
    onUpdateDb(nextDb);
    notify(
      `Train ${trn.id_train} removed.`,
      `قطار ${trn.id_train} با موفقیت از ناوگان حذف شد.`
    );
  };

  return (
    <div className="space-y-6">
      {/* Segmented Workspace Sub-Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg">
          <button
            type="button"
            onClick={() => setSubTab('LINES')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'LINES'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {isFa ? '۱. مدیریت خطوط و توپولوژی (Lines CRUD)' : '1. Railway Lines & Topology (CRUD)'}
          </button>
          <button
            type="button"
            onClick={() => setSubTab('TRAINS')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'TRAINS'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {isFa ? '۲. ناوگان قطارها و تشخیص برخورد (Trains & checkAccident)' : '2. Fleet Dispatch & Collision Guard'}
          </button>
          <button
            type="button"
            onClick={() => setSubTab('SIMULATOR')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'SIMULATOR'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {isFa ? '۳. شبیه‌ساز گراف ماری (Marey Chart Simulator)' : '3. Live Marey Chart Safety Simulator'}
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          {isFa
            ? `${db.lines.length} خط فعال · ${db.trains.length} قطار زمانبندی شده`
            : `${db.lines.length} Active Lines · ${db.trains.length} Scheduled Trains`}
        </div>
      </div>

      {/* TAB 1: RAILWAY LINE MANAGEMENT */}
      {subTab === 'LINES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Create Line Form */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <GitBranch className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {isFa ? 'تعریف خط ریلی جدید (add_train_line)' : 'Create Railway Line (add_train_line)'}
              </h3>
            </div>

            <form onSubmit={handleCreateLine} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {isFa ? 'نام یکتای خط ریلی (name_line)' : 'Line Name (name_line)'}
                </label>
                <input
                  type="text"
                  value={lineName}
                  onChange={(e) => setLineName(e.target.value)}
                  placeholder={isFa ? 'مثال: Tehran-Shiraz Royal Corridor' : 'e.g. Tehran-Shiraz Royal Corridor'}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isFa ? 'ایستگاه مبدا (origin)' : 'Origin Station (origin)'}
                  </label>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder={isFa ? 'تهران (Tehran)' : 'Tehran Central'}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isFa ? 'ایستگاه مقصد (destination)' : 'Destination (destination)'}
                  </label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder={isFa ? 'شیراز (Shiraz)' : 'Shiraz Grand'}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isFa ? 'تعداد ایستگاه‌های میانی (num_state)' : 'Intermediate Stations Count (num_state)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={stationsInput.length}
                    onChange={(e) => handleStationCountChange(Number(e.target.value))}
                    className="w-20 px-2.5 py-1 text-xs font-mono text-center rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div className="space-y-2 mt-2 max-h-60 overflow-y-auto pe-1">
                  {stationsInput.map((st, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-7">
                        <input
                          type="text"
                          value={st}
                          onChange={(e) => {
                            const next = [...stationsInput];
                            next[idx] = e.target.value;
                            setStationsInput(next);
                          }}
                          placeholder={`${isFa ? 'ایستگاه میانی' : 'Station'} #${idx + 1}`}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                        />
                      </div>
                      <div className="col-span-5">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={10}
                            value={distancesInput[idx] || 100}
                            onChange={(e) => {
                              const next = [...distancesInput];
                              next[idx] = Number(e.target.value);
                              setDistancesInput(next);
                            }}
                            className="w-full px-2 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                          />
                          <span className="text-[10px] text-slate-400 font-mono">km</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isFa ? 'ثبت خط ریلی جدید' : 'Add Train Line'}</span>
              </button>
            </form>
          </div>

          {/* Visual Route Topology Cards */}
          <div className="lg:col-span-7 space-y-4">
            {db.lines.map((line) => {
              const assignedTrains = db.trains.filter(
                (t) => normalizeIdentifier(t.name_line) === normalizeIdentifier(line.name_line)
              );
              const totalKm = (line.segmentDistancesKm || []).reduce((a, b) => a + b, 0);
              const allStops = [line.origin, ...line.list_state, line.destination];

              return (
                <div
                  key={line.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {line.name_line}
                      </h4>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                        {isFa
                          ? `${line.num_state} ایستگاه میانی · مجموع مسافت ${totalKm} کیلومتر · ${assignedTrains.length} قطار فعال`
                          : `${line.num_state} intermediate stations · ${totalKm} km total · ${assignedTrains.length} active trains`}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditLineModal(line)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{isFa ? 'ویرایش' : 'Update'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingLine(line)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-300 dark:border-red-900/60 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isFa ? 'حذف' : 'Remove'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Visual Route Topology Diagram */}
                  <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200/70 dark:border-slate-800/80 rounded-lg p-3.5 overflow-x-auto">
                    <div className="flex items-center justify-between min-w-[480px]">
                      {allStops.map((station, sIdx) => (
                        <React.Fragment key={`${line.id}-st-${sIdx}`}>
                          <div className="flex flex-col items-center text-center">
                            <div
                              className={`w-3.5 h-3.5 rounded-full border-2 ${
                                sIdx === 0 || sIdx === allStops.length - 1
                                  ? 'bg-blue-600 border-blue-300 dark:border-blue-900'
                                  : 'bg-white dark:bg-slate-900 border-slate-400 dark:border-slate-500'
                              }`}
                            />
                            <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200 mt-1.5 max-w-[110px] truncate">
                              {station}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {sIdx === 0
                                ? isFa
                                  ? 'مبدا'
                                  : 'Origin'
                                : sIdx === allStops.length - 1
                                ? isFa
                                  ? 'مقصد'
                                  : 'Dest'
                                : `#${sIdx}`}
                            </span>
                          </div>
                          {sIdx < allStops.length - 1 && (
                            <div className="flex-1 flex flex-col items-center px-2">
                              <span className="text-[10px] font-mono text-slate-400 mb-1">
                                {line.segmentDistancesKm?.[sIdx] || 100} km
                              </span>
                              <div className="w-full h-0.5 bg-slate-300 dark:bg-slate-700" />
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2 & 3: FLEET SCHEDULING, COLLISION ENGINE & MAREY CHART */}
      {(subTab === 'TRAINS' || subTab === 'SIMULATOR') && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Add / Simulate Train Form */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Train className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {isFa
                      ? 'زمانبندی قطار و تست برخورد (add_train + check_accident)'
                      : 'Schedule Train & Collision Guard (add_train)'}
                  </h3>
                </div>
              </div>

              <form onSubmit={handleAddTrain} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {isFa ? 'انتخاب خط ریلی (name_line)' : 'Assigned Railway Line (name_line)'}
                  </label>
                  <select
                    value={selectedLineObj?.name_line || ''}
                    onChange={(e) => setSelectedLineName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
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
                      {isFa ? 'شناسه یکتای قطار (id_train)' : 'Train ID (id_train)'}
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={trainId}
                      onChange={(e) => setTrainId(e.target.value)}
                      placeholder="TR-108"
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {isFa ? 'نام قطار (name_train)' : 'Train Name (name_train)'}
                    </label>
                    <input
                      type="text"
                      value={trainName}
                      onChange={(e) => setTrainName(e.target.value)}
                      placeholder="Aria Express"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {isFa ? 'ساعت حرکت از مبدا' : 'Departure Time (HH:mm)'}
                    </label>
                    <input
                      type="time"
                      dir="ltr"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {isFa ? 'سرعت متوسط (km/h)' : 'Average Speed (km/h)'}
                    </label>
                    <input
                      type="number"
                      dir="ltr"
                      min={20}
                      max={350}
                      value={speed}
                      onChange={(e) => setSpeed(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                    />
                  </div>
                </div>

                {/* Dynamic Station Stop Times (`list_stop_time`) */}
                {selectedLineObj && selectedLineObj.list_state.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {isFa
                        ? 'مدت توقف در ایستگاه‌های میانی به دقیقه (list_stop_time)'
                        : 'Intermediate Station Stop Durations in Minutes (list_stop_time)'}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {selectedLineObj.list_state.map((st) => (
                        <div key={st}>
                          <label className="block text-[11px] text-slate-500 truncate mb-0.5">
                            {st}
                          </label>
                          <input
                            type="number"
                            dir="ltr"
                            min={0}
                            max={120}
                            value={stopTimesMap[st] ?? 10}
                            onChange={(e) =>
                              setStopTimesMap({
                                ...stopTimesMap,
                                [st]: Math.max(0, Number(e.target.value)),
                              })
                            }
                            className="w-full px-2 py-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {isFa ? 'کیفیت (quality)' : 'Quality Tier'}
                    </label>
                    <select
                      value={quality}
                      onChange={(e) => setQuality(e.target.value as QualityTier)}
                      className="w-full px-2 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                    >
                      <option value="VIP 5-Star">VIP 5-Star</option>
                      <option value="Business 4-Star">Business 4-Star</option>
                      <option value="Economy 3-Star">Economy 3-Star</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {isFa ? 'قیمت بلیط ($)' : 'Ticket Cost ($)'}
                    </label>
                    <input
                      type="number"
                      dir="ltr"
                      min={1}
                      step="0.5"
                      value={costTicket}
                      onChange={(e) => setCostTicket(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {isFa ? 'ظرفیت صندلی' : 'Seat Capacity'}
                    </label>
                    <input
                      type="number"
                      dir="ltr"
                      min={1}
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                    />
                  </div>
                </div>

                {/* Live checkAccident Safety Status Box */}
                {liveCollisionResult && (
                  <div
                    className={`rounded-xl p-3.5 border text-xs ${
                      liveCollisionResult.hasConflict
                        ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 font-semibold mb-1.5">
                      <div className="flex items-center gap-1.5">
                        {liveCollisionResult.hasConflict ? (
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                        ) : (
                          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                        <span>
                          {liveCollisionResult.hasConflict
                            ? isFa
                              ? `هشدار برخورد شناسایی شد (${liveCollisionResult.conflicts.length} تداخل)`
                              : `Collision Risk Detected (${liveCollisionResult.conflicts.length} conflicts)`
                            : isFa
                            ? 'مسیر ایمن است — بدون تداخل ایستگاهی یا بلاک ریلی'
                            : 'Schedule Safe — Zero Station or Track Segment Conflicts'}
                        </span>
                      </div>
                    </div>

                    {liveCollisionResult.hasConflict && (
                      <div className="space-y-2 mt-2">
                        {liveCollisionResult.conflicts.slice(0, 2).map((c) => (
                          <div key={c.id} className="text-[11px] leading-relaxed">
                            • {isFa ? c.descriptionFa : c.descriptionEn}
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-2 border-t border-red-500/20">
                          <span className="font-mono text-[11px]">
                            {isFa
                              ? `پیشنهاد ساعت حرکت ایمن: ${liveCollisionResult.suggestedSafeDeparture}`
                              : `Suggested Safe Departure: ${liveCollisionResult.suggestedSafeDeparture}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => setDepartureTime(liveCollisionResult.suggestedSafeDeparture)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-[11px] font-medium cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{isFa ? 'اعمال ساعت ایمن' : 'Apply Safe Slot'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isFa ? 'ثبت قطار در جدول زمانبندی' : 'Dispatch & Schedule Train'}</span>
                </button>
              </form>
            </div>

            {/* Right Column: Marey Chart + Station Timetable Preview */}
            <div className="lg:col-span-7 space-y-6">
              {selectedLineObj && (
                <MareyChart
                  line={selectedLineObj}
                  trains={db.trains}
                  candidateTrain={{
                    id_train: trainId || 'CANDIDATE',
                    name_train: trainName,
                    departureTime,
                    speed: Math.max(20, Number(speed) || 120),
                    list_stop_time: stopTimesMap,
                  }}
                  conflicts={liveCollisionResult?.conflicts || []}
                  lang={lang}
                />
              )}

              {/* Candidate Timetable Breakdown */}
              {liveCollisionResult && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {isFa
                        ? `جدول زمانبندی محاسبه شده برای قطار پیشنهادی (${trainId})`
                        : `Computed Station-by-Station Timetable for Candidate (${trainId})`}
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {liveCollisionResult.candidateTimings.map((node) => (
                      <div
                        key={node.stationIndex}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-lg p-2.5 text-xs"
                      >
                        <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {node.stationName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-1">
                          {isFa ? 'ورود:' : 'Arr:'} {node.arrivalFormatted}
                        </div>
                        <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
                          {isFa ? 'حرکت:' : 'Dep:'} {node.departureFormatted}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fleet Directory Table (`view_trains`, `remove_train`) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">
              {isFa
                ? 'فهرست کامل قطارهای فعال ناوگان (view_trains & remove_train)'
                : 'Active Train Fleet & Timetable Directory (view_trains & remove_train)'}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3 text-start">{isFa ? 'شناسه و نام قطار' : 'Train ID & Name'}</th>
                    <th className="py-2.5 px-3 text-start">{isFa ? 'خط ریلی' : 'Assigned Line'}</th>
                    <th className="py-2.5 px-3 text-start">{isFa ? 'ساعت حرکت و سرعت' : 'Departure & Speed'}</th>
                    <th className="py-2.5 px-3 text-start">{isFa ? 'رده کیفی و قیمت' : 'Quality & Fare'}</th>
                    <th className="py-2.5 px-3 text-start">{isFa ? 'ظرفیت صندلی' : 'Seat Capacity'}</th>
                    <th className="py-2.5 px-3 text-end">{isFa ? 'حذف' : 'Remove'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70 text-xs">
                  {db.trains.map((trn) => {
                    const line = db.lines.find(
                      (l) => normalizeIdentifier(l.name_line) === normalizeIdentifier(trn.name_line)
                    );
                    const timings = line ? computeTrainStationTimings(trn, line) : [];
                    const arrivalEnd = timings.length > 0 ? timings[timings.length - 1].arrivalFormatted : '--:--';

                    return (
                      <tr
                        key={trn.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                            {trn.id_train}
                          </div>
                          <div className="text-slate-700 dark:text-slate-300">{trn.name_train}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{trn.name_line}</td>
                        <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                          <div>
                            {trn.departureTime} → {arrivalEnd}
                          </div>
                          <div className="text-[11px] text-slate-400">{trn.speed} km/h</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-medium text-slate-800 dark:text-slate-200">{trn.quality}</span>
                          <span className="mx-1.5 text-slate-400">·</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                            ${trn.cost_ticket.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <span className="text-slate-900 dark:text-slate-100 font-semibold">
                            {trn.capacity}
                          </span>
                          <span className="text-slate-400"> / {trn.totalCapacity}</span>
                        </td>
                        <td className="py-3 px-3 text-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveTrain(trn)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title={isFa ? 'حذف قطار' : 'Remove Train'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Line Modal */}
      {editingLine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-5 shadow-xl">
            <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
              {isFa ? `ویرایش خط ریلی (update_line): ${editingLine.name_line}` : `Update Line: ${editingLine.name_line}`}
            </h4>
            <form onSubmit={handleSaveLineUpdate} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  {isFa ? 'نام خط ریلی (name_line)' : 'Line Name (name_line)'}
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
                  <label className="block text-xs text-slate-500 mb-1">{isFa ? 'مبدا (origin)' : 'Origin'}</label>
                  <input
                    type="text"
                    value={editOrigin}
                    onChange={(e) => setEditOrigin(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{isFa ? 'مقصد (destination)' : 'Destination'}</label>
                  <input
                    type="text"
                    value={editDestination}
                    onChange={(e) => setEditDestination(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-500">
                    {isFa ? 'ایستگاه‌های میانی (list_state) — با قابلیت جابجایی ترتیب' : 'Intermediate Stations (Reorderable)'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditStations([...editStations, `Station ${editStations.length + 1}`]);
                      setEditDistances([...editDistances, 120]);
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 font-medium cursor-pointer"
                  >
                    + {isFa ? 'افزودن ایستگاه' : 'Add Station'}
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {editStations.map((st, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={st}
                        onChange={(e) => {
                          const next = [...editStations];
                          next[idx] = e.target.value;
                          setEditStations(next);
                        }}
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                      />
                      <button
                        type="button"
                        onClick={() => moveEditStation(idx, -1)}
                        className="p-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveEditStation(idx, 1)}
                        className="p-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditStations(editStations.filter((_, i) => i !== idx));
                        }}
                        className="p-1.5 rounded border border-red-300 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingLine(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  {isFa ? 'انصراف' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                >
                  {isFa ? 'ذخیره تغییرات خط' : 'Save Line Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Line Cascade Confirmation Modal */}
      {deletingLine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-5 shadow-xl">
            <h4 className="text-base font-semibold text-red-600 dark:text-red-400 mb-2">
              {isFa ? 'هشدار حذف خط ریلی (remove_line)' : 'Confirm Line Deletion (Cascade Warning)'}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              {isFa
                ? `آیا از حذف خط «${deletingLine.name_line}» اطمینان دارید؟ تمام قطارهای زمانبندی شده روی این خط نیز به صورت خودکار حذف خواهند شد.`
                : `Are you sure you want to delete "${deletingLine.name_line}"? Any trains assigned to this line will also be removed.`}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingLine(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                {isFa ? 'انصراف' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteLine}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white cursor-pointer"
              >
                {isFa ? 'بله، حذف شود' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
