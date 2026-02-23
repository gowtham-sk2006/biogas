import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    HiOutlineGlobeAmericas,
} from 'react-icons/hi2';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import CollapsibleSection from './CollapsibleSection';
import { sustainabilityReport } from '../api/client';
import type { PredictResponse } from '../types';

interface Props {
    result: PredictResponse;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

// Animated counter hook
function useAnimatedCounter(target: number, duration = 1200) {
    const [value, setValue] = useState(0);
    const ref = useRef<number>();
    useEffect(() => {
        const start = 0;
        const startTime = performance.now();
        const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            setValue(start + (target - start) * eased);
            if (progress < 1) ref.current = requestAnimationFrame(animate);
        };
        ref.current = requestAnimationFrame(animate);
        return () => { if (ref.current) cancelAnimationFrame(ref.current); };
    }, [target, duration]);
    return value;
}

function AnimatedNumber({ value, decimals = 1, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
    const animated = useAnimatedCounter(value);
    return <>{animated.toFixed(decimals)}{suffix}</>;
}

// ESG Gauge
function ESGGauge({ score, rating }: { score: number; rating: string }) {
    const radius = 50;
    const circumference = Math.PI * radius;
    const progress = Math.min(score / 100, 1);
    const offset = circumference * (1 - progress);

    const color = score >= 70 ? '#10B981' : score >= 40 ? '#FBBF24' : '#EF4444';

    return (
        <div className="flex flex-col items-center">
            <svg width="120" height="70" viewBox="0 0 120 70">
                <path
                    d="M 10 65 A 50 50 0 0 1 110 65"
                    fill="none"
                    stroke="#27272A"
                    strokeWidth="8"
                    strokeLinecap="round"
                />
                <path
                    d="M 10 65 A 50 50 0 0 1 110 65"
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                />
                <text x="60" y="55" textAnchor="middle" fill="#FAFAFA" fontSize="18" fontWeight="bold">
                    {score.toFixed(0)}
                </text>
                <text x="60" y="68" textAnchor="middle" fill="#71717A" fontSize="9">
                    {rating}
                </text>
            </svg>
        </div>
    );
}

export default function SustainabilityPanel({ result }: Props) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const resp = await sustainabilityReport({
                plastic_type: result.plastic_type,
                weight_kg: result.weight_kg,
                temperature_c: result.recommended_params?.temperature_c || 500,
                pressure_atm: result.recommended_params?.pressure_bar || 1,
                gas_yield_pct: result.predicted_yield_pct,
                co2_emission_g_per_kg: result.predicted_emission_g_per_kg,
            });
            setData(resp.data);
        } catch (e: any) {
            setError(e?.message || 'Failed to fetch sustainability data');
        }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [result.plastic_type, result.weight_kg]);

    // Lifecycle comparison data
    const lifecycleData: { method: string; co2: number; fill: string }[] = [];
    if (data) {
        lifecycleData.push(
            { method: 'Landfill', co2: data.landfill_comparison?.landfill_co2e_kg || 0, fill: '#EF4444' },
            { method: 'Incineration', co2: data.incineration_comparison?.incineration_co2_kg || 0, fill: '#FBBF24' },
            { method: 'Pyrolysis', co2: data.landfill_comparison?.pyrolysis_co2_kg || 0, fill: '#10B981' },
        );
    }

    const carbonCredits = data?.carbon_credits;
    const trees = data?.tree_equivalent;
    const sdg = data?.sdg_mapping;
    const esg = data?.esg_composite;

    return (
        <CollapsibleSection title="Sustainability Intelligence" icon={HiOutlineGlobeAmericas} accentColor="text-green-400" badge="ESG">
            {loading && (
                <div className="flex items-center gap-3 py-8 justify-center text-text-muted">
                    <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                    Generating sustainability report…
                </div>
            )}

            {error && (
                <div className="p-4 rounded-xl bg-danger/10 border border-danger/25 text-sm text-danger">{error}</div>
            )}

            {data && !loading && (
                <div className="space-y-6">
                    {/* KPI Row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                            className="p-4 rounded-xl bg-bg-base border border-border">
                            <p className="text-xs text-text-muted mb-2">Carbon Credits</p>
                            <p className="text-xl font-bold text-success">
                                <AnimatedNumber value={carbonCredits?.credits_earned || 0} decimals={2} />
                            </p>
                            <p className="text-[10px] text-text-muted mt-1">
                                ${carbonCredits?.credit_value_usd?.toFixed(2) || '0'} value
                            </p>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                            className="p-4 rounded-xl bg-bg-base border border-border">
                            <p className="text-xs text-text-muted mb-2">🌳 Trees Equivalent</p>
                            <p className="text-xl font-bold text-emerald-400">
                                <AnimatedNumber value={trees?.trees_equivalent_annual || 0} decimals={0} />
                            </p>
                            <p className="text-[10px] text-text-muted mt-1">
                                per year ({trees?.co2_offset_kg_annual?.toFixed(0) || 0} kg CO₂)
                            </p>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                            className="p-4 rounded-xl bg-bg-base border border-border col-span-2 lg:col-span-1">
                            <p className="text-xs text-text-muted mb-3">SDG Scores</p>
                            <div className="space-y-1.5">
                                {sdg && [
                                    { label: 'SDG 11', value: sdg.sdg_11_sustainable_cities },
                                    { label: 'SDG 12', value: sdg.sdg_12_responsible_consumption },
                                    { label: 'SDG 13', value: sdg.sdg_13_climate_action },
                                ].map((s) => (
                                    <div key={s.label} className="flex items-center gap-2">
                                        <span className="text-[10px] text-text-muted w-12">{s.label}</span>
                                        <div className="flex-1 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${s.value}%` }}
                                                transition={{ duration: 1, ease: 'easeOut' }}
                                                className="h-full bg-emerald-400 rounded-full"
                                            />
                                        </div>
                                        <span className="text-[10px] font-bold text-text-primary w-8 text-right">{s.value?.toFixed(0)}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* ESG Gauge */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                            className="p-4 rounded-xl bg-bg-base border border-border flex flex-col items-center justify-center">
                            <p className="text-xs text-text-muted mb-1">ESG Score</p>
                            {esg && <ESGGauge score={esg.composite_esg} rating={esg.rating} />}
                        </motion.div>
                    </div>

                    {/* Lifecycle Comparison Chart */}
                    {lifecycleData.length > 0 && (
                        <div className="p-4 rounded-xl bg-bg-base border border-border">
                            <p className="text-xs text-text-muted mb-3 font-semibold">Lifecycle CO₂ Comparison (kg)</p>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={lifecycleData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                                    <XAxis dataKey="method" tick={{ fill: '#A1A1AA', fontSize: 11 }} axisLine={false} />
                                    <YAxis tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} />
                                    <Tooltip contentStyle={{ background: '#18181B', border: '1px solid #27272A', borderRadius: 8, fontSize: 12 }} />
                                    <Bar dataKey="co2" radius={[6, 6, 0, 0]}>
                                        {lifecycleData.map((d, i) => (
                                            <Cell key={i} fill={d.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}
        </CollapsibleSection>
    );
}
