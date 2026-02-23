import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
});

// ─── Types ───────────────────────────────────────────────────────

export interface PredictRequest {
    plastic_type: string;
    weight: number;
    mode: 'auto' | 'manual';
    temperature?: number;
    pressure?: number;
}

export interface PredictResponse {
    success: boolean;
    plastic_type: string;
    weight_kg: number;
    mode: string;
    predicted_yield_pct: number;
    predicted_emission_g_per_kg: number;
    predicted_risk_level: string;
    recommended_params: {
        temperature_c: number;
        pressure_atm: number;
        source: string;
    };
    sustainability: {
        score: number;
        grade: string;
        yield_efficiency: string;
        emission_rating: string;
        risk_assessment: string;
    };
    material_info: {
        full_name: string;
        density_g_cm3: number;
        calorific_value_mj_kg: number;
        melting_point_c: number;
    };
    optimization?: {
        optimal_temperature_c: number;
        optimal_pressure_atm: number;
        optimization_score: number;
        combinations_evaluated: number;
        top_alternatives: Record<string, unknown>[];
    };
}

export interface HealthResponse {
    status: string;
    model_loaded: boolean;
    model_path: string;
}

// ─── API Calls ───────────────────────────────────────────────────

export const checkHealth = () => api.get<HealthResponse>('/health');

export const predictPyrolysis = (data: PredictRequest) =>
    api.post<PredictResponse>('/predict', data);

export const detectPlastic = (files: Record<string, File>) => {
    const form = new FormData();
    Object.entries(files).forEach(([key, file]) => form.append(key, file));
    return api.post('/detect', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export default api;
