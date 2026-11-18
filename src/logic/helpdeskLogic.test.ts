import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Ticket,
  RoutineItem,
  filterTickets,
  solveTicket,
  getSolvedTicketsForDate,
  calculateChecklistProgress,
  calculateDashboardKpis,
  buildWhatsAppReport,
  buildDailyChecklistCsv,
  generateNextTicketId,
} from './helpdeskLogic';

const sampleTickets: Ticket[] = [
  {
    id: 'TKT-101',
    userName: 'Rina Kusuma',
    department: 'Finance',
    category: 'Printer/Peripheral',
    priority: 'High',
    description: 'Printer faktur pajak paper jam berulang',
    status: 'Open',
    pic: 'Belum Ditugaskan',
    createdAt: '2026-11-18T08:15:00.000Z',
    createdDate: '2026-11-18',
    createdTime: '08:15',
  },
  {
    id: 'TKT-102',
    userName: 'Hendra Gunawan',
    department: 'Operasional',
    category: 'Network',
    priority: 'Critical',
    description: 'Koneksi LAN lantai 2 terputus total',
    status: 'Open',
    pic: 'Andi Pratama',
    createdAt: '2026-11-18T08:45:00.000Z',
    createdDate: '2026-11-18',
    createdTime: '08:45',
  },
  {
    id: 'TKT-103',
    userName: 'Sari Wulandari',
    department: 'HRD',
    category: 'Server/Active Directory',
    priority: 'Medium',
    description: 'Reset password akun AD terkunci',
    status: 'In Progress',
    pic: 'Citra Lestari',
    createdAt: '2026-11-18T09:10:00.000Z',
    createdDate: '2026-11-18',
    createdTime: '09:10',
  },
  {
    id: 'TKT-104',
    userName: 'Bagus Setiawan',
    department: 'Sales & Marketing',
    category: 'Software',
    priority: 'Low',
    description: 'Install add-in pelaporan Excel',
    status: 'Solved',
    pic: 'Budi Santoso',
    createdAt: '2026-11-18T07:50:00.000Z',
    createdDate: '2026-11-18',
    createdTime: '07:50',
    rootCause: 'COM Add-in dinonaktifkan otomatis oleh Excel setelah update Office.',
    actionTaken: 'Mengaktifkan ulang add-in melalui Trust Center dan verifikasi template.',
    solvedAt: '2026-11-18T08:30:00.000Z',
    solvedDate: '2026-11-18',
    solvedTime: '08:30',
    verified: true,
  },
];

const sampleRoutines: RoutineItem[] = [
  { id: 'RTN-1', title: 'Cek status backup server', category: 'Server' },
  { id: 'RTN-2', title: 'Monitoring trafik firewall', category: 'Network' },
];

test('generateNextTicketId increments highest numeric suffix', () => {
  assert.equal(generateNextTicketId(sampleTickets), 'TKT-105');
  assert.equal(generateNextTicketId([]), 'TKT-101');
});

test('filterTickets filters by status, priority, pic, and search query', () => {
  const byStatus = filterTickets(sampleTickets, {
    search: '',
    status: 'Open',
    priority: 'All',
    pic: 'All',
  });
  assert.equal(byStatus.length, 2);

  const byPriorityAndPic = filterTickets(sampleTickets, {
    search: '',
    status: 'All',
    priority: 'Critical',
    pic: 'Andi Pratama',
  });
  assert.equal(byPriorityAndPic.length, 1);
  assert.equal(byPriorityAndPic[0].id, 'TKT-102');

  const bySearch = filterTickets(sampleTickets, {
    search: 'faktur',
    status: 'All',
    priority: 'All',
    pic: 'All',
  });
  assert.equal(bySearch.length, 1);
  assert.equal(bySearch[0].id, 'TKT-101');
});

test('solveTicket requires all resolution fields and auto-populates date/time for Daily Checklist', () => {
  assert.throws(() =>
    solveTicket(sampleTickets, 'TKT-102', {
      rootCause: '',
      actionTaken: 'Restart switch',
      pic: 'Andi Pratama',
    })
  );

  const fixedDate = new Date(2026, 10, 18, 14, 25, 0); // 2026-11-18 14:25 local
  const updated = solveTicket(
    sampleTickets,
    'TKT-102',
    {
      rootCause: 'Kabel uplink port 24 switch lantai 2 longgar.',
      actionTaken: 'Crimping ulang konektor RJ45 dan uji ping stabil.',
      pic: 'Andi Pratama',
    },
    fixedDate
  );

  const solvedToday = getSolvedTicketsForDate(updated, '2026-11-18');
  assert.equal(solvedToday.length, 2);
  const t102 = solvedToday.find((t) => t.id === 'TKT-102');
  assert.ok(t102);
  assert.equal(t102.status, 'Solved');
  assert.equal(t102.solvedTime, '14:25');
  assert.equal(t102.verified, false);
});

test('calculateChecklistProgress and calculateDashboardKpis compute exact percentages', () => {
  const solvedToday = getSolvedTicketsForDate(sampleTickets, '2026-11-18');
  // 2 routines (1 checked) + 1 solved ticket (1 verified) = 2/3 = 67%
  const progress = calculateChecklistProgress(sampleRoutines, ['RTN-1'], solvedToday);
  assert.equal(progress.completed, 2);
  assert.equal(progress.total, 3);
  assert.equal(progress.percentage, 67);

  const kpis = calculateDashboardKpis(
    sampleTickets,
    sampleRoutines,
    ['RTN-1'],
    '2026-11-18'
  );
  assert.equal(kpis.totalToday, 4);
  assert.equal(kpis.openOrInProgress, 3);
  assert.equal(kpis.solvedToday, 1);
  assert.equal(kpis.checklistPercentage, 67);
});

test('buildWhatsAppReport and buildDailyChecklistCsv format routines and solved tickets accurately', () => {
  const solvedToday = getSolvedTicketsForDate(sampleTickets, '2026-11-18');
  const waText = buildWhatsAppReport('2026-11-18', sampleRoutines, ['RTN-1'], solvedToday);
  assert.match(waText, /✅ Cek status backup server/);
  assert.match(waText, /⬜ Monitoring trafik firewall/);
  assert.match(waText, /\[TKT-104\] Bagus Setiawan/);

  const csv = buildDailyChecklistCsv('2026-11-18', sampleRoutines, ['RTN-1'], solvedToday);
  assert.match(csv, /^(\uFEFF)Tanggal,Tipe/);
  assert.match(csv, /TKT-104/);
  assert.match(csv, /Verified\/Reported/);
});
