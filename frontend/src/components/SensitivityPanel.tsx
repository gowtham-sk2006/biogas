import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineChevronDown, HiOutlineAdjustmentsVertical } from 'react-icons/hi2';
import { predictPyrolysis } from '../api/client';
import type { PredictResponse, PredictPayload } from '../types';

function AnimVal({ value, suffix = '', color = 'text-text-primary' }: { value: number; suffix?: string; color?: string }) {
    return (
        <motion.span
            key={value.toFixed(1)}
            initial={{ scale: 1.15, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`font-bold ${color}`}
        >
            {value.toFixed(1)}{suffix}
        </motion.span>
    );
}

export default function SensitivityPanel({ result }: { result: PredictResponse }) {
    const [open, setOpen] = useState(false);
    const [tempOffset, setTempOffset] = useState(0);
    const [pressureOffset, setPressureOffset] = useState(0);
    const [preview, setPreview] = useState<PredictResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const baseTemp = result.recommended_params?.temperature_c || 450;
    const basePressure = result.recommended_params?.pressure_bar || 5;

    useEffect(() => {
        if (tempOffset === 0 && pressureOffset === 0) {
            setPreview(null);
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const payload: PredictPayload = {
                    plastic_type: result.plastic_type,
                    weight: result.weight_kg,
                    mode: 'manual',
                    temperature: baseTemp + tempOffset,
                    pressure: basePressure + pressureOffset,
                };
                const resp = await predictPyrolysis(payload);
                setPreview(resp.data);
            } catch {
                // silent fail
            }
            setLoading(false);
        }, 500);

        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [tempOffset, pressureOffset, result.plastic_type, result.weight_kg, baseTemp, basePressure]);

    const yieldDelta = preview ? preview.predicted_yield_pct - result.predicted_yield_pct : 0;
    const emissionDelta = preview ? preview.predicted_emission_g_per_kg - result.predicted_emission_g_per_kg : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="glass-card mb-6 overflow-hidden"
        >
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-bg-card-hover transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
                        <HiOutlineAdjustmentsVertical className="text-accent text-lg" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-sm">Sensitivity Analysis</h3>
                        <p className="text-xs text-text-muted">Adjust ±10°C / ±2 bar to see live impact</p>
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
                        <div className="px-6 pb-6 space-y-5">
                            {/* Temperature slider */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-text-secondary font-medium">
                                        Temperature Offset: <span className="text-accent font-bold">{tempOffset >= 0 ? '+' : ''}{tempOffset}°C</span>
                                    </span>
                                    <span className="text-xs text-text-muted">{baseTemp + tempOffset}°C</span>
                                </div>
                                <input
                                    type="range"
                                    min={-10}
                                    max={10}
                                    step={1}
                                    value={tempOffset}
                                    onChange={e => setTempOffset(+e.target.value)}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
                                    <span>-10°C</span><span>0</span><span>+10°C</span>
                                </div>
                            </div>

                            {/* Pressure slider */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-text-secondary font-medium">
                                        Pressure Offset: <span className="text-accent font-bold">{pressureOffset >= 0 ? '+' : ''}{pressureOffset} bar</span>
                                    </span>
                                    <span className="text-xs text-text-muted">{(basePressure + pressureOffset).toFixed(1)} bar</span>
                                </div>
                                <input
                                    type="range"
                                    min={-2}
                                    max={2}
                                    step={0.5}
                                    value={pressureOffset}
                                    onChange={e => setPressureOffset(+e.target.value)}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
                                    <span>-2 bar</span><span>0</span><span>+2 bar</span>
                                </div>
                            </div>

                            {/* Live Impact Preview */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className={`p-4 rounded-xl border text-center ${yieldDelta >= 0 ? 'bg-success/5 border-success/20' : 'bg-danger/5 border-danger/20'}`}>
                                    <p className="text-xs text-text-muted mb-1">Yield Change</p>
                                    {loading ? (
                                        <span className="text-sm text-text-muted">…</span>
                                    ) : preview ? (
                                        <AnimVal
                                            value={yieldDelta}
                                            suffix="%"
                                            color={yieldDelta >= 0 ? 'text-success' : 'text-danger'}
                                        />
                                    ) : (
                                        <span className="text-sm text-text-muted">±0.0%</span>
                                    )}
                                </div>
                                <div className={`p-4 rounded-xl border text-center ${emissionDelta <= 0 ? 'bg-success/5 border-success/20' : 'bg-danger/5 border-danger/20'}`}>
                                    <p className="text-xs text-text-muted mb-1">Emission Change</p>
                                    {loading ? (
                                        <span className="text-sm text-text-muted">…</span>
                                    ) : preview ? (
                                        <AnimVal
                                            value={emissionDelta}
                                            suffix=" g/kg"
                                            color={emissionDelta <= 0 ? 'text-success' : 'text-danger'}
                                        />
                                    ) : (
                                        <span className="text-sm text-text-muted">±0.0 g/kg</span>
                                    )}
                                </div>
                            </div>

                            {/* Reset */}
                            {(tempOffset !== 0 || pressureOffset !== 0) && (
                                <button
                                    onClick={() => { setTempOffset(0); setPressureOffset(0); }}
                                    className="text-xs text-accent hover:underline cursor-pointer mx-auto block"
                                >
                                    Reset to baseline
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
