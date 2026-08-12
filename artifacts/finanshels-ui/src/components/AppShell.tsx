'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface AppShellProps {
  children: React.ReactNode;
  breadcrumbs: Array<{ label: string; href?: string }>;
}

export function AppShell({ children, breadcrumbs }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);

  const sidebarWidth = collapsed ? 48 : 256; // w-12 / w-64

  return (
    <div className="min-h-screen bg-white">
      {/* Sidebar */}
      <Sidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
      />

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[29] bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Top bar */}
      <TopBar
        breadcrumbs={breadcrumbs}
        onMenuToggle={() => setMobileOpen(o => !o)}
        sidebarWidth={sidebarWidth}
      />

      {/* Main — offset matches sidebar width on desktop */}
      <main
        className="ml-0 min-w-0 max-w-full overflow-x-clip pt-[60px] transition-[margin] duration-200 ease-in-out lg:ml-[var(--sidebar-w)]"
        style={{ '--sidebar-w': `${sidebarWidth}px` } as React.CSSProperties}
      >
        {children}
      </main>

    </div>
  );
}
