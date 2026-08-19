import {
  MOCK_DEPARTMENTS,
  MOCK_VERTICALS,
  MOCK_TEAMS,
} from '@/screens/organisation/mock-data';

export { MOCK_DEPARTMENTS, MOCK_VERTICALS, MOCK_TEAMS };

/* ─── types ──────────────────────────────────────────────────────────────── */

export type UserStatus = 'Active' | 'Inactive' | 'Pending';

export type UserRole =
  | 'Admin'
  | 'Finance Manager'
  | 'Senior Accountant'
  | 'Accountant'
  | 'Tax Consultant'
  | 'Senior Auditor'
  | 'Auditor'
  | 'HR Specialist'
  | 'IT Support'
  | 'Compliance Officer'
  | 'Team Lead'
  | 'Viewer';

/** Product setting: when false, the User drawer falls back to one role. */
export const ALLOW_MULTIPLE_ROLES = true;

export const ROLE_OPTIONS: UserRole[] = [
  'Admin',
  'Finance Manager',
  'Senior Accountant',
  'Accountant',
  'Tax Consultant',
  'Senior Auditor',
  'Auditor',
  'HR Specialist',
  'IT Support',
  'Compliance Officer',
  'Team Lead',
  'Viewer',
];

export const EMPLOYEE_GROUP_OPTIONS: string[] = [
  'Management',
  'Senior Staff',
  'Junior Staff',
  'Contractor',
  'Part-time',
  'Remote Team',
  'Probation',
];

export interface AppUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  employeeId?: string;
  status: UserStatus;
  departmentId: string;
  teamId?: string;
  verticalId?: string;
  reportingManagerId?: string;
  roles: UserRole[];
  employeeGroups: string[];
  joiningDate?: string;
  createdAt: string;
  /** color for avatar background */
  avatarColor: string;
}

/* ─── seed data ──────────────────────────────────────────────────────────── */

