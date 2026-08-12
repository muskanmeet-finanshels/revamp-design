/**
 * Shared mock data for the Finanshels mobile companion app.
 * Mirrors artifacts/finanshels-ui/src/screens/projects/mock-data.ts so the
 * mobile app matches the web app's content until real API storage lands.
 */

export type ProjectStatus = 'Current' | 'Overdue' | 'On Hold' | 'Completed' | 'Archived';

export interface TeamMember {
  initials: string;
  name: string;
  color: string;
}

export interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  client: { name: string; color: string };
  serviceType: { label: string };
  teamLeads: TeamMember[];
  assignees: TeamMember[];
  progress: number;
  tasksCompleted: number;
  tasksTotal: number;
  dueDate: string;
  completedDate?: string;
  badge?: number;
}

export const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    title: 'VAT Filing Jul 2025 – Sep 2025',
    status: 'Current',
    client: { name: 'Nexora', color: '#334756' },
    serviceType: { label: 'Accounting' },
    teamLeads: [{ initials: 'AK', name: 'Arjun Kumar', color: '#F16611' }],
    assignees: [{ initials: 'MK', name: 'Mohammed Khan', color: '#334756' }],
    progress: 0,
    tasksCompleted: 0,
    tasksTotal: 12,
    dueDate: 'Due 03 Jul 2026',
    badge: 1,
  },
  {
    id: '2',
    title: 'Book Keeping – Sep 2025',
    status: 'Current',
    client: { name: 'Finovo', color: '#F16611' },
    serviceType: { label: 'Finance' },
    teamLeads: [{ initials: 'AM', name: 'Aisha Mohammed', color: '#334756' }],
    assignees: [{ initials: 'TI', name: 'Tariq Ibrahim', color: '#22C55E' }],
    progress: 30,
    tasksCompleted: 5,
    tasksTotal: 12,
    dueDate: 'Due 20 Jun 2025',
    badge: 28,
  },
  {
    id: '3',
    title: 'CT Registration – June 2026',
    status: 'Overdue',
    client: { name: 'Lumo', color: '#22C55E' },
    serviceType: { label: 'IT' },
    teamLeads: [{ initials: 'IX', name: 'Ivan Xavier', color: '#334756' }],
    assignees: [],
    progress: 0,
    tasksCompleted: 0,
    tasksTotal: 12,
    dueDate: 'Due 30 Jun 2025',
    badge: 36,
  },
  {
    id: '4',
    title: 'CT Registration – Nov 2025',
    status: 'On Hold',
    client: { name: 'Talvo', color: '#334756' },
    serviceType: { label: 'IT' },
    teamLeads: [{ initials: 'AT', name: 'Ali Tariq', color: '#F16611' }],
    assignees: [],
    progress: 0,
    tasksCompleted: 0,
    tasksTotal: 12,
    dueDate: 'Due 25 May 2026',
    badge: 1,
  },
  {
    id: '5',
    title: 'Bookkeeping – Oct 2025',
    status: 'Current',
    client: { name: 'Orvix', color: '#0A2B3B' },
    serviceType: { label: 'Technology' },
    teamLeads: [{ initials: 'AT', name: 'Ali Tariq', color: '#22C55E' }],
    assignees: [{ initials: 'MM', name: 'Maya Martinez', color: '#334756' }],
    progress: 0,
    tasksCompleted: 0,
    tasksTotal: 12,
    dueDate: 'Due 20 Jul 2025',
    badge: 11,
  },
  {
    id: '6',
    title: 'Payroll Management – Q4 2025',
    status: 'Current',
    client: { name: 'Stratco', color: '#F16611' },
    serviceType: { label: 'HR' },
    teamLeads: [{ initials: 'DK', name: 'David Kim', color: '#334756' }],
    assignees: [
      { initials: 'AT', name: 'Ali Tariq', color: '#F16611' },
      { initials: 'KS', name: 'Karen Simmons', color: '#22C55E' },
      { initials: 'VC', name: 'Vera Chen', color: '#334756' },
    ],
    progress: 75,
    tasksCompleted: 8,
    tasksTotal: 10,
    dueDate: 'Due 30 Sep 2026',
    badge: 5,
  },
  {
    id: '7',
    title: 'Annual Audit – FY 2025',
    status: 'Completed',
    client: { name: 'Nexora', color: '#334756' },
    serviceType: { label: 'Accounting' },
    teamLeads: [{ initials: 'KT', name: 'Karim Tahir', color: '#F16611' }],
    assignees: [{ initials: 'TP', name: 'Tina Patel', color: '#22C55E' }],
    progress: 100,
    tasksCompleted: 12,
    tasksTotal: 12,
    dueDate: 'Due 15 Apr 2025',
    completedDate: '2025-05-02',
    badge: 0,
  },
  {
    id: '8',
    title: 'VAT Compliance – Jan 2026',
    status: 'Overdue',
    client: { name: 'Finovo', color: '#F16611' },
    serviceType: { label: 'Finance' },
    teamLeads: [{ initials: 'PT', name: 'Paulo Torres', color: '#334756' }],
    assignees: [
      { initials: 'SN', name: 'Sarah Nasser', color: '#F16611' },
      { initials: 'HK', name: 'Hassan Khalid', color: '#22C55E' },
      { initials: 'VC', name: 'Vera Chen', color: '#334756' },
      { initials: 'OR', name: 'Omar Rahman', color: '#F16611' },
    ],
    progress: 20,
    tasksCompleted: 2,
    tasksTotal: 10,
    dueDate: 'Due 31 Dec 2025',
    badge: 14,
  },
  {
    id: '9',
    title: 'Corporate Tax Return – Q1 2026',
    status: 'Current',
    client: { name: 'Nexora', color: '#334756' },
    serviceType: { label: 'Accounting' },
    teamLeads: [{ initials: 'MN', name: 'Meera Nair', color: '#22C55E' }],
    assignees: [
      { initials: 'NS', name: 'Nadia Saleh', color: '#F16611' },
      { initials: 'VC', name: 'Vera Chen', color: '#334756' },
      { initials: 'OR', name: 'Omar Rahman', color: '#F16611' },
      { initials: 'LH', name: 'Lina Haddad', color: '#22C55E' },
      { initials: 'BM', name: 'Bilal Mahmoud', color: '#334756' },
    ],
    progress: 95,
    tasksCompleted: 8,
    tasksTotal: 9,
    dueDate: 'Due 10 Aug 2025',
    badge: 3,
  },
  {
    id: '10',
    title: 'Financial Statements – Mar 2026',
    status: 'Current',
    client: { name: 'Lumo', color: '#22C55E' },
    serviceType: { label: 'Finance' },
    teamLeads: [{ initials: 'MK', name: 'Mohammed Khan', color: '#334756' }],
    assignees: [{ initials: 'PN', name: 'Priya Nair', color: '#F16611' }],
    progress: 80,
    tasksCompleted: 8,
    tasksTotal: 10,
    dueDate: 'Due 25 Aug 2026',
    badge: 7,
  },
  {
    id: '11',
    title: 'Corporate Tax Registration – FY 2026',
    status: 'Overdue',
    client: { name: 'Stratco', color: '#F16611' },
    serviceType: { label: 'Compliance' },
    teamLeads: [{ initials: 'LN', name: 'Laura Nixon', color: '#334756' }],
    assignees: [{ initials: 'QA', name: 'Qasim Ahmed', color: '#22C55E' }],
    progress: 42,
    tasksCompleted: 5,
    tasksTotal: 12,
    dueDate: 'Due 18 Jun 2026',
    badge: 9,
  },
  {
    id: '12',
    title: 'VAT Registration – Talvo',
    status: 'On Hold',
    client: { name: 'Talvo', color: '#334756' },
    serviceType: { label: 'Compliance' },
    teamLeads: [{ initials: 'GH', name: 'Grace Hassan', color: '#F16611' }],
    assignees: [
      { initials: 'YM', name: 'Yousef Mansour', color: '#22C55E' },
      { initials: 'EF', name: 'Elena Flores', color: '#334756' },
    ],
    progress: 15,
    tasksCompleted: 2,
    tasksTotal: 13,
    dueDate: 'Due 15 Jun 2026',
    badge: 2,
  },
  {
    id: '13',
    title: 'Annual Returns – Lumo 2025',
    status: 'Completed',
    client: { name: 'Lumo', color: '#22C55E' },
    serviceType: { label: 'Accounting' },
    teamLeads: [{ initials: 'RW', name: 'Rania Williams', color: '#334756' }],
    assignees: [{ initials: 'BE', name: 'Bilal Ebrahim', color: '#F16611' }],
    progress: 100,
    tasksCompleted: 10,
    tasksTotal: 10,
    dueDate: 'Due 28 Feb 2026',
    completedDate: '2026-02-20',
    badge: 0,
  },
  {
    id: '14',
    title: 'Year-End Audit 2026 – Lumo',
    status: 'Current',
    client: { name: 'Lumo', color: '#22C55E' },
    serviceType: { label: 'Audit' },
    teamLeads: [{ initials: 'SK', name: 'Sofia Khan', color: '#F16611' }],
    assignees: [
      { initials: 'TW', name: 'Thomas Wright', color: '#334756' },
      { initials: 'EF', name: 'Elena Flores', color: '#22C55E' },
    ],
    progress: 65,
    tasksCompleted: 7,
    tasksTotal: 11,
    dueDate: 'Due 30 Sep 2026',
    badge: 4,
  },
  {
    id: '15',
    title: 'FY2024 Audit – Nexora',
    status: 'Archived',
    client: { name: 'Nexora', color: '#334756' },
    serviceType: { label: 'Audit' },
    teamLeads: [{ initials: 'JM', name: 'Jamal Malik', color: '#334756' }],
    assignees: [
      { initials: 'BE', name: 'Bilal Ebrahim', color: '#F16611' },
      { initials: 'QA', name: 'Qasim Ahmed', color: '#22C55E' },
    ],
    progress: 100,
    tasksCompleted: 12,
    tasksTotal: 12,
    dueDate: 'Due 31 Dec 2025',
    badge: 0,
  },
  {
    id: '16',
    title: 'Compliance Review – FY 2025',
    status: 'Completed',
    client: { name: 'Finovo', color: '#F16611' },
    serviceType: { label: 'Compliance' },
    teamLeads: [{ initials: 'NK', name: 'Nadia Khan', color: '#22C55E' }],
    assignees: [{ initials: 'LN', name: 'Laura Nixon', color: '#334756' }],
    progress: 100,
    tasksCompleted: 14,
    tasksTotal: 14,
    dueDate: 'Due 31 Jan 2026',
    completedDate: '2026-02-14',
    badge: 0,
  },
  {
    id: '17',
    title: 'Regulatory Filing – Orvix Q3',
    status: 'Current',
    client: { name: 'Orvix', color: '#0A2B3B' },
    serviceType: { label: 'Compliance' },
    teamLeads: [{ initials: 'OA', name: 'Omar Abdulla', color: '#F16611' }],
    assignees: [{ initials: 'GH', name: 'Grace Hassan', color: '#334756' }],
    progress: 25,
    tasksCompleted: 2,
    tasksTotal: 8,
    dueDate: 'Due 30 Sep 2026',
    badge: 6,
  },
  {
    id: '18',
    title: 'Payroll Reconciliation – Q2',
    status: 'Overdue',
    client: { name: 'Stratco', color: '#F16611' },
    serviceType: { label: 'HR' },
    teamLeads: [{ initials: 'MT', name: 'Maya Thomas', color: '#334756' }],
    assignees: [{ initials: 'TW', name: 'Thomas Wright', color: '#22C55E' }],
    progress: 55,
    tasksCompleted: 6,
    tasksTotal: 11,
    dueDate: 'Due 12 Jul 2026',
    badge: 18,
  },
  {
    id: '19',
    title: 'Management Accounts – Q3',
    status: 'On Hold',
    client: { name: 'Finovo', color: '#F16611' },
    serviceType: { label: 'Finance' },
    teamLeads: [{ initials: 'RE', name: 'Rami El-Sayed', color: '#22C55E' }],
    assignees: [],
    progress: 35,
    tasksCompleted: 4,
    tasksTotal: 10,
    dueDate: 'Due 05 Oct 2026',
    badge: 3,
  },
  {
    id: '20',
    title: 'Financial Close – December 2025',
    status: 'Completed',
    client: { name: 'Orvix', color: '#0A2B3B' },
    serviceType: { label: 'Finance' },
    teamLeads: [{ initials: 'SA', name: 'Sara Ali', color: '#F16611' }],
    assignees: [{ initials: 'JM', name: 'Jamal Malik', color: '#334756' }],
    progress: 100,
    tasksCompleted: 9,
    tasksTotal: 9,
    dueDate: 'Due 20 Jan 2026',
    completedDate: '2026-01-18',
    badge: 0,
  },
];

