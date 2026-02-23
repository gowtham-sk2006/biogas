import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    HiOutlineCog8Tooth,
    HiOutlineShieldCheck,
} from 'react-icons/hi2';
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, ZAxis,
} from 'recharts';
import CollapsibleSection from './CollapsibleSection';
import { advancedEngineering } from '../api/client';
import type { PredictResponse } from '../types';

interface Props {
    result: PredictResponse;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function EngineeringPanel({ result }: Props) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const resp = await advancedEngineering({
                plastic_type: result.plastic_type,
                weight_kg: result.weight_kg,
                temperature_c: result.recommended_params?.temperature_c || 500,
                pressure_atm: result.recommended_params?.pressure_bar || 1,
            });
            setData(resp.data);
        } catch (e: any) {
            setError(e?.message || 'Failed to fetch engineering data');
        }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [result.plastic_type, result.weight_kg]);

    // Pareto data
    const paretoFront = data?.pareto_optimization?.pareto_front || [];
    const dominatedPts = data?.pareto_optimization?.dominated_points || [];
    const utopia = data?.pareto_optimization?.utopia_point;

    // Safety
    const safety = data?.safety_boundary;
    const stability = data?.stability_zones;

    // Sensitivity heatmap
    const heatmap = data?.sensitivity_heatmap;
    const heatmapRows: { temp: number; pressure: number; yield: number }[] = [];
    if (heatmap) {
        for (let i = 0; i < (heatmap.temperature_range?.length || 0); i++) {
            for (let j = 0; j < (heatmap.pressure_range?.length || 0); j++) {
                heatmapRows.push({
                    temp: heatmap.temperature_range[i],
                    pressure: heatmap.pressure_range[j],
                    yield: heatmap.yield_matrix?.[i]?.[j] || 0,
                });
            }
        }
    }

    const yieldMin = heatmapRows.length ? Math.min(...heatmapRows.map(h => h.yield)) : 0;
    const yieldMax = heatmapRows.length ? Math.max(...heatmapRows.map(h => h.yield)) : 1;

    const getHeatColor = (v: number) => {
        const t = yieldMax === yieldMin ? 0.5 : (v - yieldMin) / (yieldMax - yieldMin);
        const r = Math.round(39 + t * (16 - 39));
        const g = Math.round(39 + t * (185 - 39));
        const b = Math.round(68 + t * (129 - 68));
        return `rgb(${r},${g},${b})`;
    };

    return (
        <CollapsibleSection title="Engineering Optimization" icon={HiOutlineCog8Tooth} accentColor="text-emerald-400" badge="Eng.">
            {loading && (
                <div className="flex items-center gap-3 py-8 justify-center text-text-muted">
                    <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    Running engineering analysis…
                </div>
            )}

            {error && (
                <div className="p-4 rounded-xl bg-danger/10 border border-danger/25 text-sm text-danger">{error}</div>
            )}

            {data && !loading && (
                <div className="space-y-6">
                    {/* Safety + Stability KPIs */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                            className="p-4 rounded-xl bg-bg-base border border-border">
                            <div className="flex items-center gap-2 mb-2">
                                <HiOutlineShieldCheck className={`text-sm ${safety?.is_within_bounds ? 'text-success' : 'text-danger'}`} />
                                <p className="text-xs text-text-muted">Safety</p>
                            </div>
                            <p className={`text-base font-bold ${safety?.is_within_bounds ? 'text-success' : 'text-danger'}`}>
                                {safety?.is_within_bounds ? 'Within Bounds' : 'Outside Bounds'}
                            </p>
                            <p className="text-[10px] text-text-muted mt-1">Margin: {safety?.safety_margin_pct?.toFixed(1)}%</p>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                            className="p-4 rounded-xl bg-bg-base border border-border">
                            <p className="text-xs text-text-muted mb-2">Stability Zone</p>
                            <p className={`text-base font-bold capitalize ${stability?.current_zone === 'safe' ? 'text-success' :
                                    stability?.current_zone === 'marginal' ? 'text-warning' : 'text-danger'
                                }`}>
                                {stability?.current_zone || '—'}
                            </p>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                            className="p-4 rounded-xl bg-bg-base border border-border">
                            <p className="text-xs text-text-muted mb-2">Econ-Env Score</p>
                            <p className="text-xl font-bold text-accent">
                                {data.economic_environmental_score?.combined_score?.toFixed(1) || '—'}
                            </p>
                            <p className="text-[10px] text-text-muted mt-1">
                                Grade: {data.economic_environmental_score?.grade || '—'}
                            </p>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                            className="p-4 rounded-xl bg-bg-base border border-border">
                            <p className="text-xs text-text-muted mb-2">Pareto Points</p>
                            <p className="text-xl font-bold text-text-primary">{paretoFront.length}</p>
                            <p className="text-[10px] text-text-muted mt-1">optimal trade-offs</p>
                        </motion.div>
                    </div>

                    {/* Pareto Front Chart */}
                    {paretoFront.length > 0 && (
                        <div className="p-4 rounded-xl bg-bg-base border border-border">
                            <p className="text-xs text-text-muted mb-3 font-semibold">Pareto Front — Yield vs Emission</p>
                            <ResponsiveContainer width="100%" height={260}>
                                <ScatterChart margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                                    <XAxis dataKey="yield_pct" name="Yield" tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false}
                                        label={{ value: 'Yield %', position: 'insideBottom', offset: -5, fill: '#71717A', fontSize: 10 }} />
                                    <YAxis dataKey="emission_score" name="Emission" tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false}
                                        label={{ value: 'Emission', angle: -90, position: 'insideLeft', fill: '#71717A', fontSize: 10 }} />
                                    <ZAxis range={[40, 40]} />
                                    <Tooltip contentStyle={{ background: '#18181B', border: '1px solid #27272A', borderRadius: 8, fontSize: 12 }} />
                                    {/* Dominated points */}
                                    <Scatter name="Dominated" data={dominatedPts} fill="#3F3F46">
                                        {dominatedPts.map((_: any, i: number) => (
                                            <Cell key={i} fill="#3F3F46" />
                                        ))}
                                    </Scatter>
                                    {/* Pareto front */}
                                    <Scatter name="Pareto Front" data={paretoFront} fill="#10B981">
                                        {paretoFront.map((_: any, i: number) => (
                                            <Cell key={i} fill="#10B981" />
                                        ))}
                                    </Scatter>
                                    {/* Utopia point */}
                                    {utopia && (
                                        <Scatter name="Current" data={[utopia]} fill="#F97316">
                                            <Cell fill="#F97316" />
                                        </Scatter>
                                    )}
                                </ScatterChart>
                            </ResponsiveContainer>
                            <div className="flex gap-4 mt-2 justify-center text-[10px] text-text-muted">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success inline-block" /> Pareto Front</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3F3F46] inline-block" /> Dominated</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent inline-block" /> Current</span>
                            </div>
                        </div>
                    )}

                    {/* Sensitivity Heatmap */}
                    {heatmapRows.length > 0 && (
                        <div className="p-4 rounded-xl bg-bg-base border border-border">
                            <p className="text-xs text-text-muted mb-3 font-semibold">Sensitivity Heatmap (Temp × Pressure → Yield)</p>
                            <div className="overflow-x-auto">
                                <div className="inline-grid gap-0.5" style={{
                                    gridTemplateColumns: `repeat(${heatmap.pressure_range.length}, 1fr)`,
                                }}>
                                    {heatmapRows.map((cell, i) => (
                                        <div
                                            key={i}
                                            className="w-7 h-7 rounded-sm flex items-center justify-center text-[7px] font-bold text-white/80"
                                            style={{ background: getHeatColor(cell.yield) }}
                                            title={`T=${cell.temp}°C, P=${cell.pressure}atm → ${cell.yield.toFixed(1)}%`}
                                        >
                                            {cell.yield.toFixed(0)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-between text-[9px] text-text-muted mt-2">
                                <span>Low yield</span>
                                <span>High yield</span>
                            </div>
                        </div>
                    )}

                    {/* Stability Zone Map */}
                    {stability?.zones?.length > 0 && (
                        <div className="p-4 rounded-xl bg-bg-base border border-border">
                            <p className="text-xs text-text-muted mb-3 font-semibold">Stability Zones</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {stability.zones.map((z: any, i: number) => (
                                    <div key={i} className={`p-3 rounded-lg border ${z.label === 'safe' ? 'border-success/30 bg-success/5' :
                                            z.label === 'marginal' ? 'border-warning/30 bg-warning/5' :
                                                'border-danger/30 bg-danger/5'
                                        }`}>
                                        <p className={`text-xs font-bold capitalize ${z.label === 'safe' ? 'text-success' : z.label === 'marginal' ? 'text-warning' : 'text-danger'
                                            }`}>{z.label}</p>
                                        <p className="text-[10px] text-text-muted mt-1">
                                            T: {z.temp_min_c}–{z.temp_max_c}°C
                                        </p>
                                        <p className="text-[10px] text-text-muted">
                                            P: {z.pressure_min_atm}–{z.pressure_max_atm} atm
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </CollapsibleSection>
    );
}
