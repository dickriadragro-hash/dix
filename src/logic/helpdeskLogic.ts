export type TicketStatus = 'Open' | 'In Progress' | 'Solved';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TicketCategory =
  | 'Network'
  | 'Hardware'
  | 'Software'
  | 'Server/Active Directory'
  | 'Printer/Peripheral';

export type UserRole = 'user' | 'officer' | 'admin' | 'management';
export type DashboardPeriod = 'today' | '7days' | 'month' | 'all';
export type TicketFilterStatus = TicketStatus | 'All' | 'Active';

export interface AuthAccount {
  username: string;
  password: string;
  name: string;
  department: string;
  role: UserRole;
  roleLabel: string;
}

export interface AuthSession {
  username: string;
  name: string;
  department: string;
  role: UserRole;
  roleLabel: string;
}

export interface RolePermissions {
  allowedTabs: Array<'dashboard' | 'tickets' | 'checklist'>;
  defaultTab: 'dashboard' | 'tickets' | 'checklist';
  canCreateTicket: boolean;
  canChangeTicketStatus: boolean;
  canDeleteTicket: boolean;
  canEditChecklist: boolean;
  canManageRoutines: boolean;
  canAccessDatabaseModal: boolean;
  onlyOwnTickets: boolean;
  readOnly: boolean;
}

export interface Ticket {
  id: string;
  userName: string;
  department: string;
  category: TicketCategory;
  priority: TicketPriority;
  description: string;
  status: TicketStatus;
  pic: string;
  createdAt: string;
  createdDate: string; // YYYY-MM-DD
  createdTime: string; // HH:mm
  rootCause?: string;
  actionTaken?: string;
  solvedAt?: string;
  solvedDate?: string; // YYYY-MM-DD
  solvedTime?: string; // HH:mm
  verified?: boolean;
}

export interface RoutineItem {
  id: string;
  title: string;
  category: string;
}

export interface ActivityEntry {
  id: string;
  timestamp: string; // HH:mm
  date: string; // YYYY-MM-DD
  actor: string;
  action: string;
  target: string;
  type: 'ticket' | 'solve' | 'checklist' | 'sync' | 'system';
}

export interface TicketFilter {
  search: string;
  status: TicketFilterStatus;
  priority: TicketPriority | 'All';
  pic: string | 'All';
}

export interface ResolutionPayload {
  rootCause: string;
  actionTaken: string;
  pic: string;
}

export interface BackupPayload {
  version?: number;
  exportedAt?: string;
  updatedAt?: string;
  tickets: Ticket[];
  routines: RoutineItem[];
  routineChecksByDate: Record<string, string[]>;
  activities?: ActivityEntry[];
}

export const DEMO_ACCOUNTS: AuthAccount[] = [
  {
    username: 'user',
    password: 'user123',
    name: 'Rina Kusuma',
    department: 'Finance',
    role: 'user',
    roleLabel: 'Karyawan / User',
  },
  {
    username: 'officer',
    password: 'officer123',
    name: 'Andi Pratama',
    department: 'IT Support',
    role: 'officer',
    roleLabel: 'IT Officer',
  },
  {
    username: 'admin',
    password: 'admin123',
    name: 'IT Administrator',
    department: 'IT Infrastructure',
    role: 'admin',
    roleLabel: 'IT Admin',
  },
  {
    username: 'management',
    password: 'mgmt123',
    name: 'Direktur Operasional',
    department: 'Management',
    role: 'management',
    roleLabel: 'Management',
  },
];

export function authenticateUser(username: string, password: string): AuthSession | null {
  const cleanUser = username.trim().toLowerCase();
  const account = DEMO_ACCOUNTS.find(
    (acc) => acc.username === cleanUser && acc.password === password
  );
  if (!account) return null;
  return {
    username: account.username,
    name: account.name,
    department: account.department,
    role: account.role,
    roleLabel: account.roleLabel,
  };
}

