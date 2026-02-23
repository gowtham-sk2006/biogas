import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineBeaker,
    HiOutlineCloud,
    HiOutlineShieldCheck,
    HiOutlineArrowPath,
    HiOutlineCog6Tooth,
    HiOutlineBolt,
    HiOutlineCheckCircle,
    HiOutlineSparkles,
} from 'react-icons/hi2';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { predictPyrolysis } from '../api/client';
import type { PredictResponse } from '../types';
import { useAlerts } from '../components/AlertPanel';

// ─── Animations ──────────────────────────────────────────────────

const stagger = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ─── Chart Tooltip ───────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
        <div className="glass-card px-4 py-3 text-sm border border-surface-600">
            <p className="text-text-secondary mb-1 font-medium">{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} style={{ color: p.color }} className="font-semibold">
                    {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
                </p>
            ))}
        </div>
    );
};

// ─── KPI Card ────────────────────────────────────────────────────

function KpiCard({
    icon: Icon,
    label,
    value,
    unit,
    sub,
    color,
    badgeClass,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    unit?: string;
    sub?: string;
    color: string;
    badgeClass?: string;
}) {
    return (
        <motion.div variants={fadeUp} className="glass-card glass-card-hover p-5">
            <div className="flex items-center justify-between mb-3">
                <span className="text-text-secondary text-sm">{label}</span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon className="text-lg" />
                </div>
            </div>
            <div className="flex items-end gap-2">
                {badgeClass ? (
                    <span className={`badge text-base ${badgeClass}`}>{value}</span>
                ) : (
                    <span className="stat-value text-text-primary">{value}</span>
                )}
                {unit && <span className="text-text-muted text-sm mb-1">{unit}</span>}
            </div>
            {sub && <p className="text-xs text-text-muted mt-2">{sub}</p>}
        </motion.div>
    );
}

// ─── Slider Component ────────────────────────────────────────────