export const MOCK_USERS: AppUser[] = [
  {
    id: 'u1',
    firstName: 'Arjun',
    lastName: 'Kumar',
    email: 'arjun.kumar@finanshels.com',
    phone: '+971 50 111 2233',
    jobTitle: 'Finance Manager',
    employeeId: 'EMP-001',
    status: 'Active',
    departmentId: 'dept-1',
    teamId: 'team-1',
    verticalId: 'vert-1',
    roles: ['Finance Manager', 'Team Lead'],
    employeeGroups: ['Management', 'Senior Staff'],
    joiningDate: '2022-03-01',
    createdAt: '2022-03-01',
    avatarColor: '#F16611',
  },
  {
    id: 'u2',
    firstName: 'Aisha',
    lastName: 'Mohammed',
    email: 'aisha.mohammed@finanshels.com',
    phone: '+971 55 222 3344',
    jobTitle: 'Senior Accountant',
    employeeId: 'EMP-002',
    status: 'Active',
    departmentId: 'dept-1',
    teamId: 'team-2',
    verticalId: 'vert-2',
    reportingManagerId: 'u1',
    roles: ['Senior Accountant'],
    employeeGroups: ['Senior Staff'],
    joiningDate: '2022-06-15',
    createdAt: '2022-06-15',
    avatarColor: '#334756',
  },
  {
    id: 'u3',
    firstName: 'Ivan',
    lastName: 'Xavier',
    email: 'ivan.xavier@finanshels.com',
    phone: '+971 52 333 4455',
    jobTitle: 'IT Support Specialist',
    employeeId: 'EMP-003',
    status: 'Active',
    departmentId: 'dept-6',
    teamId: 'team-9',
    roles: ['IT Support'],
    employeeGroups: ['Remote Team'],
    joiningDate: '2023-01-10',
    createdAt: '2023-01-10',
    avatarColor: '#22C55E',
  },
  {
    id: 'u4',
    firstName: 'Ali',
    lastName: 'Tariq',
    email: 'ali.tariq@finanshels.com',
    phone: '+971 54 444 5566',
    jobTitle: 'Tax Consultant',
    employeeId: 'EMP-004',
    status: 'Active',
    departmentId: 'dept-4',
    teamId: 'team-6',
    verticalId: 'vert-7',
    reportingManagerId: 'u7',
    roles: ['Tax Consultant', 'Compliance Officer'],
    employeeGroups: ['Senior Staff'],
    joiningDate: '2021-11-20',
    createdAt: '2021-11-20',
    avatarColor: '#F16611',
  },
  {
    id: 'u5',
    firstName: 'David',
    lastName: 'Kim',
    email: 'david.kim@finanshels.com',
    phone: '+971 56 555 6677',
    jobTitle: 'Senior Auditor',
    employeeId: 'EMP-005',
    status: 'Active',
    departmentId: 'dept-3',
    teamId: 'team-4',
    verticalId: 'vert-5',
    reportingManagerId: 'u1',
    roles: ['Senior Auditor', 'Team Lead'],
    employeeGroups: ['Management', 'Senior Staff'],
    joiningDate: '2020-08-01',
    createdAt: '2020-08-01',
    avatarColor: '#334756',
  },
  {
    id: 'u6',
    firstName: 'Karim',
    lastName: 'Tahir',
    email: 'karim.tahir@finanshels.com',
    phone: '+971 50 666 7788',
    jobTitle: 'Accountant',
    employeeId: 'EMP-006',
    status: 'Active',
    departmentId: 'dept-1',
    teamId: 'team-1',
    verticalId: 'vert-1',
    reportingManagerId: 'u2',
    roles: ['Accountant'],
    employeeGroups: ['Junior Staff'],
    joiningDate: '2023-07-01',
    createdAt: '2023-07-01',
    avatarColor: '#F16611',
  },
  {
    id: 'u7',
    firstName: 'Laura',
    lastName: 'Nixon',
    email: 'laura.nixon@finanshels.com',
    phone: '+971 55 777 8899',
    jobTitle: 'Compliance Officer',
    employeeId: 'EMP-007',
    status: 'Active',
    departmentId: 'dept-4',
    teamId: 'team-7',
    roles: ['Compliance Officer', 'Team Lead'],
    employeeGroups: ['Management'],
    joiningDate: '2021-04-12',
    createdAt: '2021-04-12',
    avatarColor: '#334756',
  },
  {
    id: 'u8',
    firstName: 'Grace',
    lastName: 'Hassan',
    email: 'grace.hassan@finanshels.com',
    phone: '+971 52 888 9900',
    jobTitle: 'HR Specialist',
    employeeId: 'EMP-008',
    status: 'Active',
    departmentId: 'dept-5',
    teamId: 'team-8',
    verticalId: 'vert-9',
    reportingManagerId: 'u1',
    roles: ['HR Specialist'],
    employeeGroups: ['Senior Staff'],
    joiningDate: '2022-09-05',
    createdAt: '2022-09-05',
    avatarColor: '#F16611',
  },
  {
    id: 'u9',
    firstName: 'Meera',
    lastName: 'Nair',
    email: 'meera.nair@finanshels.com',
    phone: '+971 54 999 0011',
    jobTitle: 'Finance Manager',
    employeeId: 'EMP-009',
    status: 'Active',
    departmentId: 'dept-2',
    teamId: 'team-3',
    verticalId: 'vert-3',
    reportingManagerId: 'u1',
    roles: ['Finance Manager'],
    employeeGroups: ['Management', 'Senior Staff'],
    joiningDate: '2020-02-14',
    createdAt: '2020-02-14',
    avatarColor: '#22C55E',
  },
  {
    id: 'u10',
    firstName: 'Mohammed',
    lastName: 'Khan',
    email: 'm.khan@finanshels.com',
    phone: '+971 56 100 2233',
    jobTitle: 'Accountant',
    employeeId: 'EMP-010',
    status: 'Active',
    departmentId: 'dept-1',
    teamId: 'team-2',
    reportingManagerId: 'u2',
    roles: ['Accountant'],
    employeeGroups: ['Junior Staff'],
    joiningDate: '2024-01-15',
    createdAt: '2024-01-15',
    avatarColor: '#334756',
  },
  {
    id: 'u11',
    firstName: 'Paulo',
    lastName: 'Torres',
    email: 'paulo.torres@finanshels.com',
    phone: '+971 50 200 3344',
    jobTitle: 'Auditor',
    employeeId: 'EMP-011',
    status: 'Active',
    departmentId: 'dept-3',
    teamId: 'team-5',
    verticalId: 'vert-6',
    reportingManagerId: 'u5',
    roles: ['Auditor'],
    employeeGroups: ['Senior Staff'],
    joiningDate: '2022-11-01',
    createdAt: '2022-11-01',
    avatarColor: '#334756',
  },
  {
    id: 'u12',
    firstName: 'Rania',
    lastName: 'Williams',
    email: 'rania.williams@finanshels.com',
    phone: '+971 55 300 4455',
    jobTitle: 'Senior Accountant',
    employeeId: 'EMP-012',
    status: 'Pending',
    departmentId: 'dept-1',
    teamId: 'team-2',
    reportingManagerId: 'u2',
    roles: ['Senior Accountant'],
    employeeGroups: ['Probation'],
    joiningDate: '2026-08-01',
    createdAt: '2026-07-28',
    avatarColor: '#334756',
  },
  {
    id: 'u13',
    firstName: 'Sara',
    lastName: 'Ali',
    email: 'sara.ali@finanshels.com',
    phone: '+971 52 400 5566',
    jobTitle: 'Tax Consultant',
    employeeId: 'EMP-013',
    status: 'Inactive',
    departmentId: 'dept-4',
    roles: ['Tax Consultant'],
    employeeGroups: [],
    joiningDate: '2021-06-20',
    createdAt: '2021-06-20',
    avatarColor: '#F16611',
  },
  {
    id: 'u14',
    firstName: 'Hassan',
    lastName: 'Khalid',
    email: 'hassan.khalid@finanshels.com',
    phone: '+971 54 500 6677',
    jobTitle: 'Compliance Officer',
    employeeId: 'EMP-014',
    status: 'Active',
    departmentId: 'dept-4',
    teamId: 'team-6',
    verticalId: 'vert-7',
    reportingManagerId: 'u7',
    roles: ['Compliance Officer'],
    employeeGroups: ['Senior Staff'],
    joiningDate: '2023-03-15',
    createdAt: '2023-03-15',
    avatarColor: '#22C55E',
  },
  {
    id: 'u15',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@finanshels.com',
    jobTitle: 'System Administrator',
    employeeId: 'EMP-000',
    status: 'Active',
    departmentId: 'dept-2',
    roles: ['Admin'],
    employeeGroups: ['Management'],
    joiningDate: '2020-01-01',
    createdAt: '2020-01-01',
    avatarColor: '#0A2B3B',
  },
];

