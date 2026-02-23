import { motion } from 'framer-motion';
import { HiOutlineCamera, HiOutlinePencilSquare, HiOutlineArrowPath } from 'react-icons/hi2';
import type { AppMode } from '../types';

const modes: { key: AppMode; icon: typeof HiOutlineCamera; title: string; desc: string }[] = [
    { key: 'image-upload', icon: HiOutlineCamera, title: '4-Side Image Upload', desc: 'Upload front, back, left & right views for AI-powered plastic detection and classification.' },
    { key: 'manual', icon: HiOutlinePencilSquare, title: 'Manual Update', desc: 'Enter plastic type, weight, and process parameters directly for instant analysis.' },
    { key: 'partial', icon: HiOutlineArrowPath, title: 'Partial Update', desc: 'Modify specific parameters of a previous analysis without re-entering all data.' },
];

const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12 } },
};

const item = {
    hidden: { opacity: 0, y: 40 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function ModeSelection({ onSelect }: { onSelect: (m: AppMode) => void }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-7rem)]">
            {/* Headline */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center mb-12"
            >
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                    <span className="text-accent">Plastic-to-Biogas</span>{' '}
                    <span className="text-text-primary">Digital Twin</span>
                </h1>
                <p className="text-text-secondary mt-3 text-lg max-w-xl mx-auto">
                    AI-powered pyrolysis process optimization. Select an input mode to begin.
                </p>
            </motion.div>

            {/* Mode Cards */}
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl"
            >
                {modes.map((m) => (
                    <motion.button
                        key={m.key}
                        variants={item}
                        whileHover={{ scale: 1.04, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSelect(m.key)}
                        className="glass-card glass-card-hover p-8 text-left cursor-pointer group"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-5 group-hover:bg-accent/20 transition-colors">
                            <m.icon className="text-accent text-2xl" />
                        </div>
                        <h3 className="text-lg font-bold text-text-primary mb-2">{m.title}</h3>
                        <p className="text-text-muted text-sm leading-relaxed">{m.desc}</p>
                    </motion.button>
                ))}
            </motion.div>
        </div>
    );
}
