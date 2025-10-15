'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { creditsAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import {
  CreditCardIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  SparklesIcon,
  CheckIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

interface CreditHistory {
  id: string;
  amount: number;
  reason: string;
  type: 'PURCHASE' | 'BONUS' | 'SPEND' | 'REFUND' | 'ADMIN_ADJUSTMENT';
  createdAt: string;
  metadata?: string;
}

interface CreditStats {
  totalPurchased: number;
  totalSpent: number;
  totalBonus: number;
  currentBalance: number;
}

const creditPackages = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 100,
    price: 5,
    popular: false,
    features: ['100 Credits', 'Basic Support', 'Valid for 6 months'],
  },
  {
    id: 'pro',
    name: 'Professional',
    credits: 500,
    price: 20,
    popular: true,
    bonus: 50,
    features: ['500 Credits', '+50 Bonus Credits', 'Priority Support', 'Valid for 1 year'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    credits: 2000,
    price: 75,
    popular: false,
    bonus: 300,
    features: ['2000 Credits', '+300 Bonus Credits', '24/7 Premium Support', 'Never Expires'],
  },
];

export default function BillingPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<CreditHistory[]>([]);
  const [stats, setStats] = useState<CreditStats | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchCreditData();
    }
  }, [user]);

  const fetchCreditData = async () => {
    try {
      setIsLoadingHistory(true);
      const [historyRes, statsRes] = await Promise.all([
        creditsAPI.getMyHistory(1, 20),
        creditsAPI.getStats(),
      ]);

      setHistory(historyRes.data.history || historyRes.data || []);
      setStats(statsRes.data);
    } catch (error: any) {
      console.error('Error fetching credit data:', error);
      toast.error('Failed to load billing data');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handlePurchase = async (packageId: string) => {
    setSelectedPackage(packageId);
    toast.error('Payment integration coming soon!');
    setTimeout(() => setSelectedPackage(null), 1000);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PURCHASE':
        return <ArrowUpIcon className="w-4 h-4 text-success-600" />;
      case 'SPEND':
        return <ArrowDownIcon className="w-4 h-4 text-danger-600" />;
      case 'BONUS':
        return <SparklesIcon className="w-4 h-4 text-purple-600" />;
      case 'REFUND':
        return <ArrowUpIcon className="w-4 h-4 text-blue-600" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PURCHASE':
        return 'text-success-600 bg-success-50';
      case 'SPEND':
        return 'text-danger-600 bg-danger-50';
      case 'BONUS':
        return 'text-purple-600 bg-purple-50';
      case 'REFUND':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading billing...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing & Credits</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your credits and purchase history</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="space-y-1">
            <button
              onClick={() => router.push('/settings')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
            >
              Profile
            </button>
            <button className="w-full text-left px-4 py-2.5 rounded-lg bg-gray-800 text-white font-medium">
              Billing
            </button>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Current Balance & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-primary-100">Current Balance</span>
                  <CreditCardIcon className="w-6 h-6 text-primary-200" />
                </div>
                <p className="text-4xl font-bold">{user.credits}</p>
                <p className="text-xs text-primary-100 mt-1">Available Credits</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Total Purchased</span>
                  <ArrowUpIcon className="w-5 h-5 text-success-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats?.totalPurchased || 0}</p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Total Spent</span>
                  <ArrowDownIcon className="w-5 h-5 text-danger-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats?.totalSpent || 0}</p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">Bonus Credits</span>
                  <SparklesIcon className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats?.totalBonus || 0}</p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>
            </div>

            {/* Credit Packages */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Purchase Credits</h2>
                <p className="text-sm text-gray-500 mt-1">Choose a package that fits your needs</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {creditPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`relative rounded-2xl border-2 p-6 transition-all hover:shadow-xl ${
                      pkg.popular
                        ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-blue-50 shadow-lg scale-105'
                        : 'border-gray-200 bg-white hover:border-primary-300'
                    }`}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="px-4 py-1 bg-primary-500 text-white text-xs font-bold rounded-full shadow-lg">
                          MOST POPULAR
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold text-primary-600">${pkg.price}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">One-time payment</p>
                    </div>

                    <div className="space-y-3 mb-6">
                      {pkg.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="w-5 h-5 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <CheckIcon className="w-3 h-3 text-primary-600" />
                          </div>
                          <span className="text-sm text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {pkg.bonus && (
                      <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-xl">
                        <div className="flex items-center gap-2">
                          <SparklesIcon className="w-5 h-5 text-purple-600" />
                          <span className="text-sm font-bold text-purple-900">
                            +{pkg.bonus} Bonus Credits!
                          </span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => handlePurchase(pkg.id)}
                      disabled={selectedPackage === pkg.id}
                      className={`w-full py-3 rounded-xl font-bold transition-all ${
                        pkg.popular
                          ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-lg hover:shadow-xl'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {selectedPackage === pkg.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Processing...
                        </span>
                      ) : (
                        'Purchase Now'
                      )}
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-blue-900">Payment Integration Coming Soon</p>
                  <p className="text-xs text-blue-700 mt-1">
                    We're integrating Stripe payment processing. You'll be able to purchase credits securely very soon!
                  </p>
                </div>
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-white/50">
                <h2 className="text-xl font-bold text-gray-900">Transaction History</h2>
                <p className="text-xs text-gray-500 mt-1">Your recent credit transactions</p>
              </div>

              <div className="p-6">
                {isLoadingHistory ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-sm text-gray-600">Loading transactions...</p>
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-12">
                    <ClockIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-900 font-semibold">No transactions yet</p>
                    <p className="text-gray-500 text-sm mt-1">Your transaction history will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-200 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getTypeColor(transaction.type)}`}>
                            {getTypeIcon(transaction.type)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{transaction.reason}</p>
                            <p className="text-xs text-gray-500">{formatDate(transaction.createdAt)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${
                            transaction.type === 'SPEND' ? 'text-danger-600' : 'text-success-600'
                          }`}>
                            {transaction.type === 'SPEND' ? '-' : '+'}{Math.abs(transaction.amount)}
                          </p>
                          <p className="text-xs text-gray-500">{transaction.type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Usage Information */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">How Credits Work</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-primary-600">1</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Purchase Credits</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Buy credit packages based on your usage needs
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-primary-600">2</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Use for Bots</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Credits are consumed when your bots are active
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-primary-600">3</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Track Usage</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Monitor your credit usage in real-time
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