function Slider({
    label,
    value,
    min,
    max,
    step,
    unit,
    onChange,
    color = 'brand',
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit: string;
    onChange: (v: number) => void;
    color?: string;
}) {
    const pct = ((value - min) / (max - min)) * 100;
    const gradientColor =
        color === 'brand'
            ? 'from-brand-500 to-brand-400'
            : 'from-accent-500 to-accent-400';

    return (
        <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">{label}</span>
                <span className="text-sm font-semibold text-text-primary">
                    {value} {unit}
                </span>
            </div>
            <div className="relative h-2 bg-surface-800 rounded-full">
                <div
                    className={`absolute h-full rounded-full bg-gradient-to-r ${gradientColor}`}
                    style={{ width: `${pct}%` }}
                />
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(+e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div
                    className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 shadow-lg transition-all ${color === 'brand' ? 'border-brand-500' : 'border-accent-500'
                        }`}
                    style={{ left: `calc(${pct}% - 8px)` }}
                />
            </div>
            <div className="flex justify-between text-xs text-text-muted mt-1">
                <span>{min}{unit}</span>
                <span>{max}{unit}</span>
            </div>
        </div>
    );
}

// ─── Generate sweep data for charts ─────────────────────────────

function generateSweep(plastic: string, _weight: number) {
    // Synthetic sweep data based on known relationships
    const data = [];
    for (let t = 300; t <= 600; t += 25) {
        const baseYield =
            plastic === 'HDPE' ? 20 : plastic === 'PET' ? 15 : plastic === 'LDPE' ? 18 : 19;
        const yieldVal = baseYield + (t - 300) * 0.08 + Math.sin(t / 80) * 3;
        const emissionVal = 50 + t * 0.3 + Math.cos(t / 60) * 15;
        data.push({
            temp: `${t}°C`,
            yield: +Math.min(65, Math.max(8, yieldVal)).toFixed(1),
            emission: +Math.min(300, Math.max(30, emissionVal)).toFixed(1),
        });
    }
    return data;
}

// ─── Main Dashboard ──────────────────────────────────────────────

const PLASTIC_TYPES = ['PET', 'HDPE', 'LDPE', 'PP'];

const comparisonData = [
    { plastic: 'PET', yield: 38.2, emission: 185.4, risk: 65 },
    { plastic: 'HDPE', yield: 48.1, emission: 60.8, risk: 25 },
    { plastic: 'LDPE', yield: 42.5, emission: 92.3, risk: 40 },
    { plastic: 'PP', yield: 44.8, emission: 78.6, risk: 30 },
];

export default function Dashboard({ initialPlastic = 'HDPE' }: { initialPlastic?: string }) {
    const [plastic, setPlastic] = useState(initialPlastic);
    const [weight, setWeight] = useState(5);
    const [mode, setMode] = useState<'auto' | 'manual'>('auto');
    const [temperature, setTemperature] = useState(450);
    const [pressure, setPressure] = useState(5);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<PredictResponse | null>(null);
    const { addAlert } = useAlerts();

    const sweepData = generateSweep(plastic, weight);

    const runPrediction = useCallback(async () => {
        setLoading(true);
        try {
            const payload: any = { plastic_type: plastic, weight, mode };
            if (mode === 'manual') {
                payload.temperature = temperature;
                payload.pressure = pressure;
            }
            const resp = await predictPyrolysis(payload);
            setResult(resp.data);
            addAlert('success', 'Analysis Complete', `${resp.data.predicted_yield_pct.toFixed(1)}% yield · Grade ${resp.data.sustainability.grade}`);
        } catch (err: any) {
            addAlert('error', 'Prediction Failed', err.response?.data?.detail || 'Backend unreachable');
        }
        setLoading(false);
    }, [plastic, weight, mode, temperature, pressure, addAlert]);

    // Initial run on mount (instant) + scroll to top
    useEffect(() => {
        window.scrollTo(0, 0);
        runPrediction();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-predict on config change (debounced)
    useEffect(() => {
        const timer = setTimeout(runPrediction, 600);
        return () => clearTimeout(timer);
    }, [runPrediction]);

    const riskColor = (r: string) =>
        r === 'Low' ? 'badge-success' : r === 'Medium' ? 'badge-warning' : 'badge-danger';
    const gradeColor = (g: string) =>
        g === 'A' ? 'text-accent-400' : g === 'B' ? 'text-brand-400' : g === 'C' ? 'text-warn-400' : 'text-danger-400';

    return (
        <motion.div variants={stagger} initial="hidden" animate="show">
            {/* ═══ Row 1: KPI Cards ═══════════════════════════════════════ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
                <KpiCard
                    icon={HiOutlineBeaker}
                    label="Gas Yield"
                    value={result ? result.predicted_yield_pct.toFixed(1) : '—'}
                    unit="%"
                    sub={result?.sustainability.yield_efficiency}
                    color="bg-brand-500/15 text-brand-400"
                />
                <KpiCard
                    icon={HiOutlineCloud}
                    label="CO₂ Emission"
                    value={result ? result.predicted_emission_g_per_kg.toFixed(1) : '—'}
                    unit="g/kg"
                    sub={result?.sustainability.emission_rating}
                    color="bg-accent-500/15 text-accent-400"
                />
                <KpiCard
                    icon={HiOutlineShieldCheck}
                    label="Risk Level"
                    value={result?.predicted_risk_level ?? '—'}
                    sub={result?.sustainability.risk_assessment}
                    color="bg-warn-500/15 text-warn-400"
                    badgeClass={result ? riskColor(result.predicted_risk_level) : undefined}
                />
            </div>

            {/* ═══ Row 2: Config + Optimization Results ═══════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">
                {/* Process Configuration */}
                <motion.div variants={fadeUp} className="glass-card p-6 lg:col-span-2">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 rounded-xl bg-brand-500/15 flex items-center justify-center">
                            <HiOutlineCog6Tooth className="text-brand-400 text-lg" />
                        </div>
                        <h3 className="font-semibold">Process Configuration</h3>
                    </div>

                    {/* Plastic Type */}
                    <label className="block text-sm text-text-secondary mb-2">Plastic Type</label>
                    <div className="grid grid-cols-4 gap-2 mb-5">
                        {PLASTIC_TYPES.map((t) => (
                            <button
                                key={t}
                                onClick={() => setPlastic(t)}
                                className={`py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${plastic === t
                                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                                    : 'bg-surface-800 text-text-secondary border border-surface-600 hover:border-surface-500'
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    {/* Weight */}
                    <Slider
                        label="Feedstock Weight"
                        value={weight}
                        min={0.5}
                        max={25}
                        step={0.5}
                        unit="kg"
                        onChange={setWeight}
                    />

                    {/* Mode Toggle */}
                    <label className="block text-sm text-text-secondary mb-2">Mode</label>
                    <div className="flex gap-2 mb-5">
                        {(['auto', 'manual'] as const).map((m) => (
                            <button
                                key={m}
                                onClick={() => setMode(m)}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${mode === m
                                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                                    : 'bg-surface-800 text-text-secondary border border-surface-600'
                                    }`}
                            >
                                {m === 'auto' ? <HiOutlineSparkles /> : <HiOutlineCog6Tooth />}
                                {m === 'auto' ? 'Auto Optimize' : 'Manual'}
                            </button>
                        ))}
                    </div>

                    {/* Manual Sliders */}
                    <AnimatePresence>
                        {mode === 'manual' && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <Slider
                                    label="Temperature"
                                    value={temperature}
                                    min={300}
                                    max={600}
                                    step={5}
                                    unit="°C"
                                    onChange={setTemperature}
                                    color="brand"
                                />
                                <Slider
                                    label="Pressure"
                                    value={pressure}
                                    min={1}
                                    max={10}
                                    step={0.5}
                                    unit="atm"
                                    onChange={setPressure}
                                    color="accent"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Run Button */}
                    <button
                        onClick={runPrediction}
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
                    >
                        {loading ? <HiOutlineArrowPath className="animate-spin" /> : <HiOutlineBolt />}
                        {loading ? 'Running…' : 'Run Analysis'}
                    </button>
                </motion.div>

                {/* Optimization Results */}
                <motion.div variants={fadeUp} className="glass-card p-6 lg:col-span-3">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 rounded-xl bg-accent-500/15 flex items-center justify-center">
                            <HiOutlineCheckCircle className="text-accent-400 text-lg" />
                        </div>
                        <h3 className="font-semibold">Optimization Results</h3>
                        {loading && (
                            <HiOutlineArrowPath className="animate-spin text-brand-400 ml-auto" />
                        )}
                    </div>

                    {!result ? (
                        <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                            <HiOutlineSparkles className="text-4xl mb-3 text-surface-500" />
                            <p>Run analysis to see results</p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* Recommended Params */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-surface-800/60 border border-surface-700">
                                    <p className="text-text-muted text-xs mb-1">Optimal Temperature</p>
                                    <p className="text-2xl font-bold text-brand-400">
                                        {result.recommended_params.temperature_c}
                                        <span className="text-sm font-normal text-text-muted ml-1">°C</span>
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl bg-surface-800/60 border border-surface-700">
                                    <p className="text-text-muted text-xs mb-1">Optimal Pressure</p>
                                    <p className="text-2xl font-bold text-accent-400">
                                        {result.recommended_params.pressure_atm}
                                        <span className="text-sm font-normal text-text-muted ml-1">atm</span>
                                    </p>
                                </div>
                            </div>

                            {/* Sustainability Score */}
                            <div className="p-4 rounded-xl bg-surface-800/60 border border-surface-700">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm text-text-secondary">Sustainability Score</p>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-3xl font-bold ${gradeColor(result.sustainability.grade)}`}>
                                            {result.sustainability.score}
                                        </span>
                                        <span className={`text-2xl font-bold ${gradeColor(result.sustainability.grade)}`}>
                                            {result.sustainability.grade}
                                        </span>
                                    </div>
                                </div>
                                <div className="h-3 bg-surface-900 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${result.sustainability.score}%` }}
                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                        className="h-full rounded-full bg-gradient-to-r from-brand-500 via-brand-400 to-accent-500"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-3 mt-3">
                                    <div className="text-center">
                                        <p className="text-xs text-text-muted">Yield</p>
                                        <p className="text-sm font-medium text-text-primary">{result.sustainability.yield_efficiency}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-text-muted">Emission</p>
                                        <p className="text-sm font-medium text-text-primary">{result.sustainability.emission_rating}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-text-muted">Risk</p>
                                        <p className="text-sm font-medium text-text-primary">{result.sustainability.risk_assessment}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Material Info */}
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-800/60 border border-surface-700">
                                <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                                    <HiOutlineBeaker className="text-brand-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{result.material_info.full_name}</p>
                                    <p className="text-xs text-text-muted">
                                        {result.material_info.density_g_cm3} g/cm³ · {result.material_info.calorific_value_mj_kg} MJ/kg · MP {result.material_info.melting_point_c}°C
                                    </p>
                                </div>
                                <span className="badge badge-success text-xs">{result.recommended_params.source}</span>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* ═══ Row 3: Charts ══════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Yield vs Temperature */}
                <motion.div variants={fadeUp} className="glass-card p-6">
                    <h4 className="font-semibold mb-1">Yield vs Temperature</h4>
                    <p className="text-text-muted text-xs mb-4">{plastic} at {weight}kg</p>
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sweepData}>
                                <defs>
                                    <linearGradient id="yieldG" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#F97316" stopOpacity={0.35} />
                                        <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                                <XAxis dataKey="temp" stroke="#64748b" fontSize={10} interval={2} />
                                <YAxis stroke="#64748b" fontSize={10} />
                                <Tooltip content={<ChartTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="yield"
                                    stroke="#F97316"
                                    fill="url(#yieldG)"
                                    strokeWidth={2}
                                    name="Yield %"
                                    dot={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Emission vs Temperature */}
                <motion.div variants={fadeUp} className="glass-card p-6">
                    <h4 className="font-semibold mb-1">Emission vs Temperature</h4>
                    <p className="text-text-muted text-xs mb-4">{plastic} at {weight}kg</p>
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sweepData}>
                                <defs>
                                    <linearGradient id="emG" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                                        <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                                <XAxis dataKey="temp" stroke="#64748b" fontSize={10} interval={2} />
                                <YAxis stroke="#64748b" fontSize={10} />
                                <Tooltip content={<ChartTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="emission"
                                    stroke="#10B981"
                                    fill="url(#emG)"
                                    strokeWidth={2}
                                    name="CO₂ g/kg"
                                    dot={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Plastic Comparison */}
                <motion.div variants={fadeUp} className="glass-card p-6">
                    <h4 className="font-semibold mb-1">Plastic Comparison</h4>
                    <p className="text-text-muted text-xs mb-4">Yield & emission by type</p>
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={comparisonData} barGap={2}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                                <XAxis dataKey="plastic" stroke="#64748b" fontSize={11} />
                                <YAxis stroke="#64748b" fontSize={10} />
                                <Tooltip content={<ChartTooltip />} />
                                <Legend
                                    wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                                />
                                <Bar dataKey="yield" name="Yield %" radius={[4, 4, 0, 0]} fill="#FB923C" />
                                <Bar dataKey="emission" name="CO₂ g/kg" radius={[4, 4, 0, 0]} fill="#10B981" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
