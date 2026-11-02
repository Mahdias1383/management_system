import React, { useEffect, useState } from 'react';
import { Check, Train, X } from 'lucide-react';
import { Language, StationNodeTiming, TrainSchedule } from '../types/domain';

interface SeatMapSelectorProps {
  train: TrainSchedule;
  timings: StationNodeTiming[];
  passengerBalance: number;
  occupiedSeats: string[];
  lang: Language;
  lowBalanceShortfall: number | null;
  onQuickDeposit: (amount: number) => void;
  onConfirmPurchase: (ticketCount: number, selectedSeats: string[], coachNumber: number) => void;
  onClose: () => void;
}

const ROWS = [1, 2, 3, 4, 5, 6, 7, 8];
const COLS = ['A', 'B', 'C', 'D'];

export const SeatMapSelector: React.FC<SeatMapSelectorProps> = ({
  train,
  timings,
  passengerBalance,
  occupiedSeats,
  lang,
  lowBalanceShortfall,
  onQuickDeposit,
  onConfirmPurchase,
  onClose,
}) => {
  const isFa = lang === 'fa';
  const [coachNumber, setCoachNumber] = useState<number>(1);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  // Pre-select first available seat on mount
  useEffect(() => {
    for (const r of ROWS) {
      for (const c of COLS) {
        const seatCode = `${r}${c}`;
        if (!occupiedSeats.includes(seatCode)) {
          setSelectedSeats([seatCode]);
          return;
        }
      }
    }
  }, [train.id]);

  const toggleSeat = (seatCode: string) => {
    if (occupiedSeats.includes(seatCode)) return;
    if (selectedSeats.includes(seatCode)) {
      if (selectedSeats.length > 1) {
        setSelectedSeats(selectedSeats.filter((s) => s !== seatCode));
      }
    } else {
      if (selectedSeats.length < Math.min(6, train.capacity)) {
        setSelectedSeats([...selectedSeats, seatCode]);
      }
    }
  };

  const totalCost = Math.round(selectedSeats.length * train.cost_ticket * 100) / 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl my-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <Train className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold">
                <span>{train.id_train}</span>
                <span>·</span>
                <span>{train.quality}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {train.name_train}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {train.name_line}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left: Interactive Wagon Seat Map */}
          <div className="md:col-span-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {isFa ? 'انتخاب واگن و شماره صندلی:' : 'Select Coach & Seats:'}
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((cn) => (
                  <button
                    key={cn}
                    type="button"
                    onClick={() => setCoachNumber(cn)}
                    className={`px-2.5 py-1 text-xs font-mono rounded-md cursor-pointer ${
                      coachNumber === cn
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {isFa ? `واگن ${cn}` : `Coach ${cn}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 inline-block" />
                <span>{isFa ? 'آزاد' : 'Available'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block" />
                <span>{isFa ? 'انتخاب شما' : 'Selected'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-slate-300 dark:bg-slate-800 opacity-50 inline-block" />
                <span>{isFa ? 'رزرو شده' : 'Occupied'}</span>
              </div>
            </div>

            {/* Coach Seat Grid (2 + Aisle + 2) */}
            <div className="space-y-2 max-h-64 overflow-y-auto px-2" dir="ltr">
              {ROWS.map((r) => (
                <div key={r} className="grid grid-cols-5 gap-2 items-center">
                  {['A', 'B'].map((c) => {
                    const code = `${r}${c}`;
                    const isTaken = occupiedSeats.includes(code);
                    const isSelected = selectedSeats.includes(code);
                    return (
                      <button
                        key={code}
                        type="button"
                        disabled={isTaken}
                        onClick={() => toggleSeat(code)}
                        className={`py-2 rounded-lg text-xs font-mono font-semibold border transition-colors ${
                          isTaken
                            ? 'bg-slate-200 dark:bg-slate-800/50 border-slate-300 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                            : isSelected
                            ? 'bg-blue-600 border-blue-600 text-white cursor-pointer'
                            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500 cursor-pointer'
                        }`}
                      >
                        {code}
                      </button>
                    );
                  })}

                  <div className="text-center text-[10px] font-mono text-slate-400">
                    R{r}
                  </div>

                  {['C', 'D'].map((c) => {
                    const code = `${r}${c}`;
                    const isTaken = occupiedSeats.includes(code);
                    const isSelected = selectedSeats.includes(code);
                    return (
                      <button
                        key={code}
                        type="button"
                        disabled={isTaken}
                        onClick={() => toggleSeat(code)}
                        className={`py-2 rounded-lg text-xs font-mono font-semibold border transition-colors ${
                          isTaken
                            ? 'bg-slate-200 dark:bg-slate-800/50 border-slate-300 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                            : isSelected
                            ? 'bg-blue-600 border-blue-600 text-white cursor-pointer'
                            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500 cursor-pointer'
                        }`}
                      >
                        {code}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Station Timeline & Payment Summary */}
          <div className="md:col-span-6 space-y-4">
            {/* Station-by-Station Timetable */}
            <div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {isFa ? 'برنامه زمانبندی حرکت و توقف در ایستگاه‌ها:' : 'Station Arrival & Departure Timeline:'}
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                {timings.map((node) => (
                  <div
                    key={node.stationIndex}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                  >
                    <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {node.stationName}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                      {node.arrivalFormatted} → {node.departureFormatted}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary Box */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">
                  {isFa ? 'صندلی‌های انتخاب شده:' : 'Selected Seats:'}
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {isFa ? `واگن ${coachNumber}` : `Coach ${coachNumber}`} ·{' '}
                  {selectedSeats.join(', ')} ({selectedSeats.length})
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">
                  {isFa ? 'بهای هر صندلی:' : 'Unit Ticket Fare:'}
                </span>
                <span className="font-mono">${train.cost_ticket.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">
                  {isFa ? 'موجودی فعلی کیف پول شما:' : 'Your Wallet Balance:'}
                </span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  ${passengerBalance.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm font-bold pt-2.5 border-t border-slate-200 dark:border-slate-800">
                <span>{isFa ? 'مبلغ کل قابل پرداخت:' : 'Total Amount Due:'}</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">
                  ${totalCost.toFixed(2)}
                </span>
              </div>
            </div>

            {lowBalanceShortfall !== null && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 text-xs text-amber-700 dark:text-amber-300">
                <span>
                  {isFa
                    ? `کمبود موجودی کیف پول: $${lowBalanceShortfall.toFixed(2)}`
                    : `Insufficient balance (Shortfall: $${lowBalanceShortfall.toFixed(2)})`}
                </span>
                <button
                  type="button"
                  onClick={() => onQuickDeposit(Math.ceil(lowBalanceShortfall))}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer whitespace-nowrap"
                >
                  {isFa
                    ? `شارژ فوری +$${Math.ceil(lowBalanceShortfall)}`
                    : `Instant Top-Up +$${Math.ceil(lowBalanceShortfall)}`}
                </button>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {isFa ? 'انصراف' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() =>
                  onConfirmPurchase(selectedSeats.length, selectedSeats, coachNumber)
                }
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isFa
                    ? 'تایید و پرداخت از کیف پول'
                    : 'Confirm & Pay with Wallet'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
