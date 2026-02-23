import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    HiOutlineBanknotes,
    HiOutlineArrowTrendingUp,
    HiOutlineArrowTrendingDown,
} from 'react-icons/hi2';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
} from 'recharts';
import CollapsibleSection from './CollapsibleSection';
import { financialAnalysis } from '../api/client';
import type { PredictResponse } from '../types';

interface Props {
    result: PredictResponse;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

const PIE_COLORS = ['#F97316', '#8B5CF6', '#06B6D4', '#FBBF24', '#EC4899'];

export default function FinancialPanel({ result }: Props) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const resp = await financialAnalysis({
                plastic_type: result.plastic_type,
                weight_kg: result.weight_kg,
                temperature_c: result.recommended_params?.temperature_c || 500,
                pressure_atm: result.recommended_params?.pressure_bar || 1,
            });
            setData(resp.data);
        } catch (e: any) {
            setError(e?.message || 'Failed to fetch financial data');
        }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [result.plastic_type, result.weight_kg]);

    const profit = data?.profit_margin;
    const breakEven = data?.break_even;
    const roi = data?.roi_projection;
    const costBreakdown = data?.cost_breakdown;
    const viability = data?.community_viability;
    const carbonRevenue = data?.carbon_credit_revenue;

    // ROI chart data
    const roiData = roi?.years?.map((y: number, i: number) => ({
        year: `Y${y}`,
        roi: roi.cumulative_roi_pct[i],
        profit: roi.cumulative_profit_usd[i],
    })) || [];

    // Cost breakdown pie data
    const pieData: { name: string; value: number }[] = [];
    if (costBreakdown?.percentages) {
        for (const [k, v] of Object.entries(costBreakdown.percentages)) {
            pieData.push({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v as number });
        }
    }

    const isProfitable = (profit?.margin_pct || 0) > 0;

    return (
        <CollapsibleSection title="Financial & Business Intelligence" icon={HiOutlineBanknotes} accentColor="text-amber-400" badge="Finance">
            {loading && (
                <div className="flex items-center gap-3 py-8 justify-center text-text-muted">
                    <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    Running financial analysis…
                </div>
            )}

            {error && (
                <div className="p-4 rounded-xl bg-danger/10 border border-danger/25 text-sm text-danger">{error}</div>
            )}

            {data && !loading && (
                <div className="space-y-6">
                    {/* KPI Row */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Profit Margin */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                            className="p-4 rounded-xl bg-bg-base border border-border">
                            <div className="flex items-center gap-2 mb-2">
                                {isProfitable
                                    ? <HiOutlineArrowTrendingUp className="text-success text-sm" />
                                    : <HiOutlineArrowTrendingDown className="text-danger text-sm" />}
                                <p className="text-xs text-text-muted">Profit Margin</p>
                            </div>
                            <p className={`text-2xl font-bold ${isProfitable ? 'text-success' : 'text-danger'}`}>
                                {profit?.margin_pct?.toFixed(1)}%
                            </p>
                            <p className="text-[10px] text-text-muted mt-1">
                                ${profit?.annual_profit_usd?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}/yr
                            </p>
                        </motion.div>

                        {/* Break-even */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                            className="p-4 rounded-xl bg-bg-base border border-border">
                            <p className="text-xs text-text-muted mb-2">Break-even</p>
                            <p className="text-2xl font-bold text-text-primary">
                                {breakEven?.break_even_months?.toFixed(1)} <span className="text-sm font-normal text-text-muted">months</span>
                            </p>
                            <p className="text-[10px] text-text-muted mt-1">
                                {breakEven?.break_even_batches?.toLocaleString()} batches
                            </p>
                        </motion.div>

                        {/* Carbon Credit Revenue */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                            className="p-4 rounded-xl bg-bg-base border border-border">
                            <p className="text-xs text-text-muted mb-2">Carbon Credit Revenue</p>
                            <p className="text-2xl font-bold text-emerald-400">
                                ${carbonRevenue?.annual_credit_revenue_usd?.toFixed(0) || '0'}
                            </p>
                            <p className="text-[10px] text-text-muted mt-1">
                                5yr: ${carbonRevenue?.five_year_revenue_usd?.toFixed(0) || '0'}
                            </p>
                        </motion.div>

                        {/* Viability Score */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                            className="p-4 rounded-xl bg-bg-base border border-border">
                            <p className="text-xs text-text-muted mb-2">Viability Score</p>
                            <div className="flex items-end gap-2">
                                <p className="text-2xl font-bold text-accent">
                                    {viability?.viability_score?.toFixed(0) || '—'}
                                </p>
                                <span className="text-xs text-text-muted mb-1">/100</span>
                            </div>
                            <p className="text-[10px] text-text-muted mt-1">
                                Grade: <span className="font-bold text-text-primary">{viability?.grade || '—'}</span>
                            </p>
                        </motion.div>

                        {/* 5-Year ROI */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                            className="p-4 rounded-xl bg-bg-base border border-border">
                            <p className="text-xs text-text-muted mb-2">5-Year ROI</p>
                            <p className={`text-2xl font-bold ${(roi?.year_5_roi_pct || 0) > 0 ? 'text-success' : 'text-danger'}`}>
                                {roi?.year_5_roi_pct?.toFixed(0)}%
                            </p>
                            <p className="text-[10px] text-text-muted mt-1">
                                Payback: Year {roi?.payback_year}
                            </p>
                        </motion.div>

                        {/* Annual Revenue */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                            className="p-4 rounded-xl bg-bg-base border border-border">
                            <p className="text-xs text-text-muted mb-2">Annual Revenue</p>
                            <p className="text-2xl font-bold text-text-primary">
                                ${profit?.annual_revenue_usd?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}
                            </p>
                            <p className="text-[10px] text-text-muted mt-1">
                                Cost: ${profit?.annual_cost_usd?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}
                            </p>
                        </motion.div>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* ROI Projection Line Chart */}
                        {roiData.length > 0 && (
                            <div className="p-4 rounded-xl bg-bg-base border border-border">
                                <p className="text-xs text-text-muted mb-3 font-semibold">5-Year ROI Projection</p>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={roiData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                                        <XAxis dataKey="year" tick={{ fill: '#A1A1AA', fontSize: 11 }} axisLine={false} />
                                        <YAxis tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ background: '#18181B', border: '1px solid #27272A', borderRadius: 8, fontSize: 12 }}
                                            formatter={(value: number, name: string) => [
                                                name === 'roi' ? `${value.toFixed(1)}%` : `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                                                name === 'roi' ? 'ROI' : 'Cumulative Profit',
                                            ]}
                                        />
                                        <Line type="monotone" dataKey="roi" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 3 }} name="roi" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Cost Breakdown Pie */}
                        {pieData.length > 0 && (
                            <div className="p-4 rounded-xl bg-bg-base border border-border">
                                <p className="text-xs text-text-muted mb-3 font-semibold">Operating Cost Breakdown</p>
                                <div className="flex items-center gap-4">
                                    <ResponsiveContainer width="50%" height={180}>
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={35}
                                                outerRadius={65}
                                                paddingAngle={3}
                                            >
                                                {pieData.map((_, i) => (
                                                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ background: '#18181B', border: '1px solid #27272A', borderRadius: 8, fontSize: 12 }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="flex-1 space-y-1.5">
                                        {pieData.map((d, i) => (
                                            <div key={d.name} className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                                <span className="text-[10px] text-text-muted flex-1">{d.name}</span>
                                                <span className="text-[10px] font-bold text-text-primary">{d.value.toFixed(1)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </CollapsibleSection>
    );
}
