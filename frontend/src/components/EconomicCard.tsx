import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    HiOutlineBanknotes,
    HiOutlineCurrencyDollar,
    HiOutlineArrowTrendingUp,
    HiOutlineArrowTrendingDown,
} from 'react-icons/hi2';
import type { PredictResponse } from '../types';

function AnimatedCounter({ target, prefix = '', suffix = '', decimals = 2 }: { target: number; prefix?: string; suffix?: string; decimals?: number }) {
    const [val, setVal] = useState(0);
    useEffect(() => {
        let frame: number;
        const dur = 1200;
        const start = performance.now();
        const tick = (now: number) => {
            const p = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setVal(target * eased);
            if (p < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [target]);
    return <>{prefix}{val.toFixed(decimals)}{suffix}</>;
}

// Price assumptions
const ENERGY_PRICE_PER_KWH = 0.12; // $/kWh for pyrolysis oil energy
const OPERATION_COST_PER_KG = 0.08; // $/kg feedstock processing cost
const MJ_TO_KWH = 0.2778;

export default function EconomicCard({ result }: { result: PredictResponse }) {
    const weight = result.weight_kg;
    const yieldFraction = result.predicted_yield_pct / 100;
    const calorific = result.material_info?.calorific_value_mj_kg || 40;

    const energyKWh = calorific * weight * yieldFraction * MJ_TO_KWH;
    const revenue = energyKWh * ENERGY_PRICE_PER_KWH;
    const cost = weight * OPERATION_COST_PER_KG;
    const netValue = revenue - cost;
    const isProfit = netValue >= 0;

    return (
        <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.1, type: 'spring', stiffness: 120 }}
            className="glass-card p-6 mb-6"
        >
            <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
                    <HiOutlineBanknotes className="text-accent text-lg" />
                </div>
                <div>
                    <h3 className="font-bold text-sm">Economic Feasibility</h3>
                    <p className="text-xs text-text-muted">Estimated financial summary</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
                {/* Revenue */}
                <div className="p-4 rounded-xl bg-bg-base border border-success/20 text-center">
                    <HiOutlineCurrencyDollar className="text-success text-lg mx-auto mb-1" />
                    <p className="text-xs text-text-muted mb-1">Revenue</p>
                    <p className="text-lg font-extrabold text-success">
                        <AnimatedCounter target={revenue} prefix="$" />
                    </p>
                </div>

                {/* Cost */}
                <div className="p-4 rounded-xl bg-bg-base border border-danger/20 text-center">
                    <HiOutlineBanknotes className="text-danger text-lg mx-auto mb-1" />
                    <p className="text-xs text-text-muted mb-1">Op. Cost</p>
                    <p className="text-lg font-extrabold text-danger">
                        <AnimatedCounter target={cost} prefix="$" />
                    </p>
                </div>

                {/* Net */}
                <div className={`p-4 rounded-xl border text-center ${isProfit ? 'bg-success/5 border-success/30' : 'bg-danger/5 border-danger/30'}`}>
                    {isProfit
                        ? <HiOutlineArrowTrendingUp className="text-success text-lg mx-auto mb-1" />
                        : <HiOutlineArrowTrendingDown className="text-danger text-lg mx-auto mb-1" />
                    }
                    <p className="text-xs text-text-muted mb-1">Net Value</p>
                    <p className={`text-lg font-extrabold ${isProfit ? 'text-success' : 'text-danger'}`}>
                        <AnimatedCounter target={netValue} prefix={isProfit ? '+$' : '-$'} />
                    </p>
                </div>
            </div>

            <p className="text-[10px] text-text-muted text-center">
                Based on energy price ${ENERGY_PRICE_PER_KWH}/kWh · operational cost ${OPERATION_COST_PER_KG}/kg
            </p>
        </motion.div>
    );
}
