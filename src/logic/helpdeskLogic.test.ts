import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Ticket,
  RoutineItem,
  authenticateUser,
  getRolePermissions,
  getVisibleTicketsForUser,
  filterTickets,
  filterTicketsByPeriod,
  solveTicket,
  getSolvedTicketsForDate,
  calculateChecklistProgress,
  calculateDashboardKpis,
  computePriorityDistribution,
  computeCategoryBreakdown,
  computePicLeaderboard,
  compute7DayTrend,
  calculatePeriodSummary,
  buildWhatsAppReport,
  buildPeriodWhatsAppReport,
  buildDailyChecklistCsv,
  buildPeriodChecklistCsv,
  validateBackupPayload,
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
    createdAt: '2026-11-17T09:10:00.000Z',
    createdDate: '2026-11-17',
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

test('authenticateUser and getRolePermissions enforce 4 RBAC roles', () => {
  assert.equal(authenticateUser('unknown', '123'), null);
  assert.equal(authenticateUser('user', 'wrong'), null);

  const userSession = authenticateUser('user', 'user123');
  assert.ok(userSession);
  assert.equal(userSession.role, 'user');
  const userPerms = getRolePermissions(userSession.role);
  assert.deepEqual(userPerms.allowedTabs, ['tickets']);
  assert.equal(userPerms.onlyOwnTickets, true);
  assert.equal(userPerms.canChangeTicketStatus, false);
  assert.equal(getVisibleTicketsForUser(sampleTickets, userSession).length, 1);
  assert.equal(getVisibleTicketsForUser(sampleTickets, userSession)[0].id, 'TKT-101');

  const officerPerms = getRolePermissions('officer');
  assert.deepEqual(officerPerms.allowedTabs, ['dashboard', 'tickets', 'checklist']);
  assert.equal(officerPerms.canDeleteTicket, false);
  assert.equal(officerPerms.canAccessDatabaseModal, false);

  const adminPerms = getRolePermissions('admin');
  assert.equal(adminPerms.canDeleteTicket, true);
  assert.equal(adminPerms.canAccessDatabaseModal, true);

  const mgmtPerms = getRolePermissions('management');
  assert.equal(mgmtPerms.defaultTab, 'dashboard');
  assert.equal(mgmtPerms.readOnly, true);
  assert.equal(mgmtPerms.canCreateTicket, false);
  assert.equal(mgmtPerms.canEditChecklist, false);
});

test('generateNextTicketId increments highest numeric suffix', () => {
  assert.equal(generateNextTicketId(sampleTickets), 'TKT-105');
  assert.equal(generateNextTicketId([]), 'TKT-101');
});

test('filterTickets supports Active status (Open + In Progress) and PIC/Priority/Search', () => {
  const activeOnly = filterTickets(sampleTickets, {
    search: '',
    status: 'Active',
    priority: 'All',
    pic: 'All',
  });
  assert.equal(activeOnly.length, 3);

  const byPriorityAndPic = filterTickets(sampleTickets, {
    search: '',
    status: 'All',
    priority: 'Critical',
    pic: 'Andi Pratama',
  });
  assert.equal(byPriorityAndPic.length, 1);
  assert.equal(byPriorityAndPic[0].id, 'TKT-102');
});

test('filterTicketsByPeriod and Dashboard analytics compute distributions & 7-day trends', () => {
  const todayTickets = filterTicketsByPeriod(sampleTickets, 'today', '2026-11-18');
  assert.equal(todayTickets.length, 3);

  const weekTickets = filterTicketsByPeriod(sampleTickets, '7days', '2026-11-18');
  assert.equal(weekTickets.length, 4);

  const prioDist = computePriorityDistribution(sampleTickets);
  assert.equal(prioDist.find((p) => p.priority === 'Critical')?.count, 1);
  assert.equal(prioDist.find((p) => p.priority === 'High')?.count, 1);

  const catBreak = computeCategoryBreakdown(sampleTickets);
  assert.equal(catBreak.length, 5);

  const leaderboard = computePicLeaderboard(sampleTickets);
  const budi = leaderboard.find((l) => l.pic === 'Budi Santoso');
  assert.ok(budi);
  assert.equal(budi.solved, 1);
  assert.equal(budi.solveRate, 100);

  const trend = compute7DayTrend(
    sampleTickets,
    sampleRoutines,
    { '2026-11-18': ['RTN-1'] },
    '2026-11-18'
  );
  assert.equal(trend.length, 7);
  assert.equal(trend[6].date, '2026-11-18');
  assert.equal(trend[6].solved, 1);
  assert.equal(trend[6].compliance, 67);
});

