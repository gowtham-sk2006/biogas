import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineGlobeAmericas,
    HiOutlineChevronDown,
    HiOutlineArrowTrendingDown,
    HiOutlineArrowTrendingUp,
} from 'react-icons/hi2';
import type { PredictResponse } from '../types';

// Landfill emission factor: ~2.53 kg CO₂ per kg of plastic waste (EPA average)
const LANDFILL_CO2_FACTOR = 2.53;

export default function CarbonImpactCard({ result }: { result: PredictResponse }) {
    const [open, setOpen] = useState(true);

    const weight = result.weight_kg;
    const landfillCO2 = weight * LANDFILL_CO2_FACTOR;
    const pyrolysisCO2 = (result.predicted_emission_g_per_kg * weight) / 1000;
    const netReduction = landfillCO2 - pyrolysisCO2;
    const reductionPct = landfillCO2 > 0 ? (netReduction / landfillCO2) * 100 : 0;
    const isPositive = netReduction > 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="glass-card mb-6 overflow-hidden"
        >
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-bg-card-hover transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl ${isPositive ? 'bg-success/15' : 'bg-danger/15'} flex items-center justify-center`}>
                        <HiOutlineGlobeAmericas className={`text-lg ${isPositive ? 'text-success' : 'text-danger'}`} />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-sm">Carbon Impact Comparison</h3>
                        <p className="text-xs text-text-muted">Landfill vs Pyrolysis CO₂ footprint</p>
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
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6 space-y-4">
                            {/* Comparison Bars */}
                            <div className="space-y-3">
                                {/* Landfill */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs text-text-secondary">🗑️ Landfill Disposal</span>
                                        <span className="text-sm font-bold text-danger">{landfillCO2.toFixed(2)} kg CO₂</span>
                                    </div>
                                    <div className="h-3 bg-bg-base rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: '100%' }}
                                            transition={{ duration: 1, ease: 'easeOut' }}
                                            className="h-full rounded-full bg-gradient-to-r from-danger/60 to-danger"
                                        />
                                    </div>
                                </div>

                                {/* Pyrolysis */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs text-text-secondary">♻️ Pyrolysis Process</span>
                                        <span className="text-sm font-bold text-accent">{pyrolysisCO2.toFixed(2)} kg CO₂</span>
                                    </div>
                                    <div className="h-3 bg-bg-base rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${landfillCO2 > 0 ? (pyrolysisCO2 / landfillCO2) * 100 : 0}%` }}
                                            transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                                            className="h-full rounded-full bg-gradient-to-r from-accent/60 to-accent"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Net Reduction Card */}
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className={`p-4 rounded-xl border text-center ${isPositive
                                    ? 'bg-success/5 border-success/20'
                                    : 'bg-danger/5 border-danger/20'
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    {isPositive
                                        ? <HiOutlineArrowTrendingDown className="text-success text-xl" />
                                        : <HiOutlineArrowTrendingUp className="text-danger text-xl" />
                                    }
                                    <span className={`text-2xl font-extrabold ${isPositive ? 'text-success' : 'text-danger'}`}>
                                        {isPositive ? '-' : '+'}{Math.abs(netReduction).toFixed(2)} kg CO₂
                                    </span>
                                </div>
                                <p className="text-xs text-text-muted">
                                    {isPositive
                                        ? `${reductionPct.toFixed(0)}% carbon reduction compared to landfill`
                                        : 'Higher emissions than landfill — consider optimizing parameters'
                                    }
                                </p>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
