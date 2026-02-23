import { motion } from 'framer-motion';
import {
    HiOutlineSparkles,
    HiOutlineArrowRight,
    HiOutlineShieldCheck,
    HiOutlineBolt,
    HiOutlineCloud,
} from 'react-icons/hi2';

interface HeroProps {
    onGetStarted: () => void;
}

const features = [
    {
        icon: HiOutlineSparkles,
        title: 'AI Detection',
        desc: 'YOLOv8 multi-view plastic recognition',
        color: 'text-brand-400 bg-brand-500/15',
    },
    {
        icon: HiOutlineBolt,
        title: 'Yield Prediction',
        desc: 'ML-powered pyrolysis optimization',
        color: 'text-accent-400 bg-accent-500/15',
    },
    {
        icon: HiOutlineCloud,
        title: 'Emission Control',
        desc: 'CO₂ forecasting & sustainability',
        color: 'text-warn-400 bg-warn-500/15',
    },
    {
        icon: HiOutlineShieldCheck,
        title: 'Risk Analysis',
        desc: 'Multi-factor safety assessment',
        color: 'text-accent-400 bg-accent-500/15',
    },
];

export default function Hero({ onGetStarted }: HeroProps) {
    return (
        <section className="relative overflow-hidden pt-8 pb-16">
            {/* Background Glow */}
            <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none"
                style={{
                    background:
                        'radial-gradient(ellipse at center, rgba(249,115,22,0.12) 0%, rgba(234,88,12,0.05) 40%, transparent 70%)',
                }}
            />

            <div className="relative z-10 text-center max-w-3xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm font-medium mb-6">
                        <HiOutlineSparkles />
                        Powered by Machine Learning
                    </span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight"
                >
                    Plastic Waste to{' '}
                    <span className="gradient-text">Clean Energy</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-text-secondary text-lg mb-8 max-w-xl mx-auto"
                >
                    AI-driven plastic detection and pyrolysis optimization platform.
                    Maximize gas yield, minimize emissions, assess risks — all in real time.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex items-center justify-center gap-4"
                >
                    <button
                        onClick={onGetStarted}
                        className="btn-primary flex items-center gap-2 text-base px-8 py-3"
                    >
                        Get Started
                        <HiOutlineArrowRight />
                    </button>
                    <a
                        href="http://127.0.0.1:8000/docs"
                        target="_blank"
                        rel="noopener"
                        className="btn-secondary text-base px-8 py-3"
                    >
                        API Docs
                    </a>
                </motion.div>
            </div>

            {/* Feature Cards */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.45 }}
                className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-14"
            >
                {features.map((f, i) => (
                    <motion.div
                        key={i}
                        whileHover={{ y: -4 }}
                        className="glass-card glass-card-hover p-5 text-center"
                    >
                        <div
                            className={`w-11 h-11 rounded-xl mx-auto mb-3 flex items-center justify-center ${f.color}`}
                        >
                            <f.icon className="text-xl" />
                        </div>
                        <h4 className="font-semibold text-sm mb-1">{f.title}</h4>
                        <p className="text-text-muted text-xs">{f.desc}</p>
                    </motion.div>
                ))}
            </motion.div>
        </section>
    );
}
