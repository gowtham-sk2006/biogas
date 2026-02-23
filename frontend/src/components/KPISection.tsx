import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineBeaker, HiOutlineCloud, HiOutlineShieldCheck } from 'react-icons/hi2';
import type { PredictResponse } from '../types';

function AnimatedCounter({ target, suffix = '', decimals = 1 }: { target: number; suffix?: string; decimals?: number }) {
    const [val, setVal] = useState(0);
    useEffect(() => {
        let frame: number;
        const dur = 1200;
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

const card = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function KPISection({ result }: { result: PredictResponse }) {
    const riskColor = result.risk_level === 'Low' ? 'text-success' : result.risk_level === 'Medium' ? 'text-warning' : 'text-danger';
    const riskBg = result.risk_level === 'Low' ? 'bg-success/10 border-success/20' : result.risk_level === 'Medium' ? 'bg-warning/10 border-warning/20' : 'bg-danger/10 border-danger/20';
    const riskGlow = result.risk_level === 'Low' ? '' : result.risk_level === 'Medium' ? '' : 'glow-pulse-accent';

    const cards = [
        {
            icon: HiOutlineBeaker,
            label: 'Gas Yield',
            value: result.predicted_yield_pct,
            suffix: '%',
            sub: result.sustainability.yield_efficiency,
            accent: 'text-accent',
            bg: 'bg-accent/10 border-accent/20',
        },
        {
            icon: HiOutlineCloud,
            label: 'CO₂ Emission',
            value: result.predicted_emission_g_per_kg,
            suffix: ' g/kg',
            sub: result.sustainability.emission_rating,
            accent: 'text-success',
            bg: 'bg-success/10 border-success/20',
        },
        {
            icon: HiOutlineShieldCheck,
            label: 'Risk Level',
            value: 0,
            text: result.risk_level,
            accent: riskColor,
            bg: riskBg,
            glow: riskGlow,
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
            {cards.map((c, i) => (
                <motion.div
                    key={c.label}
                    variants={card}
                    initial="hidden"
                    animate="show"
                    transition={{ delay: i * 0.1 }}
                    className={`glass-card p-5 border ${c.bg} ${c.glow || ''}`}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
                            <c.icon className={`text-xl ${c.accent}`} />
                        </div>
                        <span className="text-sm text-text-secondary font-medium">{c.label}</span>
                    </div>
                    <div className={`text-3xl font-extrabold ${c.accent}`}>
                        {c.text ? c.text : <AnimatedCounter target={c.value} suffix={c.suffix} />}
                    </div>
                    {c.sub && <span className="text-xs text-text-muted mt-1 block">{c.sub}</span>}
                </motion.div>
            ))}
        </div>
    );
}
