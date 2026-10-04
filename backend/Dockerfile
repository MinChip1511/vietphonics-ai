# Backend image for Render (or any Docker host). Build context = repository root:
#   docker build -f backend/Dockerfile -t vietphonics-api .
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/opt/hf \
    VIETPHONICS_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends libsndfile1 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# CPU-only PyTorch (the default wheel bundles CUDA and is several times larger).
COPY backend/requirements.txt backend/requirements-torch.txt ./backend/
RUN pip install --extra-index-url https://download.pytorch.org/whl/cpu -r backend/requirements-torch.txt \
 && pip install -r backend/requirements.txt

# Download the Vietnamese wav2vec2 at build time so a restart never waits for (or depends on) Hugging Face.
RUN python -c "from transformers import AutoProcessor, Wav2Vec2ForCTC; n='nguyenvulebinh/wav2vec2-base-vietnamese-250h'; AutoProcessor.from_pretrained(n); Wav2Vec2ForCTC.from_pretrained(n)"
ENV HF_HUB_OFFLINE=1

COPY backend/app ./backend/app
COPY backend/seed_assets ./backend/seed_assets
COPY vocab.json papl_nccf_vietmdd.pt ./

# Render sets $PORT; data (SQLite, uploads) belongs on a persistent disk, see render.yaml.
EXPOSE 10000
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-10000} --proxy-headers --forwarded-allow-ips='*'"]
