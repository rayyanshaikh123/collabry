'use client';

import React, { useState, useEffect } from 'react';
import { Check, Sparkles, Zap, Crown, Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '../components/UIElements';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useRouter } from 'next/navigation';

// Type definitions
interface BasePlan {
  name: string;
  icon: LucideIcon;
  price: number;
  currency: string;
  period: string;
  description: string;
  features: string[];
  color: string;
  buttonText: string;
}

interface FreePlan extends BasePlan {
  limitations: string[];
}

interface PaidPlan extends BasePlan {
  yearlyPrice: number;
  popular: boolean;
  savings: string;
}

interface EnterprisePlan extends BasePlan {
  isCustom: true;
}

type Plan = FreePlan | PaidPlan | EnterprisePlan;

type PlanKey = 'free' | 'basic' | 'pro' | 'enterprise';

// Razorpay script loader
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const PLANS: Record<PlanKey, Plan> = {
  free: {
    name: 'Free',
    icon: Sparkles,
    price: 0,
    currency: '₹',
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      '10 AI questions per day',
      '1 collaborative board',
      '5 group members per board',
      'Basic AI model access',
      'Community features',
      '100MB storage',
    ],
    limitations: [
      'Limited AI models',
      'Basic features only',
    ],
    color: 'from-slate-500 to-slate-700',
    buttonText: 'Current Plan',
  },
  basic: {
    name: 'Basic',
    icon: Zap,
    price: 9,
    currency: '₹',
    period: 'month',
    yearlyPrice: 99,
    description: 'For serious learners',
    features: [
      '100 AI questions per day',
      '5 collaborative boards',
      '20 group members per board',
      'Advanced AI model access',
      'All collaboration features',
      'Study planner & analytics',
      '5GB storage',
      'Email support',
    ],
    popular: true,
    color: 'from-indigo-500 to-purple-600',
    buttonText: 'Upgrade to Basic',
    savings: '8% off yearly',
  },
  pro: {
    name: 'Pro',
    icon: Crown,
    price: 29,
    currency: '₹',
    period: 'month',
    yearlyPrice: 319,
    popular: false,
    description: 'For power users',
    features: [
      'Unlimited AI questions',
      'Unlimited boards',
      '50 group members per board',
      'All AI models (premium)',
      'Advanced study analytics',
      'Groups & communities',
      '50GB storage',
      'Real-time collaboration',
      'Priority email support',
    ],
    color: 'from-amber-500 to-orange-600',
    buttonText: 'Upgrade to Pro',
    savings: '8% off yearly',
  },
  enterprise: {
    name: 'Enterprise',
    icon: Star,
    price: 99999,
    currency: '₹',
    period: 'custom',
    description: 'For organizations',
    features: [
      'Everything in Pro',
      'Unlimited group members',
      'Custom AI model access',
      'Dedicated account manager',
      '500GB storage',
      'Advanced analytics & reporting',
      'Custom onboarding',
      'Phone & email support',
      'Flexible billing',
    ],
    color: 'from-rose-500 to-pink-600',
    buttonText: 'Contact Sales',
    isCustom: true,
  },
};

