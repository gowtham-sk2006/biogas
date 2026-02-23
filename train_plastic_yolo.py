"""
YOLOv8 Plastic Object Detection — Complete Training Pipeline
=============================================================
This script:
  1. Downloads the TrashNet dataset from GitHub (plastic class only).
  2. Converts images to YOLO detection format.
  3. Creates an 80/20 train/val split.
  4. Trains YOLOv8n with transfer learning and data augmentation for 100 epochs.
  5. Reports mAP@50, precision, and recall.
  6. Saves the best model as plastic_yolo.pt.
"""

import os
import sys
import shutil
import random
import subprocess
from pathlib import Path
from glob import glob

# ─── Configuration ────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
TRASHNET_DIR = BASE_DIR / "trashnet"
PLASTIC_SRC = TRASHNET_DIR / "data" / "dataset-resized" / "plastic"
YOLO_DATASET = BASE_DIR / "plastic_yolo_dataset"
IMAGES_DIR = YOLO_DATASET / "images"
LABELS_DIR = YOLO_DATASET / "labels"
DATA_YAML = YOLO_DATASET / "data.yaml"
MODEL_SAVE_PATH = BASE_DIR / "plastic_yolo.pt"

TRAIN_RATIO = 0.80
RANDOM_SEED = 42
NUM_EPOCHS = 100
IMG_SIZE = 640
BATCH_SIZE = 16
MODEL_VARIANT = "yolov8n.pt"  # Nano — best for quick training + transfer learning

# ─── Step 1: Download TrashNet dataset ────────────────────────────────────────
def download_dataset():
    """Clone the trashnet repository and extract the dataset zip if needed."""
    global PLASTIC_SRC

    # If images already extracted, skip
    if PLASTIC_SRC.exists() and any(PLASTIC_SRC.glob("*.jpg")):
        print(f"[✓] Plastic images already present at {PLASTIC_SRC}")
        return

    # Clone repo if not present
    if not TRASHNET_DIR.exists():
        print("[↓] Cloning TrashNet repository …")
        subprocess.run(
            ["git", "clone", "--depth", "1", "https://github.com/garythung/trashnet.git", str(TRASHNET_DIR)],
            check=True,
        )

    # Extract the dataset zip
    dataset_zip = TRASHNET_DIR / "data" / "dataset-resized.zip"
    dataset_extracted = TRASHNET_DIR / "data" / "dataset-resized"
    if dataset_zip.exists() and not dataset_extracted.exists():
        import zipfile
        print("[↓] Extracting dataset-resized.zip …")
        with zipfile.ZipFile(dataset_zip, "r") as zf:
            zf.extractall(TRASHNET_DIR / "data")
        print("[✓] Extracted.")

    # Verify plastic folder exists
    if not PLASTIC_SRC.exists():
        alt = TRASHNET_DIR / "data" / "plastic"
        if alt.exists() and any(alt.glob("*.jpg")):
            PLASTIC_SRC = alt
        else:
            print("[✗] Could not locate plastic images.")
            sys.exit(1)

    print(f"[✓] Dataset ready. Plastic images at {PLASTIC_SRC}")


# ─── Step 2 & 3: Convert to YOLO format + 80/20 split ────────────────────────
def prepare_dataset():
    """
    • Copy plastic images into YOLO directory structure.
    • Create label files (class 0, full-image bbox).
    • Split into train / val with 80/20 ratio.
    """
    # Gather all .jpg images
    image_paths = sorted(PLASTIC_SRC.glob("*.jpg"))
    if not image_paths:
        # also try .png
        image_paths = sorted(PLASTIC_SRC.glob("*.png"))
    if not image_paths:
        print("[✗] No images found in", PLASTIC_SRC)
        sys.exit(1)

    print(f"[i] Found {len(image_paths)} plastic images")

    # Deterministic shuffle + split
    random.seed(RANDOM_SEED)
    random.shuffle(image_paths)
    split_idx = int(TRAIN_RATIO * len(image_paths))
    splits = {
        "train": image_paths[:split_idx],
        "val": image_paths[split_idx:],
    }

    for split_name, imgs in splits.items():
        img_dir = IMAGES_DIR / split_name
        lbl_dir = LABELS_DIR / split_name
        img_dir.mkdir(parents=True, exist_ok=True)
        lbl_dir.mkdir(parents=True, exist_ok=True)

        for src_path in imgs:
            dst_img = img_dir / src_path.name
            dst_lbl = lbl_dir / src_path.with_suffix(".txt").name

            shutil.copy2(src_path, dst_img)

            # YOLO label: <class_id> <x_center> <y_center> <width> <height>
            # Full-image bounding box (the entire image IS the plastic object)
            with open(dst_lbl, "w") as f:
                f.write("0 0.5 0.5 1.0 1.0\n")

    print(f"[✓] Split: {len(splits['train'])} train / {len(splits['val'])} val")

    # ─── Write data.yaml ──────────────────────────────────────────────────
    yaml_content = (
        f"path: {YOLO_DATASET.as_posix()}\n"
        f"train: images/train\n"
        f"val: images/val\n"
        f"nc: 1\n"
        f"names: ['plastic']\n"
    )
    DATA_YAML.parent.mkdir(parents=True, exist_ok=True)
    DATA_YAML.write_text(yaml_content, encoding="utf-8")
    print(f"[✓] data.yaml written to {DATA_YAML}")