/* ── Tasks ── */

export type TaskStatus = 'To Do' | 'In Progress' | 'Completed';

export interface Task {
  id: string;
  title: string;
  projectTitle: string;
  client: { name: string; color: string };
  status: TaskStatus;
  dueDate: string;
  assignee: TeamMember;
}

export const TASK_STATUSES: Array<'All' | TaskStatus> = [
  'All',
  'To Do',
  'In Progress',
  'Completed',
];

export const MOCK_TASKS: Task[] = [
  {
    id: 't1',
    title: 'Collect Q3 purchase invoices',
    projectTitle: 'VAT Filing Jul 2025 – Sep 2025',
    client: { name: 'Nexora', color: '#334756' },
    status: 'To Do',
    dueDate: 'Due 05 Aug 2026',
    assignee: { initials: 'MK', name: 'Mohammed Khan', color: '#334756' },
  },
  {
    id: 't2',
    title: 'Reconcile September bank statement',
    projectTitle: 'Book Keeping – Sep 2025',
    client: { name: 'Finovo', color: '#F16611' },
    status: 'In Progress',
    dueDate: 'Due 08 Aug 2026',
    assignee: { initials: 'TI', name: 'Tariq Ibrahim', color: '#22C55E' },
  },
  {
    id: 't3',
    title: 'Submit CT registration documents',
    projectTitle: 'CT Registration – June 2026',
    client: { name: 'Lumo', color: '#22C55E' },
    status: 'To Do',
    dueDate: 'Due 30 Jul 2026',
    assignee: { initials: 'IX', name: 'Ivan Xavier', color: '#334756' },
  },
  {
    id: 't4',
    title: 'Verify WPS salary file',
    projectTitle: 'Payroll Management – Q4 2025',
    client: { name: 'Stratco', color: '#F16611' },
    status: 'In Progress',
    dueDate: 'Due 12 Aug 2026',
    assignee: { initials: 'KS', name: 'Karen Simmons', color: '#22C55E' },
  },
  {
    id: 't5',
    title: 'Draft VAT return summary',
    projectTitle: 'VAT Compliance – Jan 2026',
    client: { name: 'Finovo', color: '#F16611' },
    status: 'To Do',
    dueDate: 'Due 01 Aug 2026',
    assignee: { initials: 'SN', name: 'Sarah Nasser', color: '#F16611' },
  },
  {
    id: 't6',
    title: 'Review trial balance adjustments',
    projectTitle: 'Corporate Tax Return – Q1 2026',
    client: { name: 'Nexora', color: '#334756' },
    status: 'In Progress',
    dueDate: 'Due 09 Aug 2026',
    assignee: { initials: 'NS', name: 'Nadia Saleh', color: '#F16611' },
  },
  {
    id: 't7',
    title: 'Finalize March financial statements',
    projectTitle: 'Financial Statements – Mar 2026',
    client: { name: 'Lumo', color: '#22C55E' },
    status: 'Completed',
    dueDate: 'Due 20 Jul 2026',
    assignee: { initials: 'PN', name: 'Priya Nair', color: '#F16611' },
  },
  {
    id: 't8',
    title: 'Upload audit evidence to portal',
    projectTitle: 'Year-End Audit 2026 – Lumo',
    client: { name: 'Lumo', color: '#22C55E' },
    status: 'Completed',
    dueDate: 'Due 18 Jul 2026',
    assignee: { initials: 'TW', name: 'Thomas Wright', color: '#334756' },
  },
  {
    id: 't9',
    title: 'Chase missing payroll timesheets',
    projectTitle: 'Payroll Reconciliation – Q2',
    client: { name: 'Stratco', color: '#F16611' },
    status: 'To Do',
    dueDate: 'Due 04 Aug 2026',
    assignee: { initials: 'TW', name: 'Thomas Wright', color: '#22C55E' },
  },
  {
    id: 't10',
    title: 'Prepare compliance checklist',
    projectTitle: 'Regulatory Filing – Orvix Q3',
    client: { name: 'Orvix', color: '#0A2B3B' },
    status: 'In Progress',
    dueDate: 'Due 15 Aug 2026',
    assignee: { initials: 'GH', name: 'Grace Hassan', color: '#334756' },
  },
  {
    id: 't11',
    title: 'Close December ledgers',
    projectTitle: 'Financial Close – December 2025',
    client: { name: 'Orvix', color: '#0A2B3B' },
    status: 'Completed',
    dueDate: 'Due 15 Jul 2026',
    assignee: { initials: 'JM', name: 'Jamal Malik', color: '#334756' },
  },
];

/** Parse a "Due 03 Jul 2026" label into a Date, or null if unparseable. */
export function parseDueDate(label: string): Date | null {
  const match = label.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if (!match) return null;
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const month = months[match[2] ?? ''];
  if (month === undefined) return null;
  return new Date(Number(match[3]), month, Number(match[1]));
}
