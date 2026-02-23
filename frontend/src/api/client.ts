import axios from 'axios';
import type { DetectResponse, PredictResponse, PredictPayload, HealthResponse } from '../types';

const api = axios.create({ baseURL: '/api', timeout: 60_000 });

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
