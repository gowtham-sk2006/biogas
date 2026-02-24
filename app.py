"""
FastAPI Plastic Detection Backend
==================================
Production-ready API that loads plastic_yolo.pt and exposes
a POST /detect endpoint for multi-view plastic detection.
"""

import io
import logging
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

# Force CPU-only — disable any GPU auto-detection
os.environ["CUDA_VISIBLE_DEVICES"] = ""
os.environ["YOLO_VERBOSE"] = "false"

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel, Field
from ultralytics import YOLO
import traceback


MODEL_PATH = Path(__file__).resolve().parent / "plastic_yolo.pt"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff"}
CONFIDENCE_THRESHOLD = 0.20
VIEW_NAMES = ("front", "back", "left", "right")

logger = logging.getLogger("plastic_detector")
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")

# ─── Pydantic Schemas ────────────────────────────────────────────────────────

class BoundingBox(BaseModel):
    x1: float = Field(..., description="Top-left x coordinate")
    y1: float = Field(..., description="Top-left y coordinate")
    x2: float = Field(..., description="Bottom-right x coordinate")
    y2: float = Field(..., description="Bottom-right y coordinate")


class Detection(BaseModel):
    class_name: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    bbox: BoundingBox


class ViewDetection(BaseModel):
    view: str
    image_width: int
    image_height: int
    objects: list[Detection]


class SelectedPlastic(BaseModel):
    view: str
    class_name: str
    confidence: float
    bbox: BoundingBox


class DetectionSummary(BaseModel):
    total_detections: int
    selected_plastic: Optional[SelectedPlastic] = None
    all_confidences: list[float] = Field(
        default_factory=list,
        description="All confidence scores sorted descending",
    )


class DetectResponse(BaseModel):
    success: bool = True
    inference_time_ms: float
    detections: list[ViewDetection]
    summary: DetectionSummary


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_path: str


# ─── Model Singleton ─────────────────────────────────────────────────────────
_model: Optional[YOLO] = None


def get_model() -> YOLO:
    """Return the loaded YOLO model or raise."""
    if _model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return _model


# ─── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global _model
    # Load YOLO model
    logger.info("Loading model from %s …", MODEL_PATH)
    if not os.path.exists(MODEL_PATH):
        logger.warning(f"Model file {MODEL_PATH} missing, loading default YOLO model (yolov8n.pt)")
        _model = YOLO("yolov8n.pt")
    else:
        _model = YOLO(str(MODEL_PATH))
    _model.to("cpu")  # Force CPU
    logger.info("✓ Model loaded successfully (CPU-only mode)")

    # Initialize database
    try:
        from database.config import init_db, close_db
        await init_db()
        logger.info("✓ Database initialized")
    except Exception as e:
        logger.warning("Database init skipped: %s (app will work without DB)", e)

    yield

    # Cleanup
    try:
        from database.config import close_db
        await close_db()
    except Exception:
        pass
    _model = None
    logger.info("Model unloaded")


# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Plastic Detection API",
    description="Multi-view plastic object detection using YOLOv8",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler that captures ANY unhandled error,
    logs the traceback, and returns a JSON response with CORS headers.
    This prevents 'ghost' CORS errors when the server crashes.
    """
    tb = traceback.format_exc()
    logger.error("Unhandled Exception: %s\n%s", exc, tb)
    
    # Manually define CORS headers because CORSMiddleware 
    # might be bypassed in some crash scenarios
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
    }
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal Server Error",
            "detail": str(exc),
            "traceback": tb if os.getenv("DEBUG", "false").lower() == "true" else None
        },
        headers=headers
    )


@app.get("/")
def root():
    return {
        "message": "Biogas AI API is running! 🚀",
        "docs": "/docs",
        "status": "online"
    }


# Register Advanced AI Router
from ai_intelligence.router import router as ai_router
app.include_router(ai_router)

# Register Physics Simulation Router
from backend.physics_simulation.router import router as physics_router
app.include_router(physics_router)

# Register Advanced Engineering Router
from backend.engineering_layer.router import router as engineering_router
app.include_router(engineering_router)

# Register Sustainability Engine Router
from backend.sustainability_engine.router import router as sustainability_router
app.include_router(sustainability_router)

# Register Financial Engine Router
from backend.financial_engine.router import router as financial_router
app.include_router(financial_router)

# Register Database History Router
from database.router import router as history_router
app.include_router(history_router)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _validate_image(file: UploadFile, view_name: str) -> None:
    """Validate that the uploaded file is an image."""
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=422,
            detail=f"'{view_name}' must be an image file, got {file.content_type}",
        )
    ext = Path(file.filename or "").suffix.lower()
    if ext and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"'{view_name}' has unsupported extension '{ext}'. Allowed: {ALLOWED_EXTENSIONS}",
        )


async def _read_image(file: UploadFile) -> np.ndarray:
    """Read an UploadFile into a numpy RGB array."""
    raw = await file.read()
    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Cannot decode image: {exc}")
    return np.array(img)


def _run_inference(model: YOLO, image: np.ndarray, view_name: str) -> ViewDetection:
    """Run YOLO on a single image using CPU only."""
    h, w = image.shape[:2]
    results = model.predict(
        source=image,
        conf=CONFIDENCE_THRESHOLD,
        verbose=False,
        device="cpu",
        half=False,  # No fp16 on CPU
    )

    objects: list[Detection] = []
    for r in results:
        boxes = r.boxes
        if boxes is None:
            continue
        for i in range(len(boxes)):
            xyxy = boxes.xyxy[i].cpu().numpy()
            conf = float(boxes.conf[i].cpu().numpy())
            cls_id = int(boxes.cls[i].cpu().numpy())
            cls_name = model.names.get(cls_id, f"class_{cls_id}")
            objects.append(
                Detection(
                    class_name=cls_name,
                    confidence=round(conf, 4),
                    bbox=BoundingBox(
                        x1=round(float(xyxy[0]), 2),
                        y1=round(float(xyxy[1]), 2),
                        x2=round(float(xyxy[2]), 2),
                        y2=round(float(xyxy[3]), 2),
                    ),
                )
            )

    return ViewDetection(view=view_name, image_width=w, image_height=h, objects=objects)


def _aggregate(view_detections: list[ViewDetection]) -> DetectionSummary:
    """Aggregate detections across all views and select the best plastic detection."""
    all_dets: list[tuple[str, Detection]] = []
    for vd in view_detections:
        for obj in vd.objects:
            all_dets.append((vd.view, obj))

    total = len(all_dets)
    all_confidences = sorted([d.confidence for _, d in all_dets], reverse=True)

    selected: Optional[SelectedPlastic] = None
    if all_dets:
        # Prioritize any 'plastic' detection
        plastic_dets = [d for d in all_dets if "plastic" in d[1].class_name.lower()]
        
        if plastic_dets:
            best_view, best_det = max(plastic_dets, key=lambda x: x[1].confidence)
        else:
            # No plastic found — pick highest confidence detection regardless
            best_view, best_det = max(all_dets, key=lambda x: x[1].confidence)
            
        selected = SelectedPlastic(
            view=best_view,
            class_name=best_det.class_name,
            confidence=best_det.confidence,
            bbox=best_det.bbox,
        )

    return DetectionSummary(
        total_detections=total,
        selected_plastic=selected,
        all_confidences=all_confidences,
    )


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Check API health and model status."""
    return HealthResponse(
        status="healthy",
        model_loaded=_model is not None,
        model_path=str(MODEL_PATH),
    )


@app.post("/detect", response_model=DetectResponse, tags=["Detection"])
async def detect_plastic(
    front: UploadFile = File(..., description="Front view image"),
    back: UploadFile = File(..., description="Back view image"),
    left: UploadFile = File(..., description="Left view image"),
    right: UploadFile = File(..., description="Right view image"),
):
    """
    Run plastic detection on 4 view images.

    Accepts multipart/form-data with four image files:
    **front**, **back**, **left**, **right**.

    Returns per-view detections with bounding boxes and confidence scores,
    plus a summary with the highest-confidence plastic selection.
    """
    model = get_model()
    uploads = {"front": front, "back": back, "left": left, "right": right}

    # Validate all images first
    for view_name, file in uploads.items():
        _validate_image(file, view_name)

    # Read images
    images: dict[str, np.ndarray] = {}
    for view_name, file in uploads.items():
        images[view_name] = await _read_image(file)

    # Run inference
    t0 = time.perf_counter()
    view_detections: list[ViewDetection] = []
    for view_name in VIEW_NAMES:
        vd = _run_inference(model, images[view_name], view_name)
        view_detections.append(vd)
    elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)

    # Aggregate
    summary = _aggregate(view_detections)

    logger.info(
        "Detection complete: %d objects found in %.1fms (best=%.4f)",
        summary.total_detections,
        elapsed_ms,
        summary.selected_plastic.confidence if summary.selected_plastic else 0.0,
    )

    return DetectResponse(
        success=True,
        inference_time_ms=elapsed_ms,
        detections=view_detections,
        summary=summary,
    )