test('solveTicket requires all resolution fields and auto-populates date/time for Daily Checklist', () => {
  assert.throws(() =>
    solveTicket(sampleTickets, 'TKT-102', {
      rootCause: '',
      actionTaken: 'Restart switch',
      pic: 'Andi Pratama',
    })
  );

  const fixedDate = new Date(2026, 10, 18, 14, 25, 0);
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
});

test('calculateChecklistProgress, calculateDashboardKpis, and period reports compute accurately', () => {
  const solvedToday = getSolvedTicketsForDate(sampleTickets, '2026-11-18');
  const progress = calculateChecklistProgress(sampleRoutines, ['RTN-1'], solvedToday);
  assert.equal(progress.percentage, 67);

  const kpis = calculateDashboardKpis(
    sampleTickets,
    sampleRoutines,
    ['RTN-1'],
    '2026-11-18'
  );
  assert.equal(kpis.totalToday, 3);
  assert.equal(kpis.openOrInProgress, 3);
  assert.equal(kpis.solvedToday, 1);

  const periodSummary = calculatePeriodSummary(
    sampleTickets,
    sampleRoutines,
    { '2026-11-17': ['RTN-1', 'RTN-2'], '2026-11-18': ['RTN-1'] },
    '2026-11-17',
    '2026-11-18'
  );
  assert.equal(periodSummary.daysCount, 2);
  assert.equal(periodSummary.totalSolved, 1);
  assert.equal(periodSummary.completedRoutineSlots, 3);
  assert.equal(periodSummary.totalRoutineSlots, 4);
  assert.equal(periodSummary.routineCompliancePct, 75);

  const waPeriod = buildPeriodWhatsAppReport(
    '2026-11-17',
    '2026-11-18',
    sampleTickets,
    sampleRoutines,
    { '2026-11-17': ['RTN-1', 'RTN-2'], '2026-11-18': ['RTN-1'] }
  );
  assert.match(waPeriod, /REKAP LAPORAN PERIODE IT HELPDESK/);
  assert.match(waPeriod, /75%/);

  const csvPeriod = buildPeriodChecklistCsv(
    '2026-11-17',
    '2026-11-18',
    sampleTickets,
    sampleRoutines,
    { '2026-11-18': ['RTN-1'] }
  );
  assert.match(csvPeriod, /2026-11-17,Rutinitas Harian/);
  assert.match(csvPeriod, /2026-11-18,Tiket Solved,TKT-104/);
});

test('buildWhatsAppReport, buildDailyChecklistCsv, and validateBackupPayload validate correctly', () => {
  const solvedToday = getSolvedTicketsForDate(sampleTickets, '2026-11-18');
  const waText = buildWhatsAppReport('2026-11-18', sampleRoutines, ['RTN-1'], solvedToday);
  assert.match(waText, /✅ Cek status backup server/);

  const csv = buildDailyChecklistCsv('2026-11-18', sampleRoutines, ['RTN-1'], solvedToday);
  assert.match(csv, /TKT-104/);

  assert.throws(() => validateBackupPayload({ tickets: 'invalid' }));
  const valid = validateBackupPayload({
    version: 1,
    tickets: sampleTickets,
    routines: sampleRoutines,
    routineChecksByDate: { '2026-11-18': ['RTN-1'] },
  });
  assert.equal(valid.tickets.length, 4);
});
