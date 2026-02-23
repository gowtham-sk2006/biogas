import { useState } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineArrowPath, HiOutlineSparkles } from 'react-icons/hi2';
import { predictPyrolysis } from '../api/client';
import type { PredictResponse, PredictPayload } from '../types';

interface Props {
    previousResult: PredictResponse;
    onResult: (r: PredictResponse) => void;
    onBack: () => void;
}

export default function PartialUpdate({ previousResult, onResult, onBack }: Props) {
    const [weight, setWeight] = useState(previousResult.weight_kg);
    const [temperature, setTemperature] = useState(previousResult.recommended_params.temperature_c);
    const [pressure, setPressure] = useState(previousResult.recommended_params.pressure_bar);
    const [mode, setMode] = useState<'auto' | 'manual'>(previousResult.mode as 'auto' | 'manual');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRecalculate = async () => {
        setLoading(true);
        setError('');
        try {
            const payload: PredictPayload = {
                plastic_type: previousResult.plastic_type, weight, mode,
                ...(mode === 'manual' && { temperature, pressure }),
            };
            const resp = await predictPyrolysis(payload);
            onResult(resp.data);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Recalculation failed');
        }
        setLoading(false);
    };

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
                            <HiOutlineArrowPath className="text-accent text-xl" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Partial Update</h2>
                            <p className="text-text-muted text-sm">Modify specific parameters</p>
                        </div>
                    </div>
                    <button onClick={onBack} className="btn-secondary text-xs py-1.5 px-3">← Back</button>
                </div>

                {/* Current Values Summary */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                    <div className="p-3 rounded-xl bg-bg-base border border-border text-center">
                        <p className="text-xs text-text-muted">Plastic</p>
                        <p className="text-base font-bold text-accent">{previousResult.plastic_type}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-bg-base border border-border text-center">
                        <p className="text-xs text-text-muted">Yield</p>
                        <p className="text-base font-bold text-success">{previousResult.predicted_yield_pct.toFixed(1)}%</p>
                    </div>
                    <div className="p-3 rounded-xl bg-bg-base border border-border text-center">
                        <p className="text-xs text-text-muted">Grade</p>
                        <p className="text-base font-bold text-accent">{previousResult.sustainability.grade}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="text-sm text-text-secondary font-medium block mb-2">
                            Weight: <span className="text-accent font-bold">{weight} kg</span>
                        </label>
                        <input type="range" min={0.5} max={50} step={0.5} value={weight} onChange={e => setWeight(+e.target.value)} className="w-full" />
                    </div>

                    <div>
                        <label className="text-sm text-text-secondary font-medium block mb-2">Mode</label>
                        <div className="grid grid-cols-2 gap-2">
                            {(['auto', 'manual'] as const).map(m => (
                                <button key={m} onClick={() => setMode(m)}
                                    className={`py-2.5 rounded-xl text-sm font-semibold capitalize transition-all cursor-pointer ${mode === m ? 'bg-accent text-bg-base' : 'bg-bg-base border border-border text-text-secondary hover:border-accent/40'
                                        }`}
                                >
                                    {m === 'auto' ? '⚡ Auto' : '🔧 Manual'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {mode === 'manual' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-5">
                            <div>
                                <label className="text-sm text-text-secondary font-medium block mb-2">
                                    Temperature: <span className="text-accent font-bold">{temperature}°C</span>
                                </label>
                                <input type="range" min={300} max={600} step={5} value={temperature} onChange={e => setTemperature(+e.target.value)} className="w-full" />
                            </div>
                            <div>
                                <label className="text-sm text-text-secondary font-medium block mb-2">
                                    Pressure: <span className="text-accent font-bold">{pressure} bar</span>
                                </label>
                                <input type="range" min={1} max={10} step={0.5} value={pressure} onChange={e => setPressure(+e.target.value)} className="w-full" />
                            </div>
                        </motion.div>
                    )}

                    {error && <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">{error}</div>}

                    <button onClick={handleRecalculate} disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
                    >
                        {loading ? <HiOutlineArrowPath className="animate-spin" /> : <HiOutlineSparkles />}
                        {loading ? 'Recalculating…' : 'Recalculate'}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
