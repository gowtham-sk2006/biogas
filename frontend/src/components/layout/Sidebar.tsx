import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineBeaker,
    HiOutlineChartBar,
    HiOutlineCog6Tooth,
    HiOutlineHome,
    HiOutlineCamera,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
} from 'react-icons/hi2';

interface SidebarProps {
    active: string;
    onNavigate: (page: string) => void;
}

const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: HiOutlineHome },
    { id: 'detect', label: 'Detection', icon: HiOutlineCamera },
    { id: 'predict', label: 'Prediction', icon: HiOutlineBeaker },
    { id: 'analytics', label: 'Analytics', icon: HiOutlineChartBar },
    { id: 'settings', label: 'Settings', icon: HiOutlineCog6Tooth },
];

export default function Sidebar({ active, onNavigate }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <motion.aside
            animate={{ width: collapsed ? 72 : 240 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="fixed left-0 top-0 h-screen z-40 flex flex-col"
            style={{
                background: 'linear-gradient(180deg, #0f0f17 0%, #0a0a0f 100%)',
                borderRight: '1px solid rgba(99,102,241,0.08)',
            }}
        >
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 py-6">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center flex-shrink-0">
                    <HiOutlineBeaker className="text-white text-lg" />
                </div>
                <AnimatePresence>
                    {!collapsed && (
                        <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="text-lg font-bold gradient-text whitespace-nowrap"
                        >
                            BioPlastic AI
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 px-3 mt-2 space-y-1">
                {navItems.map((item) => {
                    const isActive = active === item.id;
                    return (
                        <motion.button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            whileHover={{ x: 2 }}
                            whileTap={{ scale: 0.97 }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${isActive
                                    ? 'bg-brand-500/15 text-brand-400'
                                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-700/50'
                                }`}
                        >
                            <item.icon className={`text-xl flex-shrink-0 ${isActive ? 'text-brand-400' : ''}`} />
                            <AnimatePresence>
                                {!collapsed && (
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="whitespace-nowrap"
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                            {isActive && (
                                <motion.div
                                    layoutId="activeIndicator"
                                    className="absolute left-0 w-[3px] h-6 rounded-r-full bg-brand-500"
                                />
                            )}
                        </motion.button>
                    );
                })}
            </nav>

            {/* Collapse Toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="mx-3 mb-4 p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-700/50 transition-colors cursor-pointer"
            >
                {collapsed ? (
                    <HiOutlineChevronRight className="text-lg mx-auto" />
                ) : (
                    <div className="flex items-center gap-2 text-sm">
                        <HiOutlineChevronLeft className="text-lg" />
                        <span>Collapse</span>
                    </div>
                )}
            </button>
        </motion.aside>
    );
}