/* ─── mock dependencies per user (used in Exit workflow) ─────────────────── */

export interface UserDependency {
  projects: Array<{ id: string; title: string; role: string }>;
  tasks: Array<{ id: string; title: string; project: string }>;
}

export const MOCK_USER_DEPENDENCIES: Record<string, UserDependency> = {
  u1: {
    projects: [
      { id: 'p1', title: 'VAT Filing Jul 2025 – Sep 2025', role: 'Team Lead' },
      { id: 'p2', title: 'Payroll Setup – FY 2026', role: 'Team Lead' },
      { id: 'p3', title: 'Corporate Tax Return – Q1 2026', role: 'Assignee' },
    ],
    tasks: [
      { id: 't1', title: 'Review Q3 VAT computation', project: 'VAT Filing Jul 2025' },
      { id: 't2', title: 'Sign off on payroll reconciliation', project: 'Payroll Setup – FY 2026' },
      { id: 't3', title: 'Prepare management accounts', project: 'Corporate Tax Return – Q1 2026' },
      { id: 't4', title: 'Client liaison – Nexora follow-up', project: 'VAT Filing Jul 2025' },
    ],
  },
  u5: {
    projects: [
      { id: 'p4', title: 'Annual Audit – FY 2025', role: 'Team Lead' },
      { id: 'p5', title: 'Internal Controls Review – Q3', role: 'Assignee' },
    ],
    tasks: [
      { id: 't5', title: 'Draft audit opinion letter', project: 'Annual Audit – FY 2025' },
      { id: 't6', title: 'Conduct risk assessment', project: 'Internal Controls Review – Q3' },
      { id: 't7', title: 'Review working papers', project: 'Annual Audit – FY 2025' },
    ],
  },
  u7: {
    projects: [
      { id: 'p6', title: 'Regulatory Filing – Orvix Q3', role: 'Team Lead' },
    ],
    tasks: [
      { id: 't8', title: 'Submit annual returns', project: 'Regulatory Filing – Orvix Q3' },
      { id: 't9', title: 'Compliance checklist review', project: 'Regulatory Filing – Orvix Q3' },
    ],
  },
  u9: {
    projects: [
      { id: 'p7', title: 'Financial Statements – Mar 2026', role: 'Team Lead' },
      { id: 'p8', title: 'Management Accounts – Q3', role: 'Assignee' },
    ],
    tasks: [
      { id: 't10', title: 'Finalise income statement', project: 'Financial Statements – Mar 2026' },
    ],
  },
};
