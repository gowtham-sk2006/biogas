import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { PredictResponse } from '../types';

// Typical pyrolysis gas composition by plastic type (volume %)
const GAS_PROFILES: Record<string, { ch4: number; h2: number; co: number; co2: number }> = {
    PET: { ch4: 15, h2: 8, co: 22, co2: 55 },
    HDPE: { ch4: 45, h2: 20, co: 15, co2: 20 },
    LDPE: { ch4: 42, h2: 18, co: 17, co2: 23 },
    PP: { ch4: 48, h2: 22, co: 13, co2: 17 },
};

const COLORS = ['#F97316', '#10B981', '#3B82F6', '#8B5CF6'];

function AnimatedNum({ target, suffix = '%' }: { target: number; suffix?: string }) {
    const [v, setV] = useState(0);
    useEffect(() => {
        let frame: number;
        const start = performance.now();
        const tick = (now: number) => {
            const p = Math.min((now - start) / 1000, 1);
            setV(target * (1 - Math.pow(1 - p, 3)));
            if (p < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [target]);
    return <>{v.toFixed(1)}{suffix}</>;
}

export default function GasCompositionCard({ result }: { result: PredictResponse }) {
    const profile = GAS_PROFILES[result.plastic_type] || GAS_PROFILES['HDPE'];
    const data = [
        { name: 'Methane (CH₄)', value: profile.ch4 },
        { name: 'Hydrogen (H₂)', value: profile.h2 },
        { name: 'Carbon Monoxide', value: profile.co },
        { name: 'Carbon Dioxide', value: profile.co2 },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 }}
            className="glass-card p-5"
        >
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                <span>🧪</span> Gas Composition — {result.plastic_type}
            </h3>

            <div className="flex items-center gap-4">
                {/* Pie */}
                <div className="w-36 h-36 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={30}
                                outerRadius={55}
                                paddingAngle={3}
                                dataKey="value"
                                animationBegin={0}
                                animationDuration={1200}
                            >
                                {data.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ background: '#181818', border: '1px solid #333', borderRadius: 10, fontSize: 11 }}
                                formatter={(val: any) => [`${val}%`, '']}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="space-y-2 flex-1">
                    {data.map((d, i) => (
                        <div key={d.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
                                <span className="text-xs text-text-secondary">{d.name}</span>
                            </div>
                            <span className="text-xs font-bold text-text-primary">
                                <AnimatedNum target={d.value} />
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
