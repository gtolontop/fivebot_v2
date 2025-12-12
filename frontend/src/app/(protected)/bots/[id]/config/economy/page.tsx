'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { designTokens } from '@/styles/design-tokens';
import axios from 'axios';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import CustomSelect from '@/components/CustomSelect';

interface ShopItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  emoji?: string;
  category?: string;
  type: 'ROLE' | 'BADGE' | 'COSMETIC' | 'CONSUMABLE' | 'BOOST' | 'CUSTOM';
  roleId?: string;
  duration?: number;
  maxOwned: number;
  maxStock?: number;
  currentStock?: number;
  requiredLevel?: number;
  requiredRoleId?: string;
  isActive: boolean;
  tradeable?: boolean;
  refundable?: boolean;
  refundPercent?: number;
}

interface EconomyConfig {
  id?: string;
  guildId: string;
  botId: string;
  enabled: boolean;
  // Currency Settings
  currencyName: string;
  currencySymbol: string;
  currencyEmoji?: string;
  // Starting Balance
  startingBalance: number;
  // Daily/Work Settings
  dailyAmount: number;
  dailyCooldown: number;
  workMinAmount: number;
  workMaxAmount: number;
  workCooldown: number;
  workResponses?: string[];
  // Crime Settings
  crimeEnabled: boolean;
  crimeMinAmount: number;
  crimeMaxAmount: number;
  crimeSuccessRate: number;
  crimeFinePercent: number;
  crimeCooldown: number;
  crimeResponses?: string[];
  // Robbery Settings
  robEnabled: boolean;
  robMinAmount: number;
  robMaxPercent: number;
  robSuccessRate: number;
  robCooldown: number;
  robFinePercent: number;
  // Gambling Settings
  gamblingEnabled: boolean;
  gamblingMinBet: number;
  gamblingMaxBet?: number;
  // Bank Settings
  bankEnabled: boolean;
  bankInterestRate: number;
  bankInterestInterval: number;
  maxBankBalance?: number;
  // Streaks
  dailyStreakEnabled: boolean;
  streakBonusPercent: number;
  maxStreakBonus: number;
}

type TabType = 'currency' | 'daily-work' | 'crime' | 'robbery' | 'gambling' | 'bank' | 'streaks' | 'shop';

const SHOP_ITEM_TYPES = [
  { value: 'ROLE', label: 'Role', icon: '👤', description: 'Assigns a role to the user' },
  { value: 'BADGE', label: 'Badge', icon: '🏅', description: 'Display badge on profile' },
  { value: 'COSMETIC', label: 'Cosmetic', icon: '🎨', description: 'Visual customization' },
  { value: 'CONSUMABLE', label: 'Consumable', icon: '🍎', description: 'Single-use item' },
  { value: 'BOOST', label: 'Boost', icon: '⚡', description: 'Temporary boost' },
  { value: 'CUSTOM', label: 'Custom', icon: '✨', description: 'Custom item type' },
];