# ─── Step 4 & 5: Train YOLOv8 with transfer learning + augmentation ──────────
def train_model():
    """
    Train YOLOv8n with:
      • Transfer learning (pretrained=True on COCO).
      • Extensive data augmentation parameters.
      • 100 epochs, 640×640, batch 16.
    """
    from ultralytics import YOLO

    print("\n" + "=" * 60)
    print("  YOLOv8 TRAINING — Plastic Object Detection")
    print("=" * 60 + "\n")

    model = YOLO(MODEL_VARIANT)

    results = model.train(
        data=str(DATA_YAML),
        epochs=NUM_EPOCHS,
        imgsz=IMG_SIZE,
        batch=BATCH_SIZE,
        name="plastic_yolo_run",
        project=str(BASE_DIR / "runs"),
        pretrained=True,
        # ── Data Augmentation ─────────────────────────────────────────
        hsv_h=0.015,       # Hue augmentation (fraction)
        hsv_s=0.7,         # Saturation augmentation (fraction)
        hsv_v=0.4,         # Value/brightness augmentation (fraction)
        degrees=15.0,       # Rotation ±15°
        translate=0.1,      # Translation ±10%
        scale=0.5,          # Scale ±50%
        shear=2.0,          # Shear ±2°
        perspective=0.0,    # Perspective (keep 0 for detection)
        flipud=0.1,         # Vertical flip probability
        fliplr=0.5,         # Horizontal flip probability
        mosaic=1.0,         # Mosaic augmentation probability
        mixup=0.1,          # Mixup augmentation probability
        copy_paste=0.0,     # Copy-paste augmentation
        # ── Other ─────────────────────────────────────────────────────
        patience=20,        # Early stopping patience
        save=True,
        save_period=25,     # Save checkpoint every 25 epochs
        plots=True,
        verbose=True,
    )

    return model, results


# ─── Step 6: Evaluate & report metrics ────────────────────────────────────────
def evaluate_and_save(model):
    """Run validation, print metrics, and save best weights as plastic_yolo.pt."""
    from ultralytics import YOLO

    print("\n" + "=" * 60)
    print("  EVALUATION")
    print("=" * 60 + "\n")

    # Run validation on the val split
    metrics = model.val(data=str(DATA_YAML))

    # Extract key metrics
    map50 = metrics.box.map50          # mAP@0.5
    precision = metrics.box.mp         # Mean precision
    recall = metrics.box.mr            # Mean recall
    map50_95 = metrics.box.map         # mAP@0.5:0.95

    print("\n" + "─" * 40)
    print("  FINAL METRICS")
    print("─" * 40)
    print(f"  mAP@50      : {map50:.4f}")
    print(f"  mAP@50:95   : {map50_95:.4f}")
    print(f"  Precision    : {precision:.4f}")
    print(f"  Recall       : {recall:.4f}")
    print("─" * 40 + "\n")

    # ─── Save best model ──────────────────────────────────────────────────
    # Find the best.pt from training runs
    best_pt_candidates = sorted(
        (BASE_DIR / "runs").rglob("best.pt"), key=lambda p: p.stat().st_mtime, reverse=True
    )
    if best_pt_candidates:
        best_pt = best_pt_candidates[0]
        shutil.copy2(best_pt, MODEL_SAVE_PATH)
        print(f"[✓] Best model saved as {MODEL_SAVE_PATH}")
    else:
        # Fallback: save current model state
        model.save(str(MODEL_SAVE_PATH))
        print(f"[✓] Model saved as {MODEL_SAVE_PATH}")

    return {
        "mAP@50": map50,
        "mAP@50:95": map50_95,
        "Precision": precision,
        "Recall": recall,
    }


# ─── Main ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("  PLASTIC OBJECT DETECTION — YOLOv8 PIPELINE")
    print("=" * 60 + "\n")

    # Step 1: Download
    download_dataset()

    # Step 2-3: YOLO format + split
    prepare_dataset()

    # Step 4-5: Train with transfer learning & augmentation
    model, results = train_model()

    # Step 6-7: Evaluate & save
    final_metrics = evaluate_and_save(model)

    print("\n✅ Pipeline complete!")
    print(f"   Model   → {MODEL_SAVE_PATH}")
    print(f"   Metrics → mAP@50={final_metrics['mAP@50']:.4f}, "
          f"P={final_metrics['Precision']:.4f}, R={final_metrics['Recall']:.4f}")
