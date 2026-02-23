import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    HiOutlineBeaker,
    HiOutlineFire,
} from 'react-icons/hi2';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import CollapsibleSection from './CollapsibleSection';
import { simulatePhysics } from '../api/client';
import type { PredictResponse } from '../types';

interface Props {
    result: PredictResponse;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

type ReactorType = 'batch' | 'fluidized_bed' | 'rotary_kiln';

export default function PhysicsSimulationPanel({ result }: Props) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reactor, setReactor] = useState<ReactorType>('batch');

    const fetchData = async (rt: ReactorType) => {
        setLoading(true);
        setError(null);
        try {
            const resp = await simulatePhysics({
                plastic_type: result.plastic_type,
                weight_kg: result.weight_kg,
                temperature_c: result.recommended_params?.temperature_c || 500,
                pressure_atm: result.recommended_params?.pressure_bar || 1,
                reactor_type: rt,
            });
            setData(resp.data);
        } catch (e: any) {
            setError(e?.message || 'Failed to fetch physics data');
        }
        setLoading(false);
    };

    useEffect(() => { fetchData(reactor); }, [result.plastic_type, result.weight_kg]);

    const handleReactorChange = (rt: ReactorType) => {
        setReactor(rt);
        fetchData(rt);
    };

    // Build chart data
    const rampData = data?.temperature_ramp?.time_min?.map((t: number, i: number) => ({
        time: +t.toFixed(1),
        temperature: +data.temperature_ramp.temperature_c[i].toFixed(1),
    })) || [];

    const gasData = data?.gas_evolution?.time_min?.map((t: number, i: number) => ({
        time: +t.toFixed(1),
        yield: +data.gas_evolution.cumulative_yield_pct[i].toFixed(2),
    })) || [];

    const charFinal = data?.char_prediction?.final_char_pct;
    const tarPeak = data?.tar_formation?.peak_tar_pct;
    const stabilityIndex = data?.pressure_fluctuation?.stability_index;

    const stabilityColor = stabilityIndex == null
        ? 'bg-border'
        : stabilityIndex >= 0.7
            ? 'bg-success'
            : stabilityIndex >= 0.4
                ? 'bg-warning'
                : 'bg-danger';

    const stabilityLabel = stabilityIndex == null
        ? '—'
        : stabilityIndex >= 0.7
            ? 'Stable'
            : stabilityIndex >= 0.4
                ? 'Moderate'
                : 'Unstable';

    return (
        <CollapsibleSection title="Advanced Physics Simulation" icon={HiOutlineBeaker} accentColor="text-cyan-400" badge="Physics">
            {/* Reactor type selector */}
            <div className="flex items-center gap-3 mb-5">
                <p className="text-xs text-text-muted font-semibold">Reactor Type:</p>
                {(['batch', 'fluidized_bed', 'rotary_kiln'] as ReactorType[]).map((rt) => (
                    <button
                        key={rt}
                        onClick={() => handleReactorChange(rt)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all cursor-pointer ${reactor === rt
                                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 font-semibold'
                                : 'bg-bg-base border-border text-text-muted hover:border-border-hover'
                            }`}
                    >
                        {rt.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </button>
                ))}
            </div>

            {loading && (
                <div className="flex items-center gap-3 py-8 justify-center text-text-muted">
                    <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    Simulating physics…
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
                            <div className="flex items-center gap-2 mb-2">
                                <HiOutlineFire className="text-orange-400 text-sm" />
                                <p className="text-xs text-text-muted">Char Formation</p>
                            </div>
                            <p className="text-xl font-bold text-text-primary">
                                {charFinal != null ? `${charFinal.toFixed(1)}%` : '—'}
                            </p>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                            className="p-4 rounded-xl bg-bg-base border border-border">
                            <p className="text-xs text-text-muted mb-2">Tar Peak</p>
                            <p className="text-xl font-bold text-warning">
                                {tarPeak != null ? `${tarPeak.toFixed(1)}%` : '—'}
                            </p>
                            {data.tar_formation?.peak_tar_time_min != null && (
                                <p className="text-[10px] text-text-muted mt-1">
                                    at {data.tar_formation.peak_tar_time_min.toFixed(0)} min
                                </p>
                            )}
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                            className="p-4 rounded-xl bg-bg-base border border-border">
                            <p className="text-xs text-text-muted mb-2">Reactor</p>
                            <p className="text-base font-bold text-cyan-400 capitalize">
                                {data.reactor_type?.replace(/_/g, ' ') || '—'}
                            </p>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                            className="p-4 rounded-xl bg-bg-base border border-border">
                            <p className="text-xs text-text-muted mb-2">Stability</p>
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${stabilityColor} shadow-lg`}
                                    style={{ boxShadow: `0 0 8px ${stabilityColor === 'bg-success' ? '#10B981' : stabilityColor === 'bg-warning' ? '#FBBF24' : '#EF4444'}40` }}
                                />
                                <p className="text-base font-bold text-text-primary">{stabilityLabel}</p>
                            </div>
                            {stabilityIndex != null && (
                                <p className="text-[10px] text-text-muted mt-1">Index: {stabilityIndex.toFixed(3)}</p>
                            )}
                        </motion.div>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Temperature Ramp */}
                        {rampData.length > 0 && (
                            <div className="p-4 rounded-xl bg-bg-base border border-border">
                                <p className="text-xs text-text-muted mb-3 font-semibold">Temperature Ramp Curve</p>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={rampData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                                        <XAxis dataKey="time" tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} label={{ value: 'Time (min)', position: 'insideBottom', offset: -2, fill: '#71717A', fontSize: 10 }} />
                                        <YAxis tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} />
                                        <Tooltip contentStyle={{ background: '#18181B', border: '1px solid #27272A', borderRadius: 8, fontSize: 12 }} />
                                        <Line type="monotone" dataKey="temperature" stroke="#F97316" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Gas Evolution */}
                        {gasData.length > 0 && (
                            <div className="p-4 rounded-xl bg-bg-base border border-border">
                                <p className="text-xs text-text-muted mb-3 font-semibold">Gas Evolution Curve</p>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={gasData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                                        <XAxis dataKey="time" tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} label={{ value: 'Time (min)', position: 'insideBottom', offset: -2, fill: '#71717A', fontSize: 10 }} />
                                        <YAxis tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} />
                                        <Tooltip contentStyle={{ background: '#18181B', border: '1px solid #27272A', borderRadius: 8, fontSize: 12 }} />
                                        <Line type="monotone" dataKey="yield" stroke="#10B981" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </CollapsibleSection>
    );
}
