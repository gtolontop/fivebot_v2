'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';

/**
 * Protected layout - wraps all authenticated pages
 * Persists sidebar and navbar across all page navigations
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar - persists across all navigations */}
      <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />

      {/* Navbar - persists across all navigations */}
      <Navbar sidebarCollapsed={sidebarCollapsed} />

      {/* Main Content */}
      <main
        className={`
          pt-16 transition-all duration-300
          ${sidebarCollapsed ? 'ml-16' : 'ml-60'}
        `}
      >
        <div className="max-w-[1400px] mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
