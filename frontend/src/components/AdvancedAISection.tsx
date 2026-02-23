import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    HiOutlineCpuChip,
    HiOutlineSparkles,
    HiOutlineArrowTrendingUp,
} from 'react-icons/hi2';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import CollapsibleSection from './CollapsibleSection';
import { advancedAIOptimize } from '../api/client';
import type { PredictResponse } from '../types';

interface Props {
    result: PredictResponse;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function AdvancedAISection({ result }: Props) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const resp = await advancedAIOptimize({
                plastic_type: result.plastic_type,
                weight: result.weight_kg,
                temperature: result.recommended_params?.temperature_c,
                pressure: result.recommended_params?.pressure_bar,
            });
            setData(resp.data);
        } catch (e: any) {
            setError(e?.message || 'Failed to fetch AI data');
        }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [result.plastic_type, result.weight_kg]);

    // Derive display values
    const rlTemp = data?.rl_recommendation?.recommended_temperature_c;
    const bayesianTemp = data?.bayesian_optimization?.optimal_temperature_c;
    const standardTemp = result.recommended_params?.temperature_c;

    const ensembleYield = data?.ensemble_prediction?.weighted_yield_pct;
    const rfYield = data?.ensemble_prediction?.rf_yield_pct;
    const xgbYield = data?.ensemble_prediction?.xgb_yield_pct;

    const ciMean = data?.uncertainty?.yield_mean;
    const ciLower = data?.uncertainty?.ci_lower;
    const ciUpper = data?.uncertainty?.ci_upper;

    // SHAP data
    const shapFeatures: { name: string; importance: number }[] = [];
    if (data?.explainability?.top_features) {
        for (const f of data.explainability.top_features) {
            shapFeatures.push({ name: f.feature || f.name, importance: Math.abs(f.importance || f.shap_value || 0) });
        }
    }

    const COLORS = ['#F97316', '#10B981', '#8B5CF6', '#EC4899', '#FBBF24', '#06B6D4'];

    const rlDiffers = rlTemp != null && standardTemp != null && Math.abs(rlTemp - standardTemp) > 1;

    return (
        <CollapsibleSection title="Advanced AI Intelligence" icon={HiOutlineCpuChip} accentColor="text-purple-400" badge="AI">
            {loading && (
                <div className="flex items-center gap-3 py-8 justify-center text-text-muted">
                    <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    Running AI models…
                </div>
            )}

            {error && (
                <div className="p-4 rounded-xl bg-danger/10 border border-danger/25 text-sm text-danger">{error}</div>
            )}

            {data && !loading && (
                <div className="space-y-6">
                    {/* KPI Row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* RL Temperature */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                            className="p-4 rounded-xl bg-bg-base border border-border"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <HiOutlineSparkles className="text-purple-400 text-sm" />
                                <p className="text-xs text-text-muted">RL Temperature</p>
                            </div>
                            <p className="text-xl font-bold text-text-primary">
                                {rlTemp != null ? `${rlTemp.toFixed(1)}°C` : '—'}
                            </p>
                            {rlDiffers && (
                                <p className="text-[10px] text-warning mt-1 font-semibold">
                                    ⚡ Differs from standard ({standardTemp?.toFixed(0)}°C)
                                </p>
                            )}
                        </motion.div>

                        {/* Bayesian Temperature */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                            className="p-4 rounded-xl bg-bg-base border border-border"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <HiOutlineArrowTrendingUp className="text-cyan-400 text-sm" />
                                <p className="text-xs text-text-muted">Bayesian Opt. Temp</p>
                            </div>
                            <p className="text-xl font-bold text-text-primary">
                                {bayesianTemp != null ? `${bayesianTemp.toFixed(1)}°C` : '—'}
                            </p>
                        </motion.div>

                        {/* Ensemble Yield */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                            className="p-4 rounded-xl bg-bg-base border border-border"
                        >
                            <p className="text-xs text-text-muted mb-2">Ensemble Yield</p>
                            <p className="text-xl font-bold text-success">
                                {ensembleYield != null ? `${ensembleYield.toFixed(1)}%` : '—'}
                            </p>
                        </motion.div>

                        {/* Confidence Interval */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                            className="p-4 rounded-xl bg-bg-base border border-border"
                        >
                            <p className="text-xs text-text-muted mb-2">Yield CI (95%)</p>
                            <p className="text-xl font-bold text-accent">
                                {ciMean != null ? `${ciMean.toFixed(1)}%` : '—'}
                            </p>
                            {ciLower != null && ciUpper != null && (
                                <p className="text-[10px] text-text-muted mt-1">
                                    ± {((ciUpper - ciLower) / 2).toFixed(1)}% &nbsp; [{ciLower.toFixed(1)} – {ciUpper.toFixed(1)}]
                                </p>
                            )}
                        </motion.div>
                    </div>

                    {/* Confidence Interval Visual Bar */}
                    {ciLower != null && ciUpper != null && ciMean != null && (
                        <div className="p-4 rounded-xl bg-bg-base border border-border">
                            <p className="text-xs text-text-muted mb-3 font-semibold">Yield Confidence Interval</p>
                            <div className="relative h-6 rounded-full bg-bg-elevated overflow-hidden">
                                <div
                                    className="absolute h-full rounded-full bg-accent/25"
                                    style={{
                                        left: `${Math.max(0, (ciLower / 100) * 100)}%`,
                                        width: `${Math.min(100, ((ciUpper - ciLower) / 100) * 100)}%`,
                                    }}
                                />
                                <div
                                    className="absolute w-1.5 h-full bg-accent rounded-full"
                                    style={{ left: `${(ciMean / 100) * 100}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-text-muted mt-1 px-1">
                                <span>0%</span>
                                <span className="text-accent font-semibold">{ciMean.toFixed(1)}%</span>
                                <span>100%</span>
                            </div>
                        </div>
                    )}

                    {/* RF vs XGB Comparison */}
                    {(rfYield != null || xgbYield != null) && (
                        <div className="p-4 rounded-xl bg-bg-base border border-border">
                            <p className="text-xs text-text-muted mb-3 font-semibold">Model Comparison (RF vs XGBoost)</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-3 rounded-lg bg-bg-elevated">
                                    <p className="text-[10px] text-text-muted mb-1">Random Forest</p>
                                    <p className="text-lg font-bold text-emerald-400">{rfYield != null ? `${rfYield.toFixed(1)}%` : '—'}</p>
                                </div>
                                <div className="text-center p-3 rounded-lg bg-bg-elevated">
                                    <p className="text-[10px] text-text-muted mb-1">XGBoost</p>
                                    <p className="text-lg font-bold text-cyan-400">{xgbYield != null ? `${xgbYield.toFixed(1)}%` : '—'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SHAP Feature Importance */}
                    {shapFeatures.length > 0 && (
                        <div className="p-4 rounded-xl bg-bg-base border border-border">
                            <p className="text-xs text-text-muted mb-3 font-semibold">SHAP Feature Importance</p>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={shapFeatures} layout="vertical" margin={{ left: 60, right: 20, top: 5, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272A" horizontal={false} />
                                    <XAxis type="number" tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} />
                                    <YAxis dataKey="name" type="category" tick={{ fill: '#A1A1AA', fontSize: 11 }} axisLine={false} width={55} />
                                    <Tooltip
                                        contentStyle={{ background: '#18181B', border: '1px solid #27272A', borderRadius: 8, fontSize: 12 }}
                                        labelStyle={{ color: '#FAFAFA' }}
                                    />
                                    <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                                        {shapFeatures.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Warnings */}
                    {data.warnings?.length > 0 && (
                        <div className="text-xs text-warning/80 bg-warning/5 border border-warning/15 rounded-lg p-3 space-y-1">
                            {data.warnings.map((w: string, i: number) => (
                                <p key={i}>⚠ {w}</p>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </CollapsibleSection>
    );
}
