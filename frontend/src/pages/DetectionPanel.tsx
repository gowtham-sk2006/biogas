import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineCamera,
    HiOutlineArrowPath,
    HiOutlineTrash,
    HiOutlinePhoto,
    HiOutlineCheckCircle,
    HiOutlineExclamationTriangle,
    HiOutlineChevronDown,
} from 'react-icons/hi2';
import { detectPlastic } from '../api/client';
import { useAlerts } from '../components/AlertPanel';

// ─── Types ───────────────────────────────────────────────────────

interface BBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

interface DetectedObject {
    class_name: string;
    confidence: number;
    bbox: BBox;
}

interface ViewResult {
    view: string;
    image_width: number;
    image_height: number;
    objects: DetectedObject[];
}

interface DetectResult {
    success: boolean;
    inference_time_ms: number;
    detections: ViewResult[];
    summary: {
        total_detections: number;
        selected_plastic: {
            view: string;
            class_name: string;
            confidence: number;
            bbox: BBox;
        } | null;
        all_confidences: number[];
    };
}

type ViewName = 'front' | 'back' | 'left' | 'right';

const VIEWS: { key: ViewName; label: string }[] = [
    { key: 'front', label: 'Front' },
    { key: 'back', label: 'Back' },
    { key: 'left', label: 'Left' },
    { key: 'right', label: 'Right' },
];

// ─── Bounding Box Overlay ────────────────────────────────────────

