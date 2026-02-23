import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlinePhoto,
    HiOutlineTrash,
    HiOutlineArrowPath,
    HiOutlineCheckCircle,
    HiOutlineChevronDown,
    HiOutlineSparkles,
    HiOutlineCamera,
    HiOutlineArrowUpTray,
    HiOutlineXMark,
} from 'react-icons/hi2';
import { detectPlastic } from '../api/client';
import type { ViewName, DetectResponse } from '../types';

const VIEWS: { key: ViewName; label: string }[] = [
    { key: 'front', label: 'Front' },
    { key: 'back', label: 'Back' },
    { key: 'left', label: 'Left' },
    { key: 'right', label: 'Right' },
];

interface Props {
    onConfirm: (plasticType: string, detectionResult: DetectResponse) => void;
    onBack: () => void;
}

// ─── Camera Modal Component ──────────────────────────────────────

function CameraModal({
    viewLabel,
    onCapture,
    onClose,
}: {
    viewLabel: string;
    onCapture: (file: File) => void;
    onClose: () => void;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

    const startCamera = useCallback(async (facing: 'environment' | 'user') => {
        // Stop existing stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
        }
        setCameraReady(false);
        setCameraError('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => setCameraReady(true);
            }
        } catch {
            setCameraError('Camera access denied or unavailable. Please allow camera permissions and try again.');
        }
    }, []);

    useEffect(() => {
        startCamera(facingMode);
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, [facingMode, startCamera]);

    const handleCapture = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    const file = new File([blob], `${viewLabel.toLowerCase()}_capture.jpg`, { type: 'image/jpeg' });
                    // Stop camera
                    if (streamRef.current) {
                        streamRef.current.getTracks().forEach(t => t.stop());
                    }
                    onCapture(file);
                }
            },
            'image/jpeg',
            0.92
        );
    };

    const toggleCamera = () => {
        setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/80 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="glass-card w-full max-w-lg p-5 relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-bold text-lg text-text-primary">📷 Capture — {viewLabel} View</h3>
                        <p className="text-xs text-text-muted mt-0.5">Position the plastic object in frame</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center hover:bg-danger/20 transition-colors"
                    >
                        <HiOutlineXMark className="text-text-secondary" />
                    </button>
                </div>

                {/* Camera View */}
                <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] mb-4">
                    {cameraError ? (
                        <div className="flex flex-col items-center justify-center h-full text-danger gap-3 p-6 text-center">
                            <HiOutlineCamera className="text-4xl" />
                            <p className="text-sm">{cameraError}</p>
                        </div>
                    ) : (
                        <>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />
                            {/* Guide Overlay */}
                            {cameraReady && (
                                <div className="absolute inset-0 pointer-events-none">
                                    {/* Corner markers */}
                                    <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-accent rounded-tl-lg" />
                                    <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-accent rounded-tr-lg" />
                                    <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-accent rounded-bl-lg" />
                                    <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-accent rounded-br-lg" />
                                    {/* Label */}
                                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full">
                                        <span className="text-xs text-white font-medium">{viewLabel} View</span>
                                    </div>
                                </div>
                            )}
                            {!cameraReady && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <HiOutlineArrowPath className="text-accent text-3xl animate-spin" />
                                </div>
                            )}
                        </>
                    )}
                </div>

                <canvas ref={canvasRef} className="hidden" />

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={toggleCamera}
                        className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"
                        disabled={!!cameraError}
                    >
                        <HiOutlineArrowPath /> Flip Camera
                    </button>
                    <button
                        onClick={handleCapture}
                        disabled={!cameraReady}
                        className="btn-primary flex-[2] flex items-center justify-center gap-2 text-sm disabled:opacity-40"
                    >
                        <HiOutlineCamera /> Capture Photo
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── Main Component ──────────────────────────────────────────────

