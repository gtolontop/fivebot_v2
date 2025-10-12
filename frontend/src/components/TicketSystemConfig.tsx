'use client';

import React, { useState, useEffect } from 'react';
import {
  TicketIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  ClockIcon,
  UserGroupIcon,
  DocumentTextIcon,
  EyeIcon,
  PencilIcon,
  ChartBarIcon,
  CpuChipIcon,
  XMarkIcon,
  LockClosedIcon,
  LockOpenIcon,
  UserPlusIcon,
  UserMinusIcon
} from '@heroicons/react/24/outline';
import SearchableDropdown from './SearchableDropdown';
import TicketViewModal from './TicketViewModal';
import toast from 'react-hot-toast';
import { botsAPI } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

interface TicketSystemConfigProps {
  botId: string;
  guilds: any[];
  config: any;
  updateConfig: (updates: any) => void;
  textChannels: any[];
  allRoles: any[];
}

interface TicketCategory {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  roleId?: string;
  priority?: number;
  color?: string;
  requiredRoles?: string[];
  welcomeMessage?: string;
  useCustomModal?: boolean;
  modalTitle?: string;
  modalDescription?: string;
  modalFields?: {
    id: string;
    label: string;
    type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'NUMBER' | 'EMAIL' | 'URL';
    placeholder?: string;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    options?: { label: string; value: string }[];
    rows?: number;
  }[];
}

interface TicketPanel {
  id: string;
  channelId: string;
  title: string;
  description: string;
  color: string;
  type: 'BUTTON' | 'DROPDOWN' | 'HYBRID' | 'REACTION';
  categories: string[];
  messageId?: string;
  buttonStyle?: 'PRIMARY' | 'SECONDARY' | 'SUCCESS' | 'DANGER';
  emoji?: string;
  requireReason?: boolean;
  cooldown?: number;
}

