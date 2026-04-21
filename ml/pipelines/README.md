# ML Pipelines (LFW)

This folder contains the first two pipeline scripts for your FaceAI workflow:

- `ingest_lfw.py`    : download/extract raw LFW dataset
- `preprocess_lfw.py`: convert raw data to train/val/test + metadata

## 1) Ingest

Download from KaggleHub into `ml/data/raw/lfw`:

```bash
python ml/pipelines/ingest_lfw.py --mode kagglehub
```

Or use a local zip:

```bash
python ml/pipelines/ingest_lfw.py --mode local-zip --zip-path "C:/path/to/lfw-dataset.zip"
```

Useful options:

- `--output-dir`: change raw data base directory (default: `ml/data/raw`)
- `--force`: overwrite existing target directory

Requirements for KaggleHub mode:

```bash
pip install kagglehub
```

## 2) Preprocess

Create processed splits in `ml/data/processed/lfw`:

```bash
python ml/pipelines/preprocess_lfw.py --force
```

This step will:

- read raw images from `ml/data/raw/lfw`
- resize images to square (`--img-size`, default `160`)
- split by identity into `train/val/test`
- write processed images to `ml/data/processed/lfw/<split>/<person>/`
- export `ml/data/processed/lfw/metadata.csv`

Useful options:

```bash
python ml/pipelines/preprocess_lfw.py --img-size 160 --min-images-per-person 2 --val-ratio 0.15 --test-ratio 0.15 --force
```

## Typical run order

```bash
python ml/pipelines/ingest_lfw.py --mode kagglehub
python ml/pipelines/preprocess_lfw.py --force
```
