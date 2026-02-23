import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineSparkles, HiOutlineCog6Tooth, HiOutlineBeaker, HiOutlineCloud, HiOutlineShieldCheck } from 'react-icons/hi2';
import { predictPyrolysis } from '../api/client';
import type { PredictResponse, PredictPayload } from '../types';

const PLASTIC_TYPES = ['PET', 'HDPE', 'LDPE', 'PP'];

interface Props {
    onResult: (r: PredictResponse) => void;
    onBack: () => void;
}

// Mini KPI preview component
function LivePreview({ result, loading }: { result: PredictResponse | null; loading: boolean }) {
    if (!result && !loading) return null;

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-5 p-4 rounded-xl bg-bg-base border border-border overflow-hidden"
        >
            <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    {loading ? 'Updating...' : 'Live Preview'}
                </span>
            </div>

            {result && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-2 rounded-lg bg-accent/5 border border-accent/10">
                        <HiOutlineBeaker className="text-accent mx-auto mb-1 text-sm" />
                        <p className="text-xs text-text-muted">Yield</p>
                        <motion.p
                            key={result.predicted_yield_pct}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            className="text-base font-bold text-accent"
                        >
                            {result.predicted_yield_pct.toFixed(1)}%
                        </motion.p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-success/5 border border-success/10">
                        <HiOutlineCloud className="text-success mx-auto mb-1 text-sm" />
                        <p className="text-xs text-text-muted">CO₂</p>
                        <motion.p
                            key={result.predicted_emission_g_per_kg}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            className="text-base font-bold text-success"
                        >
                            {result.predicted_emission_g_per_kg.toFixed(1)}
                        </motion.p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-warning/5 border border-warning/10">
                        <HiOutlineShieldCheck className="text-warning mx-auto mb-1 text-sm" />
                        <p className="text-xs text-text-muted">Risk</p>
                        <motion.p
                            key={result.risk_level}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            className={`text-base font-bold ${result.risk_level === 'Low' ? 'text-success' : result.risk_level === 'Medium' ? 'text-warning' : 'text-danger'}`}
                        >
                            {result.risk_level}
                        </motion.p>
                    </div>
                </div>
            )}

            {loading && !result && (
                <div className="flex items-center justify-center py-3">
                    <HiOutlineSparkles className="text-accent animate-spin text-lg" />
                </div>
            )}
        </motion.div>
    );
}

