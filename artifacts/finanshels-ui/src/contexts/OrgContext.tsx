'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  MOCK_DEPARTMENTS,
  MOCK_VERTICALS,
  MOCK_TEAMS,
  type Department,
  type Vertical,
  type Team,
} from '@/screens/organisation/mock-data';

/* ─── context shape ──────────────────────────────────────────────────── */

interface OrgContextValue {
  departments:        Department[];
  setDepartments:     (d: Department[]) => void;
  verticals:          Vertical[];
  setVerticals:       (v: Vertical[]) => void;
  teams:              Team[];
  setTeams:           (t: Team[]) => void;
  /** Active department names — ready to use as filter options */
  activeDepartmentNames: string[];
  /** Map selected department display names → their stable IDs (active depts only) */
  getDeptIdsByNames: (names: string[]) => string[];
}

const OrgContext = createContext<OrgContextValue | null>(null);

/* ─── provider ───────────────────────────────────────────────────────── */

export function OrgProvider({ children }: { children: ReactNode }) {
  const [departments, setDepartments] = useState<Department[]>(MOCK_DEPARTMENTS);
  const [verticals,   setVerticals]   = useState<Vertical[]>(MOCK_VERTICALS);
  const [teams,       setTeams]       = useState<Team[]>(MOCK_TEAMS);

  const activeDepts = departments.filter(d => d.status === 'Active');
  const activeDepartmentNames = activeDepts.map(d => d.name);

  /** Map selected display names → stable IDs, restricted to active departments. */
  function getDeptIdsByNames(names: string[]): string[] {
    return activeDepts
      .filter(d => names.includes(d.name))
      .map(d => d.id);
  }

  return (
    <OrgContext.Provider value={{
      departments, setDepartments,
      verticals,   setVerticals,
      teams,       setTeams,
      activeDepartmentNames,
      getDeptIdsByNames,
    }}>
      {children}
    </OrgContext.Provider>
  );
}

/* ─── hook ───────────────────────────────────────────────────────────── */

export function useOrgContext(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrgContext must be used inside <OrgProvider>');
  return ctx;
}