export default function ImageUploadMode({ onConfirm, onBack }: Props) {
    const [files, setFiles] = useState<Record<ViewName, File | null>>({ front: null, back: null, left: null, right: null });
    const [previews, setPreviews] = useState<Record<ViewName, string | null>>({ front: null, back: null, left: null, right: null });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<DetectResponse | null>(null);
    const [error, setError] = useState('');
    const [confirmed, setConfirmed] = useState(false);
    const [selectedPlastic, setSelectedPlastic] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [cameraView, setCameraView] = useState<ViewName | null>(null);

    const inputRefs = useRef<Record<ViewName, HTMLInputElement | null>>({ front: null, back: null, left: null, right: null });

    const handleFile = useCallback((view: ViewName, file: File) => {
        setFiles(prev => ({ ...prev, [view]: file }));
        const url = URL.createObjectURL(file);
        setPreviews(prev => {
            if (prev[view]) URL.revokeObjectURL(prev[view]!);
            return { ...prev, [view]: url };
        });
        setResult(null);
        setConfirmed(false);
    }, []);

    const handleRemove = useCallback((view: ViewName) => {
        setPreviews(prev => {
            if (prev[view]) URL.revokeObjectURL(prev[view]!);
            return { ...prev, [view]: null };
        });
        setFiles(prev => ({ ...prev, [view]: null }));
        setResult(null);
        setConfirmed(false);
    }, []);

    const allUploaded = Object.values(files).every(Boolean);

    const handleDetect = async () => {
        if (!allUploaded) return;
        setLoading(true);
        setError('');
        try {
            const payload: Record<string, File> = {};
            (Object.keys(files) as ViewName[]).forEach(k => { if (files[k]) payload[k] = files[k]!; });
            const resp = await detectPlastic(payload);
            setResult(resp.data);
            if (resp.data.summary.selected_plastic) {
                setSelectedPlastic(resp.data.summary.selected_plastic.class_name);
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Detection failed');
        }
        setLoading(false);
    };

    // Get per-view best detection (any class, not just plastic)
    const viewConfidences = result?.detections.map(d => {
        const bestObj = d.objects.length > 0
            ? d.objects.reduce((a, b) => a.confidence > b.confidence ? a : b)
            : null;
        return { view: d.view, class_name: bestObj?.class_name || 'none', confidence: bestObj?.confidence || 0 };
    }) || [];

    // Unique plastic types detected
    const plasticTypes = [...new Set(
        result?.detections.flatMap(d => d.objects.map(o => o.class_name)) || []
    )];

    // Use the backend's selected confidence
    const selectedConf = result?.summary.selected_plastic?.confidence || 0;

    // Backend handles all detection logic — if it selected something, trust it
    const isPlasticDetected = result?.summary.selected_plastic != null;

    const handleConfirm = () => {
        if (!result || !isPlasticDetected) return;
        setConfirmed(true);
        const typeStr = selectedPlastic.split(' ')[0].toUpperCase();
        const target = ['PET', 'HDPE', 'LDPE', 'PP'].includes(typeStr) ? typeStr : 'HDPE';
        setTimeout(() => onConfirm(target, result), 800);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
            {/* ─── LEFT PANEL: Image Upload ───────────────── */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold">Upload 4-Side Images</h2>
                    <button onClick={onBack} className="btn-secondary text-xs py-1.5 px-3">← Back</button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                    {VIEWS.map(({ key, label }) => (
                        <div key={key}>
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className={`relative aspect-square rounded-2xl overflow-hidden border-2 border-dashed transition-colors ${previews[key] ? 'border-accent/40' : 'border-border hover:border-accent/30'
                                    }`}
                                onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={e => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const f = e.dataTransfer.files[0];
                                    if (f && f.type.startsWith('image/')) handleFile(key, f);
                                }}
                            >
                                <input
                                    ref={el => { inputRefs.current[key] = el; }}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(key, f); }}
                                />
                                {previews[key] ? (
                                    <>
                                        <img src={previews[key]!} alt={label} className="w-full h-full object-cover" />
                                        <button
                                            onClick={e => { e.stopPropagation(); handleRemove(key); }}
                                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-bg-base/80 flex items-center justify-center text-text-secondary hover:text-danger transition-colors"
                                        >
                                            <HiOutlineTrash className="text-sm" />
                                        </button>
                                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                                            <span className="text-xs font-medium text-white">{label}</span>
                                        </div>
                                        {/* Loading overlay */}
                                        {loading && (
                                            <div className="absolute inset-0 bg-bg-base/60 flex items-center justify-center">
                                                <HiOutlineArrowPath className="text-accent text-2xl animate-spin" />
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-text-muted gap-1.5 px-2">
                                        <HiOutlinePhoto className="text-2xl" />
                                        <span className="text-xs font-medium">{label}</span>
                                        <span className="text-[10px] text-text-muted">Tap below to add</span>
                                    </div>
                                )}
                            </motion.div>

                            {/* Upload / Camera Buttons for each view */}
                            {!previews[key] && (
                                <div className="flex gap-1.5 mt-1.5">
                                    <button
                                        onClick={() => inputRefs.current[key]?.click()}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-bg-card border border-border hover:border-accent/40 text-text-secondary hover:text-accent transition-colors text-xs font-medium cursor-pointer"
                                    >
                                        <HiOutlineArrowUpTray className="text-sm" />
                                        Upload
                                    </button>
                                    <button
                                        onClick={() => setCameraView(key)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-colors text-xs font-medium cursor-pointer"
                                    >
                                        <HiOutlineCamera className="text-sm" />
                                        Camera
                                    </button>
                                </div>
                            )}
                            {previews[key] && (
                                <div className="flex gap-1.5 mt-1.5">
                                    <button
                                        onClick={() => inputRefs.current[key]?.click()}
                                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-bg-card border border-border hover:border-accent/40 text-text-muted hover:text-accent transition-colors text-[10px] font-medium cursor-pointer"
                                    >
                                        <HiOutlineArrowUpTray className="text-xs" />
                                        Re-upload
                                    </button>
                                    <button
                                        onClick={() => setCameraView(key)}
                                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-colors text-[10px] font-medium cursor-pointer"
                                    >
                                        <HiOutlineCamera className="text-xs" />
                                        Retake
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <button
                    onClick={handleDetect}
                    disabled={!allUploaded || loading}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40"
                >
                    {loading ? <HiOutlineArrowPath className="animate-spin" /> : <HiOutlineSparkles />}
                    {loading ? 'Analyzing…' : 'Run Detection'}
                </button>

                {!allUploaded && (
                    <p className="text-text-muted text-xs text-center mt-3">Upload or capture all 4 views to enable detection</p>
                )}

                {error && (
                    <div className="mt-4 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">{error}</div>
                )}
            </div>

            {/* ─── RIGHT PANEL: Detection Results ─────────── */}
            <div className="glass-card p-6">
                {!result ? (
                    <div className="flex flex-col items-center justify-center h-full text-text-muted py-20">
                        <HiOutlinePhoto className="text-5xl mb-4 text-border" />
                        <p>Upload images and run detection</p>
                        <p className="text-sm mt-1">AI will identify plastic objects</p>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="results"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-5"
                        >
                            <h3 className="font-bold text-lg">Detection Results</h3>

                            {/* Per-view breakdown */}
                            <div className="space-y-3">
                                {viewConfidences.map((vc, i) => (
                                    <motion.div
                                        key={vc.view}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.08 }}
                                        className="flex items-center justify-between p-3 rounded-xl bg-bg-base/50 border border-border"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="capitalize text-sm font-medium text-text-primary">{vc.view}:</span>
                                            <span className={`text-sm font-semibold ${vc.confidence > 0.5 ? 'text-success' : 'text-text-muted'}`}>
                                                {vc.confidence > 0 ? vc.class_name : 'No plastic'}
                                            </span>
                                        </div>
                                        <span className={`text-sm font-bold ${vc.confidence > 0.5 ? 'text-accent' : 'text-text-muted'}`}>
                                            {vc.confidence > 0 ? `${(vc.confidence * 100).toFixed(0)}%` : '—'}
                                        </span>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Average confidence */}
                            {selectedConf > 0 && (
                                <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-text-secondary">Detection Confidence</span>
                                        <span className="text-lg font-bold text-accent">{(selectedConf * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="h-2 bg-border rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${selectedConf * 100}%` }}
                                            transition={{ duration: 0.8, ease: 'easeOut' }}
                                            className="h-full rounded-full bg-gradient-to-r from-accent-dim to-accent"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Plastic selector (if multiple) */}
                            {plasticTypes.length > 1 && (
                                <div className="relative">
                                    <label className="text-xs text-text-muted mb-1 block">Multiple plastics detected — select one:</label>
                                    <button
                                        onClick={() => setDropdownOpen(!dropdownOpen)}
                                        className="w-full btn-secondary flex items-center justify-between"
                                    >
                                        <span className="font-medium">{selectedPlastic || 'Select…'}</span>
                                        <HiOutlineChevronDown className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    <AnimatePresence>
                                        {dropdownOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                className="absolute z-10 mt-1 w-full rounded-xl glass-card border border-border overflow-hidden"
                                            >
                                                {plasticTypes.map(t => (
                                                    <button
                                                        key={t}
                                                        onClick={() => { setSelectedPlastic(t); setDropdownOpen(false); }}
                                                        className={`w-full px-4 py-2.5 text-sm text-left transition-colors ${selectedPlastic === t ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-bg-card-hover'
                                                            }`}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Final selection */}
                            {isPlasticDetected && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`p-4 rounded-xl border text-center ${confirmed
                                        ? 'border-success bg-success/10 glow-pulse-success'
                                        : 'border-accent/30 bg-accent/5'
                                        }`}
                                >
                                    <p className="text-xs text-text-muted mb-1">Final Selected</p>
                                    <p className="text-xl font-bold text-accent">{selectedPlastic}</p>
                                    <p className="text-sm text-text-secondary">
                                        Confidence: {(selectedConf * 100).toFixed(1)}%
                                    </p>

                                    {!confirmed && (
                                        <button onClick={handleConfirm} className="btn-primary mt-4 w-full flex items-center justify-center gap-2">
                                            <HiOutlineCheckCircle />
                                            Confirm &amp; Run Pyrolysis
                                        </button>
                                    )}
                                    {confirmed && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="mt-3 flex items-center justify-center gap-2 text-success font-semibold"
                                        >
                                            <HiOutlineCheckCircle className="text-xl" />
                                            Confirmed — Loading Dashboard…
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}

                            {!isPlasticDetected && result && (
                                <div className="p-4 rounded-xl border border-warning/30 bg-warning/5 text-center">
                                    <p className="text-warning text-sm font-medium">No high-confidence plastic detected</p>
                                    <p className="text-text-muted text-xs mt-1">Try uploading clearer images of the plastic object</p>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>

            {/* ─── Camera Modal ────────────────────────────── */}
            <AnimatePresence>
                {cameraView && (
                    <CameraModal
                        viewLabel={VIEWS.find(v => v.key === cameraView)?.label || ''}
                        onCapture={(file) => {
                            handleFile(cameraView, file);
                            setCameraView(null);
                        }}
                        onClose={() => setCameraView(null)}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}