from enum import Enum
from optimize_pyrolysis import predict as ml_predict, optimize as ml_optimize
from material_properties import get_material_properties


class PredictionMode(str, Enum):
    auto = "auto"
    manual = "manual"


class OptimizationObjective(str, Enum):
    max_yield = "max-yield"
    min_emission = "min-emission"
    max_profit = "max-profit"
    balanced = "balanced"


# Mapping: objective → (yield_weight, emission_weight)
OBJECTIVE_WEIGHTS: dict[OptimizationObjective, tuple[float, float]] = {
    OptimizationObjective.max_yield:    (0.90, 0.10),
    OptimizationObjective.min_emission: (0.10, 0.90),
    OptimizationObjective.max_profit:   (0.70, 0.30),
    OptimizationObjective.balanced:     (0.60, 0.40),
}


class PredictRequest(BaseModel):
    plastic_type: str = Field(..., description="PET, HDPE, LDPE, or PP")
    weight: float = Field(..., gt=0, description="Feedstock weight in kg")
    mode: PredictionMode = Field(default=PredictionMode.auto, description="auto or manual")
    temperature: Optional[float] = Field(None, ge=200, le=800, description="Reactor temperature °C (required for manual)")
    pressure: Optional[float] = Field(None, ge=0.5, le=20, description="Reactor pressure atm (required for manual)")
    objective: OptimizationObjective = Field(default=OptimizationObjective.balanced, description="Optimization goal")


class RecommendedParams(BaseModel):
    temperature_c: float
    pressure_atm: float
    source: str = Field(..., description="'user_input' or 'optimizer'")


class SustainabilityMetrics(BaseModel):
    score: float = Field(..., ge=0, le=100, description="0–100 sustainability score")
    grade: str = Field(..., description="A / B / C / D / F")
    yield_efficiency: str
    emission_rating: str
    risk_assessment: str


class MaterialInfo(BaseModel):
    full_name: str
    density_g_cm3: float
    calorific_value_mj_kg: float
    melting_point_c: int


class OptimizationInfo(BaseModel):
    optimal_temperature_c: float
    optimal_pressure_atm: float
    optimization_score: float
    combinations_evaluated: int
    top_alternatives: list[dict]


class PredictResponse(BaseModel):
    success: bool = True
    plastic_type: str
    weight_kg: float
    mode: str
    objective: str = "balanced"
    predicted_yield_pct: float
    predicted_emission_g_per_kg: float
    predicted_risk_level: str
    recommended_params: RecommendedParams
    sustainability: SustainabilityMetrics
    material_info: MaterialInfo
    optimization: Optional[OptimizationInfo] = None


def _compute_sustainability(yield_pct: float, emission: float, risk: str) -> SustainabilityMetrics:
    """Compute a 0–100 sustainability score from predictions."""
    # Yield component (0–40): higher yield = better
    yield_score = min(40, (yield_pct / 65) * 40)

    # Emission component (0–35): lower emission = better
    emission_score = max(0, 35 * (1 - emission / 350))

    # Risk component (0–25)
    risk_scores = {"Low": 25, "Medium": 15, "High": 5}
    risk_score = risk_scores.get(risk, 10)

    total = round(yield_score + emission_score + risk_score, 1)
    total = min(100, max(0, total))

    # Grade
    if total >= 80:
        grade = "A"
    elif total >= 65:
        grade = "B"
    elif total >= 50:
        grade = "C"
    elif total >= 35:
        grade = "D"
    else:
        grade = "F"

    # Labels
    yield_eff = "Excellent" if yield_pct > 45 else "Good" if yield_pct > 30 else "Low"
    emission_rat = "Low" if emission < 100 else "Moderate" if emission < 200 else "High"
    risk_assess = f"{risk} risk"

    return SustainabilityMetrics(
        score=total,
        grade=grade,
        yield_efficiency=yield_eff,
        emission_rating=emission_rat,
        risk_assessment=risk_assess,
    )


