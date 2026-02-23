import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineBeaker,
    HiOutlineFire,
    HiOutlineShieldCheck,
    HiOutlineLightBulb,
    HiOutlineCog6Tooth,
    HiOutlineCheckCircle,
    HiOutlineExclamationTriangle,
    HiOutlineChevronDown,
    HiOutlineSparkles,
    HiOutlineBolt,
    HiOutlineClipboardDocumentCheck,
} from 'react-icons/hi2';
import type { PredictResponse } from '../types';

// ─── Pyrolysis Process Data per Plastic Type ────────────────────

interface ProcessData {
    pretreatment: string[];
    steps: { title: string; detail: string; icon: React.ElementType }[];
    safetyTips: string[];
    bestPractices: string[];
    expectedOutputs: { product: string; percentage: string; color: string }[];
    catalystSuggestion: string;
    heatingRate: string;
    residenceTime: string;
    coolingMethod: string;
}

const PROCESS_DATA: Record<string, ProcessData> = {
    PET: {
        pretreatment: [
            'Remove labels, caps, and adhesives from PET bottles',
            'Wash thoroughly to eliminate food residues and contaminants',
            'Shred to 5–10 mm particle size for uniform heating',
            'Dry at 80°C for 2 hours to remove moisture (< 1% moisture required)',
        ],
        steps: [
            { title: 'Pre-heating Zone', detail: 'Gradually heat to 250°C at 10°C/min to soften the polymer and remove volatiles. PET begins depolymerization around 350°C.', icon: HiOutlineFire },
            { title: 'Primary Cracking', detail: 'Raise to 400–450°C. PET undergoes rapid thermal decomposition producing benzoic acid, acetaldehyde, and terephthalic acid derivatives.', icon: HiOutlineBeaker },
            { title: 'Condensation', detail: 'Cool pyrolysis vapors to 25–40°C using a multi-stage condenser. PET yields significant liquid oil (wax-like) at this stage.', icon: HiOutlineCog6Tooth },
            { title: 'Gas Collection', detail: 'Non-condensable gases (CO, CO₂, CH₄) are collected and can be recirculated as fuel for the reactor to improve energy efficiency.', icon: HiOutlineBolt },
        ],
        safetyTips: [
            'PET releases toxic acetaldehyde — ensure proper ventilation and gas scrubbing',
            'Monitor for terephthalic acid sublimation which can clog condensers',
            'Use nitrogen purging to maintain inert atmosphere and prevent combustion',
            'Wear PPE: heat-resistant gloves, safety goggles, and respirator mask',
        ],
        bestPractices: [
            'Use a ZSM-5 zeolite catalyst to improve aromatic hydrocarbon yield by 30–40%',
            'Maintain heating rate of 10–15°C/min for optimal product distribution',
            'Co-pyrolysis with PP or PE (20:80 ratio) significantly improves oil quality',
            'Char residue from PET can be used as activated carbon precursor',
        ],
        expectedOutputs: [
            { product: 'Liquid Oil', percentage: '23–40%', color: 'text-accent' },
            { product: 'Syngas', percentage: '30–52%', color: 'text-success' },
            { product: 'Char Residue', percentage: '15–25%', color: 'text-warning' },
            { product: 'Wax', percentage: '5–10%', color: 'text-text-secondary' },
        ],
        catalystSuggestion: 'ZSM-5 Zeolite or CaO for improved aromatic yield',
        heatingRate: '10–15°C/min (slow pyrolysis) or 50–100°C/min (fast)',
        residenceTime: '30–60 minutes at peak temperature',
        coolingMethod: 'Multi-stage water-cooled condenser (3 stages)',
    },
    HDPE: {
        pretreatment: [
            'Sort and separate from other plastic types (HDPE is resin code #2)',
            'Clean to remove soil, food waste, and organic contaminants',
            'Shred to 8–15 mm chips for efficient heat transfer',
            'No drying typically needed — HDPE has low moisture absorption',
        ],
        steps: [
            { title: 'Inert Atmosphere Setup', detail: 'Purge reactor with nitrogen (N₂) for 15 min to create oxygen-free environment. HDPE is highly flammable above 350°C.', icon: HiOutlineShieldCheck },
            { title: 'Thermal Cracking', detail: 'Heat to 450–520°C at steady rate. HDPE decomposes via random chain scission producing long-chain aliphatic hydrocarbons — excellent fuel-grade oil.', icon: HiOutlineFire },
            { title: 'Vapor Fractionation', detail: 'Pass vapors through a fractional condenser. Light fractions (gasoline-range) condense at 80–150°C, heavy fractions (diesel-range) at 200–350°C.', icon: HiOutlineBeaker },
            { title: 'Product Collection', detail: 'Collect liquid fuel oil (70–80% yield expected). Non-condensable gases can power the reactor. Minimal char residue with HDPE.', icon: HiOutlineBolt },
        ],
        safetyTips: [
            'HDPE produces highly flammable vapors — maintain strict inert atmosphere',
            'Install flame arrestors on gas outlet lines',
            'Monitor reactor pressure continuously — pressure build-up risk above 500°C',
            'Keep fire extinguisher (CO₂ type) within reach at all times',
        ],
        bestPractices: [
            'HDPE gives the HIGHEST liquid oil yield (70–80%) among all common plastics',
            'Use FCC catalyst (fluid catalytic cracking) for gasoline-range hydrocarbons',
            'Optimal temperature sweet spot: 475–500°C for maximum diesel-grade fuel',
            'Slow heating rate (5–10°C/min) favors wax production for industrial use',
        ],
        expectedOutputs: [
            { product: 'Liquid Oil', percentage: '70–80%', color: 'text-accent' },
            { product: 'Syngas', percentage: '10–20%', color: 'text-success' },
            { product: 'Char Residue', percentage: '2–5%', color: 'text-warning' },
            { product: 'Wax', percentage: '5–15%', color: 'text-text-secondary' },
        ],
        catalystSuggestion: 'FCC Catalyst or HZSM-5 for gasoline-range fuel',
        heatingRate: '5–10°C/min (wax) or 20–30°C/min (oil)',
        residenceTime: '45–90 minutes at peak temperature',
        coolingMethod: 'Water-cooled tube condenser with ice-bath secondary',
    },
    LDPE: {
        pretreatment: [
            'Collect and separate LDPE films (bags, wraps, pouches)',
            'Wash to remove printing inks, adhesives, and food residue',
            'Compact or pelletize films — loose films cause feeding issues',
            'Pre-melt at 130°C if using screw-type reactor for smooth feeding',
        ],
        steps: [
            { title: 'Compaction & Feeding', detail: 'LDPE films need compaction before feeding. Use a densifier or pre-melt at 130°C to convert fluffy films into dense pellets for uniform reactor feeding.', icon: HiOutlineCog6Tooth },
            { title: 'Thermal Decomposition', detail: 'Heat to 425–500°C. LDPE decomposes similarly to HDPE but produces more branched hydrocarbons and slightly higher gas fraction.', icon: HiOutlineFire },
            { title: 'Condensation & Separation', detail: 'Cool vapors through staged condensers. LDPE produces lighter fractions than HDPE — more gasoline-range hydrocarbons.', icon: HiOutlineBeaker },
            { title: 'Quality Enhancement', detail: 'Pass crude oil through a catalytic bed (optional) to crack heavy fractions into lighter, more valuable fuel products.', icon: HiOutlineSparkles },
        ],
        safetyTips: [
            'LDPE films can create static electricity — ground all equipment',
            'Films tend to melt and stick — ensure reactor has anti-coking coating',
            'Vapors are highly flammable — double-check all joint seals before startup',
            'Monitor condenser blockages — LDPE wax can solidify in cold zones',
        ],
        bestPractices: [
            'Mix LDPE with HDPE (50:50) to improve feedstock consistency and oil yield',
            'Use a stirred reactor to prevent agglomeration of molten LDPE',
            'Fast pyrolysis (>50°C/min) produces more gas; slow pyrolysis favors wax/oil',
            'Oil from LDPE has properties similar to diesel — suitable for engine blending',
        ],
        expectedOutputs: [
            { product: 'Liquid Oil', percentage: '60–75%', color: 'text-accent' },
            { product: 'Syngas', percentage: '15–25%', color: 'text-success' },
            { product: 'Char Residue', percentage: '3–8%', color: 'text-warning' },
            { product: 'Wax', percentage: '8–15%', color: 'text-text-secondary' },
        ],
        catalystSuggestion: 'Natural zeolite or bentonite clay (low-cost option)',
        heatingRate: '15–25°C/min recommended for balanced oil/gas ratio',
        residenceTime: '40–75 minutes at peak temperature',
        coolingMethod: 'Shell-and-tube condenser with recirculating coolant',
    },
    PP: {
        pretreatment: [
            'Separate PP containers from mixed waste (resin code #5)',
            'Remove food residues, labels, and metal components (hinges, springs)',
            'Shred to 5–12 mm particle size for optimal heat transfer',
            'Light drying at 60°C for 1 hour if visibly wet',
        ],
        steps: [
            { title: 'Reactor Preparation', detail: 'Charge reactor with feedstock. Seal and purge with N₂ (3 volume exchanges). PP requires slightly lower temperatures than PE for optimal cracking.', icon: HiOutlineCog6Tooth },
            { title: 'Controlled Heating', detail: 'Heat to 400–480°C at 15°C/min. PP decomposes via β-scission producing high-quality olefins and paraffins — excellent fuel feedstock.', icon: HiOutlineFire },
            { title: 'Selective Condensation', detail: 'Use staged cooling: 200°C catches heavy fractions (wax), 100–150°C catches medium (diesel), <80°C catches light fractions (gasoline).', icon: HiOutlineBeaker },
            { title: 'Gas Valorization', detail: 'Non-condensable gas (propylene, ethylene) can be used as chemical feedstock or burned for reactor heating — achieving near energy self-sufficiency.', icon: HiOutlineBolt },
        ],
        safetyTips: [
            'PP produces significant propylene gas — highly flammable, monitor LEL detectors',
            'Lower auto-ignition temperature than PE — maintain strict temperature control',
            'Install pressure relief valves rated for 2x expected operating pressure',
            'Avoid rapid heating >30°C/min — risk of thermal runaway with PP',
        ],
        bestPractices: [
            'PP gives the best quality fuel oil — closest to commercial diesel/gasoline',
            'Use ReUSY zeolite catalyst for maximum light olefin production',
            'Temperature sweet spot: 450°C for maximum liquid yield with PP',
            'PP pyrolysis oil has the lowest sulfur content — most environmentally friendly',
        ],
        expectedOutputs: [
            { product: 'Liquid Oil', percentage: '65–82%', color: 'text-accent' },
            { product: 'Syngas', percentage: '10–22%', color: 'text-success' },
            { product: 'Char Residue', percentage: '2–4%', color: 'text-warning' },
            { product: 'Wax', percentage: '3–8%', color: 'text-text-secondary' },
        ],
        catalystSuggestion: 'ReUSY zeolite or silica-alumina for high-grade fuel',
        heatingRate: '10–15°C/min for maximum liquid oil yield',
        residenceTime: '30–60 minutes at peak temperature',
        coolingMethod: 'Three-stage condenser (heavy → medium → light fractions)',
    },
};

