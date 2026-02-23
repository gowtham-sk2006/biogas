import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineBeaker,
    HiOutlineArrowPath,
    HiOutlineCog6Tooth,
    HiOutlineCheckCircle,
    HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import { predictPyrolysis } from '../api/client';
import type { PredictPayload, PredictResponse } from '../types';

const plasticTypes = ['PET', 'HDPE', 'LDPE', 'PP'];

export default function PredictPage() {
    const [form, setForm] = useState<PredictPayload>({
        plastic_type: 'HDPE',
        weight: 5,
        mode: 'auto',
        temperature: 450,
        pressure: 5,
    });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<PredictResponse | null>(null);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        try {
            const payload: PredictPayload = {
                plastic_type: form.plastic_type,
                weight: form.weight,
                mode: form.mode,
            };
            if (form.mode === 'manual') {
                payload.temperature = form.temperature;
                payload.pressure = form.pressure;
            }
            const resp = await predictPyrolysis(payload);
            setResult(resp.data);
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message);
        }
        setLoading(false);
    };

    const riskColor = (r: string) =>
        r === 'Low' ? 'badge-success' : r === 'Medium' ? 'badge-warning' : 'badge-danger';
    const gradeColor = (g: string) =>
        g === 'A' ? 'text-accent-400' : g === 'B' ? 'text-brand-400' : g === 'C' ? 'text-warn-400' : 'text-danger-400';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Input Panel */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-6 lg:col-span-2"
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center">
                        <HiOutlineBeaker className="text-brand-400 text-xl" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-lg">Pyrolysis Prediction</h2>
                        <p className="text-text-muted text-sm">Configure parameters</p>
                    </div>
                </div>

                {/* Plastic Type */}
                <label className="block text-sm text-text-secondary mb-2">Plastic Type</label>
                <div className="grid grid-cols-4 gap-2 mb-5">
                    {plasticTypes.map((t) => (
                        <button
                            key={t}
                            onClick={() => setForm({ ...form, plastic_type: t })}
                            className={`py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${form.plastic_type === t
                                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                                : 'bg-surface-800 text-text-secondary border border-surface-600 hover:border-surface-500'
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {/* Weight */}
                <label className="block text-sm text-text-secondary mb-2">Weight (kg)</label>
                <input
                    type="number"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: +e.target.value })}
                    className="input-field mb-5"
                    min={0.1}
                    step={0.5}
                />

                {/* Mode Toggle */}
                <label className="block text-sm text-text-secondary mb-2">Mode</label>
                <div className="flex gap-2 mb-5">
                    {(['auto', 'manual'] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => setForm({ ...form, mode: m })}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${form.mode === m
                                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                                : 'bg-surface-800 text-text-secondary border border-surface-600'
                                }`}
                        >
                            {m === 'auto' ? <HiOutlineArrowPath /> : <HiOutlineCog6Tooth />}
                            {m.charAt(0).toUpperCase() + m.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Manual fields */}
                <AnimatePresence>
                    {form.mode === 'manual' && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <label className="block text-sm text-text-secondary mb-2">Temperature (°C)</label>
                            <input
                                type="number"
                                value={form.temperature}
                                onChange={(e) => setForm({ ...form, temperature: +e.target.value })}
                                className="input-field mb-4"
                                min={200}
                                max={800}
                            />
                            <label className="block text-sm text-text-secondary mb-2">Pressure (atm)</label>
                            <input
                                type="number"
                                value={form.pressure}
                                onChange={(e) => setForm({ ...form, pressure: +e.target.value })}
                                className="input-field mb-5"
                                min={0.5}
                                max={20}
                                step={0.5}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? (
                        <HiOutlineArrowPath className="animate-spin" />
                    ) : (
                        <HiOutlineBeaker />
                    )}
                    {loading ? 'Running…' : 'Run Prediction'}
                </button>

                {error && (
                    <div className="mt-4 p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm flex items-center gap-2">
                        <HiOutlineExclamationTriangle />
                        {error}
                    </div>
                )}
            </motion.div>

            {/* Results Panel */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-3 space-y-5"
            >
                {!result ? (
                    <div className="glass-card p-12 text-center">
                        <HiOutlineBeaker className="text-5xl text-surface-500 mx-auto mb-4" />
                        <p className="text-text-muted">Configure parameters and run a prediction</p>
                    </div>
                ) : (
                    <>
                        {/* Key Metrics */}
                        <div className="grid grid-cols-3 gap-4">
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 text-center">
                                <p className="text-text-muted text-sm mb-2">Gas Yield</p>
                                <p className="stat-value text-brand-400">{result.predicted_yield_pct.toFixed(1)}%</p>
                                <p className="text-xs text-text-secondary mt-1">{result.sustainability.yield_efficiency}</p>
                            </motion.div>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-5 text-center">
                                <p className="text-text-muted text-sm mb-2">CO₂ Emission</p>
                                <p className="stat-value text-accent-400">{result.predicted_emission_g_per_kg.toFixed(1)}</p>
                                <p className="text-xs text-text-secondary mt-1">g/kg · {result.sustainability.emission_rating}</p>
                            </motion.div>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5 text-center">
                                <p className="text-text-muted text-sm mb-2">Risk Level</p>
                                <div className="flex justify-center mt-2">
                                    <span className={`badge text-base ${riskColor(result.predicted_risk_level)}`}>
                                        {result.predicted_risk_level}
                                    </span>
                                </div>
                            </motion.div>
                        </div>

                        {/* Recommended & Sustainability */}
                        <div className="grid grid-cols-2 gap-4">
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-5">
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    <HiOutlineCheckCircle className="text-accent-400" />
                                    Recommended Parameters
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-text-secondary">Temperature</span>
                                        <span className="font-medium">{result.recommended_params.temperature_c} °C</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-secondary">Pressure</span>
                                        <span className="font-medium">{result.recommended_params.pressure_atm} atm</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-secondary">Source</span>
                                        <span className="badge badge-success text-xs">{result.recommended_params.source}</span>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5">
                                <h4 className="font-semibold mb-3">Sustainability Score</h4>
                                <div className="flex items-end gap-4">
                                    <div className={`stat-value ${gradeColor(result.sustainability.grade)}`}>
                                        {result.sustainability.score}
                                    </div>
                                    <span className={`text-3xl font-bold ${gradeColor(result.sustainability.grade)}`}>
                                        {result.sustainability.grade}
                                    </span>
                                </div>
                                <div className="mt-3 h-2 bg-surface-800 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${result.sustainability.score}%` }}
                                        transition={{ delay: 0.3, duration: 0.8 }}
                                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                                    />
                                </div>
                            </motion.div>
                        </div>

                        {/* Material Info */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-5">
                            <h4 className="font-semibold mb-3">Material: {result.material_info.full_name}</h4>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <p className="text-text-muted">Density</p>
                                    <p className="font-medium">{result.material_info.density_g_cm3} g/cm³</p>
                                </div>
                                <div>
                                    <p className="text-text-muted">Calorific Value</p>
                                    <p className="font-medium">{result.material_info.calorific_value_mj_kg} MJ/kg</p>
                                </div>
                                <div>
                                    <p className="text-text-muted">Melting Point</p>
                                    <p className="font-medium">{result.material_info.melting_point_c} °C</p>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </motion.div>
        </div>
    );
}
