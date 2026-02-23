/* ───────────────────────── API Types ───────────────────────── */

export interface BBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export interface Detection {
    class_name: string;
    confidence: number;
    bbox: BBox;
}

export interface ViewDetection {
    view: string;
    image_width: number;
    image_height: number;
    objects: Detection[];
}

export interface SelectedPlastic {
    view: string;
    class_name: string;
    confidence: number;
    bbox: BBox;
}

export interface DetectionSummary {
    total_detections: number;
    selected_plastic: SelectedPlastic | null;
    all_confidences: number[];
}

export interface DetectResponse {
    success: boolean;
    inference_time_ms: number;
    detections: ViewDetection[];
    summary: DetectionSummary;
}

export interface MaterialInfo {
    plastic_type: string;
    density_g_cm3: number;
    thickness_range_mm: string;
    melting_point_c: number;
    calorific_value_mj_kg: number;
    reactor_compatible: boolean;
}

export interface Sustainability {
    score: number;
    grade: string;
    yield_efficiency: string;
    emission_rating: string;
}

export interface RecommendedParams {
    temperature_c: number;
    pressure_bar: number;
    reaction_time_min: number;
    efficiency_pct: number;
}

export interface PredictResponse {
    plastic_type: string;
    weight_kg: number;
    mode: string;
    predicted_yield_pct: number;
    predicted_emission_g_per_kg: number;
    risk_level: string;
    sustainability: Sustainability;
    recommended_params: RecommendedParams;
    material_info: MaterialInfo;
}

export interface PredictPayload {
    plastic_type: string;
    weight: number;
    mode: 'auto' | 'manual';
    temperature?: number;
    pressure?: number;
}

export interface HealthResponse {
    status: string;
    model_loaded: boolean;
    model_path: string;
}

/* ───────────────────────── App State Types ────────────────── */

export type AppMode = 'landing' | 'image-upload' | 'manual' | 'partial' | 'dashboard';

export type ViewName = 'front' | 'back' | 'left' | 'right';

export interface AppState {
    mode: AppMode;
    plasticType: string;
    weight: number;
    condition: 'clean' | 'contaminated';
    predictionMode: 'auto' | 'manual';
    temperature: number;
    pressure: number;
    result: PredictResponse | null;
    detectionResult: DetectResponse | null;
}
