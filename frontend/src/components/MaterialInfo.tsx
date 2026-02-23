import { motion } from 'framer-motion';
import { HiOutlineCube, HiOutlineScale, HiOutlineFire, HiOutlineWrenchScrewdriver } from 'react-icons/hi2';
import type { PredictResponse } from '../types';

export default function MaterialInfo({ result }: { result: PredictResponse }) {
    const m = result.material_info;
    if (!m) return null;

    const items = [
        { icon: HiOutlineCube, label: 'Thickness Range', value: m.thickness_range_mm || '—', unit: 'mm' },
        { icon: HiOutlineScale, label: 'Density', value: m.density_g_cm3?.toFixed(2) || '—', unit: 'g/cm³' },
        { icon: HiOutlineFire, label: 'Calorific Value', value: m.calorific_value_mj_kg?.toFixed(1) || '—', unit: 'MJ/kg' },
        { icon: HiOutlineWrenchScrewdriver, label: 'Reactor Compatible', value: m.reactor_compatible ? 'Yes ✓' : 'No ✗', color: m.reactor_compatible ? 'text-success' : 'text-danger' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="glass-card p-6 mb-6"
        >
            <h3 className="font-bold text-lg mb-5">Material Information — {result.plastic_type}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {items.map((it, i) => (
                    <motion.div
                        key={it.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 + i * 0.08 }}
                        className="p-4 rounded-xl bg-bg-base border border-border"
                    >
                        <it.icon className="text-accent text-lg mb-2" />
                        <p className="text-xs text-text-muted mb-1">{it.label}</p>
                        <p className={`text-base font-bold ${it.color || 'text-text-primary'}`}>
                            {it.value} {it.unit && !it.color && <span className="text-xs text-text-muted">{it.unit}</span>}
                        </p>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}
