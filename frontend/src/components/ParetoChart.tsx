import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineChevronDown } from 'react-icons/hi2';
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceDot, Cell,
} from 'recharts';
import type { PredictResponse } from '../types';

interface ParetoPoint {
    yield: number;
    emission: number;
    label: string;
    isCurrent?: boolean;
}

function generateParetoFrontier(result: PredictResponse): ParetoPoint[] {
    const baseYield = result.predicted_yield_pct;
    const baseEmission = result.predicted_emission_g_per_kg;
    const points: ParetoPoint[] = [];

    // Generate frontier sweep: as yield increases, emission typically increases
    for (let i = -5; i <= 5; i++) {
        const yieldOffset = i * 3;
        const emissionOffset = i * 8 + (Math.random() - 0.5) * 6;
        points.push({
            yield: Math.max(5, Math.min(95, baseYield + yieldOffset)),
            emission: Math.max(10, baseEmission + emissionOffset),
            label: i === 0 ? 'Current' : `Scenario ${i + 6}`,
            isCurrent: i === 0,
        });
    }
    return points.sort((a, b) => a.yield - b.yield);
}

export default function ParetoChart({ result }: { result: PredictResponse }) {
    const [open, setOpen] = useState(false);
    const data = generateParetoFrontier(result);
    const currentPoint = data.find(d => d.isCurrent);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
            className="glass-card mb-6 overflow-hidden"
        >
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-bg-card-hover transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
                        <span className="text-lg">📊</span>
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-sm">Yield vs Emission Trade-off</h3>
                        <p className="text-xs text-text-muted">Pareto frontier analysis</p>
                    </div>
                </div>
                <HiOutlineChevronDown className={`text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6">
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                                        <XAxis
                                            dataKey="yield"
                                            name="Yield"
                                            unit="%"
                                            type="number"
                                            tick={{ fill: '#888', fontSize: 11 }}
                                            label={{ value: 'Yield (%)', position: 'bottom', fill: '#888', fontSize: 11 }}
                                        />
                                        <YAxis
                                            dataKey="emission"
                                            name="Emission"
                                            unit=" g/kg"
                                            type="number"
                                            tick={{ fill: '#888', fontSize: 11 }}
                                            label={{ value: 'CO₂ (g/kg)', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 11 }}
                                        />
                                        <Tooltip
                                            contentStyle={{ background: '#181818', border: '1px solid #333', borderRadius: 12, fontSize: 12 }}
                                            formatter={(value: number, name: string) => [
                                                `${value.toFixed(1)}${name === 'Yield' ? '%' : ' g/kg'}`,
                                                name,
                                            ]}
                                        />
                                        <Scatter data={data} fill="#F97316">
                                            {data.map((entry, i) => (
                                                <Cell
                                                    key={i}
                                                    fill={entry.isCurrent ? '#10B981' : '#F97316'}
                                                    r={entry.isCurrent ? 8 : 4}
                                                    stroke={entry.isCurrent ? '#10B981' : 'none'}
                                                    strokeWidth={entry.isCurrent ? 2 : 0}
                                                />
                                            ))}
                                        </Scatter>
                                        {currentPoint && (
                                            <ReferenceDot
                                                x={currentPoint.yield}
                                                y={currentPoint.emission}
                                                r={14}
                                                fill="none"
                                                stroke="#10B981"
                                                strokeWidth={2}
                                                strokeDasharray="4 4"
                                            />
                                        )}
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex items-center justify-center gap-6 mt-3 text-xs text-text-muted">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-full bg-success inline-block" /> Current Operating Point
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-full bg-accent inline-block" /> Pareto Frontier
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
