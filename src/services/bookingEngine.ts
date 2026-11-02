import { PlatformDatabaseV2, TicketRecord, WalletTransaction } from '../types/domain';
import { formatRial, normalizeIdentifier, parsePositiveInteger, parsePositiveNumber } from './authService';
import { deepClone } from './storageAndMigration';

export interface WalletOperationResult {
  success: boolean;
  db: PlatformDatabaseV2;
  newBalance?: number;
  transaction?: WalletTransaction;
  errorEn?: string;
  errorFa?: string;
}

export interface TicketBookingResult {
  success: boolean;
  db: PlatformDatabaseV2;
  ticket?: TicketRecord;
  lowBalanceRedirect?: boolean;
  requiredShortfall?: number;
  errorEn?: string;
  errorFa?: string;
}

/**
 * Atomic wallet deposit scoped strictly to `userId`.
 */
export function depositToWallet(
  db: PlatformDatabaseV2,
  userId: string,
  rawAmount: unknown,
  customNoteEn?: string,
  customNoteFa?: string
): WalletOperationResult {
  const parsed = parsePositiveNumber(rawAmount);
  if (!parsed.valid) {
    return {
      success: false,
      db,
      errorEn: parsed.errorEn,
      errorFa: parsed.errorFa,
    };
  }

  const nextDb = deepClone(db);
  const userIdx = nextDb.passengers.findIndex((u) => u.id === userId);
  if (userIdx === -1) {
    return {
      success: false,
      db,
      errorEn: 'Authenticated passenger account not found.',
      errorFa: 'حساب کاربری مسافر یافت نشد.',
    };
  }

  const user = nextDb.passengers[userIdx];
  const updatedBalance = Math.round((user.balance + parsed.value) * 100) / 100;
  user.balance = updatedBalance;

  const tx: WalletTransaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: user.id,
    username: user.username,
    type: 'DEPOSIT',
    amount: parsed.value,
    runningBalance: updatedBalance,
    descriptionEn: customNoteEn || `Wallet Deposit (+${formatRial(parsed.value, 'en')})`,
    descriptionFa: customNoteFa || `افزایش موجودی کیف پول (+${formatRial(parsed.value, 'fa')})`,
    timestamp: new Date().toISOString(),
  };

  nextDb.transactions.unshift(tx);
  nextDb.auditLogs.unshift({
    id: `aud_${Date.now()}`,
    timestamp: tx.timestamp,
    actorRole: 'passenger',
    actorUsername: user.username,
    action: 'WALLET_DEPOSIT',
    detailsEn: `Deposited ${formatRial(parsed.value, 'en')}. New balance: ${formatRial(updatedBalance, 'en')}.`,
    detailsFa: `مبلغ ${formatRial(parsed.value, 'fa')} به کیف پول اضافه شد. موجودی جدید: ${formatRial(updatedBalance, 'fa')}.`,
  });

  return {
    success: true,
    db: nextDb,
    newBalance: updatedBalance,
    transaction: tx,
  };
}

/**
 * Atomic wallet withdrawal scoped strictly to `userId`.
 */
export function withdrawFromWallet(
  db: PlatformDatabaseV2,
  userId: string,
  rawAmount: unknown
): WalletOperationResult {
  const parsed = parsePositiveNumber(rawAmount);
  if (!parsed.valid) {
    return {
      success: false,
      db,
      errorEn: parsed.errorEn,
      errorFa: parsed.errorFa,
    };
  }

  const nextDb = deepClone(db);
  const userIdx = nextDb.passengers.findIndex((u) => u.id === userId);
  if (userIdx === -1) {
    return {
      success: false,
      db,
      errorEn: 'Authenticated passenger account not found.',
      errorFa: 'حساب کاربری مسافر یافت نشد.',
    };
  }

  const user = nextDb.passengers[userIdx];
  if (parsed.value > user.balance) {
    return {
      success: false,
      db,
      errorEn: `Insufficient wallet balance (${formatRial(user.balance, 'en')}) to withdraw ${formatRial(parsed.value, 'en')}.`,
      errorFa: `موجودی کیف پول (${formatRial(user.balance, 'fa')}) برای برداشت مبلغ ${formatRial(parsed.value, 'fa')} کافی نیست.`,
    };
  }

  const updatedBalance = Math.round((user.balance - parsed.value) * 100) / 100;
  user.balance = updatedBalance;

  const tx: WalletTransaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: user.id,
    username: user.username,
    type: 'WITHDRAWAL',
    amount: parsed.value,
    runningBalance: updatedBalance,
    descriptionEn: `Wallet Withdrawal (-${formatRial(parsed.value, 'en')})`,
    descriptionFa: `برداشت وجه از کیف پول (-${formatRial(parsed.value, 'fa')})`,
    timestamp: new Date().toISOString(),
  };

  nextDb.transactions.unshift(tx);
  nextDb.auditLogs.unshift({
    id: `aud_${Date.now()}`,
    timestamp: tx.timestamp,
    actorRole: 'passenger',
    actorUsername: user.username,
    action: 'WALLET_WITHDRAWAL',
    detailsEn: `Withdrew ${formatRial(parsed.value, 'en')}. Remaining balance: ${formatRial(updatedBalance, 'en')}.`,
    detailsFa: `مبلغ ${formatRial(parsed.value, 'fa')} از کیف پول برداشت شد. موجودی باقیمانده: ${formatRial(updatedBalance, 'fa')}.`,
  });

  return {
    success: true,
    db: nextDb,
    newBalance: updatedBalance,
    transaction: tx,
  };
}

