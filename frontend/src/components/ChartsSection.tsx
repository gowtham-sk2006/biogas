import { motion } from 'framer-motion';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot,
} from 'recharts';
import type { PredictResponse } from '../types';

function generateSweep(plastic: string) {
    const base: Record<string, { yBase: number; eBase: number }> = {
        PET: { yBase: 38, eBase: 185 },
        HDPE: { yBase: 48, eBase: 60 },
        LDPE: { yBase: 42, eBase: 92 },
        PP: { yBase: 44, eBase: 78 },
    };
    const { yBase, eBase } = base[plastic] || base['HDPE'];
    const data = [];
    for (let t = 300; t <= 600; t += 20) {
        const norm = (t - 300) / 300;
        const yieldVal = yBase * (0.3 + 1.4 * norm - 0.7 * norm * norm) + (Math.random() - 0.5) * 2;
        const emissionVal = eBase * (0.4 + 0.8 * norm + 0.2 * norm * norm) + (Math.random() - 0.5) * 5;
        data.push({
            temp: t,
            yield: +Math.min(65, Math.max(8, yieldVal)).toFixed(1),
            emission: +Math.min(300, Math.max(30, emissionVal)).toFixed(1),
        });
    }
    return data;
}

export default function ChartsSection({ result }: { result: PredictResponse }) {
    const sweepData = generateSweep(result.plastic_type);
    const optTemp = result.recommended_params.temperature_c;
    const optPoint = sweepData.reduce((best, d) => (Math.abs(d.temp - optTemp) < Math.abs(best.temp - optTemp) ? d : best), sweepData[0]);

    const customTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload) return null;
        return (
            <div className="glass-card p-3 text-xs !border-border">
                <p className="font-semibold text-text-primary mb-1">{label}°C</p>
                {payload.map((p: any) => (
                    <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value}</p>
                ))}
            </div>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6"
        >
            {/* Yield vs Temperature */}
            <div className="glass-card p-5">
                <h4 className="font-semibold text-sm mb-4 text-text-secondary">Yield vs Temperature</h4>
                <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={sweepData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                        <XAxis dataKey="temp" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} />
                        <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} />
                        <Tooltip content={customTooltip} />
                        <Line type="monotone" dataKey="yield" name="Yield %" stroke="#F97316" strokeWidth={2.5} dot={false} animationDuration={1500} />
                        <ReferenceDot x={optPoint.temp} y={optPoint.yield} r={6} fill="#10B981" stroke="#09090B" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
                <p className="text-xs text-text-muted text-center mt-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-success mr-1" />
                    Optimal: {optPoint.temp}°C → {optPoint.yield}%
                </p>
            </div>

            {/* Emission vs Temperature */}
            <div className="glass-card p-5">
                <h4 className="font-semibold text-sm mb-4 text-text-secondary">Emission vs Temperature</h4>
                <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={sweepData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="temp" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} />
                        <YAxis tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} />
                        <Tooltip content={customTooltip} />
                        <Line type="monotone" dataKey="emission" name="Emission g/kg" stroke="#F59E0B" strokeWidth={2.5} dot={false} animationDuration={1500} />
                        <ReferenceDot x={optPoint.temp} y={optPoint.emission} r={6} fill="#EF4444" stroke="#09090B" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
                <p className="text-xs text-text-muted text-center mt-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-danger mr-1" />
                    At optimal: {optPoint.emission} g/kg
                </p>
            </div>
        </motion.div>
    );
}
