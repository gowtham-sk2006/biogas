import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineClock,
    HiOutlineChevronRight,
    HiOutlineTrash,
    HiOutlineBeaker,
} from 'react-icons/hi2';
import type { PredictResponse } from '../types';

interface HistoryEntry {
    id: string;
    date: string;
    plasticType: string;
    weightKg: number;
    yieldPct: number;
    emissionGPerKg: number;
    risk: string;
    result: PredictResponse;
}

const STORAGE_KEY = 'biogas_analysis_history';
const MAX_ENTRIES = 5;

function loadHistory(): HistoryEntry[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveHistory(entries: HistoryEntry[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export function addToHistory(result: PredictResponse) {
    const entries = loadHistory();
    const entry: HistoryEntry = {
        id: Date.now().toString(),
        date: new Date().toLocaleString(),
        plasticType: result.plastic_type,
        weightKg: result.weight_kg,
        yieldPct: result.predicted_yield_pct,
        emissionGPerKg: result.predicted_emission_g_per_kg,
        risk: result.predicted_risk_level || result.risk_level || 'Unknown',
        result,
    };
    // Remove duplicates and prepend
    const filtered = entries.filter(e => e.id !== entry.id);
    saveHistory([entry, ...filtered]);
}

export default function HistorySidebar({ onLoadResult }: { onLoadResult: (r: PredictResponse) => void }) {
    const [open, setOpen] = useState(false);
    const [entries, setEntries] = useState<HistoryEntry[]>([]);

    useEffect(() => {
        setEntries(loadHistory());
    }, [open]);

    const handleClear = () => {
        localStorage.removeItem(STORAGE_KEY);
        setEntries([]);
    };

    const riskColor = (r: string) =>
        r === 'Low' ? 'text-success' : r === 'Medium' ? 'text-warning' : 'text-danger';

    return (
        <>
            {/* Toggle Button */}
            <motion.button
                onClick={() => setOpen(!open)}
                className="fixed right-0 top-1/2 -translate-y-1/2 z-50 w-8 h-20 rounded-l-xl bg-bg-card border border-r-0 border-border flex items-center justify-center hover:bg-bg-card-hover transition-colors cursor-pointer"
                whileHover={{ width: 36 }}
            >
                <HiOutlineChevronRight className={`text-text-muted text-sm transition-transform ${open ? 'rotate-180' : ''}`} />
            </motion.button>

            {/* Sidebar Overlay */}
            <AnimatePresence>
                {open && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 bg-black/30"
                            onClick={() => setOpen(false)}
                        />

                        {/* Sidebar */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
                            className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-bg-card border-l border-border flex flex-col"
                        >
                            {/* Header */}
                            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <HiOutlineClock className="text-accent" />
                                    <h3 className="font-bold text-sm">Analysis History</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    {entries.length > 0 && (
                                        <button
                                            onClick={handleClear}
                                            className="text-xs text-text-muted hover:text-danger transition-colors cursor-pointer"
                                        >
                                            <HiOutlineTrash className="text-sm" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setOpen(false)}
                                        className="text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* Entries */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {entries.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-text-muted">
                                        <HiOutlineBeaker className="text-3xl mb-3 text-border" />
                                        <p className="text-sm">No history yet</p>
                                        <p className="text-xs mt-1">Run an analysis to save it here</p>
                                    </div>
                                ) : (
                                    entries.map((entry, i) => (
                                        <motion.button
                                            key={entry.id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.06 }}
                                            onClick={() => {
                                                onLoadResult(entry.result);
                                                setOpen(false);
                                            }}
                                            className="w-full p-4 rounded-xl bg-bg-base border border-border hover:border-accent/30 transition-all text-left cursor-pointer group"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors">
                                                    {entry.plasticType}
                                                </span>
                                                <span className={`text-xs font-semibold ${riskColor(entry.risk)}`}>
                                                    {entry.risk}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                                                <div>
                                                    <span className="text-text-muted">Yield: </span>
                                                    <span className="font-medium text-accent">{entry.yieldPct.toFixed(1)}%</span>
                                                </div>
                                                <div>
                                                    <span className="text-text-muted">CO₂: </span>
                                                    <span className="font-medium text-text-secondary">{entry.emissionGPerKg.toFixed(1)} g/kg</span>
                                                </div>
                                                <div>
                                                    <span className="text-text-muted">Weight: </span>
                                                    <span className="font-medium text-text-secondary">{entry.weightKg} kg</span>
                                                </div>
                                            </div>

                                            <p className="text-[10px] text-text-muted">{entry.date}</p>
                                        </motion.button>
                                    ))
                                )}
                            </div>

                            <div className="px-5 py-3 border-t border-border text-center">
                                <p className="text-[10px] text-text-muted">Showing last {MAX_ENTRIES} analyses · Stored locally</p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
