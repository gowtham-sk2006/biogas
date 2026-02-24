import { motion } from 'framer-motion';
import { HiOutlineCpuChip } from 'react-icons/hi2';
import { FiLogOut } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import { checkHealth } from '../api/client';

export default function Navbar() {
    const [status, setStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');

    useEffect(() => {
        const check = async () => {
            try {
                const r = await checkHealth();
                setStatus(r.data.model_loaded ? 'online' : 'connecting');
            } catch {
                setStatus('offline');
            }
        };
        check();
        const id = setInterval(check, 15000);
        return () => clearInterval(id);
    }, []);

    const dot = status === 'online' ? 'bg-success' : status === 'connecting' ? 'bg-warning' : 'bg-danger';

    return (
        <motion.nav
            initial={{ y: -60 }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            className="fixed top-0 inset-x-0 z-50 h-14 flex items-center justify-between px-6 border-b border-border"
            style={{ background: 'rgba(9,9,11,0.92)', backdropFilter: 'blur(12px)' }}
        >
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                    <HiOutlineCpuChip className="text-accent text-lg" />
                </div>
                <span className="font-bold text-text-primary tracking-tight">BioPlastic AI</span>
                <span className="badge badge-accent text-[10px]">v2.0</span>
            </div>

            <div className="flex items-center gap-4 text-xs text-text-secondary">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${dot} ${status === 'online' ? 'animate-pulse' : ''}`} />
                    <span className="capitalize">{status === 'online' ? 'AI Online' : status}</span>
                </div>

                <button
                    onClick={() => {
                        localStorage.removeItem('access_token');
                        localStorage.removeItem('user');
                        window.location.reload();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors border border-red-500/20"
                >
                    <FiLogOut className="w-3.5 h-3.5" />
                    Logout
                </button>
            </div>
        </motion.nav>
    );
}