export default function TicketSystemConfig({
  botId,
  guilds,
  config,
  updateConfig,
  textChannels,
  allRoles
}: TicketSystemConfigProps) {
  const { user } = useAuth();
  const [activeTickets, setActiveTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketStats, setTicketStats] = useState({
    total: 0,
    open: 0,
    closed: 0,
    avgResponseTime: 'N/A',
    totalMessages: 0,
    avgResolutionTime: 'N/A',
    satisfactionRate: 0,
    todayTickets: 0,
    peakHours: '2PM - 6PM',
    topCategory: { name: 'General', percentage: 45 },
    staffPerformance: 92
  });
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [panels, setPanels] = useState<TicketPanel[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPanelModal, setShowPanelModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TicketCategory | null>(null);
  const [editingPanel, setEditingPanel] = useState<TicketPanel | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    setup: true,
    categories: true,
    panels: true,
    active: false,
    settings: false,
    transcripts: false,
    analytics: false,
    automations: false
  });

  const [ticketCommands, setTicketCommands] = useState({
    close: true,
    add: true,
    remove: true,
    claim: true,
    unclaim: true,
    lock: true,
    unlock: true,
    rename: true,
    transfer: true,
    priority: true
  });

  // Category form state
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    emoji: '🎫',
    roleId: '',
    priority: 0,
    color: '#5865F2',
    requiredRoles: [] as string[],
    welcomeMessage: '',
    useCustomModal: false,
    modalTitle: '',
    modalDescription: '',
    modalFields: [{
      id: '1',
      label: 'Issue Description',
      type: 'TEXTAREA' as const,
      placeholder: 'Please describe your issue in detail',
      required: true,
      rows: 4,
      minLength: 10,
      maxLength: 1000
    }]
  });

  // Panel form state
  const [panelForm, setPanelForm] = useState({
    channelId: '',
    title: '🎫 Support Tickets',
    description: 'Click the button below to create a support ticket.',
    color: '#5865F2',
    type: 'BUTTON' as 'BUTTON' | 'DROPDOWN' | 'HYBRID' | 'REACTION',
    selectedCategories: [] as string[],
    buttonStyle: 'PRIMARY' as 'PRIMARY' | 'SECONDARY' | 'SUCCESS' | 'DANGER',
    emoji: '🎫',
    requireReason: false,
    cooldown: 0
  });

  useEffect(() => {
    console.log('TicketSystemConfig - guilds:', guilds.length, guilds);
    console.log('TicketSystemConfig - config:', config);
  }, [guilds, config]);

  useEffect(() => {
    if (config.ticketEnabled && botId) {
      fetchTicketData();

      // Auto-refresh tickets every 5 seconds
      const interval = setInterval(() => {
        fetchTicketData();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [config.ticketEnabled, botId]);

  const fetchTicketData = async () => {
    try {
      // Fetch active tickets
      const ticketsResponse = await botsAPI.getTickets(botId);
      const tickets = ticketsResponse.data.tickets || [];
      setActiveTickets(tickets);
      
      // Calculate peak hours
      const hourlyTickets: { [hour: number]: number } = {};
      tickets.forEach((ticket: any) => {
        const hour = new Date(ticket.createdAt).getHours();
        hourlyTickets[hour] = (hourlyTickets[hour] || 0) + 1;
      });
      
      let peakHour = 14;
      let maxTickets = 0;
      Object.entries(hourlyTickets).forEach(([hour, count]) => {
        if (count > maxTickets) {
          maxTickets = count;
          peakHour = parseInt(hour);
        }
      });
      
      const formatHour = (h: number) => {
        const period = h >= 12 ? 'PM' : 'AM';
        const hour12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
        return `${hour12}${period}`;
      };
      
      const peakHoursStr = `${formatHour(peakHour)} - ${formatHour((peakHour + 4) % 24)}`;
      
      // Calculate category statistics
      const categoryCount: { [category: string]: number } = {};
      tickets.forEach((ticket: any) => {
        const category = ticket.category || 'General';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });
      
      let topCategoryName = 'General';
      let topCategoryCount = 0;
      Object.entries(categoryCount).forEach(([category, count]) => {
        if (count > topCategoryCount) {
          topCategoryCount = count;
          topCategoryName = category;
        }
      });
      
      const topCategoryPercentage = tickets.length > 0 
        ? Math.round((topCategoryCount / tickets.length) * 100)
        : 0;
      
      // Fetch categories
      const categoriesResponse = await botsAPI.getTicketCategories(botId);
      setCategories(categoriesResponse.data.categories || []);

      // Fetch panels
      const panelsResponse = await botsAPI.getTicketPanels(botId);
      setPanels(panelsResponse.data.panels || []);

      // Fetch commands
      try {
        const commandsResponse = await botsAPI.getTicketCommands(botId);
        setTicketCommands(commandsResponse.data || ticketCommands);
      } catch (error) {
        console.log('Commands not yet configured, using defaults');
      }
      
      // Fetch real ticket statistics from the API
      try {
        const statsResponse = await botsAPI.getTicketStats(botId);
        const stats = statsResponse.data;
        // Calculate staff performance (tickets resolved within average time)
        const closedTickets = tickets.filter((t: any) => 
          t.state === 'CLOSED' || t.state === 'RESOLVED'
        );
        const avgResolutionHours = stats.avgResolutionTime && stats.avgResolutionTime !== 'N/A' 
          ? parseInt(stats.avgResolutionTime) 
          : 24;
        const ticketsResolvedInTime = closedTickets.filter((t: any) => {
          if (!t.closedAt) return false;
          const resolutionTime = (new Date(t.closedAt).getTime() - new Date(t.createdAt).getTime()) / 3600000;
          return resolutionTime <= avgResolutionHours;
        });
        
        const staffPerformance = closedTickets.length > 0
          ? Math.round((ticketsResolvedInTime.length / closedTickets.length) * 100)
          : 100;

        setTicketStats({
          total: stats.totalTickets || 0,
          open: stats.openTickets || 0,
          closed: stats.closedTickets || 0,
          avgResponseTime: stats.avgResponseTime || 'N/A',
          totalMessages: stats.totalMessages || 0,
          avgResolutionTime: stats.avgResolutionTime || 'N/A',
          satisfactionRate: stats.satisfactionScore || 0,
          todayTickets: stats.todayTickets || 0,
          peakHours: peakHoursStr || '2PM - 6PM',
          topCategory: { name: topCategoryName || 'General', percentage: topCategoryPercentage || 45 },
          staffPerformance: staffPerformance || 92
        });
        return; // Exit early if we got real stats
      } catch (statsError) {
        console.log('Failed to fetch ticket stats, using fallback calculation');
      }
      
      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const openTickets = tickets.filter((t: any) => 
        t.state === 'OPEN' || t.state === 'NEW' || t.state === 'IN_PROGRESS' || t.state === 'ON_HOLD'
      );
      
      const closedTickets = tickets.filter((t: any) => 
        t.state === 'CLOSED' || t.state === 'RESOLVED'
      );
      
      const todayTickets = tickets.filter((t: any) => {
        const ticketDate = new Date(t.createdAt);
        ticketDate.setHours(0, 0, 0, 0);
        return ticketDate.getTime() === today.getTime();
      });
      
      const totalMessages = tickets.reduce((sum: number, ticket: any) => sum + (ticket.messageCount || 0), 0);
      
      // Calculate average response time
      const ticketsWithResponse = tickets.filter((t: any) => t.firstResponseTime);
      const avgResponseTime = ticketsWithResponse.length > 0
        ? Math.round(ticketsWithResponse.reduce((sum: number, t: any) => sum + t.firstResponseTime, 0) / ticketsWithResponse.length / 60000)
        : 0;
      
      // Calculate average resolution time
      const resolvedTickets = closedTickets.filter((t: any) => t.resolutionTime);
      const avgResolutionTime = resolvedTickets.length > 0
        ? Math.round(resolvedTickets.reduce((sum: number, t: any) => sum + t.resolutionTime, 0) / resolvedTickets.length / 3600000)
        : 0;
      
      const closedWithSatisfaction = closedTickets.filter((t: any) => t.satisfaction !== undefined);
      const satisfactionRate = closedWithSatisfaction.length > 0
        ? Math.round(closedWithSatisfaction.reduce((sum: number, t: any) => sum + (t.satisfaction || 0), 0) / closedWithSatisfaction.length)
        : 0;
      
      // Calculate staff performance for fallback
      const avgResolutionHours = avgResolutionTime > 0 ? avgResolutionTime : 24;
      const ticketsResolvedInTime = closedTickets.filter((t: any) => {
        if (!t.closedAt) return false;
        const resolutionTime = (new Date(t.closedAt).getTime() - new Date(t.createdAt).getTime()) / 3600000;
        return resolutionTime <= avgResolutionHours;
      });
      
      const staffPerformance = closedTickets.length > 0
        ? Math.round((ticketsResolvedInTime.length / closedTickets.length) * 100)
        : 100;
      
      setTicketStats({
        total: tickets.length,
        open: openTickets.length,
        closed: closedTickets.length,
        avgResponseTime: avgResponseTime > 0 ? `${avgResponseTime}m` : 'N/A',
        totalMessages,
        avgResolutionTime: avgResolutionTime > 0 ? `${avgResolutionTime}h` : 'N/A',
        satisfactionRate,
        todayTickets: todayTickets.length,
        peakHours: peakHoursStr,
        topCategory: { name: topCategoryName, percentage: topCategoryPercentage },
        staffPerformance
      });
    } catch (error) {
      console.error('Error fetching ticket data:', error);
    }
  };

  const calculateAvgResponseTime = (tickets: any[]) => {
    if (!tickets || tickets.length === 0) return 'N/A';
    
    const ticketsWithResponse = tickets.filter(t => t.firstResponseAt);
    if (ticketsWithResponse.length === 0) return 'No data';
    
    const totalResponseTime = ticketsWithResponse.reduce((sum, ticket) => {
      const created = new Date(ticket.createdAt).getTime();
      const responded = new Date(ticket.firstResponseAt).getTime();
      return sum + (responded - created);
    }, 0);
    
    const avgMs = totalResponseTime / ticketsWithResponse.length;
    const avgMinutes = Math.floor(avgMs / 60000);
    
    if (avgMinutes < 60) return `${avgMinutes}m`;
    const hours = Math.floor(avgMinutes / 60);
    const minutes = avgMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const calculateAvgResolutionTime = (tickets: any[]) => {
    if (!tickets || tickets.length === 0) return 'N/A';
    
    const closedTickets = tickets.filter(t => t.state === 'CLOSED' && t.closedAt);
    if (closedTickets.length === 0) return 'No data';
    
    const totalResolutionTime = closedTickets.reduce((sum, ticket) => {
      const created = new Date(ticket.createdAt).getTime();
      const closed = new Date(ticket.closedAt).getTime();
      return sum + (closed - created);
    }, 0);
    
    const avgMs = totalResolutionTime / closedTickets.length;
    const avgMinutes = Math.floor(avgMs / 60000);
    
    if (avgMinutes < 60) return `${avgMinutes}m`;
    const hours = Math.floor(avgMinutes / 60);
    const minutes = avgMinutes % 60;
    if (hours < 24) return `${hours}h ${minutes}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const saveCategory = async () => {
    try {
      if (editingCategory) {
        await botsAPI.updateTicketCategory(botId, editingCategory.id, categoryForm);
        toast.success('Category updated successfully');
      } else {
        await botsAPI.createTicketCategory(botId, categoryForm);
        toast.success('Category created successfully');
      }
      
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryForm({
        name: '',
        description: '',
        emoji: '🎫',
        roleId: '',
        priority: 0,
        color: '#5865F2',
        requiredRoles: [],
        welcomeMessage: '',
        useCustomModal: false,
        modalTitle: '',
        modalDescription: '',
        modalFields: [{
          id: '1',
          label: 'Issue Description',
          type: 'TEXTAREA' as const,
          placeholder: 'Please describe your issue in detail',
          required: true,
          rows: 4,
          minLength: 10,
          maxLength: 1000
        }]
      });
      
      fetchTicketData();
    } catch (error) {
      toast.error('Failed to save category');
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
      await botsAPI.deleteTicketCategory(botId, categoryId);
      toast.success('Category deleted successfully');
      fetchTicketData();
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  const savePanel = async () => {
    try {
      // Validate required fields
      if (!panelForm.channelId) {
        toast.error('Please select a channel');
        return;
      }
      
      // Validate categories for BUTTON type
      if (panelForm.type === 'BUTTON' && panelForm.selectedCategories.length === 0) {
        toast.error('Please select at least one category for button panel');
        return;
      }
      
      const panelData = {
        ...panelForm,
        categories: panelForm.selectedCategories
      };
      
      if (editingPanel) {
        await botsAPI.updateTicketPanel(botId, editingPanel.id, panelData);
        toast.success('Panel updated successfully');
      } else {
        await botsAPI.createTicketPanel(botId, panelData);
        toast.success('Panel created successfully');
      }
      
      setShowPanelModal(false);
      setEditingPanel(null);
      setPanelForm({
        channelId: '',
        title: '🎫 Support Tickets',
        description: 'Click the button below to create a support ticket.',
        color: '#5865F2',
        type: 'BUTTON' as 'BUTTON' | 'DROPDOWN' | 'HYBRID' | 'REACTION',
        selectedCategories: [],
        buttonStyle: 'PRIMARY' as 'PRIMARY' | 'SECONDARY' | 'SUCCESS' | 'DANGER',
        emoji: '🎫',
        requireReason: true,
        cooldown: 0
      });
      
      fetchTicketData();
    } catch (error) {
      toast.error('Failed to save panel');
    }
  };

  const deletePanel = async (panelId: string) => {
    if (!confirm('Are you sure you want to delete this panel?')) return;
    
    try {
      await botsAPI.deleteTicketPanel(botId, panelId);
      toast.success('Panel deleted successfully');
      fetchTicketData();
    } catch (error) {
      toast.error('Failed to delete panel');
    }
  };

  const closeTicket = async (ticketId: string) => {
    try {
      await botsAPI.closeTicket(botId, ticketId);
      toast.success('Ticket closed successfully');
      fetchTicketData();
    } catch (error) {
      toast.error('Failed to close ticket');
    }
  };

  const renameTicket = async (ticketId: string) => {
    const newName = prompt('Enter new ticket name:');
    if (!newName) return;

    try {
      await botsAPI.renameTicket(botId, ticketId, newName);
      toast.success('Ticket renamed successfully');
      fetchTicketData();
    } catch (error) {
      toast.error('Failed to rename ticket');
    }
  };

  const claimTicket = async (ticketId: string) => {
    try {
      // Update UI optimistically
      setActiveTickets(prev => prev.map(t =>
        t.id === ticketId ? { ...t, claimedBy: user?.username || 'Unknown' } : t
      ));

      await botsAPI.claimTicket(botId, ticketId);
      toast.success('Ticket claimed successfully');
      setTimeout(() => fetchTicketData(), 2000);
    } catch (error) {
      toast.error('Failed to claim ticket');
      fetchTicketData();
    }
  };

  const unclaimTicket = async (ticketId: string) => {
    try {
      // Update UI optimistically
      setActiveTickets(prev => prev.map(t =>
        t.id === ticketId ? { ...t, claimedBy: null } : t
      ));

      await botsAPI.unclaimTicket(botId, ticketId);
      toast.success('Ticket unclaimed successfully');
      setTimeout(() => fetchTicketData(), 2000);
    } catch (error) {
      toast.error('Failed to unclaim ticket');
      fetchTicketData();
    }
  };

  const lockTicket = async (ticketId: string) => {
    try {
      // Update UI optimistically
      setActiveTickets(prev => prev.map(t =>
        t.id === ticketId ? { ...t, locked: true } : t
      ));

      await botsAPI.lockTicket(botId, ticketId);
      toast.success('Ticket locked successfully');
      setTimeout(() => fetchTicketData(), 2000);
    } catch (error) {
      toast.error('Failed to lock ticket');
      fetchTicketData();
    }
  };

  const unlockTicket = async (ticketId: string) => {
    try {
      // Update UI optimistically
      setActiveTickets(prev => prev.map(t =>
        t.id === ticketId ? { ...t, locked: false } : t
      ));

      await botsAPI.unlockTicket(botId, ticketId);
      toast.success('Ticket unlocked successfully');
      setTimeout(() => fetchTicketData(), 2000);
    } catch (error) {
      toast.error('Failed to unlock ticket');
      fetchTicketData();
    }
  };

  const addUserToTicket = async (ticketId: string) => {
    const userId = prompt('Enter Discord User ID to add:');
    if (!userId) return;

    try {
      await botsAPI.addUserToTicket(botId, ticketId, userId);
      toast.success('User added to ticket successfully');
      fetchTicketData();
    } catch (error) {
      toast.error('Failed to add user to ticket');
    }
  };

  const removeUserFromTicket = async (ticketId: string) => {
    const userId = prompt('Enter Discord User ID to remove:');
    if (!userId) return;

    try {
      await botsAPI.removeUserFromTicket(botId, ticketId, userId);
      toast.success('User removed from ticket successfully');
      fetchTicketData();
    } catch (error) {
      toast.error('Failed to remove user from ticket');
    }
  };

  const changeTicketPriority = async (ticketId: string) => {
    const priority = prompt('Enter priority (LOW, NORMAL, HIGH, URGENT):');
    if (!priority) return;

    const validPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
    if (!validPriorities.includes(priority.toUpperCase())) {
      toast.error('Invalid priority. Use: LOW, NORMAL, HIGH, or URGENT');
      return;
    }

    try {
      await botsAPI.changeTicketPriority(botId, ticketId, priority.toUpperCase());
      toast.success('Ticket priority changed successfully');
      fetchTicketData();
    } catch (error) {
      toast.error('Failed to change ticket priority');
    }
  };

  const deleteTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
      return;
    }

    try {
      // Remove ticket optimistically from UI
      setActiveTickets(prev => prev.filter(t => t.id !== ticketId));

      await botsAPI.deleteTicket(botId, ticketId);
      toast.success('Ticket deleted successfully');

      // Fetch again to ensure sync
      setTimeout(() => fetchTicketData(), 2000);
    } catch (error) {
      toast.error('Failed to delete ticket');
      // Restore ticket on error
      fetchTicketData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ticket System</h2>
          <p className="text-gray-600">Complete ticket management system for your Discord server</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.ticketEnabled || false}
            onChange={(e) => updateConfig({ ticketEnabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          <span className="ml-3 text-sm font-medium text-gray-900">
            {config.ticketEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </label>
      </div>

      {config.ticketEnabled ? (
        <div className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <TicketIcon className="w-8 h-8 text-indigo-600" />
                <span className="text-2xl font-bold text-gray-900">{ticketStats.total}</span>
              </div>
              <p className="text-sm font-medium text-gray-700">Total Tickets</p>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <CheckCircleIcon className="w-8 h-8 text-green-600" />
                <span className="text-2xl font-bold text-gray-900">{ticketStats.open}</span>
              </div>
              <p className="text-sm font-medium text-gray-700">Open Tickets</p>
            </div>
            
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
                <span className="text-2xl font-bold text-gray-900">{ticketStats.closed}</span>
              </div>
              <p className="text-sm font-medium text-gray-700">Closed Tickets</p>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <ClockIcon className="w-8 h-8 text-yellow-600" />
                <span className="text-xl font-bold text-gray-900">{ticketStats.avgResponseTime}</span>
              </div>
              <p className="text-sm font-medium text-gray-700">Avg Response</p>
            </div>
            
          </div>
          
          {/* Additional Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <ChatBubbleLeftRightIcon className="w-8 h-8 text-blue-600" />
                <span className="text-2xl font-bold text-gray-900">{ticketStats.totalMessages}</span>
              </div>
              <p className="text-sm font-medium text-gray-700">Total Messages</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <ClockIcon className="w-8 h-8 text-purple-600" />
                <span className="text-xl font-bold text-gray-900">{ticketStats.avgResolutionTime}</span>
              </div>
              <p className="text-sm font-medium text-gray-700">Resolution Time</p>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-2xl font-bold text-gray-900">{ticketStats.satisfactionRate}%</span>
              </div>
              <p className="text-sm font-medium text-gray-700">Satisfaction</p>
            </div>
            
            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <svg className="w-8 h-8 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-2xl font-bold text-gray-900">{ticketStats.todayTickets}</span>
              </div>
              <p className="text-sm font-medium text-gray-700">Today's Tickets</p>
            </div>
          </div>

          {/* Basic Setup Section */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection('setup')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <Cog6ToothIcon className="w-5 h-5 text-gray-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Basic Setup</h3>
              </div>
              {expandedSections.setup ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
            </button>
            
            {expandedSections.setup && (
              <div className="px-6 pb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Ticket Category
                  </label>
                  {guilds.length === 0 ? (
                    <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-md">
                      Loading Discord data... If this persists, make sure your bot is online and in a server.
                    </div>
                  ) : (
                    <SearchableDropdown
                      options={guilds.flatMap(guild =>
                        guild.channels.filter((channel: any) => channel.type === 4).map((channel: any) => ({
                          ...channel,
                          guildName: guild.name
                        }))
                      )}
                      value={config.ticketCategoryId || ''}
                      onChange={(value) => updateConfig({ ticketCategoryId: value as string })}
                      placeholder="Select a category for ticket channels"
                      emptyMessage="No categories available - Create a category in your Discord server first"
                    />
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    New tickets will be created in this Discord category
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Staff Role
                  </label>
                  <SearchableDropdown
                    options={allRoles.map(role => ({ ...role, isRole: true }))}
                    value={config.ticketStaffRoleId || ''}
                    onChange={(value) => updateConfig({ ticketStaffRoleId: value as string })}
                    placeholder="Select a staff role"
                    emptyMessage="No roles available"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Members with this role can manage all tickets
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transcript Channel (Optional)
                  </label>
                  <SearchableDropdown
                    options={textChannels}
                    value={config.ticketTranscriptChannelId || ''}
                    onChange={(value) => updateConfig({ ticketTranscriptChannelId: value as string })}
                    placeholder="Select a channel for ticket transcripts"
                    emptyMessage="No text channels available"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ticket transcripts will be saved here when tickets are closed
                  </p>
                </div>

                {/* Ticket Commands */}
                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Available Commands
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Select which moderation commands staff can use in tickets
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries({
                      close: 'Close ticket and generate transcript',
                      add: 'Add user to ticket',
                      remove: 'Remove user from ticket',
                      claim: 'Claim/assign ticket to yourself',
                      unclaim: 'Release ticket assignment',
                      lock: 'Lock ticket (prevent user from talking)',
                      unlock: 'Unlock ticket',
                      rename: 'Rename ticket channel',
                      transfer: 'Transfer ticket to another staff',
                      priority: 'Change ticket priority'
                    }).map(([key, description]) => (
                      <label key={key} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ticketCommands[key as keyof typeof ticketCommands]}
                          onChange={async (e) => {
                            const newCommands = { ...ticketCommands, [key]: e.target.checked };
                            setTicketCommands(newCommands);
                            try {
                              await botsAPI.updateTicketCommands(botId, newCommands);
                              toast.success('Commands updated');
                            } catch (error) {
                              toast.error('Failed to update commands');
                              setTicketCommands(ticketCommands); // Revert on error
                            }
                          }}
                          className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">/{key}</div>
                          <div className="text-xs text-gray-500">{description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Ticket Categories Section */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection('categories')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <UserGroupIcon className="w-5 h-5 text-gray-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Ticket Categories</h3>
                <span className="ml-2 text-sm text-gray-500">({categories.length})</span>
              </div>
              {expandedSections.categories ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
            </button>
            
            {expandedSections.categories && (
              <div className="px-6 pb-6">
                <div className="mb-4">
                  <button
                    onClick={() => {
                      setEditingCategory(null);
                      setCategoryForm({
                        name: '',
                        description: '',
                        emoji: '🎫',
                        roleId: '',
                        priority: 0,
                        color: '#5865F2',
                        requiredRoles: [],
                        welcomeMessage: '',
                        useCustomModal: false,
                        modalTitle: '',
                        modalDescription: '',
                        modalFields: [{
                          id: '1',
                          label: 'Issue Description',
                          type: 'TEXTAREA' as const,
                          placeholder: 'Please describe your issue in detail',
                          required: true,
                          rows: 4,
                          minLength: 10,
                          maxLength: 1000
                        }]
                      });
                      setShowCategoryModal(true);
                    }}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Add Category
                  </button>
                </div>

                {categories.length > 0 ? (
                  <div className="space-y-3">
                    {categories.map((category) => (
                      <div key={category.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-2xl">{category.emoji || '🎫'}</span>
                              <h4 className="font-medium text-gray-900">{category.name}</h4>
                              {category.priority && category.priority > 0 && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800">
                                  Priority {category.priority}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                            <div className="flex items-center flex-wrap gap-3 text-xs text-gray-500">
                              {category.roleId && (
                                <span className="flex items-center">
                                  <ShieldCheckIcon className="w-3 h-3 mr-1" />
                                  {allRoles.find(r => r.id === category.roleId)?.name || 'Unknown'}
                                </span>
                              )}
                              {category.color && (
                                <span className="flex items-center">
                                  <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: category.color }}></div>
                                  Color
                                </span>
                              )}
                              {category.useCustomModal && (
                                <span className="flex items-center">
                                  <DocumentTextIcon className="w-3 h-3 mr-1" />
                                  Custom Modal
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setEditingCategory(category);
                                setCategoryForm({
                                  name: category.name,
                                  description: category.description,
                                  emoji: category.emoji || '🎫',
                                  roleId: category.roleId || '',
                                  priority: category.priority || 0,
                                  color: category.color || '#5865F2',
                                  requiredRoles: category.requiredRoles || [],
                                  welcomeMessage: category.welcomeMessage || '',
                                  useCustomModal: category.useCustomModal || false,
                                  modalTitle: category.modalTitle || '',
                                  modalDescription: category.modalDescription || '',
                                  modalFields: (category.modalFields || []) as any
                                });
                                setShowCategoryModal(true);
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteCategory(category.id)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 bg-gray-50 rounded-lg">
                    <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No ticket categories yet</p>
                    <p className="text-sm text-gray-500 mt-1">Create categories to organize different types of tickets</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ticket Panels Section */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection('panels')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <ChatBubbleLeftRightIcon className="w-5 h-5 text-gray-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Ticket Panels</h3>
                <span className="ml-2 text-sm text-gray-500">({panels.length})</span>
              </div>
              {expandedSections.panels ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
            </button>
            
            {expandedSections.panels && (
              <div className="px-6 pb-6">
                <div className="mb-4">
                  <button
                    onClick={() => {
                      setEditingPanel(null);
                      setPanelForm({
                        channelId: '',
                        title: '🎫 Support Tickets',
                        description: 'Click the button below to create a support ticket.',
                        color: '#5865F2',
                        type: 'BUTTON' as 'BUTTON' | 'DROPDOWN' | 'HYBRID' | 'REACTION',
                        selectedCategories: [],
                        buttonStyle: 'PRIMARY' as 'PRIMARY' | 'SECONDARY' | 'SUCCESS' | 'DANGER',
                        emoji: '🎫',
                        requireReason: true,
                        cooldown: 0
                      });
                      setShowPanelModal(true);
                    }}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Create Panel
                  </button>
                </div>

                {panels.length > 0 ? (
                  <div className="space-y-3">
                    {panels.map((panel) => {
                      const channel = textChannels.find(c => c.id === panel.channelId);
                      return (
                        <div key={panel.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 mb-1">{panel.title}</h4>
                              <p className="text-sm text-gray-600 mb-2">{panel.description}</p>
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span>Channel: #{channel?.name || 'Unknown'}</span>
                                <span>Type: {panel.type}</span>
                                <span>Categories: {panel.categories.length}</span>
                                <span style={{ color: panel.color }}>● Color</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={async () => {
                                  try {
                                    await botsAPI.sendTicketPanel(botId, panel.id);
                                    toast.success('Panel sent successfully!');
                                  } catch (error) {
                                    // Error is already handled by the API interceptor
                                    // No need to show another toast
                                  }
                                }}
                                className="text-green-600 hover:text-green-800"
                                title="Send Panel"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                              </button>
                              <button
                                onClick={() => {
                                  setEditingPanel(panel);
                                  setPanelForm({
                                    channelId: panel.channelId,
                                    title: panel.title,
                                    description: panel.description,
                                    color: panel.color,
                                    type: panel.type,
                                    selectedCategories: panel.categories,
                                    buttonStyle: (panel as any).buttonStyle || 'PRIMARY' as 'PRIMARY' | 'SECONDARY' | 'SUCCESS' | 'DANGER',
                                    emoji: (panel as any).emoji || '🎫',
                                    requireReason: (panel as any).requireReason || true,
                                    cooldown: (panel as any).cooldown || 0
                                  });
                                  setShowPanelModal(true);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deletePanel(panel.id)}
                                className="text-red-400 hover:text-red-600"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center p-8 bg-gray-50 rounded-lg">
                    <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No ticket panels yet</p>
                    <p className="text-sm text-gray-500 mt-1">Create panels for users to open tickets</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Active Tickets Section */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection('active')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <DocumentTextIcon className="w-5 h-5 text-gray-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Active Tickets</h3>
                <span className="ml-2 text-sm text-gray-500">({activeTickets.length})</span>
              </div>
              {expandedSections.active ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
            </button>
            
            {expandedSections.active && (
              <div className="px-6 pb-6">
                {activeTickets.length > 0 ? (
                  <div className="space-y-3">
                    {activeTickets.map((ticket) => (
                      <div key={ticket.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                ticket.state === 'OPEN' ? 'bg-green-100 text-green-800' :
                                ticket.state === 'CLOSED' ? 'bg-gray-100 text-gray-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {ticket.state}
                              </span>
                              <h4 className="font-medium text-gray-900">
                                Ticket #{ticket.ticketNumber} {ticket.categoryName ? `- ${ticket.categoryName}` : ''}
                              </h4>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              Created by {ticket.creatorName} • {new Date(ticket.createdAt).toLocaleString()}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>Category: {ticket.categoryName || 'General'}</span>
                              <span>Messages: {ticket.messageCount || 0}</span>
                              {ticket.claimedBy && <span>Claimed by: {ticket.claimedByName}</span>}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setShowTicketModal(true);
                              }}
                              className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                              title="View ticket messages"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => renameTicket(ticket.id)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                              title="Rename ticket"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            {ticket.claimedBy ? (
                              <button
                                onClick={() => unclaimTicket(ticket.id)}
                                className="p-1.5 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded transition-colors"
                                title="Unclaim ticket"
                              >
                                <UserMinusIcon className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => claimTicket(ticket.id)}
                                className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                                title="Claim ticket"
                              >
                                <UserPlusIcon className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => addUserToTicket(ticket.id)}
                              className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded transition-colors"
                              title="Add user to ticket"
                            >
                              <UserPlusIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeUserFromTicket(ticket.id)}
                              className="p-1.5 text-pink-600 hover:text-pink-800 hover:bg-pink-50 rounded transition-colors"
                              title="Remove user from ticket"
                            >
                              <UserMinusIcon className="w-4 h-4" />
                            </button>
                            {ticket.locked ? (
                              <button
                                onClick={() => unlockTicket(ticket.id)}
                                className="p-1.5 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded transition-colors"
                                title="Unlock ticket"
                              >
                                <LockOpenIcon className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => lockTicket(ticket.id)}
                                className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors"
                                title="Lock ticket"
                              >
                                <LockClosedIcon className="w-4 h-4" />
                              </button>
                            )}
                            {ticket.state === 'OPEN' && (
                              <button
                                onClick={() => closeTicket(ticket.id)}
                                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                title="Close ticket"
                              >
                                <XMarkIcon className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteTicket(ticket.id)}
                              className="p-1.5 text-red-700 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
                              title="Delete ticket permanently"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 bg-gray-50 rounded-lg">
                    <TicketIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No active tickets</p>
                    <p className="text-sm text-gray-500 mt-1">Tickets will appear here when users create them</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Advanced Settings Section */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection('settings')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <ShieldCheckIcon className="w-5 h-5 text-gray-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Advanced Settings</h3>
              </div>
              {expandedSections.settings ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
            </button>
            
            {expandedSections.settings && (
              <div className="px-6 pb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ticket Naming Format
                    </label>
                    <select
                      value={config.ticketNamingFormat || 'number'}
                      onChange={(e) => updateConfig({ ticketNamingFormat: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="number">ticket-0001</option>
                      <option value="username">ticket-username</option>
                      <option value="category">category-0001</option>
                      <option value="date">ticket-2024-01-01</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Tickets Per User
                    </label>
                    <input
                      type="number"
                      value={config.maxTicketsPerUser || 3}
                      onChange={(e) => updateConfig({ maxTicketsPerUser: parseInt(e.target.value) })}
                      min="1"
                      max="10"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Auto Close After (hours)
                    </label>
                    <input
                      type="number"
                      value={config.autoCloseHours || 72}
                      onChange={(e) => updateConfig({ autoCloseHours: parseInt(e.target.value) })}
                      min="0"
                      placeholder="0 to disable"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Inactivity Warning (hours)
                    </label>
                    <input
                      type="number"
                      value={config.inactivityWarningHours || 24}
                      onChange={(e) => updateConfig({ inactivityWarningHours: parseInt(e.target.value) })}
                      min="0"
                      placeholder="0 to disable"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={config.ticketThreads || false}
                      onChange={(e) => updateConfig({ ticketThreads: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Use threads instead of channels</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={config.ticketMentionStaff || false}
                      onChange={(e) => updateConfig({ ticketMentionStaff: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Mention staff role on ticket creation</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={config.ticketDMNotifications || false}
                      onChange={(e) => updateConfig({ ticketDMNotifications: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Send DM notifications to users</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={config.ticketRequireReason || false}
                      onChange={(e) => updateConfig({ ticketRequireReason: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Require reason when closing tickets</span>
                  </label>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Ticket Control Buttons</h4>
                  <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={config.ticketButtons?.close !== false}
                        onChange={(e) => updateConfig({ 
                          ticketButtons: { ...config.ticketButtons, close: e.target.checked } 
                        })}
                        className="rounded border-gray-300 text-indigo-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Show Close Button</span>
                    </label>
                    
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={config.ticketButtons?.claim || false}
                        onChange={(e) => updateConfig({ 
                          ticketButtons: { ...config.ticketButtons, claim: e.target.checked } 
                        })}
                        className="rounded border-gray-300 text-indigo-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Show Claim Button</span>
                    </label>
                    
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={config.ticketButtons?.unclaim || false}
                        onChange={(e) => updateConfig({ 
                          ticketButtons: { ...config.ticketButtons, unclaim: e.target.checked } 
                        })}
                        className="rounded border-gray-300 text-indigo-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Show Unclaim Button (when claimed)</span>
                    </label>
                    
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={config.ticketButtons?.addMember || false}
                        onChange={(e) => updateConfig({ 
                          ticketButtons: { ...config.ticketButtons, addMember: e.target.checked } 
                        })}
                        className="rounded border-gray-300 text-indigo-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Show Add Member Button</span>
                    </label>
                    
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={config.ticketButtons?.removeMember || false}
                        onChange={(e) => updateConfig({ 
                          ticketButtons: { ...config.ticketButtons, removeMember: e.target.checked } 
                        })}
                        className="rounded border-gray-300 text-indigo-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Show Remove Member Button</span>
                    </label>
                    
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={config.ticketButtons?.transcript || false}
                        onChange={(e) => updateConfig({ 
                          ticketButtons: { ...config.ticketButtons, transcript: e.target.checked } 
                        })}
                        className="rounded border-gray-300 text-indigo-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Show Transcript Button</span>
                    </label>
                    
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={config.ticketButtons?.lock || false}
                        onChange={(e) => updateConfig({ 
                          ticketButtons: { ...config.ticketButtons, lock: e.target.checked } 
                        })}
                        className="rounded border-gray-300 text-indigo-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Show Lock/Unlock Button</span>
                    </label>
                    
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={config.ticketButtons?.transfer || false}
                        onChange={(e) => updateConfig({ 
                          ticketButtons: { ...config.ticketButtons, transfer: e.target.checked } 
                        })}
                        className="rounded border-gray-300 text-indigo-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Show Transfer Button</span>
                    </label>
                  </div>
                  
                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Close Ticket Options</h5>
                    <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={config.closeOptions?.showTranscript !== false}
                          onChange={(e) => updateConfig({ 
                            closeOptions: { ...config.closeOptions, showTranscript: e.target.checked } 
                          })}
                          className="rounded border-gray-300 text-indigo-600"
                        />
                        <span className="text-sm font-medium text-gray-700">Show 'Save Transcript' option</span>
                      </label>
                      
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={config.closeOptions?.showReopen || false}
                          onChange={(e) => updateConfig({ 
                            closeOptions: { ...config.closeOptions, showReopen: e.target.checked } 
                          })}
                          className="rounded border-gray-300 text-indigo-600"
                        />
                        <span className="text-sm font-medium text-gray-700">Show 'Close & Allow Reopen' option</span>
                      </label>
                      
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={config.closeOptions?.showDelete || false}
                          onChange={(e) => updateConfig({ 
                            closeOptions: { ...config.closeOptions, showDelete: e.target.checked } 
                          })}
                          className="rounded border-gray-300 text-indigo-600"
                        />
                        <span className="text-sm font-medium text-gray-700">Show 'Delete Ticket' option</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Transcripts Section */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection('transcripts')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <DocumentTextIcon className="w-5 h-5 text-gray-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Ticket Transcripts</h3>
              </div>
              {expandedSections.transcripts ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
            </button>
            
            {expandedSections.transcripts && (
              <div className="px-6 pb-6">
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Transcript Settings</h4>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={config.autoSaveTranscripts || false}
                          onChange={(e) => updateConfig({ autoSaveTranscripts: e.target.checked })}
                          className="rounded border-gray-300 text-indigo-600"
                        />
                        <span className="text-sm font-medium text-gray-700">Auto-save transcripts on ticket close</span>
                      </label>
                      
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={config.sendTranscriptToUser || false}
                          onChange={(e) => updateConfig({ sendTranscriptToUser: e.target.checked })}
                          className="rounded border-gray-300 text-indigo-600"
                        />
                        <span className="text-sm font-medium text-gray-700">Send transcript to user via DM</span>
                      </label>
                      
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={config.includeAttachments || false}
                          onChange={(e) => updateConfig({ includeAttachments: e.target.checked })}
                          className="rounded border-gray-300 text-indigo-600"
                        />
                        <span className="text-sm font-medium text-gray-700">Include attachments in transcripts</span>
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Transcripts</h4>
                    <div className="text-center p-8 bg-gray-50 rounded-lg">
                      <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No transcripts available yet</p>
                      <p className="text-sm text-gray-500 mt-1">Transcripts will appear here when tickets are closed</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Analytics Section */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection('analytics')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <ChartBarIcon className="w-5 h-5 text-gray-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Analytics & Reports</h3>
              </div>
              {expandedSections.analytics ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
            </button>
            
            {expandedSections.analytics && (
              <div className="px-6 pb-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Peak Hours</h4>
                      <p className="text-2xl font-bold text-gray-900">{ticketStats.peakHours}</p>
                      <p className="text-xs text-gray-500">Most tickets created</p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Top Category</h4>
                      <p className="text-2xl font-bold text-gray-900">{ticketStats.topCategory.name}</p>
                      <p className="text-xs text-gray-500">{ticketStats.topCategory.percentage}% of all tickets</p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Staff Performance</h4>
                      <p className="text-2xl font-bold text-gray-900">{ticketStats.staffPerformance}%</p>
                      <p className="text-xs text-gray-500">Tickets resolved in time</p>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export Full Report
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Automations Section */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection('automations')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <CpuChipIcon className="w-5 h-5 text-gray-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Automations</h3>
              </div>
              {expandedSections.automations ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
            </button>
            
            {expandedSections.automations && (
              <div className="px-6 pb-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Auto-Response Templates</h4>
                    <div className="space-y-3">
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900">Welcome Message</h5>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.autoWelcomeEnabled || false}
                              onChange={(e) => updateConfig({ autoWelcomeEnabled: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>
                        <textarea
                          value={config.autoWelcomeMessage || 'Thank you for creating a ticket! A staff member will assist you shortly.'}
                          onChange={(e) => updateConfig({ autoWelcomeMessage: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="Enter welcome message..."
                        />
                      </div>
                      
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900">Inactivity Warning</h5>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.inactivityWarningEnabled || false}
                              onChange={(e) => updateConfig({ inactivityWarningEnabled: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>
                        <textarea
                          value={config.inactivityWarningMessage || 'This ticket will be closed in 24 hours due to inactivity. Please respond if you still need assistance.'}
                          onChange={(e) => updateConfig({ inactivityWarningMessage: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="Enter inactivity warning message..."
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Auto-Actions</h4>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={config.autoAssignStaff || false}
                          onChange={(e) => updateConfig({ autoAssignStaff: e.target.checked })}
                          className="rounded border-gray-300 text-indigo-600"
                        />
                        <span className="text-sm font-medium text-gray-700">Auto-assign tickets to available staff</span>
                      </label>
                      
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={config.autoTagUrgent || false}
                          onChange={(e) => updateConfig({ autoTagUrgent: e.target.checked })}
                          className="rounded border-gray-300 text-indigo-600"
                        />
                        <span className="text-sm font-medium text-gray-700">Auto-tag urgent tickets based on keywords</span>
                      </label>
                      
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={config.autoEscalate || false}
                          onChange={(e) => updateConfig({ autoEscalate: e.target.checked })}
                          className="rounded border-gray-300 text-indigo-600"
                        />
                        <span className="text-sm font-medium text-gray-700">Auto-escalate tickets after 1 hour without response</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center p-12 bg-gray-50 rounded-lg">
          <TicketIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ticket System Disabled</h3>
          <p className="text-gray-600 mb-4">Enable the ticket system to provide organized support to your members.</p>
          <button
            onClick={() => updateConfig({ ticketEnabled: true })}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Enable Ticket System
          </button>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h3>
              <button 
                onClick={() => setShowCategoryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Essential fields - Always visible */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="General Support"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="For general questions and support"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emoji
                  </label>
                  <input
                    type="text"
                    value={categoryForm.emoji}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, emoji: e.target.value }))}
                    placeholder="🎫"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

              </div>

              {/* Advanced options - Collapsible */}
              <details className="border border-gray-200 rounded-lg p-4">
                <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                  Advanced Options
                </summary>
                
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Priority Level
                      </label>
                      <input
                        type="number"
                        value={categoryForm.priority}
                        onChange={(e) => setCategoryForm(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                        min="0"
                        max="10"
                        placeholder="0 = lowest"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category Color
                      </label>
                      <input
                        type="text"
                        value={categoryForm.color}
                        onChange={(e) => setCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                        placeholder="#5865F2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Auto-Assign Role
                    </label>
                    <SearchableDropdown
                      options={allRoles.map(role => ({ ...role, isRole: true }))}
                      value={categoryForm.roleId}
                      onChange={(value) => setCategoryForm(prev => ({ ...prev, roleId: value as string }))}
                      placeholder="Select a role to auto-assign"
                      emptyMessage="No roles available"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Welcome Message
                    </label>
                    <textarea
                      value={categoryForm.welcomeMessage}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                      placeholder="Thank you for opening a ticket..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                </div>
              </details>

              {/* Modal Customization - New Section */}
              <details className="border border-gray-200 rounded-lg p-4 mt-4">
                <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                  Modal Customization
                </summary>
                
                <div className="mt-4 space-y-4">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={categoryForm.useCustomModal}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, useCustomModal: e.target.checked }))}
                      className="rounded border-gray-300 text-indigo-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Use custom modal</span>
                  </label>

                  {categoryForm.useCustomModal && (
                  <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Modal Title
                    </label>
                    <input
                      type="text"
                      value={categoryForm.modalTitle}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, modalTitle: e.target.value }))}
                      placeholder={`Create ${categoryForm.name || 'Ticket'}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Modal Description
                    </label>
                    <textarea
                      value={categoryForm.modalDescription}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, modalDescription: e.target.value }))}
                      placeholder="Please fill out the form below to create a support ticket"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Form Fields
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const newField = {
                            id: Date.now().toString(),
                            label: '',
                            type: 'TEXT' as const,
                            placeholder: '',
                            required: false,
                            minLength: 0,
                            maxLength: 500
                          };
                          setCategoryForm(prev => ({
                            ...prev,
                            modalFields: [...(prev.modalFields || []), newField] as any
                          }));
                        }}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <PlusIcon className="w-3 h-3 mr-1" />
                        Add Field
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(categoryForm.modalFields || []).map((field, index) => (
                        <div key={field.id} className="border border-gray-200 rounded-lg p-4 relative">
                          <button
                            type="button"
                            onClick={() => {
                              setCategoryForm(prev => ({
                                ...prev,
                                modalFields: prev.modalFields?.filter(f => f.id !== field.id)
                              }));
                            }}
                            className="absolute top-2 right-2 text-red-400 hover:text-red-600"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Field Label
                              </label>
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => {
                                  setCategoryForm(prev => ({
                                    ...prev,
                                    modalFields: prev.modalFields?.map((f, i) => 
                                      i === index ? { ...f, label: e.target.value } : f
                                    )
                                  }));
                                }}
                                placeholder="Issue Description"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Field Type
                              </label>
                              <select
                                value={field.type}
                                onChange={(e) => {
                                  setCategoryForm(prev => ({
                                    ...prev,
                                    modalFields: prev.modalFields?.map((f, i) => 
                                      i === index ? { ...f, type: e.target.value as any } : f
                                    )
                                  }));
                                }}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                              >
                                <option value="TEXT">Short Text</option>
                                <option value="TEXTAREA">Long Text</option>
                                <option value="SELECT">Dropdown</option>
                                <option value="NUMBER">Number</option>
                                <option value="EMAIL">Email</option>
                                <option value="URL">URL</option>
                              </select>
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Placeholder
                              </label>
                              <input
                                type="text"
                                value={field.placeholder}
                                onChange={(e) => {
                                  setCategoryForm(prev => ({
                                    ...prev,
                                    modalFields: prev.modalFields?.map((f, i) => 
                                      i === index ? { ...f, placeholder: e.target.value } : f
                                    )
                                  }));
                                }}
                                placeholder="Enter placeholder text"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                              />
                            </div>

                            <div className="md:col-span-2 flex items-center space-x-4">
                              <label className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={field.required}
                                  onChange={(e) => {
                                    setCategoryForm(prev => ({
                                      ...prev,
                                      modalFields: prev.modalFields?.map((f, i) => 
                                        i === index ? { ...f, required: e.target.checked } : f
                                      )
                                    }));
                                  }}
                                  className="rounded border-gray-300 text-indigo-600"
                                />
                                <span className="text-sm text-gray-700">Required</span>
                              </label>

                              {field.type === 'TEXTAREA' && (
                                <div className="flex items-center space-x-2">
                                  <label className="text-xs text-gray-700">Rows:</label>
                                  <input
                                    type="number"
                                    value={field.rows || 4}
                                    onChange={(e) => {
                                      setCategoryForm(prev => ({
                                        ...prev,
                                        modalFields: prev.modalFields?.map((f, i) => 
                                          i === index ? { ...f, rows: parseInt(e.target.value) } : f
                                        )
                                      }));
                                    }}
                                    min="2"
                                    max="10"
                                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md"
                                  />
                                </div>
                              )}

                              {((field as any).type === 'TEXT' || (field as any).type === 'TEXTAREA') && (
                                <>
                                  <div className="flex items-center space-x-2">
                                    <label className="text-xs text-gray-700">Min:</label>
                                    <input
                                      type="number"
                                      value={field.minLength || 0}
                                      onChange={(e) => {
                                        setCategoryForm(prev => ({
                                          ...prev,
                                          modalFields: prev.modalFields?.map((f, i) => 
                                            i === index ? { ...f, minLength: parseInt(e.target.value) } : f
                                          )
                                        }));
                                      }}
                                      min="0"
                                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md"
                                    />
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <label className="text-xs text-gray-700">Max:</label>
                                    <input
                                      type="number"
                                      value={field.maxLength || 500}
                                      onChange={(e) => {
                                        setCategoryForm(prev => ({
                                          ...prev,
                                          modalFields: prev.modalFields?.map((f, i) => 
                                            i === index ? { ...f, maxLength: parseInt(e.target.value) } : f
                                          )
                                        }));
                                      }}
                                      min="1"
                                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md"
                                    />
                                  </div>
                                </>
                              )}
                            </div>

                            {(field as any).type === 'SELECT' && (
                              <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Options (one per line)
                                </label>
                                <textarea
                                  value={(field as any).options?.map((o: any) => o.label).join('\n') || ''}
                                  onChange={(e) => {
                                    const options = e.target.value.split('\n').filter(line => line.trim()).map(line => ({
                                      label: line.trim(),
                                      value: line.trim().toLowerCase().replace(/\s+/g, '_')
                                    }));
                                    setCategoryForm(prev => ({
                                      ...prev,
                                      modalFields: prev.modalFields?.map((f, i) => 
                                        i === index ? { ...f, options } : f
                                      )
                                    }));
                                  }}
                                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                                  rows={3}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {(!categoryForm.modalFields || categoryForm.modalFields.length === 0) && (
                        <div className="text-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <DocumentTextIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">No custom fields yet</p>
                          <p className="text-xs text-gray-500 mt-1">Add fields to customize the ticket creation form</p>
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                  )}
                </div>
              </details>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button 
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={saveCategory}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                {editingCategory ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel Modal */}
      {showPanelModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingPanel ? 'Edit Panel' : 'Create Ticket Panel'}
              </h3>
              <button 
                onClick={() => setShowPanelModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Channel *
                </label>
                <SearchableDropdown
                  options={textChannels}
                  value={panelForm.channelId}
                  onChange={(value) => setPanelForm(prev => ({ ...prev, channelId: value as string }))}
                  placeholder="Select a channel for the panel"
                  emptyMessage="No text channels available"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Panel Title *
                </label>
                <input
                  type="text"
                  value={panelForm.title}
                  onChange={(e) => setPanelForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="🎫 Support Tickets"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={panelForm.description}
                  onChange={(e) => setPanelForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Click the button below to create a support ticket."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Panel Type
                </label>
                <select
                  value={panelForm.type}
                  onChange={(e) => setPanelForm(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="BUTTON">Buttons - One button per category</option>
                  <option value="DROPDOWN">Dropdown - Select category from menu</option>
                  <option value="HYBRID">Hybrid - Main button + category selector</option>
                </select>
                {/* Type description */}
                <p className="mt-2 text-sm text-gray-600">
                  {panelForm.type === 'BUTTON' && "Creates one button for each selected category. Users click the category they need."}
                  {panelForm.type === 'DROPDOWN' && "Creates a dropdown menu where users select their category before creating a ticket."}
                  {panelForm.type === 'HYBRID' && "Creates a main 'Create Ticket' button. If categories exist, also shows a dropdown for specific categories."}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Embed Color
                </label>
                <input
                  type="text"
                  value={panelForm.color}
                  onChange={(e) => setPanelForm(prev => ({ ...prev, color: e.target.value }))}
                  placeholder="#5865F2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              {(panelForm.type === 'BUTTON' || panelForm.type === 'DROPDOWN' || panelForm.type === 'HYBRID') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categories to Show
                    {panelForm.type === 'BUTTON' && (
                      <span className="text-xs text-gray-500 ml-2">(Each category will be a separate button)</span>
                    )}
                    {panelForm.type === 'DROPDOWN' && (
                      <span className="text-xs text-gray-500 ml-2">(Options in the dropdown menu)</span>
                    )}
                    {panelForm.type === 'HYBRID' && (
                      <span className="text-xs text-gray-500 ml-2">(Optional - for category-specific tickets)</span>
                    )}
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                    {categories.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No categories available. Please create categories first.</p>
                    ) : (
                      categories.map((category) => (
                      <label key={category.id} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={panelForm.selectedCategories.includes(category.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPanelForm(prev => ({ 
                                ...prev, 
                                selectedCategories: [...prev.selectedCategories, category.id] 
                              }));
                            } else {
                              setPanelForm(prev => ({ 
                                ...prev, 
                                selectedCategories: prev.selectedCategories.filter(id => id !== category.id) 
                              }));
                            }
                          }}
                          className="rounded border-gray-300 text-indigo-600"
                        />
                        <span className="text-sm">
                          {category.emoji} {category.name}
                        </span>
                      </label>
                    ))
                    )}
                  </div>
                </div>
              )}

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preview
                </label>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="bg-gray-700 rounded-md p-4" style={{
                    borderLeft: `4px solid ${panelForm.color}`
                  }}>
                    <h5 className="text-white font-semibold mb-2">{panelForm.title}</h5>
                    <p className="text-gray-300 text-sm mb-4">{panelForm.description}</p>
                    
                    {panelForm.type === 'BUTTON' && (
                      <div className="flex flex-wrap gap-2">
                        {panelForm.selectedCategories.length === 0 ? (
                          <button className="bg-indigo-600 text-white px-4 py-2 rounded text-sm">
                            Create Ticket
                          </button>
                        ) : (
                          categories
                            .filter(cat => panelForm.selectedCategories.includes(cat.id))
                            .map((category, index) => (
                              <button key={category.id} className="bg-gray-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1">
                                {category.emoji && <span>{category.emoji}</span>}
                                {category.name}
                              </button>
                            ))
                        )}
                      </div>
                    )}
                    
                    {panelForm.type === 'DROPDOWN' && (
                      <select className="bg-gray-600 text-white px-4 py-2 rounded text-sm w-48">
                        <option>Select a category...</option>
                        {panelForm.selectedCategories.length === 0 ? (
                          <option>General Support</option>
                        ) : (
                          categories
                            .filter(cat => panelForm.selectedCategories.includes(cat.id))
                            .map(category => (
                              <option key={category.id}>
                                {category.emoji} {category.name}
                              </option>
                            ))
                        )}
                      </select>
                    )}
                    
                    {panelForm.type === 'HYBRID' && (
                      <div className="space-y-2">
                        <button className="bg-indigo-600 text-white px-4 py-2 rounded text-sm flex items-center gap-1">
                          <span>🎫</span> Create Ticket
                        </button>
                        {panelForm.selectedCategories.length > 0 && (
                          <select className="bg-gray-600 text-white px-3 py-2 rounded text-sm w-full">
                            <option>Or select a specific category...</option>
                            {categories
                              .filter(cat => panelForm.selectedCategories.includes(cat.id))
                              .map(category => (
                                <option key={category.id}>
                                  {category.emoji} {category.name}
                                </option>
                              ))
                            }
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button 
                onClick={() => setShowPanelModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={savePanel}
                disabled={!panelForm.channelId || (panelForm.type === 'BUTTON' && panelForm.selectedCategories.length === 0)}
                className={`px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white ${
                  !panelForm.channelId || (panelForm.type === 'BUTTON' && panelForm.selectedCategories.length === 0)
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {editingPanel ? 'Update' : 'Create'} Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket View Modal */}
      {showTicketModal && selectedTicket && user && (
        <TicketViewModal
          botId={botId}
          ticketId={selectedTicket.id}
          ticketNumber={selectedTicket.ticketNumber}
          onClose={() => {
            setShowTicketModal(false);
            setSelectedTicket(null);
          }}
          currentUser={{
            id: user.id,
            discordId: user.discordId,
            username: user.username,
            avatar: user.avatar
          }}
        />
      )}
    </div>
  );
}