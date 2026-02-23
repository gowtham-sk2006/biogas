import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineChevronDown } from 'react-icons/hi2';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { PredictResponse } from '../types';

// Emission factors (kg CO₂ per kg plastic waste)
const LANDFILL_FACTOR = 2.53;
const INCINERATION_FACTOR = 2.89;

const COLORS = { landfill: '#EF4444', incineration: '#EAB308', pyrolysis: '#10B981' };

export default function LifecycleComparison({ result }: { result: PredictResponse }) {
    const [open, setOpen] = useState(false);

    const weight = result.weight_kg;
    const pyrolysisCO2 = (result.predicted_emission_g_per_kg * weight) / 1000;
    const landfillCO2 = weight * LANDFILL_FACTOR;
    const incinerationCO2 = weight * INCINERATION_FACTOR;

    const data = [
        { method: 'Landfill', co2: landfillCO2, color: COLORS.landfill },
        { method: 'Incineration', co2: incinerationCO2, color: COLORS.incineration },
        { method: 'Pyrolysis', co2: pyrolysisCO2, color: COLORS.pyrolysis },
    ];

    const bestMethod = data.reduce((a, b) => (a.co2 < b.co2 ? a : b));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="glass-card mb-6 overflow-hidden"
        >
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-bg-card-hover transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-success/15 flex items-center justify-center">
                        <span className="text-lg">🌍</span>
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-sm">Lifecycle Comparison</h3>
                        <p className="text-xs text-text-muted">Landfill vs Incineration vs Pyrolysis</p>
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
                            <div className="h-52">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1E1E1E" />
                                        <XAxis dataKey="method" tick={{ fill: '#888', fontSize: 11 }} />
                                        <YAxis
                                            tick={{ fill: '#888', fontSize: 11 }}
                                            label={{ value: 'kg CO₂', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 11 }}
                                        />
                                        <Tooltip
                                            contentStyle={{ background: '#181818', border: '1px solid #333', borderRadius: 12, fontSize: 12 }}
                                            formatter={(val: any) => [`${Number(val).toFixed(2)} kg CO₂`, 'Emission']}
                                        />
                                        <Bar dataKey="co2" radius={[6, 6, 0, 0]} animationDuration={1200}>
                                            {data.map((entry, i) => (
                                                <Cell key={i} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="mt-3 p-3 rounded-xl bg-success/5 border border-success/20 text-center">
                                <p className="text-xs text-text-secondary">
                                    <span className="font-bold text-success">{bestMethod.method}</span> produces the lowest emissions at{' '}
                                    <span className="font-bold text-success">{bestMethod.co2.toFixed(2)} kg CO₂</span> for {weight} kg of {result.plastic_type}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
