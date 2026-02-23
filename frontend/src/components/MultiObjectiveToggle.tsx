import { motion } from 'framer-motion';
import { HiOutlineAdjustmentsHorizontal } from 'react-icons/hi2';

export type OptimizationGoal = 'max-yield' | 'min-emission' | 'max-profit' | 'balanced';

const GOALS: { key: OptimizationGoal; label: string; icon: string }[] = [
    { key: 'max-yield', label: 'Max Yield', icon: '🔥' },
    { key: 'min-emission', label: 'Min Emission', icon: '🌿' },
    { key: 'max-profit', label: 'Max Profit', icon: '💰' },
    { key: 'balanced', label: 'Balanced Eco', icon: '⚖️' },
];

interface Props {
    value: OptimizationGoal;
    onChange: (goal: OptimizationGoal) => void;
}

export default function MultiObjectiveToggle({ value, onChange }: Props) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
        >
            <div className="flex items-center gap-2 mb-2">
                <HiOutlineAdjustmentsHorizontal className="text-accent text-sm" />
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Optimization Goal</span>
            </div>
            <div className="flex gap-2 p-1 bg-bg-base rounded-xl border border-border">
                {GOALS.map(g => (
                    <button
                        key={g.key}
                        onClick={() => onChange(g.key)}
                        className={`relative flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${value === g.key
                                ? 'text-bg-base'
                                : 'text-text-muted hover:text-text-secondary'
                            }`}
                    >
                        {value === g.key && (
                            <motion.div
                                layoutId="goal-bg"
                                className="absolute inset-0 bg-accent rounded-lg"
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10 flex items-center justify-center gap-1">
                            <span>{g.icon}</span>
                            <span className="hidden sm:inline">{g.label}</span>
                        </span>
                    </button>
                ))}
            </div>
        </motion.div>
    );
}
