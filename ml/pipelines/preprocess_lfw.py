#!/usr/bin/env python3
"""Preprocess LFW for training.

Steps:
1) Find raw LFW images under ml/data/raw/lfw
2) Filter classes with at least N images
3) Split by identity into train/val/test
4) Resize images and save into ml/data/processed/lfw/<split>/<person>/
5) Export metadata.csv
"""

from __future__ import annotations

import argparse
import csv
import random
import shutil
from pathlib import Path

try:
    from PIL import Image
except Exception as exc:  # pragma: no cover
    raise RuntimeError("Pillow is required. Install with: pip install pillow") from exc


REPO_ROOT = Path(__file__).resolve().parents[2]
RAW_BASE = REPO_ROOT / "ml" / "data" / "raw" / "lfw"
PROCESSED_BASE = REPO_ROOT / "ml" / "data" / "processed" / "lfw"

VALID_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Preprocess LFW dataset")
    parser.add_argument("--raw-dir", type=Path, default=RAW_BASE)
    parser.add_argument("--out-dir", type=Path, default=PROCESSED_BASE)
    parser.add_argument("--img-size", type=int, default=160, help="Output square image size")
    parser.add_argument("--min-images-per-person", type=int, default=2)
    parser.add_argument("--val-ratio", type=float, default=0.15)
    parser.add_argument("--test-ratio", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--force", action="store_true", help="Overwrite output directory")
    return parser.parse_args()


def find_image_root(raw_dir: Path) -> Path:
    candidates = [raw_dir / "lfw-deepfunneled", raw_dir / "lfw", raw_dir]
    for candidate in candidates:
        if candidate.exists() and any(p.suffix.lower() in VALID_EXTS for p in candidate.rglob("*")):
            return candidate
    raise FileNotFoundError(f"No images found under: {raw_dir}")


def normalize_identity_root(image_root: Path) -> Path:
    """Unwrap single-folder wrappers until we reach person directories.

    Some LFW bundles are nested like:
    raw/lfw/lfw-deepfunneled/lfw-deepfunneled/<person>/<images>
    """
    current = image_root
    while True:
        subdirs = [d for d in current.iterdir() if d.is_dir()]
        direct_images = [p for p in current.iterdir() if p.is_file() and p.suffix.lower() in VALID_EXTS]

        if direct_images:
            return current

        # If there is a single wrapper directory and no direct images, unwrap it.
        if len(subdirs) == 1:
            current = subdirs[0]
            continue

        return current


def list_person_images(image_root: Path) -> dict[str, list[Path]]:
    by_person: dict[str, list[Path]] = {}
    for person_dir in image_root.iterdir():
        if not person_dir.is_dir():
            continue
        images = [p for p in person_dir.iterdir() if p.is_file() and p.suffix.lower() in VALID_EXTS]
        if images:
            by_person[person_dir.name] = sorted(images)
    return by_person


def split_for_person(images: list[Path], val_ratio: float, test_ratio: float) -> dict[str, list[Path]]:
    total = len(images)
    n_test = max(1, int(total * test_ratio))
    n_val = max(1, int(total * val_ratio))
    n_train = total - n_test - n_val

    if n_train < 1:
        n_train = 1
        if n_val > 1:
            n_val -= 1
        elif n_test > 1:
            n_test -= 1

    return {
        "train": images[:n_train],
        "val": images[n_train : n_train + n_val],
        "test": images[n_train + n_val : n_train + n_val + n_test],
    }


def ensure_output(out_dir: Path, force: bool) -> None:
    if out_dir.exists():
        if not force:
            raise RuntimeError(f"Output exists: {out_dir}. Use --force to overwrite.")
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)


def process_and_save(src: Path, dst: Path, img_size: int) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as img:
        img = img.convert("RGB")
        img = img.resize((img_size, img_size), Image.BILINEAR)
        img.save(dst, format="JPEG", quality=95)


def main() -> None:
    args = parse_args()
    random.seed(args.seed)

    image_root = find_image_root(args.raw_dir)
    identity_root = normalize_identity_root(image_root)
    by_person = list_person_images(identity_root)

    filtered = {
        person: imgs
        for person, imgs in by_person.items()
        if len(imgs) >= args.min_images_per_person
    }
    if not filtered:
        raise RuntimeError("No classes left after filtering. Lower --min-images-per-person.")

    ensure_output(args.out_dir, args.force)

    metadata_path = args.out_dir / "metadata.csv"
    rows: list[tuple[str, str, str]] = []

    class_count = 0
    image_count = 0

    for person, imgs in sorted(filtered.items()):
        class_count += 1
        random.shuffle(imgs)
        split = split_for_person(imgs, args.val_ratio, args.test_ratio)

        for split_name, split_imgs in split.items():
            for src in split_imgs:
                out_name = f"{src.stem}.jpg"
                dst = args.out_dir / split_name / person / out_name
                process_and_save(src, dst, args.img_size)
                rel_path = dst.relative_to(args.out_dir).as_posix()
                rows.append((rel_path, person, split_name))
                image_count += 1

    with metadata_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["relative_path", "label", "split"])
        writer.writerows(rows)

    print("Preprocess completed")
    print(f"Raw image root: {image_root}")
    print(f"Identity root: {identity_root}")
    print(f"Output dir: {args.out_dir}")
    print(f"Classes: {class_count}")
    print(f"Images: {image_count}")
    print(f"Metadata: {metadata_path}")


if __name__ == "__main__":
    main()
