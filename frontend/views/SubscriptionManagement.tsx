'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../components/UIElements';
import { useAuthStore } from '../src/stores/auth.store';
import { Check, X, AlertCircle, CreditCard, Calendar, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Subscription {
  plan: string;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  interval: string;
  amount: number;
  currency: string;
}

interface Payment {
  _id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  description: string;
}

const SubscriptionManagementView: React.FC = () => {
  const { user } = useAuthStore();
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      // Fetch subscription
      const subResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/subscriptions/current`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const subData = await subResponse.json();
      if (subData.success) {
        setSubscription(subData.data);
      }

      // Fetch payment history
      const payResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/subscriptions/payment-history`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const payData = await payResponse.json();
      if (payData.success) {
        setPayments(payData.data);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access at the end of the billing period.')) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/subscriptions/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        alert('Subscription cancelled successfully');
        loadSubscriptionData();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to cancel subscription');
    }
  };

  const handleReactivate = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/subscriptions/reactivate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        alert('Subscription reactivated successfully');
        loadSubscriptionData();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to reactivate subscription');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-black text-slate-800 mb-8">Subscription Management</h1>

        {/* Current Plan */}
        <Card className="p-8 mb-8 bg-white shadow-lg rounded-2xl border-2 border-slate-200">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">
                {subscription?.plan.toUpperCase()} Plan
              </h2>
              <div className="flex items-center gap-2">
                {subscription?.status === 'active' ? (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold flex items-center gap-1">
                    <Check className="w-4 h-4" /> Active
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold flex items-center gap-1">
                    <X className="w-4 h-4" /> {subscription?.status}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="text-3xl font-black text-slate-800">
                ₹{((subscription?.amount || 0) / 100).toFixed(0)}
              </div>
              <div className="text-sm text-slate-600 font-bold">/{subscription?.interval}</div>
            </div>
          </div>

          {subscription?.cancelAtPeriodEnd && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-800 font-bold">Subscription Cancelled</p>
                <p className="text-sm text-amber-700">
                  Your subscription will end on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-xs text-slate-600 font-bold">Next Billing Date</p>
                <p className="text-sm font-black text-slate-800">
                  {subscription?.currentPeriodEnd
                    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-xs text-slate-600 font-bold">Payment Method</p>
                <p className="text-sm font-black text-slate-800">Razorpay</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-xs text-slate-600 font-bold">Billing Cycle</p>
                <p className="text-sm font-black text-slate-800 capitalize">{subscription?.interval}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            {subscription?.plan !== 'free' && !subscription?.cancelAtPeriodEnd && (
              <button
                onClick={handleCancelSubscription}
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
              >
                Cancel Subscription
              </button>
            )}

            {subscription?.cancelAtPeriodEnd && (
              <button
                onClick={handleReactivate}
                className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all"
              >
                Reactivate Subscription
              </button>
            )}

            <button
              onClick={() => router.push('/pricing')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
            >
              Change Plan
            </button>
          </div>
        </Card>

        {/* Payment History */}
        <Card className="p-8 bg-white shadow-lg rounded-2xl border-2 border-slate-200">
          <h2 className="text-2xl font-black text-slate-800 mb-6">Payment History</h2>

          {payments.length === 0 ? (
            <p className="text-slate-600 text-center py-8">No payment history yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-3 px-4 font-black text-slate-700">Date</th>
                    <th className="text-left py-3 px-4 font-black text-slate-700">Description</th>
                    <th className="text-left py-3 px-4 font-black text-slate-700">Amount</th>
                    <th className="text-left py-3 px-4 font-black text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment._id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm text-slate-700">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700">{payment.description}</td>
                      <td className="py-3 px-4 text-sm font-bold text-slate-800">
                        ₹{((payment.amount || 0) / 100).toFixed(0)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            payment.status === 'captured'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default SubscriptionManagementView;
