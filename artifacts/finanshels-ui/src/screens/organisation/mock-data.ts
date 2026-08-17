/* ── Organisation hierarchy types & seed data ── */

export type OrgStatus = 'Active' | 'Inactive';

export interface Department {
  id: string;
  name: string;
  description: string;
  status: OrgStatus;
  createdAt: string;
}

export interface Vertical {
  id: string;
  name: string;
  description: string;
  departmentId: string;
  status: OrgStatus;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  departmentId: string;
  status: OrgStatus;
  createdAt: string;
}

export const MOCK_DEPARTMENTS: Department[] = [
  {
    id: 'dept-1',
    name: 'Accounting',
    description: 'Handles all client accounting services including bookkeeping, financial statements, and VAT filings.',
    status: 'Active',
    createdAt: '2024-01-10',
  },
  {
    id: 'dept-2',
    name: 'Finance',
    description: 'Manages corporate finance advisory, treasury, and financial planning services.',
    status: 'Active',
    createdAt: '2024-01-10',
  },
  {
    id: 'dept-3',
    name: 'Audit',
    description: 'Conducts internal and external audit engagements for clients across all sectors.',
    status: 'Active',
    createdAt: '2024-01-15',
  },
  {
    id: 'dept-4',
    name: 'Compliance',
    description: 'Ensures regulatory compliance and handles corporate tax registrations and filings.',
    status: 'Active',
    createdAt: '2024-02-01',
  },
  {
    id: 'dept-5',
    name: 'HR',
    description: 'Delivers payroll processing, WPS compliance, and human resources advisory services.',
    status: 'Active',
    createdAt: '2024-02-14',
  },
  {
    id: 'dept-6',
    name: 'Technology',
    description: 'Internal IT infrastructure and systems support across the organisation.',
    status: 'Inactive',
    createdAt: '2024-03-01',
  },
];

export const MOCK_VERTICALS: Vertical[] = [
  {
    id: 'vert-1',
    name: 'VAT Services',
    description: 'End-to-end VAT registration, returns, and compliance for UAE-based clients.',
    departmentId: 'dept-1',
    status: 'Active',
    createdAt: '2024-02-01',
  },
  {
    id: 'vert-2',
    name: 'Bookkeeping',
    description: 'Monthly and quarterly bookkeeping and reconciliation services.',
    departmentId: 'dept-1',
    status: 'Active',
    createdAt: '2024-02-01',
  },
  {
    id: 'vert-3',
    name: 'Corporate Finance',
    description: 'Financial modelling, treasury management, and capital structure advisory.',
    departmentId: 'dept-2',
    status: 'Active',
    createdAt: '2024-02-15',
  },
  {
    id: 'vert-4',
    name: 'Management Reporting',
    description: 'Monthly management accounts and KPI dashboards for leadership teams.',
    departmentId: 'dept-2',
    status: 'Active',
    createdAt: '2024-03-01',
  },
  {
    id: 'vert-5',
    name: 'External Audit',
    description: 'Statutory external audit engagements for limited liability companies.',
    departmentId: 'dept-3',
    status: 'Active',
    createdAt: '2024-02-20',
  },
  {
    id: 'vert-6',
    name: 'Internal Audit',
    description: 'Risk-based internal audit reviews and control assessments.',
    departmentId: 'dept-3',
    status: 'Active',
    createdAt: '2024-03-05',
  },
  {
    id: 'vert-7',
    name: 'Corporate Tax',
    description: 'UAE corporate tax registration, filings, and ongoing advisory.',
    departmentId: 'dept-4',
    status: 'Active',
    createdAt: '2024-02-10',
  },
  {
    id: 'vert-8',
    name: 'Regulatory Filings',
    description: 'Annual returns, licence renewals, and statutory regulatory submissions.',
    departmentId: 'dept-4',
    status: 'Inactive',
    createdAt: '2024-03-12',
  },
  {
    id: 'vert-9',
    name: 'Payroll Processing',
    description: 'Monthly payroll computation, WPS file generation, and salary disbursement.',
    departmentId: 'dept-5',
    status: 'Active',
    createdAt: '2024-02-25',
  },
  {
    id: 'vert-10',
    name: 'HR Advisory',
    description: 'Employee contracts, labour law compliance, and HR policy consulting.',
    departmentId: 'dept-5',
    status: 'Active',
    createdAt: '2024-04-01',
  },
];

export const MOCK_TEAMS: Team[] = [
  {
    id: 'team-1',
    name: 'VAT Filing Team',
    description: 'Responsible for all client VAT return submissions and reconciliations.',
    departmentId: 'dept-1',
    status: 'Active',
    createdAt: '2024-02-05',
  },
  {
    id: 'team-2',
    name: 'Accounts Preparation Team',
    description: 'Prepares financial statements and year-end accounts for SME clients.',
    departmentId: 'dept-1',
    status: 'Active',
    createdAt: '2024-02-05',
  },
  {
    id: 'team-3',
    name: 'Financial Planning Team',
    description: 'Delivers budgeting, forecasting, and financial modelling engagements.',
    departmentId: 'dept-2',
    status: 'Active',
    createdAt: '2024-03-01',
  },
  {
    id: 'team-4',
    name: 'Statutory Audit Team',
    description: 'Conducts year-end statutory audits and issues audit opinions.',
    departmentId: 'dept-3',
    status: 'Active',
    createdAt: '2024-02-20',
  },
  {
    id: 'team-5',
    name: 'Internal Controls Team',
    description: 'Reviews and tests internal controls and risk management frameworks.',
    departmentId: 'dept-3',
    status: 'Active',
    createdAt: '2024-03-10',
  },
  {
    id: 'team-6',
    name: 'Tax Advisory Team',
    description: 'Advises clients on UAE corporate tax structuring and planning.',
    departmentId: 'dept-4',
    status: 'Active',
    createdAt: '2024-02-15',
  },
  {
    id: 'team-7',
    name: 'Compliance Operations Team',
    description: 'Handles day-to-day regulatory filings and licence renewals.',
    departmentId: 'dept-4',
    status: 'Inactive',
    createdAt: '2024-03-20',
  },
  {
    id: 'team-8',
    name: 'Payroll Team',
    description: 'Processes monthly payroll and WPS files for all clients.',
    departmentId: 'dept-5',
    status: 'Active',
    createdAt: '2024-02-28',
  },
  {
    id: 'team-9',
    name: 'IT Support Team',
    description: 'Internal desktop support, network administration, and software licensing.',
    departmentId: 'dept-6',
    status: 'Inactive',
    createdAt: '2024-04-15',
  },
];
