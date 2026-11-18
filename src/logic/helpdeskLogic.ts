export type TicketStatus = 'Open' | 'In Progress' | 'Solved';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TicketCategory =
  | 'Network'
  | 'Hardware'
  | 'Software'
  | 'Server/Active Directory'
  | 'Printer/Peripheral';

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

export interface TicketFilter {
  search: string;
  status: TicketStatus | 'All';
  priority: TicketPriority | 'All';
  pic: string | 'All';
}

export interface ResolutionPayload {
  rootCause: string;
  actionTaken: string;
  pic: string;
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
    if (filter.status !== 'All' && ticket.status !== filter.status) return false;
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
