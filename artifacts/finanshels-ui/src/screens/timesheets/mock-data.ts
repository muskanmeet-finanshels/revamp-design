/* ── Timesheet mock data ── */

export type TimesheetStatus =
  | 'Draft'
  | 'Submitted'
  | 'Approved'
  | 'Rejected'
  | 'Correction Required'
  | 'Clarification Required';

export interface TimesheetRecord {
  id:           string;
  name:         string;
  filingPeriod: string;      // e.g. "01 Jul 2026 – 31 Jul 2026"
  submittedOn:  string;      // ISO date
  totalHours:   number;
  approvedBy:   string | null;
  status:       TimesheetStatus;
}

export const MOCK_TIMESHEETS: TimesheetRecord[] = [
  {
    id: 'ts-1', name: 'Aisha Khan',
    filingPeriod: '01 Jul 2026 – 31 Jul 2026', submittedOn: '2026-08-01',
    totalHours: 176, approvedBy: 'Wade Warren', status: 'Approved',
  },
  {
    id: 'ts-2', name: 'Marcus Johnson',
    filingPeriod: '01 Jul 2026 – 31 Jul 2026', submittedOn: '2026-08-02',
    totalHours: 168, approvedBy: null, status: 'Submitted',
  },
  {
    id: 'ts-3', name: 'Tina Patel',
    filingPeriod: '01 Jul 2026 – 31 Jul 2026', submittedOn: '2026-08-01',
    totalHours: 160, approvedBy: 'Sara Noel', status: 'Clarification Required',
  },
  {
    id: 'ts-4', name: 'Daniel Kim',
    filingPeriod: '01 Jun 2026 – 30 Jun 2026', submittedOn: '2026-07-02',
    totalHours: 184, approvedBy: 'Wade Warren', status: 'Approved',
  },
  {
    id: 'ts-5', name: 'Natalie Suarez',
    filingPeriod: '01 Jun 2026 – 30 Jun 2026', submittedOn: '2026-07-04',
    totalHours: 152, approvedBy: null, status: 'Rejected',
  },
  {
    id: 'ts-6', name: 'Victor Chen',
    filingPeriod: '01 Jun 2026 – 30 Jun 2026', submittedOn: '2026-07-01',
    totalHours: 176, approvedBy: 'Sara Noel', status: 'Approved',
  },
  {
    id: 'ts-7', name: 'Hana Müller',
    filingPeriod: '01 Jul 2026 – 31 Jul 2026', submittedOn: '2026-08-03',
    totalHours: 144, approvedBy: null, status: 'Submitted',
  },
  {
    id: 'ts-8', name: 'Oliver Tan',
    filingPeriod: '01 Jul 2026 – 31 Jul 2026', submittedOn: '',
    totalHours: 0, approvedBy: null, status: 'Draft',
  },
  {
    id: 'ts-9', name: 'Priya Sharma',
    filingPeriod: '01 May 2026 – 31 May 2026', submittedOn: '2026-06-02',
    totalHours: 180, approvedBy: 'Wade Warren', status: 'Approved',
  },
  {
    id: 'ts-10', name: 'Kevin Wright',
    filingPeriod: '01 May 2026 – 31 May 2026', submittedOn: '2026-06-03',
    totalHours: 164, approvedBy: null, status: 'Correction Required',
  },
  {
    id: 'ts-11', name: 'Sara Noel',
    filingPeriod: '01 Jul 2026 – 31 Jul 2026', submittedOn: '2026-08-02',
    totalHours: 176, approvedBy: null, status: 'Clarification Required',
  },
  {
    id: 'ts-12', name: 'Andre Dupont',
    filingPeriod: '01 Jun 2026 – 30 Jun 2026', submittedOn: '2026-07-03',
    totalHours: 160, approvedBy: 'Wade Warren', status: 'Approved',
  },
  {
    id: 'ts-13', name: 'Mei Lin',
    filingPeriod: '01 Jul 2026 – 31 Jul 2026', submittedOn: '',
    totalHours: 0, approvedBy: null, status: 'Draft',
  },
  {
    id: 'ts-14', name: "James O'Sullivan",
    filingPeriod: '01 May 2026 – 31 May 2026', submittedOn: '2026-06-01',
    totalHours: 192, approvedBy: null, status: 'Rejected',
  },
  {
    id: 'ts-15', name: 'Fatima Al-Rashid',
    filingPeriod: '01 Jul 2026 – 31 Jul 2026', submittedOn: '2026-08-01',
    totalHours: 168, approvedBy: null, status: 'Correction Required',
  },
];

/* ── Attendance mock data ── */

export type AttendanceStatus = 'Present' | 'Late' | 'Absent' | 'Half Day' | 'Remote';

export interface AttendanceRecord {
  id:        string;
  name:      string;
  date:      string;   // ISO date
  checkIn:   string;
  checkOut:  string;
  duration:  string;
  status:    AttendanceStatus;
}

/* Deterministic hash so the "random" data is stable across renders */
function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) >>> 0;
  return h;
}

const ATTENDANCE_EMPLOYEES = [
  'Aisha Khan', 'Marcus Johnson', 'Tina Patel', 'Daniel Kim', 'Natalie Suarez',
  'Victor Chen', 'Hana Müller', 'Oliver Tan', 'Priya Sharma', 'Kevin Wright',
  'Sara Noel', 'Andre Dupont',
];

const STATUS_POOL: [AttendanceStatus, number][] = [
  ['Present',  65],
  ['Remote',   15],
  ['Late',     10],
  ['Half Day',  6],
  ['Absent',    4],
];

function pickAttendanceStatus(seed: number): AttendanceStatus {
  const n = seed % 100;
  let acc = 0;
  for (const [s, w] of STATUS_POOL) { acc += w; if (n < acc) return s; }
  return 'Present';
}

function fmt(mins: number) {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

export function generateMonthAttendance(year: number, month: number): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    ATTENDANCE_EMPLOYEES.forEach((name, ei) => {
      const seed = simpleHash(name + iso);
      const status = pickAttendanceStatus(seed);
      let checkIn = '—', checkOut = '—', duration = '—';
      if (status !== 'Absent') {
        const baseIn  = status === 'Late' ? 570 : 525;   // 9:30 or 8:45
        const inMins  = baseIn + (seed % 30);
        const rawOut  = status === 'Half Day' ? inMins + 250 + (seed % 20) : inMins + 480 + (seed % 60);
        const outMins = Math.min(rawOut, 1200);           // cap at 20:00
        checkIn  = fmt(inMins);
        checkOut = fmt(outMins);
        const dur = outMins - inMins;
        duration = `${Math.floor(dur / 60)}h ${String(dur % 60).padStart(2, '0')}m`;
      }
      records.push({ id: `at-${iso}-${ei}`, name, date: iso, checkIn, checkOut, duration, status });
    });
  }
  return records;
}

/* Pre-generated data for July + August 2026 (covers prev/next month navigation) */
export const MOCK_ATTENDANCE: AttendanceRecord[] = [
  ...generateMonthAttendance(2026, 6),   // July
  ...generateMonthAttendance(2026, 7),   // August
];