export default function EconomyConfigPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const botId = params?.id as string;

  const [activeTab, setActiveTab] = useState<TabType>('currency');
  const [bot, setBot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guilds, setGuilds] = useState<any[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<string>('');

  // Shop management state
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
  const [workResponseInput, setWorkResponseInput] = useState('');
  const [crimeResponseInput, setCrimeResponseInput] = useState('');

  const [config, setConfig] = useState<EconomyConfig>({
    guildId: '',
    botId: botId,
    enabled: true,
    currencyName: 'Coins',
    currencySymbol: '💰',
    currencyEmoji: '🪙',
    startingBalance: 100,
    dailyAmount: 100,
    dailyCooldown: 86400,
    workMinAmount: 50,
    workMaxAmount: 200,
    workCooldown: 3600,
    workResponses: [],
    crimeEnabled: true,
    crimeMinAmount: 100,
    crimeMaxAmount: 500,
    crimeSuccessRate: 50,
    crimeFinePercent: 25,
    crimeCooldown: 7200,
    crimeResponses: [],
    robEnabled: true,
    robMinAmount: 50,
    robMaxPercent: 25,
    robSuccessRate: 40,
    robCooldown: 14400,
    robFinePercent: 30,
    gamblingEnabled: true,
    gamblingMinBet: 10,
    gamblingMaxBet: 1000,
    bankEnabled: true,
    bankInterestRate: 0.01,
    bankInterestInterval: 86400,
    maxBankBalance: 100000,
    dailyStreakEnabled: true,
    streakBonusPercent: 10,
    maxStreakBonus: 100,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && botId) {
      fetchBotData();
      fetchGuilds();
    }
  }, [user, botId]);

  useEffect(() => {
    if (selectedGuild) {
      fetchConfig();
    }
  }, [selectedGuild]);

  const fetchBotData = async () => {
    try {
      const token = Cookies.get('token');
      const botRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBot(botRes.data);
    } catch (error) {
      console.error('Error fetching bot:', error);
      toast.error('Failed to load bot data');
    }
  };

  const fetchGuilds = async () => {
    try {
      setLoading(true);
      const token = Cookies.get('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/guilds`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGuilds(response.data);
      if (response.data.length > 0) {
        setSelectedGuild(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching guilds:', error);
      toast.error('Failed to load guilds');
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const token = Cookies.get('token');
      const configRes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/economy/config?guildId=${selectedGuild}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (configRes.data) {
        // Parse JSON strings for responses
        const parsedConfig = { ...configRes.data };
        if (typeof parsedConfig.workResponses === 'string') {
          parsedConfig.workResponses = JSON.parse(parsedConfig.workResponses);
        }
        if (typeof parsedConfig.crimeResponses === 'string') {
          parsedConfig.crimeResponses = JSON.parse(parsedConfig.crimeResponses);
        }
        setConfig(parsedConfig);
      }

      // Fetch shop items
      const shopRes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/economy/shop?guildId=${selectedGuild}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShopItems(shopRes.data || []);
    } catch (error) {
      console.error('Error fetching config:', error);
      toast.error('Failed to load economy configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedGuild) {
      toast.error('Please select a guild');
      return;
    }

    try {
      setSaving(true);
      const token = Cookies.get('token');

      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/economy/config?guildId=${selectedGuild}`,
        config,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Economy configuration saved successfully');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save configuration';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteShopItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const token = Cookies.get('token');
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/economy/shop/${itemId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Shop item deleted');
      fetchConfig();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete item');
    }
  };

  const handleSaveShopItem = async (item: Partial<ShopItem>) => {
    try {
      const token = Cookies.get('token');

      if (editingItem?.id) {
        // Update existing item
        await axios.put(
          `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/economy/shop/${editingItem.id}`,
          item,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Shop item updated');
      } else {
        // Create new item
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/bots/${botId}/economy/shop?guildId=${selectedGuild}`,
          item,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Shop item created');
      }

      setShowItemModal(false);
      setEditingItem(null);
      fetchConfig();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save item');
    }
  };

  const addWorkResponse = () => {
    if (workResponseInput.trim()) {
      setConfig({
        ...config,
        workResponses: [...(config.workResponses || []), workResponseInput.trim()],
      });
      setWorkResponseInput('');
    }
  };

  const removeWorkResponse = (index: number) => {
    setConfig({
      ...config,
      workResponses: config.workResponses?.filter((_, i) => i !== index) || [],
    });
  };

  const addCrimeResponse = () => {
    if (crimeResponseInput.trim()) {
      setConfig({
        ...config,
        crimeResponses: [...(config.crimeResponses || []), crimeResponseInput.trim()],
      });
      setCrimeResponseInput('');
    }
  };

  const removeCrimeResponse = (index: number) => {
    setConfig({
      ...config,
      crimeResponses: config.crimeResponses?.filter((_, i) => i !== index) || [],
    });
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'currency' as TabType, label: 'Currency Settings', icon: '💰' },
    { id: 'daily-work' as TabType, label: 'Daily & Work', icon: '⚒️' },
    { id: 'crime' as TabType, label: 'Crime', icon: '🔫' },
    { id: 'robbery' as TabType, label: 'Robbery', icon: '💼' },
    { id: 'gambling' as TabType, label: 'Gambling', icon: '🎰' },
    { id: 'bank' as TabType, label: 'Bank', icon: '🏦' },
    { id: 'streaks' as TabType, label: 'Streaks', icon: '🔥' },
    { id: 'shop' as TabType, label: 'Shop Items', icon: '🛒' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={designTokens.typography.h2}>Economy Configuration</h1>
          <p className={designTokens.typography.body + ' text-gray-500 mt-1'}>
            Configure economy settings for {bot?.name}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !selectedGuild}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {/* Guild Selector */}
      {guilds.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <label className={designTokens.typography.label + ' mb-2 block'}>Select Guild</label>
          <CustomSelect
            options={guilds.map((g) => ({
              value: g.id,
              label: g.name,
              icon: g.icon || '🌐',
            }))}
            value={selectedGuild}
            onChange={setSelectedGuild}
            placeholder="Select a guild"
            searchable
          />
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200 overflow-x-auto">
          <div className="flex space-x-1 p-2 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Currency Settings Tab */}
          {activeTab === 'currency' && (
            <div className="space-y-6">
              <h3 className={designTokens.typography.h3}>Currency Settings</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Currency Name
                  </label>
                  <input
                    type="text"
                    value={config.currencyName}
                    onChange={(e) => setConfig({ ...config, currencyName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Coins"
                  />
                </div>

                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    value={config.currencySymbol}
                    onChange={(e) => setConfig({ ...config, currencySymbol: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="💰"
                  />
                </div>

                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Currency Emoji
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={config.currencyEmoji || ''}
                      onChange={(e) => setConfig({ ...config, currencyEmoji: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="🪙"
                    />
                    {config.currencyEmoji && (
                      <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded-lg text-2xl">
                        {config.currencyEmoji}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Starting Balance
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.startingBalance}
                    onChange={(e) => setConfig({ ...config, startingBalance: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-4">
                <input
                  type="checkbox"
                  id="economy-enabled"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="economy-enabled" className={designTokens.typography.label}>
                  Enable Economy System
                </label>
              </div>
            </div>
          )}

          {/* Daily & Work Tab */}
          {activeTab === 'daily-work' && (
            <div className="space-y-6">
              <h3 className={designTokens.typography.h3}>Daily & Work Settings</h3>

              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <h4 className={designTokens.typography.h4}>Daily Reward</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={designTokens.typography.label + ' mb-2 block'}>
                        Daily Amount
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={config.dailyAmount}
                        onChange={(e) => setConfig({ ...config, dailyAmount: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className={designTokens.typography.label + ' mb-2 block'}>
                        Cooldown (seconds)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={config.dailyCooldown}
                        onChange={(e) => setConfig({ ...config, dailyCooldown: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">Default: 86400 (24 hours)</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <h4 className={designTokens.typography.h4}>Work Command</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={designTokens.typography.label + ' mb-2 block'}>
                        Min Amount
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={config.workMinAmount}
                        onChange={(e) => setConfig({ ...config, workMinAmount: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className={designTokens.typography.label + ' mb-2 block'}>
                        Max Amount
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={config.workMaxAmount}
                        onChange={(e) => setConfig({ ...config, workMaxAmount: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className={designTokens.typography.label + ' mb-2 block'}>
                        Cooldown (seconds)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={config.workCooldown}
                        onChange={(e) => setConfig({ ...config, workCooldown: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={designTokens.typography.label + ' mb-2 block'}>
                      Custom Work Responses
                    </label>
                    <div className="flex space-x-2 mb-2">
                      <input
                        type="text"
                        value={workResponseInput}
                        onChange={(e) => setWorkResponseInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addWorkResponse()}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="You worked as a {job} and earned {amount}!"
                      />
                      <button
                        onClick={addWorkResponse}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                      >
                        Add
                      </button>
                    </div>
                    <div className="space-y-2">
                      {config.workResponses?.map((response, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                          <span className="text-sm">{response}</span>
                          <button
                            onClick={() => removeWorkResponse(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Crime Tab */}
          {activeTab === 'crime' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className={designTokens.typography.h3}>Crime Settings</h3>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="crime-enabled"
                    checked={config.crimeEnabled}
                    onChange={(e) => setConfig({ ...config, crimeEnabled: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="crime-enabled" className={designTokens.typography.label}>
                    Enable Crime
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Min Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.crimeMinAmount}
                    onChange={(e) => setConfig({ ...config, crimeMinAmount: parseInt(e.target.value) || 0 })}
                    disabled={!config.crimeEnabled}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Max Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.crimeMaxAmount}
                    onChange={(e) => setConfig({ ...config, crimeMaxAmount: parseInt(e.target.value) || 0 })}
                    disabled={!config.crimeEnabled}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Success Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={config.crimeSuccessRate}
                    onChange={(e) => setConfig({ ...config, crimeSuccessRate: parseInt(e.target.value) || 0 })}
                    disabled={!config.crimeEnabled}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Fine Percent (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={config.crimeFinePercent}
                    onChange={(e) => setConfig({ ...config, crimeFinePercent: parseInt(e.target.value) || 0 })}
                    disabled={!config.crimeEnabled}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Cooldown (seconds)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.crimeCooldown}
                    onChange={(e) => setConfig({ ...config, crimeCooldown: parseInt(e.target.value) || 0 })}
                    disabled={!config.crimeEnabled}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className={designTokens.typography.label + ' mb-2 block'}>
                  Custom Crime Responses
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={crimeResponseInput}
                    onChange={(e) => setCrimeResponseInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCrimeResponse()}
                    disabled={!config.crimeEnabled}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="You committed a crime and got away with {amount}!"
                  />
                  <button
                    onClick={addCrimeResponse}
                    disabled={!config.crimeEnabled}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-2">
                  {config.crimeResponses?.map((response, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                      <span className="text-sm">{response}</span>
                      <button
                        onClick={() => removeCrimeResponse(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Robbery Tab */}
          {activeTab === 'robbery' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className={designTokens.typography.h3}>Robbery Settings</h3>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="rob-enabled"
                    checked={config.robEnabled}
                    onChange={(e) => setConfig({ ...config, robEnabled: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="rob-enabled" className={designTokens.typography.label}>
                    Enable Robbery
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Min Amount Required
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.robMinAmount}
                    onChange={(e) => setConfig({ ...config, robMinAmount: parseInt(e.target.value) || 0 })}
                    disabled={!config.robEnabled}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum balance required to rob someone</p>
                </div>
                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Max Steal Percent (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={config.robMaxPercent}
                    onChange={(e) => setConfig({ ...config, robMaxPercent: parseInt(e.target.value) || 0 })}
                    disabled={!config.robEnabled}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max % of target balance you can steal</p>
                </div>
                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Success Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={config.robSuccessRate}
                    onChange={(e) => setConfig({ ...config, robSuccessRate: parseInt(e.target.value) || 0 })}
                    disabled={!config.robEnabled}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Fine Percent (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={config.robFinePercent}
                    onChange={(e) => setConfig({ ...config, robFinePercent: parseInt(e.target.value) || 0 })}
                    disabled={!config.robEnabled}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Fine if robbery fails</p>
                </div>
                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Cooldown (seconds)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.robCooldown}
                    onChange={(e) => setConfig({ ...config, robCooldown: parseInt(e.target.value) || 0 })}
                    disabled={!config.robEnabled}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Gambling Tab */}
          {activeTab === 'gambling' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className={designTokens.typography.h3}>Gambling Settings</h3>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="gambling-enabled"
                    checked={config.gamblingEnabled}
                    onChange={(e) => setConfig({ ...config, gamblingEnabled: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="gambling-enabled" className={designTokens.typography.label}>
                    Enable Gambling
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Min Bet
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.gamblingMinBet}
                    onChange={(e) => setConfig({ ...config, gamblingMinBet: parseInt(e.target.value) || 0 })}
                    disabled={!config.gamblingEnabled}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Max Bet (optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.gamblingMaxBet || ''}
                    onChange={(e) => setConfig({ ...config, gamblingMaxBet: parseInt(e.target.value) || undefined })}
                    disabled={!config.gamblingEnabled}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="No limit"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bank Tab */}
          {activeTab === 'bank' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className={designTokens.typography.h3}>Bank Settings</h3>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="bank-enabled"
                    checked={config.bankEnabled}
                    onChange={(e) => setConfig({ ...config, bankEnabled: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="bank-enabled" className={designTokens.typography.label}>
                    Enable Bank
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Interest Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={config.bankInterestRate}
                    onChange={(e) => setConfig({ ...config, bankInterestRate: parseFloat(e.target.value) || 0 })}
                    disabled={!config.bankEnabled}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Interest earned per interval</p>
                </div>
                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Interest Interval (seconds)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.bankInterestInterval}
                    onChange={(e) => setConfig({ ...config, bankInterestInterval: parseInt(e.target.value) || 0 })}
                    disabled={!config.bankEnabled}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Default: 86400 (24 hours)</p>
                </div>
                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Max Bank Balance (optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.maxBankBalance || ''}
                    onChange={(e) => setConfig({ ...config, maxBankBalance: parseInt(e.target.value) || undefined })}
                    disabled={!config.bankEnabled}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="No limit"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Streaks Tab */}
          {activeTab === 'streaks' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className={designTokens.typography.h3}>Daily Streak Settings</h3>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="streak-enabled"
                    checked={config.dailyStreakEnabled}
                    onChange={(e) => setConfig({ ...config, dailyStreakEnabled: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="streak-enabled" className={designTokens.typography.label}>
                    Enable Daily Streaks
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Bonus Per Streak (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.streakBonusPercent}
                    onChange={(e) => setConfig({ ...config, streakBonusPercent: parseInt(e.target.value) || 0 })}
                    disabled={!config.dailyStreakEnabled}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Bonus added per day of streak</p>
                </div>
                <div>
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Max Streak Bonus
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.maxStreakBonus}
                    onChange={(e) => setConfig({ ...config, maxStreakBonus: parseInt(e.target.value) || 0 })}
                    disabled={!config.dailyStreakEnabled}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum bonus amount</p>
                </div>
              </div>
            </div>
          )}

          {/* Shop Items Tab */}
          {activeTab === 'shop' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className={designTokens.typography.h3}>Shop Items</h3>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setShowItemModal(true);
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  + Add Item
                </button>
              </div>

              {shopItems.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <div className="text-6xl mb-4">🛒</div>
                  <h4 className={designTokens.typography.h4 + ' mb-2'}>No shop items</h4>
                  <p className={designTokens.typography.body + ' text-gray-500 mb-4'}>
                    Create items for users to purchase with their currency
                  </p>
                  <button
                    onClick={() => setShowItemModal(true)}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Create First Item
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {shopItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div className="flex items-center space-x-3">
                              {item.emoji && <span className="text-2xl">{item.emoji}</span>}
                              <div>
                                <div className="font-medium">{item.name}</div>
                                {item.description && (
                                  <div className="text-xs text-gray-500">{item.description}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                              {item.type}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-medium">{item.price}</span> {config.currencySymbol}
                          </td>
                          <td className="px-4 py-4">
                            {item.maxStock ? (
                              <span>{item.currentStock || 0} / {item.maxStock}</span>
                            ) : (
                              <span className="text-gray-500">Unlimited</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {item.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setEditingItem(item);
                                  setShowItemModal(true);
                                }}
                                className="text-primary-600 hover:text-primary-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteShopItem(item.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Shop Item Modal */}
      {showItemModal && (
        <ShopItemModal
          item={editingItem}
          currencySymbol={config.currencySymbol}
          onSave={handleSaveShopItem}
          onClose={() => {
            setShowItemModal(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}

// Shop Item Modal Component
interface ShopItemModalProps {
  item: ShopItem | null;
  currencySymbol: string;
  onSave: (item: Partial<ShopItem>) => void;
  onClose: () => void;
}

function ShopItemModal({ item, currencySymbol, onSave, onClose }: ShopItemModalProps) {
  const [formData, setFormData] = useState<Partial<ShopItem>>(
    item || {
      name: '',
      description: '',
      price: 0,
      emoji: '',
      category: '',
      type: 'CUSTOM',
      roleId: '',
      duration: undefined,
      maxOwned: 1,
      maxStock: undefined,
      currentStock: undefined,
      requiredLevel: undefined,
      requiredRoleId: '',
      isActive: true,
      tradeable: false,
      refundable: false,
      refundPercent: 50,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.type) {
      toast.error('Please fill in all required fields');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className={designTokens.typography.h3}>
            {item ? 'Edit Shop Item' : 'Create Shop Item'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h4 className={designTokens.typography.h4}>Basic Information</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={designTokens.typography.label + ' mb-2 block'}>
                  Item Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className={designTokens.typography.label + ' mb-2 block'}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div>
                <label className={designTokens.typography.label + ' mb-2 block'}>
                  Type *
                </label>
                <CustomSelect
                  options={SHOP_ITEM_TYPES}
                  value={formData.type || 'CUSTOM'}
                  onChange={(value) => setFormData({ ...formData, type: value as any })}
                  placeholder="Select type"
                />
              </div>

              <div>
                <label className={designTokens.typography.label + ' mb-2 block'}>
                  Price * ({currencySymbol})
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className={designTokens.typography.label + ' mb-2 block'}>
                  Emoji
                </label>
                <input
                  type="text"
                  value={formData.emoji}
                  onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="🎁"
                />
              </div>

              <div>
                <label className={designTokens.typography.label + ' mb-2 block'}>
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="General"
                />
              </div>
            </div>
          </div>

          {/* Item Properties */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h4 className={designTokens.typography.h4}>Item Properties</h4>

            <div className="grid grid-cols-2 gap-4">
              {formData.type === 'ROLE' && (
                <div className="col-span-2">
                  <label className={designTokens.typography.label + ' mb-2 block'}>
                    Role ID
                  </label>
                  <input
                    type="text"
                    value={formData.roleId}
                    onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Discord role ID"
                  />
                </div>
              )}

              <div>
                <label className={designTokens.typography.label + ' mb-2 block'}>
                  Max Owned
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxOwned}
                  onChange={(e) => setFormData({ ...formData, maxOwned: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className={designTokens.typography.label + ' mb-2 block'}>
                  Duration (seconds, optional)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.duration || ''}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || undefined })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Permanent"
                />
              </div>

              <div>
                <label className={designTokens.typography.label + ' mb-2 block'}>
                  Max Stock (optional)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.maxStock || ''}
                  onChange={(e) => setFormData({ ...formData, maxStock: parseInt(e.target.value) || undefined })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Unlimited"
                />
              </div>

              <div>
                <label className={designTokens.typography.label + ' mb-2 block'}>
                  Current Stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.currentStock || ''}
                  onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value) || undefined })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={!formData.maxStock}
                />
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h4 className={designTokens.typography.h4}>Requirements</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={designTokens.typography.label + ' mb-2 block'}>
                  Required Level
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.requiredLevel || ''}
                  onChange={(e) => setFormData({ ...formData, requiredLevel: parseInt(e.target.value) || undefined })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="No requirement"
                />
              </div>

              <div>
                <label className={designTokens.typography.label + ' mb-2 block'}>
                  Required Role ID
                </label>
                <input
                  type="text"
                  value={formData.requiredRoleId}
                  onChange={(e) => setFormData({ ...formData, requiredRoleId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="No requirement"
                />
              </div>
            </div>
          </div>

          {/* Flags */}
          <div className="space-y-3 pt-4 border-t border-gray-200">
            <h4 className={designTokens.typography.h4}>Item Flags</h4>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="item-active"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="item-active" className={designTokens.typography.label}>
                Active (available for purchase)
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="item-tradeable"
                checked={formData.tradeable}
                onChange={(e) => setFormData({ ...formData, tradeable: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="item-tradeable" className={designTokens.typography.label}>
                Tradeable
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="item-refundable"
                checked={formData.refundable}
                onChange={(e) => setFormData({ ...formData, refundable: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="item-refundable" className={designTokens.typography.label}>
                Refundable
              </label>
            </div>

            {formData.refundable && (
              <div className="ml-7">
                <label className={designTokens.typography.label + ' mb-2 block'}>
                  Refund Percent (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.refundPercent}
                  onChange={(e) => setFormData({ ...formData, refundPercent: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {item ? 'Update Item' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