const PricingView: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  const handleSubscribe = async (planKey: string) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/pricing');
      return;
    }

    if (planKey === 'free') {
      return; // Already on free plan
    }

    if (planKey === 'enterprise') {
      // Redirect to contact page
      router.push('/contact?subject=Enterprise+Plan');
      return;
    }

    setLoading(true);

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay SDK');
      }

      // Determine plan ID
      const interval = billingCycle === 'yearly' ? 'yearly' : 'monthly';
      const planId = `${planKey}_${interval}`;

      // Create order
      const orderResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/subscriptions/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ planId }),
      });

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error('Order creation failed:', orderResponse.status, errorText);
        throw new Error(`Server returned ${orderResponse.status}: ${errorText}`);
      }

      const orderData = await orderResponse.json();
      console.log('Order response:', orderData);

      if (!orderData.success) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      const { orderId, amount, currency } = orderData.data;

      // Razorpay options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_your_key',
        amount,
        currency,
        name: 'Collabry',
        description: `${PLANS[planKey as keyof typeof PLANS].name} Plan`,
        order_id: orderId,
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: '#6366f1',
        },
        handler: async (response: any) => {
          // Verify payment
          try {
            const verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/subscriptions/verify-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planId,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              // Update user in auth store with new subscription tier
              if (verifyData.data?.user) {
                const { setUser } = useAuthStore.getState();
                setUser(verifyData.data.user);
                
                // Also update localStorage
                localStorage.setItem('user', JSON.stringify(verifyData.data.user));
              }
              
              alert('🎉 Subscription activated successfully!');
              router.push('/dashboard');
            } else {
              throw new Error(verifyData.error || 'Payment verification failed');
            }
          } catch (error: any) {
            console.error('Payment verification error:', error);
            alert('Payment verification failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
          escape: false,
          backdropclose: false,
        },
        notes: {
          userId: user?.id,
          planId,
        },
      };

      console.log('Opening Razorpay with options:', {
        key: options.key,
        amount: options.amount,
        currency: options.currency,
        order_id: options.order_id,
      });

      // Open Razorpay checkout
      const razorpay = new (window as any).Razorpay(options);
      
      razorpay.on('payment.failed', function (response: any) {
        console.error('Razorpay payment failed:', response);
        alert(`Payment failed: ${response.error.description || 'Unknown error'}`);
        setLoading(false);
      });
      
      razorpay.open();
    } catch (error: any) {
      console.error('Subscription error:', error);
      alert(error.message || 'Failed to process subscription');
    } finally {
      setLoading(false);
    }
  };

  const currentTier = user?.subscriptionTier || 'free';

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-20 px-6-m-4 md:-m-8 text-slate-800 dark:text-slate-100">
      <div className="max-w-7xl mx-auto">
        {/* Current Plan Badge */}
        {currentTier !== 'free' && (
          <div className="text-center mb-8">
            <div className="inline-flex items-center px-6 py-3 bg-linear-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg dark:shadow-none dark:bg-indigo-700">
              <Crown className="w-5 h-5 mr-2" />
              <span className="font-semibold">Current Plan: {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}</span>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-black text-slate-800 dark:text-white mb-6 font-display">
            Choose Your <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-indigo-600">Perfect Plan</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 font-bold max-w-2xl mx-auto mb-8">
            Start free and upgrade as you grow. No hidden fees, cancel anytime.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-4 bg-white dark:bg-slate-800 rounded-full p-2 shadow-lg dark:shadow-none border-2 border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full font-bold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-indigo-600 text-white shadow-md dark:shadow-none'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-full font-bold transition-all relative ${
                billingCycle === 'yearly'
                  ? 'bg-indigo-600 text-white shadow-md dark:shadow-none'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100'
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 bg-amber-400 text-slate-900 text-xs px-2 py-0.5 rounded-full font-black">
                Save 8%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {Object.entries(PLANS).map(([key, plan]) => {
            const Icon = plan.icon;
            const isCurrentPlan = currentTier === key;
            const displayPrice = billingCycle === 'yearly' && 'yearlyPrice' in plan ? plan.yearlyPrice : plan.price;

            return (
              <div
                key={key}
                className={`relative rounded-3xl overflow-hidden transition-all duration-300 ${
                  'popular' in plan && plan.popular
                    ? 'scale-105 shadow-2xl border-4 border-indigo-600 dark:shadow-none dark:border-indigo-500'
                    : 'shadow-lg hover:shadow-xl border-2 border-slate-200 dark:border-slate-700 dark:shadow-none dark:hover:shadow-none'
                }`}
              >
                {/* Popular badge */}
                {'popular' in plan && plan.popular && (
                  <div className="absolute top-0 right-0 bg-linear-to-r from-amber-400 to-amber-500 text-slate-900 px-4 py-1 text-xs font-black uppercase tracking-wider rounded-bl-2xl">
                    Most Popular
                  </div>
                )}

                {/* Card content */}
                <div className="bg-white dark:bg-slate-800 p-8 h-full flex flex-col">
                  {/* Icon and name */}

                  <div className={`w-16 h-16 rounded-2xl bg-linear-to-br ${plan.color} flex items-center justify-center mb-6`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">{plan.name}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">{plan.description}</p>

                  {/* Price */}
                  <div className="mb-6">
                    {'isCustom' in plan && plan.isCustom ? (
                      <div className="text-4xl font-black text-slate-800">Custom</div>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-slate-800 dark:text-white">{plan.currency}</span>
                          <span className="text-5xl font-black text-slate-800 dark:text-white">{displayPrice}</span>
                          <span className="text-slate-600 dark:text-slate-300 font-bold">/{plan.period}</span>
                        </div>
                        {billingCycle === 'yearly' && 'yearlyPrice' in plan && plan.yearlyPrice && 'savings' in plan && (
                          <div className="text-sm text-green-600 font-bold mt-1">{plan.savings}</div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8 grow">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-500 dark:text-green-400 shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-700 dark:text-slate-200">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA button */}
                  <button
                    onClick={() => handleSubscribe(key)}
                    disabled={isCurrentPlan || loading}
                    className={`w-full py-4 rounded-xl font-black text-lg transition-all ${
                      isCurrentPlan
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'popular' in plan && plan.popular
                        ? 'bg-linear-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl dark:shadow-none'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl dark:shadow-none'
                    }`}
                  >
                    {isCurrentPlan ? 'Current Plan' : loading ? 'Processing...' : plan.buttonText}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ or additional info */}
        <div className="mt-20 text-center">
          <p className="text-slate-600 font-bold">
            Need help choosing? <a href="/contact" className="text-indigo-600 hover:underline">Contact our team</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingView;
