#!/usr/bin/env python3
"""Ingest LFW dataset into ml/data/raw.

Supports two modes:
1) kagglehub  : download jessicali9530/lfw-dataset via KaggleHub.
2) local-zip  : extract from an existing zip file.
"""

from __future__ import annotations

import argparse
import importlib
import shutil
import zipfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_RAW_DIR = REPO_ROOT / "ml" / "data" / "raw"
DEFAULT_DATASET_NAME = "lfw"
KAGGLE_DATASET_REF = "jessicali9530/lfw-dataset"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingest LFW dataset into ml/data/raw")
    parser.add_argument(
        "--mode",
        choices=["kagglehub", "local-zip"],
        default="kagglehub",
        help="Data source mode",
    )
    parser.add_argument(
        "--zip-path",
        type=Path,
        default=None,
        help="Path to local LFW zip (required for --mode local-zip)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_RAW_DIR,
        help="Raw data output directory",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing target directory",
    )
    return parser.parse_args()


def ensure_clean_dir(path: Path, force: bool) -> None:
    if path.exists():
        if not force:
            raise RuntimeError(
                f"Target directory already exists: {path}. Use --force to overwrite."
            )
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def count_images(root: Path) -> int:
    exts = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    return sum(1 for p in root.rglob("*") if p.suffix.lower() in exts)


def ingest_from_local_zip(zip_path: Path, target_dir: Path) -> None:
    if not zip_path or not zip_path.exists():
        raise FileNotFoundError("--zip-path is required and must point to an existing zip file")

    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(target_dir)


def ingest_from_kagglehub(target_dir: Path) -> None:
    try:
        kagglehub = importlib.import_module("kagglehub")
    except Exception as exc:
        raise RuntimeError(
            "kagglehub is not installed. Run: pip install kagglehub"
        ) from exc

    downloaded_path = Path(kagglehub.dataset_download(KAGGLE_DATASET_REF))

    # Copy files from kaggle cache path to project raw folder for stable pipeline paths.
    for item in downloaded_path.iterdir():
        dest = target_dir / item.name
        if item.is_dir():
            shutil.copytree(item, dest)
        else:
            shutil.copy2(item, dest)


def locate_lfw_root(target_dir: Path) -> Path:
    # Common cases: raw/lfw/lfw, raw/lfw/lfw_funneled, or images directly in raw/lfw.
    preferred = [target_dir / "lfw", target_dir / "lfw_funneled", target_dir]
    for root in preferred:
        if root.exists() and count_images(root) > 0:
            return root

    # Fallback: first subdir containing images
    for subdir in target_dir.rglob("*"):
        if subdir.is_dir() and count_images(subdir) > 0:
            return subdir

    return target_dir


def main() -> None:
    args = parse_args()

    dataset_root = args.output_dir.resolve() / DEFAULT_DATASET_NAME
    ensure_clean_dir(dataset_root, args.force)

    if args.mode == "local-zip":
        ingest_from_local_zip(args.zip_path, dataset_root)
    else:
        ingest_from_kagglehub(dataset_root)

    lfw_root = locate_lfw_root(dataset_root)
    image_count = count_images(lfw_root)

    print("Ingest completed")
    print(f"Dataset root: {dataset_root}")
    print(f"Detected image root: {lfw_root}")
    print(f"Total images: {image_count}")


if __name__ == "__main__":
    main()
