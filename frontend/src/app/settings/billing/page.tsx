'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Card, PanelCard, StatCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { designTokens } from '@/styles/design-tokens';

interface Transaction {
  id: string;
  type: 'purchase' | 'spend' | 'refund';
  amount: number;
  description: string;
  date: Date;
  status: 'completed' | 'pending' | 'failed';
}

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    type: 'purchase',
    amount: 1000,
    description: 'Credits Package - Starter',
    date: new Date('2024-02-15'),
    status: 'completed',
  },
  {
    id: '2',
    type: 'spend',
    amount: -10,
    description: 'Bot Creation - MyBot',
    date: new Date('2024-02-14'),
    status: 'completed',
  },
  {
    id: '3',
    type: 'spend',
    amount: -50,
    description: 'Module Purchase - Music Player Pro',
    date: new Date('2024-02-10'),
    status: 'completed',
  },
  {
    id: '4',
    type: 'purchase',
    amount: 500,
    description: 'Credits Package - Basic',
    date: new Date('2024-01-20'),
    status: 'completed',
  },
];

const CREDIT_PACKAGES = [
  {
    id: 'basic',
    name: 'Basic',
    credits: 500,
    price: 5,
    popular: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    credits: 1000,
    price: 9,
    popular: true,
    bonus: 100,
  },
  {
    id: 'pro',
    name: 'Pro',
    credits: 2500,
    price: 20,
    popular: false,
    bonus: 500,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    credits: 10000,
    price: 75,
    popular: false,
    bonus: 2500,
  },
];

export default function BillingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const handlePurchase = (packageId: string) => {
    toast.success('Redirecting to payment...');
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return (
          <svg className="w-5 h-5 text-success-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd"/>
          </svg>
        );
      case 'spend':
        return (
          <svg className="w-5 h-5 text-danger-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
          </svg>
        );
      case 'refund':
        return (
          <svg className="w-5 h-5 text-warning-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
          </svg>
        );
      default:
        return null;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className={designTokens.typography.h1}>Billing & Credits</h1>
          <p className={designTokens.typography.body + ' text-gray-500'}>
            Manage your credits and purchase history
          </p>
        </div>

        {/* Credit Balance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            label="Current Balance"
            value={user.credits.toLocaleString()}
            icon={
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
              </svg>
            }
            color="purple"
          />

          <StatCard
            label="Total Spent"
            value="60"
            icon={
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
              </svg>
            }
            color="red"
          />

          <StatCard
            label="Total Purchased"
            value="1,500"
            icon={
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd"/>
              </svg>
            }
            color="green"
          />
        </div>

        {/* Credit Packages */}
        <PanelCard title="Buy Credits" subtitle="Choose a package to add credits to your account">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {CREDIT_PACKAGES.map(pkg => (
              <Card
                key={pkg.id}
                className={`p-6 text-center ${pkg.popular ? 'border-2 border-primary-500 shadow-lg' : ''}`}
              >
                {pkg.popular && (
                  <Badge variant="info" className="mb-3">
                    Most Popular
                  </Badge>
                )}
                <h3 className={designTokens.typography.h3 + ' mb-2'}>{pkg.name}</h3>
                <div className="mb-4">
                  <div className="text-3xl font-bold text-gray-900">${pkg.price}</div>
                  <div className="text-sm text-gray-500">
                    {pkg.credits.toLocaleString()} credits
                    {pkg.bonus && (
                      <span className="text-success-600 font-medium"> +{pkg.bonus}</span>
                    )}
                  </div>
                </div>
                <Button
                  variant={pkg.popular ? 'primary' : 'outline'}
                  size="sm"
                  fullWidth
                  onClick={() => handlePurchase(pkg.id)}
                >
                  Purchase
                </Button>
              </Card>
            ))}
          </div>
        </PanelCard>

        {/* Transaction History */}
        <PanelCard title="Transaction History" subtitle="View your recent transactions">
          <div className="space-y-3">
            {transactions.map(transaction => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex-shrink-0">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{transaction.description}</div>
                    <div className="text-sm text-gray-500">
                      {transaction.date.toLocaleDateString()} at {transaction.date.toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className={`font-semibold ${transaction.amount > 0 ? 'text-success-600' : 'text-danger-600'}`}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount} credits
                  </div>
                  <Badge
                    variant={
                      transaction.status === 'completed' ? 'success' :
                      transaction.status === 'pending' ? 'warning' :
                      'danger'
                    }
                  >
                    {transaction.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </PanelCard>

        {/* Payment Methods */}
        <PanelCard
          title="Payment Methods"
          subtitle="Manage your payment methods"
          action={
            <Button variant="outline" size="sm">
              Add Method
            </Button>
          }
        >
          <div className="text-center py-8 text-gray-500">
            No payment methods added yet
          </div>
        </PanelCard>
      </div>
    </DashboardLayout>
  );
}
