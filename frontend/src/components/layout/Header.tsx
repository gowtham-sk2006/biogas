import { motion } from 'framer-motion';
import { HiOutlineBell, HiOutlineSparkles } from 'react-icons/hi2';

interface HeaderProps {
    title: string;
    subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
    return (
        <header className="flex items-center justify-between mb-8">
            <div>
                <motion.h1
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl font-bold text-text-primary"
                >
                    {title}
                </motion.h1>
                {subtitle && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="text-text-secondary text-sm mt-1"
                    >
                        {subtitle}
                    </motion.p>
                )}
            </div>

            <div className="flex items-center gap-3">
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm font-medium"
                >
                    <HiOutlineSparkles />
                    <span>AI Active</span>
                </motion.div>
                <button className="p-2.5 rounded-xl bg-surface-800 border border-surface-600 text-text-secondary hover:text-text-primary transition-colors relative">
                    <HiOutlineBell className="text-lg" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent-500" />
                </button>
            </div>
        </header>
    );
}