export default function ManualForm({ onResult, onBack }: Props) {
    const [plastic, setPlastic] = useState('HDPE');
    const [weight, setWeight] = useState(5);
    const [condition, setCondition] = useState<'clean' | 'contaminated'>('clean');
    const [mode, setMode] = useState<'auto' | 'manual'>('auto');
    const [temperature, setTemperature] = useState(450);
    const [pressure, setPressure] = useState(5);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [previewResult, setPreviewResult] = useState<PredictResponse | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const runPrediction = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const payload: PredictPayload = { plastic_type: plastic, weight, mode };
            if (mode === 'manual') {
                payload.temperature = temperature;
                payload.pressure = pressure;
            }
            const resp = await predictPyrolysis(payload);
            onResult(resp.data);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Prediction failed');
        }
        setLoading(false);
    }, [plastic, weight, mode, temperature, pressure, onResult]);

    // Real-time slider simulation: debounced auto-predict on parameter changes
    useEffect(() => {
        if (mode !== 'manual') return;

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(async () => {
            setPreviewLoading(true);
            try {
                const payload: PredictPayload = {
                    plastic_type: plastic,
                    weight,
                    mode: 'manual',
                    temperature,
                    pressure,
                };
                const resp = await predictPyrolysis(payload);
                setPreviewResult(resp.data);
            } catch {
                // silently fail for preview — no user error needed
            }
            setPreviewLoading(false);
        }, 600);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [plastic, weight, temperature, pressure, mode]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl mx-auto"
        >
            <div className="glass-card p-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                            <HiOutlineCog6Tooth className="text-accent text-xl" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Manual Configuration</h2>
                            <p className="text-text-muted text-sm">Enter process parameters directly</p>
                        </div>
                    </div>
                    <button onClick={onBack} className="btn-secondary text-xs py-1.5 px-3">← Back</button>
                </div>

                <div className="space-y-6">
                    {/* Plastic Type */}
                    <div>
                        <label className="text-sm text-text-secondary font-medium block mb-2">Plastic Type</label>
                        <div className="grid grid-cols-4 gap-2">
                            {PLASTIC_TYPES.map(t => (
                                <button
                                    key={t}
                                    onClick={() => setPlastic(t)}
                                    className={`py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${plastic === t
                                        ? 'bg-accent text-bg-base shadow-[0_0_14px_rgba(249,115,22,0.3)]'
                                        : 'bg-bg-base border border-border text-text-secondary hover:border-accent/40'
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Weight */}
                    <div>
                        <label className="text-sm text-text-secondary font-medium block mb-2">
                            Weight: <span className="text-accent font-bold">{weight} kg</span>
                        </label>
                        <input
                            type="range"
                            min={0.5}
                            max={50}
                            step={0.5}
                            value={weight}
                            onChange={e => setWeight(+e.target.value)}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-text-muted mt-1">
                            <span>0.5 kg</span><span>50 kg</span>
                        </div>
                    </div>

                    {/* Condition */}
                    <div>
                        <label className="text-sm text-text-secondary font-medium block mb-2">Condition</label>
                        <div className="grid grid-cols-2 gap-2">
                            {(['clean', 'contaminated'] as const).map(c => (
                                <button
                                    key={c}
                                    onClick={() => setCondition(c)}
                                    className={`py-2.5 rounded-xl text-sm font-semibold capitalize transition-all cursor-pointer ${condition === c
                                        ? 'bg-accent text-bg-base'
                                        : 'bg-bg-base border border-border text-text-secondary hover:border-accent/40'
                                        }`}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Mode Toggle */}
                    <div>
                        <label className="text-sm text-text-secondary font-medium block mb-2">Optimization Mode</label>
                        <div className="grid grid-cols-2 gap-2">
                            {(['auto', 'manual'] as const).map(m => (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    className={`py-2.5 rounded-xl text-sm font-semibold capitalize transition-all cursor-pointer ${mode === m
                                        ? 'bg-accent text-bg-base'
                                        : 'bg-bg-base border border-border text-text-secondary hover:border-accent/40'
                                        }`}
                                >
                                    {m === 'auto' ? '⚡ Auto' : '🔧 Manual'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Manual Sliders */}
                    <AnimatePresence>
                        {mode === 'manual' && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-5 overflow-hidden">
                                <div>
                                    <label className="text-sm text-text-secondary font-medium block mb-2">
                                        Temperature: <span className="text-accent font-bold">{temperature}°C</span>
                                    </label>
                                    <input
                                        type="range"
                                        min={300}
                                        max={600}
                                        step={5}
                                        value={temperature}
                                        onChange={e => setTemperature(+e.target.value)}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-text-muted mt-1">
                                        <span>300°C</span><span>600°C</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm text-text-secondary font-medium block mb-2">
                                        Pressure: <span className="text-accent font-bold">{pressure} bar</span>
                                    </label>
                                    <input
                                        type="range"
                                        min={1}
                                        max={10}
                                        step={0.5}
                                        value={pressure}
                                        onChange={e => setPressure(+e.target.value)}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-text-muted mt-1">
                                        <span>1 bar</span><span>10 bar</span>
                                    </div>
                                </div>

                                {/* Live Preview */}
                                <LivePreview result={previewResult} loading={previewLoading} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {error && (
                        <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">{error}</div>
                    )}

                    <button
                        onClick={runPrediction}
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
                    >
                        {loading ? <HiOutlineSparkles className="animate-spin" /> : <HiOutlineSparkles />}
                        {loading ? 'Analyzing…' : 'Run Prediction'}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
