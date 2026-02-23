import { motion } from 'framer-motion';
import { HiOutlineFire, HiOutlineClock, HiOutlineBolt } from 'react-icons/hi2';
import type { PredictResponse } from '../types';

function ProgressRing({ value, size = 120, strokeWidth = 8 }: { value: number; size?: number; strokeWidth?: number }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;
    const color = value >= 75 ? '#10B981' : value >= 50 ? '#F97316' : value >= 25 ? '#FBBF24' : '#EF4444';

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle className="progress-ring-bg" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
                <motion.circle
                    className="progress-ring-fg"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    stroke={color}
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-text-primary">{value}</span>
                <span className="text-[10px] text-text-muted mt-0.5">/ 100</span>
            </div>
        </div>
    );
}

export default function OptimizationSummary({ result }: { result: PredictResponse }) {
    const { recommended_params: rp, sustainability: s } = result;

    const items = [
        { icon: HiOutlineFire, label: 'Rec. Temperature', value: `${rp.temperature_c}°C`, accent: 'text-accent' },
        { icon: HiOutlineFire, label: 'Rec. Pressure', value: `${rp.pressure_bar} bar`, accent: 'text-accent' },
        { icon: HiOutlineClock, label: 'Reaction Time', value: `${rp.reaction_time_min} min`, accent: 'text-warning' },
        { icon: HiOutlineBolt, label: 'Efficiency', value: `${rp.efficiency_pct}%`, accent: 'text-success' },
    ];

    const gradeColor = s.grade === 'A' ? 'text-success' : s.grade === 'B' ? 'text-accent' : s.grade === 'C' ? 'text-warning' : 'text-danger';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6 mb-6"
        >
            <h3 className="font-bold text-lg mb-5">Optimization Summary</h3>

            <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Progress Ring */}
                <div className="flex flex-col items-center gap-2">
                    <ProgressRing value={s.score} />
                    <span className="text-xs text-text-muted">Sustainability Score</span>
                    <span className={`text-lg font-extrabold ${gradeColor}`}>Grade {s.grade}</span>
                </div>

                {/* Parameters Grid */}
                <div className="flex-1 grid grid-cols-2 gap-4 w-full">
                    {items.map((it, i) => (
                        <motion.div
                            key={it.label}
                            initial={{ opacity: 0, x: -15 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + i * 0.08 }}
                            className="p-4 rounded-xl bg-bg-base border border-border"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <it.icon className={`text-sm ${it.accent}`} />
                                <span className="text-xs text-text-muted">{it.label}</span>
                            </div>
                            <p className={`text-lg font-bold ${it.accent}`}>{it.value}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