@app.post("/predict", response_model=PredictResponse, tags=["Prediction"])
async def predict_pyrolysis(req: PredictRequest):
    """
    Predict pyrolysis outcomes for a given plastic type and weight.

    **Modes:**
    - `auto`: Runs the optimization engine to find best temperature & pressure.
    - `manual`: Uses the provided temperature and pressure values.

    Returns yield, emission, risk, recommended parameters, sustainability score,
    and material properties.
    """
    key = req.plastic_type.strip().upper()
    valid_types = ["PET", "HDPE", "LDPE", "PP"]
    if key not in valid_types:
        raise HTTPException(status_code=422, detail=f"Invalid plastic_type. Must be one of {valid_types}")

    # ── Material info ─────────────────────────────────────────────────────
    mat = get_material_properties(key)
    mat_info = MaterialInfo(
        full_name=mat["full_name"],
        density_g_cm3=mat["density"]["typical"],
        calorific_value_mj_kg=mat["calorific_value"]["value"],
        melting_point_c=mat["ideal_temperature_range"]["melting_point_celsius"],
    )

    optimization_info = None

    if req.mode == PredictionMode.auto:
        # ── Auto: run optimizer with objective-driven weights ─────────────
        yw, ew = OBJECTIVE_WEIGHTS.get(req.objective, (0.6, 0.4))
        opt = ml_optimize(plastic_type=key, weight=req.weight, yield_weight=yw, emission_weight=ew)

        temperature = opt["optimal_temperature_c"]
        pressure = opt["optimal_pressure_atm"]
        yield_pct = opt["predicted_yield_pct"]
        emission = opt["predicted_emission_g_per_kg"]
        risk = opt["predicted_risk_level"]

        recommended = RecommendedParams(
            temperature_c=temperature,
            pressure_atm=pressure,
            source="optimizer",
        )

        optimization_info = OptimizationInfo(
            optimal_temperature_c=temperature,
            optimal_pressure_atm=pressure,
            optimization_score=opt["optimization_score"],
            combinations_evaluated=opt["search_space"]["combinations_evaluated"],
            top_alternatives=opt["top_5_alternatives"],
        )

    else:
        # ── Manual: validate required fields ──────────────────────────────
        if req.temperature is None or req.pressure is None:
            raise HTTPException(
                status_code=422,
                detail="temperature and pressure are required in manual mode",
            )

        temperature = req.temperature
        pressure = req.pressure
        pred = ml_predict(
            plastic_type=key,
            temperature=temperature,
            weight=req.weight,
            pressure=pressure,
        )

        yield_pct = pred["gas_yield_pct"]
        emission = pred["co2_emission_g_per_kg"]
        risk = pred["risk_level"]

        recommended = RecommendedParams(
            temperature_c=temperature,
            pressure_atm=pressure,
            source="user_input",
        )

    # ── Sustainability ────────────────────────────────────────────────────
    sustainability = _compute_sustainability(yield_pct, emission, risk)

    logger.info(
        "Predict [%s] mode=%s: yield=%.1f%%, emission=%.1f g/kg, risk=%s, score=%.1f",
        key, req.mode, yield_pct, emission, risk, sustainability.score,
    )

    response = PredictResponse(
        plastic_type=key,
        weight_kg=req.weight,
        mode=req.mode.value,
        objective=req.objective.value,
        predicted_yield_pct=yield_pct,
        predicted_emission_g_per_kg=emission,
        predicted_risk_level=risk,
        recommended_params=recommended,
        sustainability=sustainability,
        material_info=mat_info,
        optimization=optimization_info,
    )

    # Auto-save to database (non-blocking, failure-safe)
    try:
        from database.config import async_session
        from database.crud import save_prediction
        async with async_session() as db:
            await save_prediction(db, response.model_dump())
    except Exception as e:
        logger.debug("DB save skipped: %s", e)

    return response


# ─── Entry point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
