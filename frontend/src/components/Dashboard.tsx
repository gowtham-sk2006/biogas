import { motion } from 'framer-motion';
import { HiOutlineArrowPath, HiOutlineHome, HiOutlineDocumentArrowDown } from 'react-icons/hi2';
import AlertBanner from './AlertBanner';
import KPISection from './KPISection';
import OptimizationSummary from './OptimizationSummary';
import ChartsSection from './ChartsSection';
import CarbonImpactCard from './CarbonImpactCard';
import EnergyEstimator from './EnergyEstimator';
import EconomicCard from './EconomicCard';
import ExplanationPanel from './ExplanationPanel';
import ProcessGuide from './ProcessGuide';
import MaterialInfo from './MaterialInfo';
import type { PredictResponse } from '../types';

interface Props {
    result: PredictResponse;
    onBack: () => void;
    onPartialUpdate: () => void;
}

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
  Report generated automatically
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

export default function Dashboard({ result, onBack, onPartialUpdate }: Props) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Alert Banner (conditional) */}
            <AlertBanner result={result} />

            {/* Header bar */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-extrabold text-text-primary">Process Dashboard</h2>
                    <p className="text-text-muted text-sm mt-1">
                        {result.plastic_type} · {result.weight_kg} kg · {result.mode} mode
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleExport(result)}
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
            <KPISection result={result} />

            {/* Row 2: Optimization Summary */}
            <OptimizationSummary result={result} />

            {/* Row 3: Charts */}
            <ChartsSection result={result} />

            {/* Row 4: Carbon Impact */}
            <CarbonImpactCard result={result} />

            {/* Row 5: Energy + Economic side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <EnergyEstimator result={result} />
                <EconomicCard result={result} />
            </div>

            {/* Row 6: AI Explanation */}
            <ExplanationPanel result={result} />

            {/* Row 7: Pyrolysis Process Guide */}
            <ProcessGuide result={result} />

            {/* Row 8: Material Info */}
            <MaterialInfo result={result} />
        </motion.div>
    );
}