/**
 * Atomic Ticket Purchase Engine with optional coach & seat numbers assignment.
 */
export function purchaseTrainTicket(
  db: PlatformDatabaseV2,
  userId: string,
  trainIdInput: string,
  rawTicketCount: unknown,
  selectedSeats?: string[],
  coachNumber: number = 1
): TicketBookingResult {
  const countCheck = parsePositiveInteger(rawTicketCount);
  if (!countCheck.valid) {
    return {
      success: false,
      db,
      errorEn: countCheck.errorEn || 'Ticket count must be a positive integer.',
      errorFa: countCheck.errorFa || 'تعداد بلیط باید یک عدد صحیح بزرگتر از صفر باشد.',
    };
  }
  const ticketCount = countCheck.value;

  const normTrainId = normalizeIdentifier(trainIdInput);
  const nextDb = deepClone(db);

  const trainIdx = nextDb.trains.findIndex((t) => normalizeIdentifier(t.id_train) === normTrainId);
  if (trainIdx === -1) {
    return {
      success: false,
      db,
      errorEn: `Train "${trainIdInput}" was not found.`,
      errorFa: `قطار با شناسه «${trainIdInput}» یافت نشد.`,
    };
  }

  const userIdx = nextDb.passengers.findIndex((u) => u.id === userId);
  if (userIdx === -1) {
    return {
      success: false,
      db,
      errorEn: 'Passenger session invalid.',
      errorFa: 'نشست کاربری مسافر معتبر نیست.',
    };
  }

  const train = nextDb.trains[trainIdx];
  const user = nextDb.passengers[userIdx];

  if (ticketCount > train.capacity) {
    return {
      success: false,
      db,
      errorEn: `Insufficient seat capacity on ${train.id_train}. Requested: ${ticketCount}, Available: ${train.capacity}.`,
      errorFa: `ظرفیت صندلی کافی در قطار ${train.id_train} وجود ندارد. درخواستی: ${ticketCount}، ظرفیت باقیمانده: ${train.capacity}.`,
    };
  }

  const totalCost = Math.round(ticketCount * train.cost_ticket * 100) / 100;
  if (totalCost > user.balance) {
    const shortfall = Math.round((totalCost - user.balance) * 100) / 100;
    return {
      success: false,
      db,
      lowBalanceRedirect: true,
      requiredShortfall: shortfall,
      errorEn: `Insufficient wallet balance. Total cost is ${formatRial(totalCost, 'en')}, but your balance is ${formatRial(user.balance, 'en')} (Shortfall: ${formatRial(shortfall, 'en')}).`,
      errorFa: `موجودی کیف پول کافی نیست. هزینه کل بلیط‌ها ${formatRial(totalCost, 'fa')} است اما موجودی شما ${formatRial(user.balance, 'fa')} می‌باشد (کمبود اعتبار: ${formatRial(shortfall, 'fa')}).`,
    };
  }

  const line = nextDb.lines.find((l) => normalizeIdentifier(l.name_line) === normalizeIdentifier(train.name_line));
  const origin = line ? line.origin : 'Origin Station';
  const destination = line ? line.destination : 'Destination Station';

  // Assign seat numbers if not explicitly provided
  const assignedSeats =
    selectedSeats && selectedSeats.length === ticketCount
      ? [...selectedSeats]
      : Array.from({ length: ticketCount }, (_, idx) => {
          const row = Math.floor((train.totalCapacity - train.capacity + idx) / 4) + 1;
          const col = ['A', 'B', 'C', 'D'][(train.totalCapacity - train.capacity + idx) % 4];
          return `${row}${col}`;
        });

  user.balance = Math.round((user.balance - totalCost) * 100) / 100;
  train.capacity -= ticketCount;

  const pnr = `RP-${Math.floor(10000 + Math.random() * 90000)}`;
  const nowIso = new Date().toISOString();

  const ticket: TicketRecord = {
    id: `tkt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    pnr,
    userId: user.id,
    passengerName: user.name,
    passengerUsername: user.username,
    id_train: train.id_train,
    name_train: train.name_train,
    name_line: train.name_line,
    origin,
    destination,
    departureTime: train.departureTime,
    ticketCount,
    seatNumbers: assignedSeats,
    coachNumber,
    unitPrice: train.cost_ticket,
    totalPrice: totalCost,
    quality: train.quality,
    status: 'Confirmed',
    purchasedAt: nowIso,
    qrPayload: `RAILPULSE|PNR:${pnr}|TRAIN:${train.id_train}|COACH:${coachNumber}|SEATS:${assignedSeats.join(',')}|USER:${user.username}|VERIFIED`,
  };

  const tx: WalletTransaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: user.id,
    username: user.username,
    type: 'TICKET_PURCHASE',
    amount: totalCost,
    runningBalance: user.balance,
    descriptionEn: `Booked ${ticketCount}x seat(s) (${assignedSeats.join(', ')}) on ${train.id_train} (${train.name_line}) • PNR ${pnr}`,
    descriptionFa: `خرید ${ticketCount} صندلی (${assignedSeats.join('، ')}) در قطار ${train.id_train} (${train.name_line}) • کد رزرو ${pnr}`,
    referenceId: pnr,
    timestamp: nowIso,
  };

  nextDb.tickets.unshift(ticket);
  nextDb.transactions.unshift(tx);
  nextDb.auditLogs.unshift({
    id: `aud_${Date.now()}`,
    timestamp: nowIso,
    actorRole: 'passenger',
    actorUsername: user.username,
    action: 'TICKET_BOOKED',
    detailsEn: `Passenger ${user.username} booked ${ticketCount} seat(s) (${assignedSeats.join(', ')}) on ${train.id_train} for ${formatRial(totalCost, 'en')} (PNR: ${pnr}).`,
    detailsFa: `مسافر ${user.username} تعداد ${ticketCount} صندلی (${assignedSeats.join('، ')}) در قطار ${train.id_train} به مبلغ ${formatRial(totalCost, 'fa')} رزرو کرد (کد: ${pnr}).`,
  });

  return {
    success: true,
    db: nextDb,
    ticket,
  };
}

/**
 * Refunds an active ticket, restoring seat capacity to the train and crediting the passenger's wallet.
 */
export function refundTrainTicket(
  db: PlatformDatabaseV2,
  userId: string,
  ticketId: string
): TicketBookingResult {
  const nextDb = deepClone(db);
  const tktIdx = nextDb.tickets.findIndex((t) => t.id === ticketId && t.userId === userId);
  if (tktIdx === -1) {
    return {
      success: false,
      db,
      errorEn: 'Ticket not found or does not belong to current user.',
      errorFa: 'بلیط مورد نظر یافت نشد یا متعلق به این حساب کاربری نیست.',
    };
  }

  const ticket = nextDb.tickets[tktIdx];
  if (ticket.status === 'Refunded') {
    return {
      success: false,
      db,
      errorEn: 'Ticket has already been refunded.',
      errorFa: 'این بلیط قبلاً استرداد شده است.',
    };
  }

  const user = nextDb.passengers.find((u) => u.id === userId);
  if (!user) {
    return {
      success: false,
      db,
      errorEn: 'Passenger account not found.',
      errorFa: 'حساب مسافر یافت نشد.',
    };
  }

  ticket.status = 'Refunded';
  user.balance = Math.round((user.balance + ticket.totalPrice) * 100) / 100;

  const train = nextDb.trains.find((t) => normalizeIdentifier(t.id_train) === normalizeIdentifier(ticket.id_train));
  if (train) {
    train.capacity = Math.min(train.totalCapacity, train.capacity + ticket.ticketCount);
  }

  const nowIso = new Date().toISOString();
  nextDb.transactions.unshift({
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: user.id,
    username: user.username,
    type: 'TICKET_REFUND',
    amount: ticket.totalPrice,
    runningBalance: user.balance,
    descriptionEn: `Full Refund for Ticket PNR ${ticket.pnr} (${ticket.id_train})`,
    descriptionFa: `استرداد کامل وجه بلیط با کد رزرو ${ticket.pnr} (${ticket.id_train})`,
    referenceId: ticket.pnr,
    timestamp: nowIso,
  });

  nextDb.auditLogs.unshift({
    id: `aud_${Date.now()}`,
    timestamp: nowIso,
    actorRole: 'passenger',
    actorUsername: user.username,
    action: 'TICKET_REFUNDED',
    detailsEn: `Refunded ticket ${ticket.pnr} (${formatRial(ticket.totalPrice, 'en')}) and restored ${ticket.ticketCount} seat(s) to ${ticket.id_train}.`,
    detailsFa: `استرداد بلیط ${ticket.pnr} به مبلغ ${formatRial(ticket.totalPrice, 'fa')} و بازگشت ${ticket.ticketCount} صندلی به ظرفیت قطار ${ticket.id_train}.`,
  });

  return {
    success: true,
    db: nextDb,
    ticket,
  };
}
