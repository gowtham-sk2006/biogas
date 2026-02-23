import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import type { PredictResponse } from '../types';

// Calculate circular economy score based on yield, emission, sustainability
function calcScore(result: PredictResponse): number {
    const yieldScore = Math.min(result.predicted_yield_pct / 80, 1) * 40; // max 40
    const emissionScore = Math.max(0, 1 - result.predicted_emission_g_per_kg / 300) * 30; // max 30
    const sustScore = (result.sustainability.score / 100) * 30; // max 30
    return Math.round(Math.min(100, yieldScore + emissionScore + sustScore));
}

function getGrade(score: number): { label: string; color: string } {
    if (score >= 80) return { label: 'Excellent', color: '#10B981' };
    if (score >= 60) return { label: 'Good', color: '#F97316' };
    if (score >= 40) return { label: 'Fair', color: '#EAB308' };
    return { label: 'Needs Work', color: '#EF4444' };
}

export default function CircularScoreCard({ result }: { result: PredictResponse }) {
    const score = calcScore(result);
    const grade = getGrade(score);
    const [animatedScore, setAnimatedScore] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Animate score counter
    useEffect(() => {
        let frame: number;
        const start = performance.now();
        const duration = 1500;
        const tick = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setAnimatedScore(Math.round(score * eased));
            if (p < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [score]);

    // Animated ring via canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const size = 120;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);

        let frame: number;
        const start = performance.now();
        const duration = 1500;
        const cx = size / 2;
        const cy = size / 2;
        const radius = 48;
        const lineWidth = 8;

        const draw = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            const angle = eased * (score / 100) * Math.PI * 2;

            ctx.clearRect(0, 0, size, size);

            // Background ring
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.strokeStyle = '#1E1E1E';
            ctx.lineWidth = lineWidth;
            ctx.stroke();

            // Foreground ring
            if (angle > 0) {
                ctx.beginPath();
                ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + angle);
                ctx.strokeStyle = grade.color;
                ctx.lineWidth = lineWidth;
                ctx.lineCap = 'round';
                ctx.stroke();
            }

            if (p < 1) frame = requestAnimationFrame(draw);
        };

        frame = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(frame);
    }, [score, grade.color]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-5 mb-6"
        >
            <div className="flex items-center gap-5">
                {/* Ring */}
                <div className="relative w-[120px] h-[120px] flex-shrink-0">
                    <canvas
                        ref={canvasRef}
                        style={{ width: 120, height: 120 }}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-extrabold" style={{ color: grade.color }}>
                            {animatedScore}
                        </span>
                        <span className="text-[10px] text-text-muted">/100</span>
                    </div>
                </div>

                {/* Info */}
                <div className="flex-1">
                    <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
                        <span>♻️</span> Circular Economy Score
                    </h3>
                    <p className="text-xs text-text-muted mb-3">
                        Composite metric combining yield efficiency, emission reduction, and sustainability.
                    </p>
                    <span
                        className="text-xs font-bold px-3 py-1 rounded-full"
                        style={{ background: `${grade.color}20`, color: grade.color }}
                    >
                        {grade.label}
                    </span>

                    {/* Breakdown */}
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                        <div>
                            <span className="text-text-muted block">Yield</span>
                            <span className="font-semibold text-text-primary">{Math.round(Math.min(result.predicted_yield_pct / 80, 1) * 40)}/40</span>
                        </div>
                        <div>
                            <span className="text-text-muted block">Low CO₂</span>
                            <span className="font-semibold text-text-primary">{Math.round(Math.max(0, 1 - result.predicted_emission_g_per_kg / 300) * 30)}/30</span>
                        </div>
                        <div>
                            <span className="text-text-muted block">Sustainability</span>
                            <span className="font-semibold text-text-primary">{Math.round((result.sustainability.score / 100) * 30)}/30</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