export function getRolePermissions(role: UserRole): RolePermissions {
  switch (role) {
    case 'user':
      return {
        allowedTabs: ['tickets'],
        defaultTab: 'tickets',
        canCreateTicket: true,
        canChangeTicketStatus: false,
        canDeleteTicket: false,
        canEditChecklist: false,
        canManageRoutines: false,
        canAccessDatabaseModal: false,
        onlyOwnTickets: true,
        readOnly: false,
      };
    case 'officer':
      return {
        allowedTabs: ['dashboard', 'tickets', 'checklist'],
        defaultTab: 'tickets',
        canCreateTicket: true,
        canChangeTicketStatus: true,
        canDeleteTicket: false,
        canEditChecklist: true,
        canManageRoutines: true,
        canAccessDatabaseModal: false,
        onlyOwnTickets: false,
        readOnly: false,
      };
    case 'admin':
      return {
        allowedTabs: ['dashboard', 'tickets', 'checklist'],
        defaultTab: 'tickets',
        canCreateTicket: true,
        canChangeTicketStatus: true,
        canDeleteTicket: true,
        canEditChecklist: true,
        canManageRoutines: true,
        canAccessDatabaseModal: true,
        onlyOwnTickets: false,
        readOnly: false,
      };
    case 'management':
      return {
        allowedTabs: ['dashboard', 'tickets', 'checklist'],
        defaultTab: 'dashboard',
        canCreateTicket: false,
        canChangeTicketStatus: false,
        canDeleteTicket: false,
        canEditChecklist: false,
        canManageRoutines: false,
        canAccessDatabaseModal: false,
        onlyOwnTickets: false,
        readOnly: true,
      };
  }
}

export function getVisibleTicketsForUser(tickets: Ticket[], session: AuthSession | null): Ticket[] {
  if (!session) return [];
  const perms = getRolePermissions(session.role);
  if (perms.onlyOwnTickets) {
    return tickets.filter((t) => t.userName.trim().toLowerCase() === session.name.trim().toLowerCase());
  }
  return tickets;
}

