import axios from 'axios';
import type { DetectResponse, PredictResponse, PredictPayload, HealthResponse } from '../types';

// In dev: Vite proxy rewrites /api → localhost:8000
// In production (Railway): VITE_API_BASE_URL points to deployed backend
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 60_000,
});

export const checkHealth = () => api.get<HealthResponse>('/health');

export const detectPlastic = (files: Record<string, File>) => {
    const fd = new FormData();
    Object.entries(files).forEach(([key, file]) => fd.append(key, file));
    return api.post<DetectResponse>('/detect', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export const predictPyrolysis = (payload: PredictPayload) =>
    api.post<PredictResponse>('/predict', payload);

/* ─── Advanced Dashboard Endpoints ─────────────────────────── */

export const advancedAIOptimize = (payload: Record<string, unknown>) =>
    api.post('/advanced-ai/optimize', payload);

export const simulatePhysics = (payload: Record<string, unknown>) =>
    api.post('/physics/simulate-physics', payload);

export const advancedEngineering = (payload: Record<string, unknown>) =>
    api.post('/engineering/advanced-engineering', payload);

export const sustainabilityReport = (payload: Record<string, unknown>) =>
    api.post('/sustainability/report', payload);

export const financialAnalysis = (payload: Record<string, unknown>) =>
    api.post('/financial/analysis', payload);

export default api;