// ─── Collapsible Section ─────────────────────────────────────────

function Section({
    title,
    icon: Icon,
    children,
    defaultOpen = false,
    accentColor = 'text-accent',
}: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
    accentColor?: string;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-border rounded-xl overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-bg-card-hover transition-colors cursor-pointer"
            >
                <div className={`w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center ${accentColor}`}>
                    <Icon className="text-base" />
                </div>
                <span className="font-semibold text-sm text-text-primary flex-1 text-left">{title}</span>
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
                        <div className="px-5 pb-5 pt-1">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────

export default function ProcessGuide({ result }: { result: PredictResponse }) {
    const data = PROCESS_DATA[result.plastic_type] || PROCESS_DATA['HDPE'];
    const temp = result.recommended_params?.temperature_c;
    const pressure = result.recommended_params?.pressure_bar;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="glass-card p-6 mb-6"
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                    <HiOutlineClipboardDocumentCheck className="text-accent text-xl" />
                </div>
                <div>
                    <h3 className="font-bold text-lg">Pyrolysis Process Guide — {result.plastic_type}</h3>
                    <p className="text-text-muted text-sm">Best practices &amp; step-by-step recommendations for optimal conversion</p>
                </div>
            </div>

            {/* Quick Recommendation Banner */}
            <div className="bg-accent/8 border border-accent/20 rounded-xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
                <HiOutlineLightBulb className="text-accent text-2xl flex-shrink-0" />
                <div className="flex-1">
                    <p className="text-sm font-semibold text-accent mb-1">AI Recommendation</p>
                    <p className="text-sm text-text-secondary">
                        For <span className="font-bold text-text-primary">{result.weight_kg} kg of {result.plastic_type}</span>,
                        use <span className="font-bold text-accent">{temp}°C</span> at{' '}
                        <span className="font-bold text-accent">{pressure} bar</span> pressure.
                        Expected yield: <span className="font-bold text-success">{result.predicted_yield_pct.toFixed(1)}%</span>.
                        {result.risk_level === 'Low'
                            ? ' Conditions are safe — proceed with standard protocols.'
                            : result.risk_level === 'Medium'
                                ? ' Moderate risk — follow all safety guidelines carefully.'
                                : ' High risk — enhanced safety measures required!'}
                    </p>
                </div>
            </div>

            {/* Process Parameters Quick View */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                    { label: 'Catalyst', value: data.catalystSuggestion.split(' or ')[0], icon: HiOutlineBeaker },
                    { label: 'Heating Rate', value: data.heatingRate.split(' (')[0], icon: HiOutlineFire },
                    { label: 'Hold Time', value: data.residenceTime.split(' at ')[0], icon: HiOutlineCog6Tooth },
                    { label: 'Cooling', value: data.coolingMethod.split(' (')[0], icon: HiOutlineSparkles },
                ].map((p) => (
                    <div key={p.label} className="p-3 rounded-xl bg-bg-base border border-border">
                        <p.icon className="text-accent text-sm mb-1.5" />
                        <p className="text-xs text-text-muted mb-0.5">{p.label}</p>
                        <p className="text-xs font-semibold text-text-primary leading-snug">{p.value}</p>
                    </div>
                ))}
            </div>

            {/* Collapsible Sections */}
            <div className="space-y-3">
                {/* Pre-Treatment */}
                <Section title="Pre-Treatment Steps" icon={HiOutlineClipboardDocumentCheck} defaultOpen={true}>
                    <div className="space-y-2.5">
                        {data.pretreatment.map((step, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-accent/15 text-accent text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                    {i + 1}
                                </span>
                                <p className="text-sm text-text-secondary leading-relaxed">{step}</p>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Step-by-Step Process */}
                <Section title="Step-by-Step Pyrolysis Process" icon={HiOutlineFire} defaultOpen={true} accentColor="text-accent">
                    <div className="space-y-4">
                        {data.steps.map((step, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="flex gap-4"
                            >
                                <div className="flex flex-col items-center flex-shrink-0">
                                    <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
                                        <step.icon className="text-accent text-base" />
                                    </div>
                                    {i < data.steps.length - 1 && (
                                        <div className="w-0.5 flex-1 bg-border mt-2" />
                                    )}
                                </div>
                                <div className="pb-4">
                                    <p className="font-semibold text-sm text-text-primary mb-1">{step.title}</p>
                                    <p className="text-sm text-text-secondary leading-relaxed">{step.detail}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </Section>

                {/* Expected Outputs */}
                <Section title="Expected Output Products" icon={HiOutlineSparkles} accentColor="text-success">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        {data.expectedOutputs.map((o) => (
                            <div key={o.product} className="p-3 rounded-xl bg-bg-base border border-border text-center">
                                <p className="text-xs text-text-muted mb-1">{o.product}</p>
                                <p className={`text-lg font-bold ${o.color}`}>{o.percentage}</p>
                            </div>
                        ))}
                    </div>
                    <div className="text-xs text-text-muted bg-bg-base rounded-lg p-3 border border-border">
                        <strong className="text-text-secondary">Note:</strong> Actual yields depend on feedstock purity, heating rate, catalyst presence, and reactor design. Ranges shown are from published pyrolysis studies.
                    </div>
                </Section>

                {/* Best Practices */}
                <Section title="Best Practices & Pro Tips" icon={HiOutlineLightBulb} accentColor="text-warning">
                    <div className="space-y-2.5">
                        {data.bestPractices.map((tip, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <HiOutlineCheckCircle className="text-success text-sm flex-shrink-0 mt-1" />
                                <p className="text-sm text-text-secondary leading-relaxed">{tip}</p>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Safety */}
                <Section title="Safety Precautions" icon={HiOutlineShieldCheck} accentColor="text-danger">
                    <div className="space-y-2.5">
                        {data.safetyTips.map((tip, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <HiOutlineExclamationTriangle className="text-warning text-sm flex-shrink-0 mt-1" />
                                <p className="text-sm text-text-secondary leading-relaxed">{tip}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 p-3 rounded-lg bg-danger/8 border border-danger/20">
                        <p className="text-xs text-danger font-semibold">⚠ Always follow local regulations for waste handling, emissions, and occupational safety when conducting pyrolysis operations.</p>
                    </div>
                </Section>
            </div>
        </motion.div>
    );
}
