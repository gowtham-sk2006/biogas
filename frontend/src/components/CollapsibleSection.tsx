import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineChevronDown } from 'react-icons/hi2';

interface CollapsibleSectionProps {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
    accentColor?: string;
    badge?: string;
}

export default function CollapsibleSection({
    title,
    icon: Icon,
    children,
    defaultOpen = false,
    accentColor = 'text-accent',
    badge,
}: CollapsibleSectionProps) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="glass-card overflow-hidden mb-6">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-3 px-6 py-5 hover:bg-bg-card-hover transition-colors cursor-pointer"
            >
                <div className={`w-10 h-10 rounded-xl bg-bg-elevated flex items-center justify-center ${accentColor}`}>
                    <Icon className="text-lg" />
                </div>
                <div className="flex-1 text-left">
                    <span className="font-bold text-base text-text-primary">{title}</span>
                    {badge && (
                        <span className="ml-2 badge badge-accent text-[10px]">{badge}</span>
                    )}
                </div>
                <HiOutlineChevronDown
                    className={`text-text-muted text-lg transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6 pt-2">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
