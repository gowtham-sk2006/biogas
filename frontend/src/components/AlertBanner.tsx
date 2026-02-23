import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineExclamationTriangle, HiOutlineLightBulb } from 'react-icons/hi2';
import type { PredictResponse } from '../types';

const EMISSION_THRESHOLD = 150; // g/kg

export default function AlertBanner({ result }: { result: PredictResponse }) {
    const highEmission = result.predicted_emission_g_per_kg > EMISSION_THRESHOLD;
    const highRisk = result.risk_level === 'High';
    const show = highEmission || highRisk;

    const currentTemp = result.recommended_params?.temperature_c || 450;
    const suggestedTemp = currentTemp - 10;

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: -20, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -20, height: 0 }}
                    className="mb-6 overflow-hidden"
                >
                    <div className="relative rounded-2xl overflow-hidden">
                        {/* Animated pulse background */}
                        <div className="absolute inset-0 bg-danger/8 animate-pulse" style={{ animationDuration: '3s' }} />

                        <div className="relative p-4 border border-danger/25 rounded-2xl flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-danger/15 flex items-center justify-center flex-shrink-0">
                                <HiOutlineExclamationTriangle className="text-danger text-xl" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-bold text-danger">
                                        {highRisk ? '⚠ High Risk Alert' : '⚠ High Emission Warning'}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-danger/15 text-danger font-medium">
                                        {result.predicted_emission_g_per_kg.toFixed(0)} g/kg
                                    </span>
                                </div>
                                <p className="text-xs text-text-secondary">
                                    {highEmission
                                        ? `Emission exceeds ${EMISSION_THRESHOLD} g/kg threshold. `
                                        : 'Risk level is elevated. '}
                                    {highRisk && 'Process conditions pose significant safety concerns. '}
                                </p>
                            </div>

                            <div className="flex-shrink-0 p-3 rounded-xl bg-success/8 border border-success/20">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <HiOutlineLightBulb className="text-success text-sm" />
                                    <span className="text-[10px] font-bold text-success">SUGGESTION</span>
                                </div>
                                <p className="text-xs text-text-secondary">
                                    Reduce temperature to <span className="font-bold text-success">{suggestedTemp}°C</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
