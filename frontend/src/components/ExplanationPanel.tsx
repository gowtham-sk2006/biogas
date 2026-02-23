import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineSparkles, HiOutlineChevronDown } from 'react-icons/hi2';
import type { PredictResponse } from '../types';

function generateExplanation(result: PredictResponse): string[] {
    const lines: string[] = [];
    const temp = result.recommended_params?.temperature_c || 0;
    const yld = result.predicted_yield_pct;
    const emission = result.predicted_emission_g_per_kg;
    const risk = result.risk_level;
    const plastic = result.plastic_type;
    const sustainability = result.sustainability;

    // Temperature reasoning
    if (temp >= 500) {
        lines.push(
            `The recommended temperature of ${temp}°C is relatively high for ${plastic}. Higher temperatures tend to break down polymer chains more aggressively, which increases gas yield but may also elevate CO₂ emissions. This is a trade-off the optimizer has balanced.`
        );
    } else if (temp >= 400) {
        lines.push(
            `The temperature of ${temp}°C falls in the optimal mid-range for ${plastic} pyrolysis. This temperature provides a good balance between yield efficiency (${yld.toFixed(1)}%) and emission control (${emission.toFixed(1)} g/kg).`
        );
    } else {
        lines.push(
            `A lower temperature of ${temp}°C has been selected for ${plastic}. While this reduces emissions to ${emission.toFixed(1)} g/kg, gas yield is more conservative at ${yld.toFixed(1)}%. Consider raising temperature for higher output.`
        );
    }

    // Yield assessment
    if (yld > 45) {
        lines.push(
            `The predicted yield of ${yld.toFixed(1)}% is excellent — this is above the typical range for ${plastic} pyrolysis. The polymer chain structure of ${plastic} is being efficiently cracked into valuable gaseous products.`
        );
    } else if (yld > 30) {
        lines.push(
            `A yield of ${yld.toFixed(1)}% is within the expected range for ${plastic}. Increasing temperature by 10–20°C may improve yield, but could also increase emissions proportionally.`
        );
    } else {
        lines.push(
            `The yield of ${yld.toFixed(1)}% is below optimal for ${plastic}. This may be due to low temperature or high pressure conditions. The AI suggests reviewing input parameters.`
        );
    }

    // Risk assessment
    if (risk === 'Low') {
        lines.push(
            `Risk level is classified as Low — the process conditions are within safe operating limits. No additional safety measures are needed beyond standard protocols.`
        );
    } else if (risk === 'Medium') {
        lines.push(
            `Risk level is Medium — some process parameters are approaching upper limits. Monitor reactor temperature and pressure closely during operation. Consider reducing temperature by 10–15°C if conditions allow.`
        );
    } else {
        lines.push(
            `⚠ Risk level is HIGH — current conditions may lead to unsafe operations. The AI strongly recommends reducing temperature and reviewing pressure settings before proceeding.`
        );
    }

    // Sustainability
    if (sustainability.score >= 75) {
        lines.push(
            `Sustainability Score: ${sustainability.score}/100 (Grade ${sustainability.grade}) — Excellent. This configuration minimizes environmental impact while maintaining good economic output.`
        );
    } else if (sustainability.score >= 50) {
        lines.push(
            `Sustainability Score: ${sustainability.score}/100 (Grade ${sustainability.grade}) — Moderate. There is room for improvement; consider co-pyrolysis with mixed plastic types or using a catalyst.`
        );
    } else {
        lines.push(
            `Sustainability Score: ${sustainability.score}/100 (Grade ${sustainability.grade}) — Needs improvement. Current parameters result in higher emissions relative to yield. Optimization is recommended.`
        );
    }

    return lines;
}

export default function ExplanationPanel({ result }: { result: PredictResponse }) {
    const [open, setOpen] = useState(false);
    const explanations = generateExplanation(result);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="glass-card mb-6 overflow-hidden"
        >
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-bg-card-hover transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
                        <HiOutlineSparkles className="text-accent text-lg" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-sm">Why This Recommendation?</h3>
                        <p className="text-xs text-text-muted">AI-generated explanation of the prediction results</p>
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
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6 space-y-3">
                            {explanations.map((text, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex gap-3"
                                >
                                    <div className="w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                        {i + 1}
                                    </div>
                                    <p className="text-sm text-text-secondary leading-relaxed">{text}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
