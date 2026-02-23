import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineArrowPath, HiOutlineHome, HiOutlineDocumentArrowDown, HiOutlineExclamationTriangle } from 'react-icons/hi2';
import AlertBanner from './AlertBanner';
import KPISection from './KPISection';
import OptimizationSummary from './OptimizationSummary';
import MultiObjectiveToggle, { type OptimizationGoal } from './MultiObjectiveToggle';
import SensitivityPanel from './SensitivityPanel';
import ChartsSection from './ChartsSection';
import ParetoChart from './ParetoChart';
import CarbonImpactCard from './CarbonImpactCard';
import EnergyEstimator from './EnergyEstimator';
import EconomicCard from './EconomicCard';
import CircularScoreCard from './CircularScoreCard';
import ExplanationPanel from './ExplanationPanel';
import LifecycleComparison from './LifecycleComparison';
import GasCompositionCard from './GasCompositionCard';
import ProcessGuide from './ProcessGuide';
import MaterialInfo from './MaterialInfo';
import { predictPyrolysis } from '../api/client';
import type { PredictResponse, PredictPayload } from '../types';

interface Props {
    result: PredictResponse;
    onBack: () => void;
    onPartialUpdate: () => void;
}

// Optimization goal → parameter adjustments
const GOAL_ADJUSTMENTS: Record<OptimizationGoal, { tempDelta: number; pressureDelta: number }> = {
    'max-yield': { tempDelta: 25, pressureDelta: 1 },
    'min-emission': { tempDelta: -30, pressureDelta: -1 },
    'max-profit': { tempDelta: 15, pressureDelta: 0.5 },
    'balanced': { tempDelta: 0, pressureDelta: 0 },
};

function generateReport(result: PredictResponse): string {
    const temp = result.recommended_params?.temperature_c || 0;
    const pressure = result.recommended_params?.pressure_bar || 0;
    const weight = result.weight_kg;
    const yld = result.predicted_yield_pct;
    const emission = result.predicted_emission_g_per_kg;
    const risk = result.risk_level;
    const sust = result.sustainability;
    const landfillCO2 = (weight * 2.53).toFixed(2);
    const pyrolysisCO2 = ((emission * weight) / 1000).toFixed(2);
    const netReduction = (weight * 2.53 - (emission * weight) / 1000).toFixed(2);

    return `
╔══════════════════════════════════════════════════╗
║          PYROLYSIS ANALYSIS REPORT               ║
╠══════════════════════════════════════════════════╣
║  Generated: ${new Date().toLocaleString().padEnd(35)}║
╚══════════════════════════════════════════════════╝

─── FEEDSTOCK ──────────────────────────────────────
  Plastic Type:      ${result.plastic_type}
  Weight:            ${weight} kg
  Mode:              ${result.mode}

─── OPTIMIZED PARAMETERS ──────────────────────────
  Temperature:       ${temp} °C
  Pressure:          ${pressure} bar

─── PREDICTIONS ───────────────────────────────────
  Gas Yield:         ${yld.toFixed(1)}%
  CO₂ Emission:      ${emission.toFixed(1)} g/kg
  Risk Level:        ${risk}

─── SUSTAINABILITY ────────────────────────────────
  Score:             ${sust.score}/100
  Grade:             ${sust.grade}
  Yield Efficiency:  ${sust.yield_efficiency}
  Emission Rating:   ${sust.emission_rating}

─── CARBON IMPACT ─────────────────────────────────
  Landfill CO₂:      ${landfillCO2} kg
  Pyrolysis CO₂:     ${pyrolysisCO2} kg
  Net Reduction:     ${netReduction} kg

─── MATERIAL INFO ─────────────────────────────────
  Density:           ${result.material_info?.density_g_cm3 || '—'} g/cm³
  Calorific Value:   ${result.material_info?.calorific_value_mj_kg || '—'} MJ/kg
  Melting Point:     ${result.material_info?.melting_point_c || '—'} °C

════════════════════════════════════════════════════
  BioPlastic AI — Pyrolysis Platform
════════════════════════════════════════════════════
`.trim();
}

