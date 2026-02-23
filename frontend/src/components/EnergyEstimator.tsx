import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineBolt, HiOutlineFire, HiOutlineHomeModern } from 'react-icons/hi2';
import type { PredictResponse } from '../types';

function AnimatedCounter({ target, decimals = 1, suffix = '' }: { target: number; decimals?: number; suffix?: string }) {
    const [val, setVal] = useState(0);
    useEffect(() => {
        let frame: number;
        const dur = 1400;
        const start = performance.now();
        const animate = (now: number) => {
            const progress = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setVal(target * eased);
            if (progress < 1) frame = requestAnimationFrame(animate);
        };
        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
    }, [target]);
    return <>{val.toFixed(decimals)}{suffix}</>;
}

// Energy conversion: 1 MJ = 0.2778 kWh
// Average household uses ~30 kWh/day
const MJ_TO_KWH = 0.2778;
const AVG_HOUSEHOLD_KWH_PER_DAY = 30;

export default function EnergyEstimator({ result }: { result: PredictResponse }) {
    const weight = result.weight_kg;
    const yieldFraction = result.predicted_yield_pct / 100;
    const calorific = result.material_info?.calorific_value_mj_kg || 40;

    // Gas volume estimate: ~0.8 m³ gas per kg of plastic at 100% yield
    const gasVolume = weight * yieldFraction * 0.8;
    // Energy = calorific value × weight × yield fraction → MJ → kWh
    const energyMJ = calorific * weight * yieldFraction;
    const energyKWh = energyMJ * MJ_TO_KWH;
    // Household equivalent
    const householdDays = energyKWh / AVG_HOUSEHOLD_KWH_PER_DAY;

    const cards = [
        {
            icon: HiOutlineFire,
            label: 'Gas Volume',
            value: gasVolume,
            decimals: 1,
            suffix: ' m³',
            color: 'text-accent',
            bg: 'bg-accent/10 border-accent/20',
        },
        {
            icon: HiOutlineBolt,
            label: 'Energy Output',
            value: energyKWh,
            decimals: 1,
            suffix: ' kWh',
            color: 'text-success',
            bg: 'bg-success/10 border-success/20',
        },
        {
            icon: HiOutlineHomeModern,
            label: 'Household Equiv.',
            value: householdDays,
            decimals: 1,
            suffix: ' days',
            color: 'text-warning',
            bg: 'bg-warning/10 border-warning/20',
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="mb-6"
        >
            <h3 className="font-bold text-sm text-text-secondary mb-3 flex items-center gap-2">
                <HiOutlineBolt className="text-accent" /> Energy Recovery Estimate
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {cards.map((c, i) => (
                    <motion.div
                        key={c.label}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.0 + i * 0.1 }}
                        className={`glass-card p-5 border ${c.bg}`}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center`}>
                                <c.icon className={`text-lg ${c.color}`} />
                            </div>
                            <span className="text-sm text-text-secondary font-medium">{c.label}</span>
                        </div>
                        <div className={`text-2xl font-extrabold ${c.color}`}>
                            <AnimatedCounter target={c.value} decimals={c.decimals} suffix={c.suffix} />
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}
