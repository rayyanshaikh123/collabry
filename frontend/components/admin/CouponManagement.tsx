'use client';

import React, { useEffect, useState } from 'react';
import { Card, Button, Badge, Input } from '../UIElements';
import couponService, { type Coupon, type CouponFormData, type CouponStats } from '@/lib/services/coupon.service';

const PLANS = ['basic', 'pro', 'enterprise'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatCurrency(paise: number, currency = 'INR') {
  return currency === 'INR' ? `₹${(paise / 100).toLocaleString()}` : `${(paise / 100).toLocaleString()}`;
}

const EMPTY_FORM: CouponFormData = {
  code: '',
  discountType: 'percentage',
  discountValue: 0,
  maxDiscount: null,
  minimumAmount: 0,
  applicablePlans: [],
  validFrom: new Date().toISOString().slice(0, 10),
  validUntil: '',
  maxUsageTotal: null,
  maxUsagePerUser: 1,
  firstTimeOnly: false,
  description: '',
  internalNotes: '',
  campaign: '',
};

export default function CouponManagement() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState<CouponFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stats modal
  const [statsModal, setStatsModal] = useState<CouponStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filter === 'active') params.isActive = 'true';
      if (filter === 'inactive') params.isActive = 'false';
      setCoupons(await couponService.getAll(params));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const filtered = coupons.filter((c) =>
    !search || c.code.toLowerCase().includes(search.toLowerCase()) || c.campaign?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setFormData({ ...EMPTY_FORM });
    setError(null);
    setShowForm(true);
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setFormData({
      discountType: c.discountType,
      discountValue: c.discountValue,
      maxDiscount: c.maxDiscount,
      minimumAmount: c.minimumAmount,
      applicablePlans: c.applicablePlans,
      validFrom: c.validFrom?.slice(0, 10),
      validUntil: c.validUntil?.slice(0, 10),
      maxUsageTotal: c.maxUsageTotal,
      maxUsagePerUser: c.maxUsagePerUser,
      firstTimeOnly: c.firstTimeOnly,
      description: c.description || '',
      internalNotes: c.internalNotes || '',
      campaign: c.campaign || '',
    });
    setError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await couponService.update(editing._id, formData);
      } else {
        await couponService.create(formData);
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this coupon?')) return;
    try {
      await couponService.deactivate(id);
      load();
    } catch { /* silent */ }
  };

  const handleDelete = async (c: Coupon) => {
    if (c.currentUsageCount > 0) {
      alert('Cannot delete a used coupon. Deactivate it instead.');
      return;
    }
    if (!confirm(`Delete coupon ${c.code}? This cannot be undone.`)) return;
    try {
      await couponService.deleteCoupon(c._id);
      load();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to delete');
    }
  };

  const openStats = async (c: Coupon) => {
    setStatsLoading(true);
    setStatsModal(null);
    try {
      setStatsModal(await couponService.getStats(c._id));
    } catch { /* silent */ }
    setStatsLoading(false);
  };

  const updateField = (key: keyof CouponFormData, value: any) => {
    setFormData((p) => ({ ...p, [key]: value }));
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-slate-800 dark:text-white">Coupon Management</h3>
          <p className="text-xs text-slate-400">{coupons.length} coupons total</p>
        </div>
        <Button onClick={openCreate} className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs px-4 py-2 rounded-lg">
          + Create Coupon
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all capitalize ${
                filter === f ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <Input
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          placeholder="Search code or campaign..."
          className="max-w-xs text-xs"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-slate-400">No coupons found</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Code</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Discount</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Plans</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Valid Until</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Usage</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c._id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{c.code}</span>
                      {c.campaign && <span className="block text-[10px] text-slate-400">{c.campaign}</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {c.discountType === 'percentage' ? `${c.discountValue}%` : formatCurrency(c.discountValue)}
                      {c.maxDiscount && <span className="text-slate-400 ml-1">(max {formatCurrency(c.maxDiscount)})</span>}
                    </td>
                    <td className="px-4 py-3">
                      {c.applicablePlans.length === 0 ? (
                        <span className="text-slate-400">All</span>
                      ) : (
                        <div className="flex gap-1 flex-wrap">
                          {c.applicablePlans.map((p) => (
                            <Badge key={p} className="text-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300 border-0 capitalize">{p}</Badge>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(c.validUntil)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {c.currentUsageCount}{c.maxUsageTotal ? ` / ${c.maxUsageTotal}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-[10px] border-0 ${c.isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openStats(c)} className="px-2 py-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Stats">📊</button>
                        <button onClick={() => openEdit(c)} className="px-2 py-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Edit">✏️</button>
                        {c.isActive && (
                          <button onClick={() => handleDeactivate(c._id)} className="px-2 py-1 rounded text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors" title="Deactivate">⏸️</button>
                        )}
                        <button onClick={() => handleDelete(c)} className="px-2 py-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Create / Edit Modal ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
              {editing ? `Edit: ${editing.code}` : 'Create Coupon'}
            </h3>

            {error && <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs">{error}</div>}

            <div className="space-y-4">
              {/* Code (only for create) */}
              {!editing && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Code (leave blank to auto-generate)</label>
                  <Input
                    value={formData.code || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('code', e.target.value.toUpperCase())}
                    placeholder="e.g. SAVE20"
                    className="font-mono text-xs"
                  />
                </div>
              )}

              {/* Discount type + value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Discount Type</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => updateField('discountType', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">
                    Value {formData.discountType === 'percentage' ? '(%)' : '(paise)'}
                  </label>
                  <Input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('discountValue', Number(e.target.value))}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Max discount + Minimum amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Max Discount (paise, 0=none)</label>
                  <Input
                    type="number"
                    value={formData.maxDiscount ?? 0}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('maxDiscount', Number(e.target.value) || null)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Min Amount (paise)</label>
                  <Input
                    type="number"
                    value={formData.minimumAmount ?? 0}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('minimumAmount', Number(e.target.value))}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Valid dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Valid From</label>
                  <Input
                    type="date"
                    value={formData.validFrom || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('validFrom', e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Valid Until *</label>
                  <Input
                    type="date"
                    value={formData.validUntil || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('validUntil', e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Usage limits */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Max Total Usage (0=unlimited)</label>
                  <Input
                    type="number"
                    value={formData.maxUsageTotal ?? 0}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('maxUsageTotal', Number(e.target.value) || null)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Max Per User</label>
                  <Input
                    type="number"
                    value={formData.maxUsagePerUser ?? 1}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('maxUsagePerUser', Number(e.target.value))}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Applicable plans */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-2 block">Applicable Plans (none = all)</label>
                <div className="flex gap-2">
                  {PLANS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        const current = formData.applicablePlans || [];
                        updateField('applicablePlans', current.includes(p) ? current.filter((x) => x !== p) : [...current, p]);
                      }}
                      className={`px-3 py-1.5 text-xs rounded-lg font-semibold capitalize transition-all ${
                        (formData.applicablePlans || []).includes(p)
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Flags */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.firstTimeOnly || false} onChange={(e) => updateField('firstTimeOnly', e.target.checked)} className="rounded" />
                <span className="text-xs text-slate-600 dark:text-slate-400">First-time users only</span>
              </label>

              {/* Description + notes + campaign */}
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Description</label>
                <Input
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('description', e.target.value)}
                  placeholder="User-facing description"
                  className="text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Campaign Tag</label>
                <Input
                  value={formData.campaign || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('campaign', e.target.value)}
                  placeholder="e.g. summer2026"
                  className="text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Internal Notes</label>
                <Input
                  value={formData.internalNotes || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('internalNotes', e.target.value)}
                  placeholder="Admin-only notes"
                  className="text-xs"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button onClick={() => setShowForm(false)} className="text-xs px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="text-xs px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg">
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats Modal ─────────────────────────────────────────────────────── */}
      {(statsModal || statsLoading) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setStatsModal(null); setStatsLoading(false); }}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            {statsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
              </div>
            ) : statsModal ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                    <span className="font-mono text-indigo-600">{statsModal.code}</span> Stats
                  </h3>
                  <Badge className={`text-[10px] border-0 ${statsModal.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {statsModal.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Usage</p>
                    <p className="text-lg font-black text-slate-800 dark:text-white">
                      {statsModal.totalUsage}{statsModal.maxUsage ? ` / ${statsModal.maxUsage}` : ''}
                    </p>
                    <p className="text-[10px] text-slate-400">{statsModal.usageRate}% used</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Discount Given</p>
                    <p className="text-lg font-black text-slate-800 dark:text-white">{formatCurrency(statsModal.totalDiscountGiven)}</p>
                    <p className="text-[10px] text-slate-400">Until {formatDate(statsModal.validUntil)}</p>
                  </div>
                </div>

                {statsModal.recentUsage.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 mb-2">Recent Redemptions</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {statsModal.recentUsage.map((u, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                          <span className="text-slate-700 dark:text-slate-300">{u.user?.name || u.user?.email || 'Unknown'}</span>
                          <span className="text-slate-400">{formatCurrency(u.discountApplied)} · {formatDate(u.usedAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end mt-4">
                  <Button onClick={() => setStatsModal(null)} className="text-xs px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-lg">
                    Close
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
