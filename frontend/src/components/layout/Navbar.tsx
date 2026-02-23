import { motion } from 'framer-motion';
import {
    HiOutlineBeaker,
    HiOutlineBell,
} from 'react-icons/hi2';
import StatusIndicator from '../StatusIndicator';

interface NavbarProps {
    active: string;
    onNavigate: (page: string) => void;
}

const navLinks = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'detect', label: 'Detection' },
    { id: 'predict', label: 'Prediction' },
];

export default function Navbar({ active, onNavigate }: NavbarProps) {
    return (
        <nav
            className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6"
            style={{
                background: 'rgba(10,10,15,0.82)',
                backdropFilter: 'blur(14px) saturate(1.6)',
                borderBottom: '1px solid rgba(99,102,241,0.08)',
            }}
        >
            {/* Logo */}
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                    <HiOutlineBeaker className="text-white text-lg" />
                </div>
                <span className="text-lg font-bold gradient-text hidden sm:inline">
                    BioPlastic AI
                </span>
            </div>

            {/* Center Links */}
            <div className="flex items-center gap-1 bg-surface-900/60 rounded-xl p-1 border border-surface-800">
                {navLinks.map((link) => (
                    <button
                        key={link.id}
                        onClick={() => onNavigate(link.id)}
                        className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${active === link.id
                                ? 'text-text-primary'
                                : 'text-text-muted hover:text-text-secondary'
                            }`}
                    >
                        {active === link.id && (
                            <motion.div
                                layoutId="navPill"
                                className="absolute inset-0 bg-surface-700 rounded-lg border border-surface-600"
                                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10">{link.label}</span>
                    </button>
                ))}
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
                <StatusIndicator />
                <button className="p-2 rounded-xl bg-surface-800/60 border border-surface-700 text-text-muted hover:text-text-primary transition-colors relative cursor-pointer">
                    <HiOutlineBell className="text-lg" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent-500" />
                </button>
            </div>
        </nav>
    );
}
