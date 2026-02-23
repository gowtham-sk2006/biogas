import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineExclamationCircle } from 'react-icons/hi2';
import { checkHealth } from '../api/client';

type Status = 'connecting' | 'online' | 'offline';

export default function StatusIndicator() {
    const [status, setStatus] = useState<Status>('connecting');
    const [modelLoaded, setModelLoaded] = useState(false);

    useEffect(() => {
        let mounted = true;
        const check = async () => {
            try {
                const resp = await checkHealth();
                if (!mounted) return;
                setStatus('online');
                setModelLoaded(resp.data.model_loaded);
            } catch {
                if (mounted) setStatus('offline');
            }
        };

        check();
        const interval = setInterval(check, 15000);
        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

    const colors: Record<Status, string> = {
        connecting: 'bg-warn-400',
        online: 'bg-accent-400',
        offline: 'bg-danger-400',
    };

    const labels: Record<Status, string> = {
        connecting: 'Connecting…',
        online: modelLoaded ? 'AI Online' : 'API Online · Model Loading',
        offline: 'Backend Offline',
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-800/80 border border-surface-700 text-xs"
        >
            <span className="relative flex h-2 w-2">
                <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colors[status]}`}
                />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${colors[status]}`} />
            </span>
            <span className="text-text-secondary">{labels[status]}</span>
            {status === 'offline' && (
                <HiOutlineExclamationCircle className="text-danger-400" />
            )}
        </motion.div>
    );
}
