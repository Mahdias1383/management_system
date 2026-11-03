import React, { useRef } from 'react';
import { CheckCircle2, Printer, QrCode, X } from 'lucide-react';
import { Language, TicketRecord } from '../types/domain';
import { RailPulseLogo } from './ui/RailPulseLogo';
import { useOnClickOutside } from '../hooks/useOnClickOutside';
import {
  formatCurrency,
  formatDateTime,
  formatTime,
  localizeQuality,
  localizeText,
  toPersianDigits,
} from '../services/authService';

interface DigitalBoardingPassModalProps {
  ticket: TicketRecord;
  lang: Language;
  onClose: () => void;
}

export const DigitalBoardingPassModal: React.FC<DigitalBoardingPassModalProps> = ({
  ticket,
  lang,
  onClose,
}) => {
  const isFa = lang === 'fa';
  const modalContentRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(modalContentRef, onClose);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isFa ? 'کارت سوارشدن دیجیتال مسافر' : 'Passenger Digital Boarding Pass'}
      onClick={onClose}
      className="rp-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4"
    >
      <div
        ref={modalContentRef}
        onClick={(e) => e.stopPropagation()}
        className="rp-modal-content bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl"
      >
        {/* Top Ticket Header Banner with RailPulse Logo */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RailPulseLogo size="sm" variant="icon" />
            <div>
              <div className="text-[11px] font-semibold tracking-wider text-blue-400">
                {isFa ? 'کارت سوارشدن دیجیتال ریل‌پالس' : 'RAILPULSE BOARDING PASS'}
              </div>
              <div className="text-sm font-bold">{localizeText(ticket.name_train, lang)}</div>
            </div>
          </div>

          <div className="text-end font-mono">
            <div className="text-[10px] text-slate-400">
              {isFa ? 'کد رهگیری (PNR)' : 'PNR REFERENCE'}
            </div>
            <div className="text-base font-bold text-emerald-400">
              {toPersianDigits(ticket.pnr, lang)}
            </div>
          </div>
        </div>

        {/* Ticket Body */}
        <div className="p-6 space-y-5">
          {/* Origin -> Destination */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div>
              <div className="text-[11px] text-slate-400">
                {isFa ? 'ایستگاه مبدا' : 'Origin Station'}
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {localizeText(ticket.origin, lang)}
              </div>
              <div className="text-xs font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                {isFa ? 'حرکت:' : 'Dep:'} {formatTime(ticket.departureTime, lang)}
              </div>
            </div>

            <div className="text-slate-400 font-mono text-xs px-2">───►</div>

            <div className="text-end">
              <div className="text-[11px] text-slate-400">
                {isFa ? 'ایستگاه مقصد' : 'Destination'}
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {localizeText(ticket.destination, lang)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {localizeQuality(ticket.quality, lang)}
              </div>
            </div>
          </div>

          {/* Passenger & Seat Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
              <div className="text-[10px] text-slate-400">
                {isFa ? 'نام مسافر' : 'Passenger'}
              </div>
              <div className="font-semibold text-slate-900 dark:text-white mt-0.5 truncate">
                {localizeText(ticket.passengerName, lang)}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
              <div className="text-[10px] text-slate-400">
                {isFa ? 'شماره قطار' : 'Train No.'}
              </div>
              <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                {toPersianDigits(ticket.id_train, lang)}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
              <div className="text-[10px] text-slate-400">
                {isFa ? 'واگن و صندلی' : 'Coach & Seats'}
              </div>
              <div className="font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {isFa
                  ? `واگن ${toPersianDigits(ticket.coachNumber || 1, lang)}`
                  : `C${ticket.coachNumber || 1}`}{' '}
                · {toPersianDigits((ticket.seatNumbers || ['1A']).join(isFa ? '، ' : ', '), lang)}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
              <div className="text-[10px] text-slate-400">
                {isFa ? 'مبلغ پرداخت شده' : 'Total Paid'}
              </div>
              <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatCurrency(ticket.totalPrice, isFa ? 'Rial' : 'USD')}
              </div>
            </div>
          </div>

          {/* Perforated Divider */}
          <div className="border-t-2 border-dashed border-slate-200 dark:border-slate-800 pt-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shrink-0">
                <QrCode className="w-12 h-12 text-slate-900 dark:text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    {isFa
                      ? 'کارت سوارشدن معتبر و تایید شده'
                      : 'Verified Digital Boarding Pass'}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate mt-1" dir="ltr">
                  {ticket.qrPayload}
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                  {isFa ? 'زمان صدور:' : 'Issued:'} {formatDateTime(ticket.purchasedAt, lang, 'full')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => window.print()}
            aria-label={isFa ? 'چاپ بلیط مسافرتی' : 'Print travel boarding pass'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isFa ? 'چاپ بلیط' : 'Print Ticket'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label={isFa ? 'بستن پنجره بلیط' : 'Close boarding pass modal'}
            className="rp-btn-primary inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-white text-xs font-semibold cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>{isFa ? 'بستن' : 'Close'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