function handleExport(result: PredictResponse) {
    const text = generateReport(result);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pyrolysis_report_${result.plastic_type}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// Contamination impact constants
const CONTAMINATION_YIELD_REDUCTION = 12; // %
const CONTAMINATION_EMISSION_INCREASE = 18; // %

export default function Dashboard({ result, onBack, onPartialUpdate }: Props) {
    const [goal, setGoal] = useState<OptimizationGoal>('balanced');
    const [activeResult, setActiveResult] = useState<PredictResponse>(result);
    const [recalculating, setRecalculating] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Detect contamination from mode string (heuristic)
    const isContaminated = result.mode?.toLowerCase().includes('contaminated') || false;

    // When goal changes, recalculate via API
    useEffect(() => {
        if (goal === 'balanced') {
            setActiveResult(result);
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(async () => {
            setRecalculating(true);
            const adj = GOAL_ADJUSTMENTS[goal];
            const baseTemp = result.recommended_params?.temperature_c || 450;
            const basePress = result.recommended_params?.pressure_bar || 5;

            try {
                const payload: PredictPayload = {
                    plastic_type: result.plastic_type,
                    weight: result.weight_kg,
                    mode: 'manual',
                    temperature: Math.max(300, Math.min(600, baseTemp + adj.tempDelta)),
                    pressure: Math.max(1, Math.min(10, basePress + adj.pressureDelta)),
                };
                const resp = await predictPyrolysis(payload);
                setActiveResult(resp.data);
            } catch {
                setActiveResult(result);
            }
            setRecalculating(false);
        }, 300);

        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [goal, result]);

    // Reset when external result changes
    useEffect(() => {
        setActiveResult(result);
        setGoal('balanced');
    }, [result]);

    const r = activeResult;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Alert Banner (conditional) */}
            <AlertBanner result={r} />

            {/* Contamination Warning */}
            <AnimatePresence>
                {isContaminated && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-5 overflow-hidden"
                    >
                        <div className="relative p-4 rounded-2xl border border-warning/25 overflow-hidden">
                            <div className="absolute inset-0 bg-warning/5 animate-pulse" style={{ animationDuration: '4s' }} />
                            <div className="relative flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-warning/15 flex items-center justify-center flex-shrink-0">
                                    <HiOutlineExclamationTriangle className="text-warning text-lg" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-warning">Contamination Detected</p>
                                    <p className="text-xs text-text-secondary mt-0.5">
                                        Yield reduced by <span className="font-bold text-warning">~{CONTAMINATION_YIELD_REDUCTION}%</span> ·
                                        Emission increased by <span className="font-bold text-warning">~{CONTAMINATION_EMISSION_INCREASE}%</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header bar */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-extrabold text-text-primary">
                        Process Dashboard
                        {recalculating && <span className="text-xs text-accent ml-2 font-normal">recalculating…</span>}
                    </h2>
                    <p className="text-text-muted text-sm mt-1">
                        {r.plastic_type} · {r.weight_kg} kg · {r.mode} mode
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleExport(r)}
                        className="btn-secondary flex items-center gap-2 text-sm"
                    >
                        <HiOutlineDocumentArrowDown className="text-accent" /> Download Report
                    </button>
                    <button onClick={onPartialUpdate} className="btn-secondary flex items-center gap-2 text-sm">
                        <HiOutlineArrowPath className="text-accent" /> Partial Update
                    </button>
                    <button onClick={onBack} className="btn-secondary flex items-center gap-2 text-sm">
                        <HiOutlineHome /> New Analysis
                    </button>
                </div>
            </div>

            {/* Row 1: KPIs */}
            <KPISection result={r} />

            {/* Circular Economy Score */}
            <CircularScoreCard result={r} />

            {/* Multi-Objective Toggle + Optimization Summary */}
            <MultiObjectiveToggle value={goal} onChange={setGoal} />
            <OptimizationSummary result={r} />

            {/* Sensitivity Analysis */}
            <SensitivityPanel result={r} />

            {/* Row 3: Charts */}
            <ChartsSection result={r} />

            {/* Pareto Trade-off */}
            <ParetoChart result={r} />

            {/* Row 4: Carbon Impact */}
            <CarbonImpactCard result={r} />

            {/* Row 5: Energy + Economic side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <EnergyEstimator result={r} />
                <EconomicCard result={r} />
            </div>

            {/* Lifecycle Comparison */}
            <LifecycleComparison result={r} />

            {/* Row 6: AI Explanation */}
            <ExplanationPanel result={r} />

            {/* Row 7: Process Guide */}
            <ProcessGuide result={r} />

            {/* Row 8: Material Info + Gas Composition */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MaterialInfo result={r} />
                <GasCompositionCard result={r} />
            </div>
        </motion.div>
    );
}
