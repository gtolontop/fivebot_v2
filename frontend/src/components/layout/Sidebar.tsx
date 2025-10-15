'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  CubeIcon,
  PuzzlePieceIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  QuestionMarkCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CommandLineIcon,
  ChartBarIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { botsAPI } from '@/utils/api';
import Cookies from 'js-cookie';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: NavItem[];
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed = false,
  onToggleCollapse,
}) => {
  const pathname = usePathname();
  const [currentBot, setCurrentBot] = useState<any>(null);
  const [botsExpanded, setBotsExpanded] = useState(false);

  // Extract bot ID from pathname
  const botIdMatch = pathname?.match(/\/bots\/([^\/]+)/);
  const botId = botIdMatch ? botIdMatch[1] : null;

  // Fetch current bot if on a bot page
  useEffect(() => {
    if (botId && botId !== 'create') {
      fetchBot(botId);
    } else {
      setCurrentBot(null);
    }
  }, [botId]);

  const fetchBot = async (id: string) => {
    try {
      const response = await botsAPI.getById(id);
      setCurrentBot(response.data);
      setBotsExpanded(true); // Auto-expand bots section when on bot page
    } catch (error) {
      console.error('Error fetching bot:', error);
    }
  };

  const navigation: NavSection[] = [
    {
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: HomeIcon },
      ],
    },
    {
      title: 'Bots',
      items: [
        { label: 'All Bots', href: '/bots', icon: CubeIcon },
        { label: 'Create Bot', href: '/bots/create', icon: CubeIcon },
      ],
    },
    {
      title: 'Modules',
      items: [
        { label: 'Browse', href: '/modules', icon: PuzzlePieceIcon },
        { label: 'Installed', href: '/modules/installed', icon: PuzzlePieceIcon },
      ],
    },
    {
      title: 'Settings',
      items: [
        { label: 'Profile', href: '/settings', icon: Cog6ToothIcon },
        { label: 'Billing', href: '/settings/billing', icon: CreditCardIcon },
      ],
    },
    {
      items: [
        { label: 'Help & Support', href: '/help', icon: QuestionMarkCircleIcon },
      ],
    },
  ];

  const isActive = (href: string): boolean => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    // Exact match for /bots to avoid activating it when on /bots/create
    if (href === '/bots') {
      return pathname === '/bots';
    }
    return pathname?.startsWith(href) ?? false;
  };

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300 z-40
        ${collapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="font-bold text-lg text-gray-900">FiveBot</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navigation.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-6">
            {section.title && !collapsed && (
              <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.title}
              </h3>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const isBotSection = section.title === 'Bots' && item.href === '/bots';

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${active
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        }
                        ${collapsed ? 'justify-center' : ''}
                      `}
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {item.badge && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>

                    {/* Current Bot Sub-navigation */}
                    {!collapsed && isBotSection && currentBot && (
                      <ul className="mt-2 ml-8 space-y-1 border-l-2 border-gray-200 pl-3">
                        <li className="text-xs font-semibold text-gray-900 mb-2 px-2">
                          {currentBot.name}
                        </li>
                        <li>
                          <Link
                            href={`/bots/${currentBot.id}`}
                            className={`
                              flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors
                              ${pathname === `/bots/${currentBot.id}`
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                              }
                            `}
                          >
                            <HomeIcon className="w-4 h-4" />
                            <span>Overview</span>
                          </Link>
                        </li>
                        <li>
                          <Link
                            href={`/bots/${currentBot.id}/invite`}
                            className={`
                              flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors
                              ${pathname?.startsWith(`/bots/${currentBot.id}/invite`)
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                              }
                            `}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span>Invite Link</span>
                          </Link>
                        </li>
                        <li>
                          <Link
                            href={`/bots/${currentBot.id}/analytics`}
                            className={`
                              flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors
                              ${pathname?.startsWith(`/bots/${currentBot.id}/analytics`)
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                              }
                            `}
                          >
                            <ChartBarIcon className="w-4 h-4" />
                            <span>Analytics</span>
                          </Link>
                        </li>
                        <li>
                          <Link
                            href={`/bots/${currentBot.id}/config`}
                            className={`
                              flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors
                              ${pathname?.startsWith(`/bots/${currentBot.id}/config`)
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                              }
                            `}
                          >
                            <WrenchScrewdriverIcon className="w-4 h-4" />
                            <span>Configuration</span>
                          </Link>
                        </li>
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse Toggle */}
      {onToggleCollapse && (
        <div className="p-2 border-t border-gray-200">
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRightIcon className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeftIcon className="w-5 h-5" />
                <span className="ml-2 text-sm font-medium">Collapse</span>
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
