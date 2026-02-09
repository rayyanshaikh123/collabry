'use client';

import React, { useMemo } from 'react';
import { Card } from '../UIElements';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

type InfographicViewerVariant = 'compact' | 'full';

type StatsItem = {
  label?: string;
  value?: string | number;
  icon?: string;
};

type TimelineEvent = {
  year?: string;
  event?: string;
  description?: string;
};

type ComparisonItem = {
  label?: string;
  pros?: string[];
  cons?: string[];
};

type RenderSection =
  | { kind: 'stats'; title?: string; items: StatsItem[] }
  | { kind: 'timeline'; title?: string; events: TimelineEvent[] }
  | { kind: 'comparison'; title?: string; items: ComparisonItem[] }
  | { kind: 'bullets'; title?: string; items: string[] }
  | { kind: 'unknown'; title?: string };

function toStringOrEmpty(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function parseNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  // Extract first numeric token (supports "85%", "1,200", "-3.5")
  const cleaned = trimmed.replace(/,/g, '');
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const num = Number(match[0]);
  return Number.isFinite(num) ? num : null;
}

function StatsBarChart({
  items,
  variant,
}: {
  items: Array<{ label: string; value: number }>;
  variant: InfographicViewerVariant;
}) {
  const height = Math.min(320, Math.max(160, items.length * (variant === 'compact' ? 34 : 38)));

  return (
    <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3">
      <div className="h-[160px] sm:h-[220px]" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={items} layout="vertical" margin={{ top: 6, right: 12, left: 8, bottom: 6 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="label"
              width={variant === 'compact' ? 110 : 150}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              cursor={{ opacity: 0.12 }}
              contentStyle={{
                borderRadius: 12,
                border: '1px solid rgba(148, 163, 184, 0.35)',
              }}
            />
            <Bar dataKey="value" fill="currentColor" radius={[6, 6, 6, 6]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function normalizeInfographic(input: any): { title: string; subtitle?: string; sections: RenderSection[] } | null {
  if (!input || typeof input !== 'object') return null;

  const title = toStringOrEmpty(input.title);
  const subtitle = toStringOrEmpty(input.subtitle) || undefined;
  if (!title) return null;

  const rawSections: any[] = Array.isArray(input.sections) ? input.sections : [];

  const sections: RenderSection[] = rawSections.map((section) => {
    if (!section || typeof section !== 'object') return { kind: 'unknown' as const };

    const sectionTitle = toStringOrEmpty(section.title) || undefined;

    // V2: typed sections
    const type = toStringOrEmpty(section.type).toLowerCase();
    if (type === 'stats') {
      const items = Array.isArray(section.items) ? section.items : Array.isArray(section.stats) ? section.stats : [];
      return {
        kind: 'stats' as const,
        title: sectionTitle,
        items: items.map((it: any) => ({
          label: toStringOrEmpty(it?.label) || undefined,
          value: it?.value,
          icon: toStringOrEmpty(it?.icon) || undefined,
        })),
      };
    }

    if (type === 'timeline') {
      const events = Array.isArray(section.events) ? section.events : [];
      return {
        kind: 'timeline' as const,
        title: sectionTitle,
        events: events.map((ev: any) => ({
          year: toStringOrEmpty(ev?.year) || undefined,
          event: toStringOrEmpty(ev?.event) || undefined,
          description: toStringOrEmpty(ev?.description) || undefined,
        })),
      };
    }

    if (type === 'comparison') {
      const items = Array.isArray(section.items) ? section.items : [];
      return {
        kind: 'comparison' as const,
        title: sectionTitle,
        items: items.map((it: any) => ({
          label: toStringOrEmpty(it?.label) || undefined,
          pros: Array.isArray(it?.pros) ? it.pros.map((p: any) => toStringOrEmpty(p)).filter(Boolean) : [],
          cons: Array.isArray(it?.cons) ? it.cons.map((c: any) => toStringOrEmpty(c)).filter(Boolean) : [],
        })),
      };
    }

    // V1: sections with keyPoints
    if (Array.isArray(section.keyPoints)) {
      return {
        kind: 'bullets' as const,
        title: sectionTitle,
        items: section.keyPoints.map((p: any) => toStringOrEmpty(p)).filter(Boolean),
      };
    }

    // V1: sections with stats
    if (Array.isArray(section.stats)) {
      return {
        kind: 'stats' as const,
        title: sectionTitle,
        items: section.stats.map((it: any) => ({
          label: toStringOrEmpty(it?.label) || undefined,
          value: it?.value,
          icon: toStringOrEmpty(it?.icon) || undefined,
        })),
      };
    }

    return { kind: 'unknown' as const, title: sectionTitle };
  });

  // V1 also supports top-level timeline/comparisons; append if present and not already in sections
  if (Array.isArray(input.timeline) && input.timeline.length) {
    sections.push({
      kind: 'timeline' as const,
      title: 'Timeline',
      events: input.timeline.map((ev: any) => ({
        year: toStringOrEmpty(ev?.year) || undefined,
        event: toStringOrEmpty(ev?.event) || undefined,
        description: toStringOrEmpty(ev?.description) || undefined,
      })),
    });
  }

  if (Array.isArray(input.comparisons) && input.comparisons.length) {
    // Best-effort: present as bullets to avoid assuming schema
    sections.push({
      kind: 'bullets' as const,
      title: 'Comparisons',
      items: input.comparisons.map((c: any) => {
        const cat = toStringOrEmpty(c?.category);
        const a = toStringOrEmpty(c?.optionA);
        const b = toStringOrEmpty(c?.optionB);
        return [cat, a, b].filter(Boolean).join(': ');
      }).filter(Boolean),
    });
  }

  return { title, subtitle, sections };
}

export default function InfographicViewer({
  infographic,
  variant = 'full',
  maxSections,
  showCharts = true,
  className,
}: {
  infographic: any;
  variant?: InfographicViewerVariant;
  maxSections?: number;
  showCharts?: boolean;
  className?: string;
}) {
  const normalized = useMemo(() => normalizeInfographic(infographic), [infographic]);

  if (!normalized) {
    return (
      <Card className={className || ''}>
        <div className="p-6 text-center">
          <div className="text-5xl mb-3">📈</div>
          <div className="text-slate-700 dark:text-slate-200 font-black">Infographic unavailable</div>
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">The data format couldn’t be rendered.</div>
        </div>
      </Card>
    );
  }

  const sectionsToRender =
    typeof maxSections === 'number' ? normalized.sections.slice(0, Math.max(0, maxSections)) : normalized.sections;

  return (
    <Card className={className || ''}>
      <div className={variant === 'compact' ? 'p-5' : 'p-6'}>
        <div className="text-center">
          <h3 className={variant === 'compact' ? 'text-xl font-black text-slate-800 dark:text-slate-200' : 'text-2xl font-black text-slate-800 dark:text-slate-200'}>
            {normalized.title}
          </h3>
          {normalized.subtitle ? (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{normalized.subtitle}</p>
          ) : null}
        </div>

        <div className={variant === 'compact' ? 'mt-4 space-y-4' : 'mt-6 space-y-6'}>
          {sectionsToRender.map((section, idx) => {
            const sectionTitle = section.title ? (
              <div className="text-sm font-black text-slate-700 dark:text-slate-300 mb-3">{section.title}</div>
            ) : null;

            if (section.kind === 'stats') {
              const items = section.items.filter((it) => it && (it.label || it.value !== undefined));
              if (!items.length) return null;

              const chartItems = items
                .map((it) => ({
                  label: it.label || 'Stat',
                  value: parseNumericValue(it.value),
                }))
                .filter((it): it is { label: string; value: number } => typeof it.value === 'number');

              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 text-indigo-700 dark:text-indigo-300"
                >
                  {sectionTitle}
                  <div className={variant === 'compact' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'}>
                    {items.map((it, itemIdx) => (
                      <div key={itemIdx} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            {it.icon ? <span className="mr-2">{it.icon}</span> : null}
                            {it.label || 'Stat'}
                          </div>
                          <div className="text-lg font-black text-slate-900 dark:text-slate-100">
                            {typeof it.value === 'number' || typeof it.value === 'string' ? it.value : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {showCharts && chartItems.length >= 2 ? (
                    <StatsBarChart items={chartItems} variant={variant} />
                  ) : null}
                </div>
              );
            }

            if (section.kind === 'timeline') {
              const events = section.events.filter((ev) => ev && (ev.year || ev.event));
              if (!events.length) return null;

              return (
                <div key={idx} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4">
                  {sectionTitle}
                  <div className="space-y-3">
                    {events.map((ev, eventIdx) => (
                      <div key={eventIdx} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3">
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 text-xs font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded">
                            {ev.year || '—'}
                          </div>
                          <div>
                            <div className="text-sm font-black text-slate-800 dark:text-slate-200">{ev.event || 'Event'}</div>
                            {ev.description ? (
                              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{ev.description}</div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            if (section.kind === 'comparison') {
              const items = section.items.filter((it) => it && it.label);
              if (!items.length) return null;

              return (
                <div key={idx} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4">
                  {sectionTitle}
                  <div className={variant === 'compact' ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-2 gap-3'}>
                    {items.map((it, itemIdx) => (
                      <div key={itemIdx} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                        <div className="text-sm font-black text-slate-800 dark:text-slate-200 mb-3">{it.label}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs font-black text-slate-500 dark:text-slate-400 mb-2">Pros</div>
                            {it.pros?.length ? (
                              <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 list-disc pl-5">
                                {it.pros.map((p, i) => (
                                  <li key={i}>{p}</li>
                                ))}
                              </ul>
                            ) : (
                              <div className="text-sm text-slate-500 dark:text-slate-400">—</div>
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-500 dark:text-slate-400 mb-2">Cons</div>
                            {it.cons?.length ? (
                              <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 list-disc pl-5">
                                {it.cons.map((c, i) => (
                                  <li key={i}>{c}</li>
                                ))}
                              </ul>
                            ) : (
                              <div className="text-sm text-slate-500 dark:text-slate-400">—</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            if (section.kind === 'bullets') {
              const items = section.items.filter(Boolean);
              if (!items.length) return null;

              return (
                <div key={idx} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4">
                  {sectionTitle}
                  <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 list-disc pl-5">
                    {items.map((item, itemIdx) => (
                      <li key={itemIdx}>{item}</li>
                    ))}
                  </ul>
                </div>
              );
            }

            // unknown
            return (
              <div key={idx} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4">
                {sectionTitle}
                <div className="text-sm text-slate-500 dark:text-slate-400">Unsupported section type</div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