export function formatLocalDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatLocalTime(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function addDaysToDateStr(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return formatLocalDate(dt);
}

export function getDateRangeDates(startDate: string, endDate: string): string[] {
  if (!startDate || !endDate || startDate > endDate) return [];
  const dates: string[] = [];
  let current = startDate;
  let guard = 0;
  while (current <= endDate && guard < 366) {
    dates.push(current);
    current = addDaysToDateStr(current, 1);
    guard += 1;
  }
  return dates;
}

export function generateNextTicketId(tickets: Ticket[]): string {
  let maxNum = 100;
  for (const ticket of tickets) {
    const match = /^TKT-(\d+)$/.exec(ticket.id);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return `TKT-${maxNum + 1}`;
}

export function filterTickets(tickets: Ticket[], filter: TicketFilter): Ticket[] {
  const q = filter.search.trim().toLowerCase();
  return tickets.filter((ticket) => {
    if (filter.status === 'Active') {
      if (ticket.status !== 'Open' && ticket.status !== 'In Progress') return false;
    } else if (filter.status !== 'All' && ticket.status !== filter.status) {
      return false;
    }
    if (filter.priority !== 'All' && ticket.priority !== filter.priority) return false;
    if (filter.pic !== 'All') {
      const ticketPic = ticket.pic || 'Belum Ditugaskan';
      if (ticketPic !== filter.pic) return false;
    }
    if (q) {
      const haystack = [
        ticket.id,
        ticket.userName,
        ticket.department,
        ticket.category,
        ticket.description,
        ticket.pic,
        ticket.rootCause || '',
        ticket.actionTaken || '',
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function filterTicketsByPeriod(
  tickets: Ticket[],
  period: DashboardPeriod,
  todayStr: string = formatLocalDate(new Date())
): Ticket[] {
  if (period === 'all') return tickets;
  if (period === 'today') {
    return tickets.filter((t) => t.createdDate === todayStr || t.solvedDate === todayStr);
  }
  if (period === '7days') {
    const minDate = addDaysToDateStr(todayStr, -6);
    return tickets.filter(
      (t) =>
        (t.createdDate >= minDate && t.createdDate <= todayStr) ||
        (Boolean(t.solvedDate) && t.solvedDate! >= minDate && t.solvedDate! <= todayStr)
    );
  }
  // month
  const monthPrefix = todayStr.slice(0, 7);
  return tickets.filter(
    (t) =>
      t.createdDate.startsWith(monthPrefix) ||
      (Boolean(t.solvedDate) && t.solvedDate!.startsWith(monthPrefix))
  );
}

export function solveTicket(
  tickets: Ticket[],
  ticketId: string,
  resolution: ResolutionPayload,
  now: Date = new Date()
): Ticket[] {
  const rootCause = resolution.rootCause.trim();
  const actionTaken = resolution.actionTaken.trim();
  const pic = resolution.pic.trim();

  if (!rootCause || !actionTaken || !pic) {
    throw new Error('Root Cause, Action Taken, dan Teknisi PIC wajib diisi.');
  }

  return tickets.map((ticket) => {
    if (ticket.id !== ticketId) return ticket;
    return {
      ...ticket,
      status: 'Solved',
      pic,
      rootCause,
      actionTaken,
      solvedAt: now.toISOString(),
      solvedDate: formatLocalDate(now),
      solvedTime: formatLocalTime(now),
      verified: false,
    };
  });
}

export function getSolvedTicketsForDate(tickets: Ticket[], dateStr: string): Ticket[] {
  return tickets
    .filter((t) => t.status === 'Solved' && t.solvedDate === dateStr)
    .sort((a, b) => (a.solvedTime || '').localeCompare(b.solvedTime || ''));
}

export function calculateChecklistProgress(
  routines: RoutineItem[],
  checkedRoutineIds: string[],
  solvedTicketsForDate: Ticket[]
): { completed: number; total: number; percentage: number } {
  const checkedSet = new Set(checkedRoutineIds);
  const completedRoutines = routines.filter((r) => checkedSet.has(r.id)).length;
  const verifiedTickets = solvedTicketsForDate.filter((t) => Boolean(t.verified)).length;

  const total = routines.length + solvedTicketsForDate.length;
  const completed = completedRoutines + verifiedTickets;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { completed, total, percentage };
}

export function calculateDashboardKpis(
  tickets: Ticket[],
  routines: RoutineItem[],
  checkedRoutineIdsForToday: string[],
  todayDate: string
) {
  const todayTickets = tickets.filter(
    (t) => t.createdDate === todayDate || t.solvedDate === todayDate
  );
  const openOrInProgress = tickets.filter(
    (t) => t.status === 'Open' || t.status === 'In Progress'
  ).length;
  const solvedTodayList = getSolvedTicketsForDate(tickets, todayDate);
  const checklist = calculateChecklistProgress(
    routines,
    checkedRoutineIdsForToday,
    solvedTodayList
  );

  return {
    totalToday: todayTickets.length,
    openOrInProgress,
    solvedToday: solvedTodayList.length,
    checklistPercentage: checklist.percentage,
    checklistCompleted: checklist.completed,
    checklistTotal: checklist.total,
  };
}

export function computePriorityDistribution(tickets: Ticket[]) {
  const priorities: TicketPriority[] = ['Critical', 'High', 'Medium', 'Low'];
  const total = tickets.length;
  return priorities.map((priority) => {
    const items = tickets.filter((t) => t.priority === priority);
    const open = items.filter((t) => t.status === 'Open').length;
    const inProgress = items.filter((t) => t.status === 'In Progress').length;
    const solved = items.filter((t) => t.status === 'Solved').length;
    return {
      priority,
      count: items.length,
      open,
      inProgress,
      solved,
      percentage: total === 0 ? 0 : Math.round((items.length / total) * 100),
    };
  });
}

export function computeCategoryBreakdown(tickets: Ticket[]) {
  const categories: TicketCategory[] = [
    'Network',
    'Hardware',
    'Software',
    'Server/Active Directory',
    'Printer/Peripheral',
  ];
  const total = tickets.length;
  return categories
    .map((category) => {
      const count = tickets.filter((t) => t.category === category).length;
      return {
        category,
        count,
        percentage: total === 0 ? 0 : Math.round((count / total) * 100),
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function computePicLeaderboard(tickets: Ticket[]) {
  const map = new Map<string, { pic: string; inProgress: number; open: number; solved: number }>();
  for (const t of tickets) {
    const pic = t.pic && t.pic !== 'Belum Ditugaskan' ? t.pic : 'Belum Ditugaskan';
    if (!map.has(pic)) {
      map.set(pic, { pic, inProgress: 0, open: 0, solved: 0 });
    }
    const row = map.get(pic)!;
    if (t.status === 'Solved') row.solved += 1;
    else if (t.status === 'In Progress') row.inProgress += 1;
    else row.open += 1;
  }
  return Array.from(map.values())
    .map((row) => {
      const handled = row.inProgress + row.solved + row.open;
      const ratio = handled === 0 ? 0 : Math.round((row.solved / handled) * 100);
      return { ...row, total: handled, solveRate: ratio };
    })
    .sort((a, b) => b.solved - a.solved || b.total - a.total);
}

export function compute7DayTrend(
  tickets: Ticket[],
  routines: RoutineItem[],
  routineChecksByDate: Record<string, string[]>,
  todayStr: string = formatLocalDate(new Date())
) {
  const startDate = addDaysToDateStr(todayStr, -6);
  const days = getDateRangeDates(startDate, todayStr);
  return days.map((date) => {
    const createdCount = tickets.filter((t) => t.createdDate === date).length;
    const solvedCount = tickets.filter((t) => t.status === 'Solved' && t.solvedDate === date).length;
    const checked = Array.isArray(routineChecksByDate[date]) ? routineChecksByDate[date] : [];
    const progress = calculateChecklistProgress(
      routines,
      checked,
      getSolvedTicketsForDate(tickets, date)
    );
    return {
      date,
      label: date.slice(5), // MM-DD
      created: createdCount,
      solved: solvedCount,
      compliance: progress.percentage,
    };
  });
}

export function calculatePeriodSummary(
  tickets: Ticket[],
  routines: RoutineItem[],
  routineChecksByDate: Record<string, string[]>,
  startDate: string,
  endDate: string
) {
  const dates = getDateRangeDates(startDate, endDate);
  const solvedTickets = tickets
    .filter((t) => t.status === 'Solved' && t.solvedDate && t.solvedDate >= startDate && t.solvedDate <= endDate)
    .sort((a, b) => (a.solvedDate || '').localeCompare(b.solvedDate || '') || (a.solvedTime || '').localeCompare(b.solvedTime || ''));

  let totalRoutineSlots = 0;
  let completedRoutineSlots = 0;
  for (const date of dates) {
    const checkedSet = new Set(Array.isArray(routineChecksByDate[date]) ? routineChecksByDate[date] : []);
    totalRoutineSlots += routines.length;
    completedRoutineSlots += routines.filter((r) => checkedSet.has(r.id)).length;
  }

  const routineCompliancePct =
    totalRoutineSlots === 0 ? 0 : Math.round((completedRoutineSlots / totalRoutineSlots) * 100);

  const periodTickets = tickets.filter(
    (t) =>
      (t.createdDate >= startDate && t.createdDate <= endDate) ||
      (Boolean(t.solvedDate) && t.solvedDate! >= startDate && t.solvedDate! <= endDate)
  );
  const categoryCounts = new Map<string, number>();
  for (const t of periodTickets) {
    categoryCounts.set(t.category, (categoryCounts.get(t.category) || 0) + 1);
  }
  let topCategory = '-';
  let topCount = 0;
  for (const [cat, cnt] of categoryCounts.entries()) {
    if (cnt > topCount) {
      topCategory = cat;
      topCount = cnt;
    }
  }

  return {
    daysCount: dates.length,
    dates,
    solvedTickets,
    totalSolved: solvedTickets.length,
    totalRoutineSlots,
    completedRoutineSlots,
    routineCompliancePct,
    topCategory,
    topCategoryCount: topCount,
  };
}

export function buildWhatsAppReport(
  dateStr: string,
  routines: RoutineItem[],
  checkedRoutineIds: string[],
  solvedTickets: Ticket[]
): string {
  const checkedSet = new Set(checkedRoutineIds);
  const progress = calculateChecklistProgress(routines, checkedRoutineIds, solvedTickets);

  const lines: string[] = [];
  lines.push(`*LAPORAN HARIAN IT HELPDESK & CHECKLIST*`);
  lines.push(`Tanggal: ${dateStr}`);
  lines.push(`Penyelesaian Checklist: ${progress.completed}/${progress.total} (${progress.percentage}%)`);
  lines.push('');
  lines.push(`*1. Rutinitas Harian IT*`);
  if (routines.length === 0) {
    lines.push(`- Tidak ada item rutinitas.`);
  } else {
    for (const item of routines) {
      const mark = checkedSet.has(item.id) ? '✅' : '⬜';
      lines.push(`${mark} ${item.title} (${item.category})`);
    }
  }
  lines.push('');
  lines.push(`*2. Tiket Solved (${solvedTickets.length})*`);
  if (solvedTickets.length === 0) {
    lines.push(`- Belum ada tiket yang diselesaikan pada tanggal ini.`);
  } else {
    for (const t of solvedTickets) {
      const mark = t.verified ? '✅' : '☑️';
      lines.push(
        `${mark} [${t.id}] ${t.userName} (${t.department}) — ${t.category} [${t.priority}]`
      );
      lines.push(`   • Selesai: ${t.solvedTime || '-'} | PIC: ${t.pic}`);
      lines.push(`   • Root Cause: ${t.rootCause || '-'}`);
      lines.push(`   • Solusi: ${t.actionTaken || '-'}`);
    }
  }

  return lines.join('\n');
}

export function buildPeriodWhatsAppReport(
  startDate: string,
  endDate: string,
  tickets: Ticket[],
  routines: RoutineItem[],
  routineChecksByDate: Record<string, string[]>
): string {
  const summary = calculatePeriodSummary(tickets, routines, routineChecksByDate, startDate, endDate);
  const lines: string[] = [];
  lines.push(`*REKAP LAPORAN PERIODE IT HELPDESK*`);
  lines.push(`Periode: ${startDate} s/d ${endDate} (${summary.daysCount} hari)`);
  lines.push(`Total Tiket Solved: ${summary.totalSolved}`);
  lines.push(
    `Kepatuhan Rutinitas Harian: ${summary.completedRoutineSlots}/${summary.totalRoutineSlots} (${summary.routineCompliancePct}%)`
  );
  lines.push(
    `Top Kategori Masalah: ${summary.topCategory}${
      summary.topCategoryCount > 0 ? ` (${summary.topCategoryCount} tiket)` : ''
    }`
  );
  lines.push('');
  lines.push(`*Ringkasan Rutinitas per Tanggal:*`);
  for (const date of summary.dates) {
    const checkedSet = new Set(Array.isArray(routineChecksByDate[date]) ? routineChecksByDate[date] : []);
    const done = routines.filter((r) => checkedSet.has(r.id)).length;
    const icon = routines.length > 0 && done === routines.length ? '✅' : '📋';
    lines.push(`${icon} ${date}: ${done}/${routines.length} rutinitas selesai`);
  }
  lines.push('');
  lines.push(`*Daftar Tiket Solved (${summary.totalSolved}):*`);
  if (summary.solvedTickets.length === 0) {
    lines.push(`- Tidak ada tiket Solved dalam periode ini.`);
  } else {
    for (const t of summary.solvedTickets) {
      lines.push(
        `${t.verified ? '✅' : '☑️'} [${t.solvedDate} ${t.solvedTime || '-'}] ${t.id} · ${t.userName} (${t.department}) — ${t.category}`
      );
      lines.push(`   • Solusi (${t.pic}): ${t.actionTaken || '-'}`);
    }
  }
  return lines.join('\n');
}

export function escapeCsvCell(value: string): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildDailyChecklistCsv(
  dateStr: string,
  routines: RoutineItem[],
  checkedRoutineIds: string[],
  solvedTickets: Ticket[]
): string {
  const checkedSet = new Set(checkedRoutineIds);
  const headers = [
    'Tanggal',
    'Tipe',
    'Referensi/ID',
    'Judul/Deskripsi',
    'User/Kategori',
    'Prioritas',
    'Jam Selesai',
    'Root Cause',
    'Action Taken',
    'PIC',
    'Status Verifikasi',
  ];

  const rows: string[][] = [headers];

  for (const r of routines) {
    rows.push([
      dateStr,
      'Rutinitas Harian',
      r.id,
      r.title,
      r.category,
      '-',
      '-',
      '-',
      '-',
      'Tim IT',
      checkedSet.has(r.id) ? 'Selesai' : 'Belum',
    ]);
  }

  for (const t of solvedTickets) {
    rows.push([
      dateStr,
      'Tiket Solved',
      t.id,
      t.description,
      `${t.userName} (${t.department}) - ${t.category}`,
      t.priority,
      t.solvedTime || '-',
      t.rootCause || '-',
      t.actionTaken || '-',
      t.pic,
      t.verified ? 'Verified/Reported' : 'Menunggu Verifikasi',
    ]);
  }

  return '\uFEFF' + rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}

export function buildPeriodChecklistCsv(
  startDate: string,
  endDate: string,
  tickets: Ticket[],
  routines: RoutineItem[],
  routineChecksByDate: Record<string, string[]>
): string {
  const summary = calculatePeriodSummary(tickets, routines, routineChecksByDate, startDate, endDate);
  const headers = [
    'Tanggal',
    'Tipe',
    'Referensi/ID',
    'Judul/Deskripsi',
    'User/Kategori',
    'Prioritas',
    'Jam Selesai',
    'Root Cause',
    'Action Taken',
    'PIC',
    'Status Verifikasi',
  ];
  const rows: string[][] = [headers];

  for (const date of summary.dates) {
    const checkedSet = new Set(Array.isArray(routineChecksByDate[date]) ? routineChecksByDate[date] : []);
    for (const r of routines) {
      rows.push([
        date,
        'Rutinitas Harian',
        r.id,
        r.title,
        r.category,
        '-',
        '-',
        '-',
        '-',
        'Tim IT',
        checkedSet.has(r.id) ? 'Selesai' : 'Belum',
      ]);
    }
    const daySolved = summary.solvedTickets.filter((t) => t.solvedDate === date);
    for (const t of daySolved) {
      rows.push([
        date,
        'Tiket Solved',
        t.id,
        t.description,
        `${t.userName} (${t.department}) - ${t.category}`,
        t.priority,
        t.solvedTime || '-',
        t.rootCause || '-',
        t.actionTaken || '-',
        t.pic,
        t.verified ? 'Verified/Reported' : 'Menunggu Verifikasi',
      ]);
    }
  }

  return '\uFEFF' + rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}

export function validateBackupPayload(raw: unknown): BackupPayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Format file backup JSON tidak valid.');
  }
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.tickets)) {
    throw new Error('Field "tickets" wajib berupa array pada file backup.');
  }
  if (!Array.isArray(obj.routines)) {
    throw new Error('Field "routines" wajib berupa array pada file backup.');
  }
  if (
    !obj.routineChecksByDate ||
    typeof obj.routineChecksByDate !== 'object' ||
    Array.isArray(obj.routineChecksByDate)
  ) {
    throw new Error('Field "routineChecksByDate" wajib berupa objek tanggal.');
  }

  return {
    version: typeof obj.version === 'number' ? obj.version : 1,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : undefined,
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : undefined,
    tickets: obj.tickets as Ticket[],
    routines: obj.routines as RoutineItem[],
    routineChecksByDate: obj.routineChecksByDate as Record<string, string[]>,
    activities: Array.isArray(obj.activities) ? (obj.activities as ActivityEntry[]) : undefined,
  };
}
