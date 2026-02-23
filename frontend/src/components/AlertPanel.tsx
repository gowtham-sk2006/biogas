import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineCheckCircle,
    HiOutlineExclamationTriangle,
    HiOutlineXCircle,
    HiOutlineInformationCircle,
    HiOutlineXMark,
} from 'react-icons/hi2';

// ─── Types ───────────────────────────────────────────────────────

export type AlertType = 'success' | 'warning' | 'error' | 'info';

interface Alert {
    id: string;
    type: AlertType;
    title: string;
    message?: string;
}

interface AlertContextValue {
    addAlert: (type: AlertType, title: string, message?: string) => void;
    dismissAlert: (id: string) => void;
}

// ─── Context ─────────────────────────────────────────────────────

const AlertContext = createContext<AlertContextValue>({
    addAlert: () => { },
    dismissAlert: () => { },
});

export const useAlerts = () => useContext(AlertContext);

// ─── Provider ────────────────────────────────────────────────────

export function AlertProvider({ children }: { children: ReactNode }) {
    const [alerts, setAlerts] = useState<Alert[]>([]);

    const addAlert = useCallback(
        (type: AlertType, title: string, message?: string) => {
            const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            setAlerts((prev) => [...prev, { id, type, title, message }]);
            setTimeout(() => {
                setAlerts((prev) => prev.filter((a) => a.id !== id));
            }, 5000);
        },
        []
    );

    const dismissAlert = useCallback((id: string) => {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
    }, []);

    return (
        <AlertContext.Provider value={{ addAlert, dismissAlert }}>
            {children}
            <AlertPanel alerts={alerts} onDismiss={dismissAlert} />
        </AlertContext.Provider>
    );
}

// ─── Panel UI ────────────────────────────────────────────────────

const icons: Record<AlertType, React.ElementType> = {
    success: HiOutlineCheckCircle,
    warning: HiOutlineExclamationTriangle,
    error: HiOutlineXCircle,
    info: HiOutlineInformationCircle,
};

const styles: Record<AlertType, string> = {
    success: 'border-accent-500/30 bg-accent-500/10 text-accent-400',
    warning: 'border-warn-400/30 bg-warn-500/10 text-warn-400',
    error: 'border-danger-400/30 bg-danger-500/10 text-danger-400',
    info: 'border-brand-400/30 bg-brand-500/10 text-brand-400',
};

function AlertPanel({
    alerts,
    onDismiss,
}: {
    alerts: Alert[];
    onDismiss: (id: string) => void;
}) {
    return (
        <div className="fixed top-4 right-4 z-50 w-96 space-y-3 pointer-events-none">
            <AnimatePresence>
                {alerts.map((alert) => {
                    const Icon = icons[alert.type];
                    return (
                        <motion.div
                            key={alert.id}
                            initial={{ opacity: 0, x: 80, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 80, scale: 0.95 }}
                            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                            className={`pointer-events-auto glass-card border px-4 py-3 flex items-start gap-3 ${styles[alert.type]}`}
                        >
                            <Icon className="text-xl flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-text-primary">{alert.title}</p>
                                {alert.message && (
                                    <p className="text-xs text-text-secondary mt-0.5">{alert.message}</p>
                                )}
                            </div>
                            <button
                                onClick={() => onDismiss(alert.id)}
                                className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0 cursor-pointer"
                            >
                                <HiOutlineXMark />
                            </button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