function BBoxOverlay({
    objects,
    imgWidth,
    imgHeight,
}: {
    objects: DetectedObject[];
    imgWidth: number;
    imgHeight: number;
}) {
    return (
        <svg
            viewBox={`0 0 ${imgWidth} ${imgHeight}`}
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="none"
        >
            {objects.map((obj, i) => {
                const w = obj.bbox.x2 - obj.bbox.x1;
                const h = obj.bbox.y2 - obj.bbox.y1;
                const isPlastic = obj.class_name.toLowerCase().includes('plastic');
                const color = isPlastic ? '#34d399' : '#f87171';
                return (
                    <g key={i}>
                        <rect
                            x={obj.bbox.x1}
                            y={obj.bbox.y1}
                            width={w}
                            height={h}
                            fill="none"
                            stroke={color}
                            strokeWidth={Math.max(2, imgWidth * 0.005)}
                            rx={4}
                            opacity={0.9}
                        />
                        <rect
                            x={obj.bbox.x1}
                            y={obj.bbox.y1}
                            width={w}
                            height={h}
                            fill={color}
                            opacity={0.08}
                        />
                        {/* Label */}
                        <rect
                            x={obj.bbox.x1}
                            y={Math.max(0, obj.bbox.y1 - imgHeight * 0.045)}
                            width={imgWidth * 0.35}
                            height={imgHeight * 0.04}
                            fill={color}
                            rx={3}
                            opacity={0.9}
                        />
                        <text
                            x={obj.bbox.x1 + 6}
                            y={Math.max(imgHeight * 0.03, obj.bbox.y1 - imgHeight * 0.012)}
                            fill="white"
                            fontSize={imgHeight * 0.028}
                            fontFamily="Inter, sans-serif"
                            fontWeight="600"
                        >
                            {obj.class_name} {(obj.confidence * 100).toFixed(1)}%
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

// ─── Confidence Bar ──────────────────────────────────────────────

function ConfidenceBar({
    label,
    confidence,
    isPlastic,
    delay = 0,
}: {
    label: string;
    confidence: number;
    isPlastic: boolean;
    delay?: number;
}) {
    const pct = confidence * 100;
    const color = isPlastic
        ? pct > 80
            ? 'from-accent-500 to-accent-400'
            : 'from-brand-500 to-brand-400'
        : 'from-danger-400 to-danger-500';

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.3 }}
            className="mb-3"
        >
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    {isPlastic ? (
                        <HiOutlineCheckCircle className="text-accent-400 text-sm" />
                    ) : (
                        <HiOutlineExclamationTriangle className="text-danger-400 text-sm" />
                    )}
                    <span className="text-sm font-medium text-text-primary">{label}</span>
                </div>
                <span
                    className={`text-sm font-bold ${isPlastic ? 'text-accent-400' : 'text-danger-400'
                        }`}
                >
                    {pct.toFixed(1)}%
                </span>
            </div>
            <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: delay + 0.15, duration: 0.7, ease: 'easeOut' }}
                    className={`h-full rounded-full bg-gradient-to-r ${color}`}
                />
            </div>
        </motion.div>
    );
}

// ─── Main Component ──────────────────────────────────────────────

export default function DetectionPanel() {
    const [files, setFiles] = useState<Record<ViewName, File | null>>({
        front: null,
        back: null,
        left: null,
        right: null,
    });
    const [previews, setPreviews] = useState<Record<ViewName, string | null>>({
        front: null,
        back: null,
        left: null,
        right: null,
    });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<DetectResult | null>(null);
    const [error, setError] = useState('');
    const [selectedView, setSelectedView] = useState<ViewName>('front');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const { addAlert } = useAlerts();

    const inputRefs = useRef<Record<ViewName, HTMLInputElement | null>>({
        front: null,
        back: null,
        left: null,
        right: null,
    });

    const handleFile = useCallback((view: ViewName, file: File) => {
        setFiles((prev) => ({ ...prev, [view]: file }));
        const url = URL.createObjectURL(file);
        setPreviews((prev) => {
            if (prev[view]) URL.revokeObjectURL(prev[view]!);
            return { ...prev, [view]: url };
        });
        setResult(null);
    }, []);

    const handleRemove = useCallback((view: ViewName) => {
        if (previews[view]) URL.revokeObjectURL(previews[view]!);
        setFiles((prev) => ({ ...prev, [view]: null }));
        setPreviews((prev) => ({ ...prev, [view]: null }));
    }, [previews]);

    const allUploaded = Object.values(files).every(Boolean);

    const handleDetect = async () => {
        if (!allUploaded) return;
        setLoading(true);
        setError('');
        try {
            const payload: Record<string, File> = {};
            (Object.keys(files) as ViewName[]).forEach((k) => {
                if (files[k]) payload[k] = files[k]!;
            });
            const resp = await detectPlastic(payload);
            const data = resp.data as DetectResult;
            setResult(data);
            addAlert('success', 'Detection Complete', `${data.summary.total_detections} objects found in ${data.inference_time_ms.toFixed(0)}ms`);
        } catch (err: any) {
            const msg = err.response?.data?.detail || err.message;
            setError(msg);
            addAlert('error', 'Detection Failed', msg);
        }
        setLoading(false);
    };

    const handleClear = () => {
        Object.values(previews).forEach((u) => u && URL.revokeObjectURL(u));
        setFiles({ front: null, back: null, left: null, right: null });
        setPreviews({ front: null, back: null, left: null, right: null });
        setResult(null);
        setError('');
    };

    // Get detection for the selected view
    const viewDetection = result?.detections.find((d) => d.view === selectedView);

    // All detections flat
    const allDetections = result?.detections.flatMap((d) =>
        d.objects.map((o) => ({ ...o, view: d.view }))
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* ─── Upload Panel ─────────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-6 lg:col-span-2"
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center">
                        <HiOutlineCamera className="text-accent-400 text-xl" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-lg">Plastic Detection</h2>
                        <p className="text-text-muted text-sm">Upload 4 view images</p>
                    </div>
                </div>

                {/* Image Upload Grid */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                    {VIEWS.map(({ key, label }) => (
                        <motion.div
                            key={key}
                            whileHover={{ scale: 1.02 }}
                            className={`relative aspect-square rounded-xl overflow-hidden border-2 border-dashed transition-colors cursor-pointer ${previews[key]
                                ? 'border-accent-500/40'
                                : 'border-surface-600 hover:border-brand-500/40'
                                }`}
                            onClick={() => inputRefs.current[key]?.click()}
                        >
                            <input
                                ref={(el) => { inputRefs.current[key] = el; }}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleFile(key, f);
                                }}
                            />

                            {previews[key] ? (
                                <>
                                    <img
                                        src={previews[key]!}
                                        alt={label}
                                        className="w-full h-full object-cover"
                                    />
                                    {/* Remove button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemove(key);
                                        }}
                                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-surface-900/80 flex items-center justify-center text-text-secondary hover:text-danger-400 transition-colors cursor-pointer"
                                    >
                                        <HiOutlineTrash className="text-sm" />
                                    </button>
                                    {/* Label */}
                                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                                        <span className="text-xs font-medium text-white">{label}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2">
                                    <HiOutlinePhoto className="text-2xl" />
                                    <span className="text-xs font-medium">{label}</span>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={handleDetect}
                        disabled={!allUploaded || loading}
                        className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <HiOutlineArrowPath className="animate-spin" />
                        ) : (
                            <HiOutlineCamera />
                        )}
                        {loading ? 'Detecting…' : 'Run Detection'}
                    </button>
                    <button
                        onClick={handleClear}
                        className="btn-secondary px-4"
                        title="Clear all"
                    >
                        <HiOutlineTrash />
                    </button>
                </div>

                {!allUploaded && (
                    <p className="text-text-muted text-xs text-center mt-3">
                        Upload all 4 views to enable detection
                    </p>
                )}

                {error && (
                    <div className="mt-4 p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm flex items-center gap-2">
                        <HiOutlineExclamationTriangle className="flex-shrink-0" />
                        {error}
                    </div>
                )}
            </motion.div>

            {/* ─── Results Panel ────────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-3 space-y-5"
            >
                {!result ? (
                    <div className="glass-card p-16 text-center">
                        <HiOutlineCamera className="text-5xl text-surface-500 mx-auto mb-4" />
                        <p className="text-text-muted">Upload 4 images and run detection</p>
                        <p className="text-text-muted text-sm mt-1">
                            AI will identify plastic objects with bounding boxes
                        </p>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="results"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-5"
                        >
                            {/* Summary Bar */}
                            <div className="glass-card p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className="badge badge-success">
                                        {result.summary.total_detections} detections
                                    </span>
                                    <span className="text-text-muted text-sm">
                                        {result.inference_time_ms.toFixed(0)}ms inference
                                    </span>
                                </div>
                                {result.summary.selected_plastic && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-text-secondary">Best:</span>
                                        <span className="font-semibold text-accent-400">
                                            {result.summary.selected_plastic.class_name}
                                        </span>
                                        <span className="text-text-muted">
                                            ({(result.summary.selected_plastic.confidence * 100).toFixed(1)}%)
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* View Selector Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="w-full btn-secondary flex items-center justify-between cursor-pointer"
                                >
                                    <span>
                                        View:{' '}
                                        <span className="font-semibold text-text-primary capitalize">
                                            {selectedView}
                                        </span>
                                        {viewDetection && (
                                            <span className="text-text-muted ml-2">
                                                ({viewDetection.objects.length} objects)
                                            </span>
                                        )}
                                    </span>
                                    <HiOutlineChevronDown
                                        className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''
                                            }`}
                                    />
                                </button>
                                <AnimatePresence>
                                    {dropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            className="absolute z-10 mt-2 w-full rounded-xl overflow-hidden glass-card border border-surface-600"
                                        >
                                            {VIEWS.map(({ key, label }) => {
                                                const det = result.detections.find((d) => d.view === key);
                                                const count = det?.objects.length || 0;
                                                return (
                                                    <button
                                                        key={key}
                                                        onClick={() => {
                                                            setSelectedView(key);
                                                            setDropdownOpen(false);
                                                        }}
                                                        className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between transition-colors cursor-pointer ${selectedView === key
                                                            ? 'bg-brand-500/10 text-brand-400'
                                                            : 'text-text-secondary hover:bg-surface-700'
                                                            }`}
                                                    >
                                                        <span className="font-medium">{label}</span>
                                                        <span
                                                            className={`badge text-xs ${count > 0 ? 'badge-success' : 'badge-warning'
                                                                }`}
                                                        >
                                                            {count} objects
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Image with Bounding Boxes */}
                            {previews[selectedView] && (
                                <motion.div
                                    key={selectedView}
                                    initial={{ opacity: 0, scale: 0.97 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="glass-card overflow-hidden"
                                >
                                    <div className="relative">
                                        <img
                                            src={previews[selectedView]!}
                                            alt={selectedView}
                                            className="w-full h-auto block"
                                        />
                                        {viewDetection && viewDetection.objects.length > 0 && (
                                            <BBoxOverlay
                                                objects={viewDetection.objects}
                                                imgWidth={viewDetection.image_width}
                                                imgHeight={viewDetection.image_height}
                                            />
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* Detected Plastics List */}
                            <div className="glass-card p-5">
                                <h4 className="font-semibold mb-4 flex items-center gap-2">
                                    <HiOutlineCheckCircle className="text-accent-400" />
                                    Detected Plastics
                                </h4>

                                {allDetections && allDetections.length > 0 ? (
                                    allDetections.map((det, i) => (
                                        <ConfidenceBar
                                            key={`${det.view}-${i}`}
                                            label={`${det.class_name} (${det.view})`}
                                            confidence={det.confidence}
                                            isPlastic={det.class_name.toLowerCase().includes('plastic')}
                                            delay={i * 0.06}
                                        />
                                    ))
                                ) : (
                                    <p className="text-text-muted text-sm">No objects detected</p>
                                )}
                            </div>

                            {/* Confidence Distribution */}
                            {result.summary.all_confidences.length > 0 && (
                                <div className="glass-card p-5">
                                    <h4 className="font-semibold mb-3">Confidence Distribution</h4>
                                    <div className="flex items-end gap-1 h-20">
                                        {result.summary.all_confidences.map((c, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ height: 0 }}
                                                animate={{ height: `${c * 100}%` }}
                                                transition={{ delay: i * 0.1, duration: 0.4 }}
                                                className="flex-1 rounded-t-md bg-gradient-to-t from-brand-500 to-accent-400 min-w-[12px]"
                                                title={`${(c * 100).toFixed(1)}%`}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex justify-between text-xs text-text-muted mt-2">
                                        <span>Highest: {(result.summary.all_confidences[0] * 100).toFixed(1)}%</span>
                                        <span>
                                            Avg:{' '}
                                            {(
                                                (result.summary.all_confidences.reduce((a, b) => a + b, 0) /
                                                    result.summary.all_confidences.length) *
                                                100
                                            ).toFixed(1)}
                                            %
                                        </span>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                )}
            </motion.div>
        </div>
    );
}
