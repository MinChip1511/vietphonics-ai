import json
import logging
import threading
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, File, UploadFile, Form, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from .alignment import (
    needleman_wunsch,
    map_alignment_to_elsa_format,
    compute_pronunciation_score,
    generate_feedback_summary,
    generate_letter_highlights,
    SCORE_CAP_UNSURE
)
from .accounts import AuthError
from .audio_quality import analyze_signal
from . import config
from .catalog import CatalogError, UPLOAD_DIR
from .commerce import CommerceError
from .database import init_db
from .features import decode_audio_bytes, acoustic_81, nccf_pitch, resize_time
from .kids import KidError, record_attempt
from .routers import admin as admin_router, auth as auth_router, content as content_router, profiles as profiles_router
from .security import current_account
from .validation import ValidationError
from .verification import mark_unsure_phones, phone_confidences, cap_score_for_transcript, transcript_matches, is_off_target

log = logging.getLogger("vietphonics")
VOCAB_PATH = config.VOCAB_PATH
MODEL_BEST_PATH = config.MODEL_PATH

# Global model state holder
AI_STATE = {
    "model_loaded": False,
    "model": None,
    "phone2id": {},
    "id2phone": [],
    "device": "cpu",
    "phonetic_processor": None,
    "phonetic_model": None,
    "asr_head": None,
}

def try_init_model():
    """Attempts to load PyTorch model if torch and checkpoint are accessible."""
    if AI_STATE["model_loaded"]:
        return True
    try:
        import torch
        from .model import PAPL_NCCF

        if not VOCAB_PATH.exists():
            return False
        with open(VOCAB_PATH, "r", encoding="utf-8") as f:
            v = json.load(f)
            AI_STATE["phone2id"] = v.get("phone2id", {})
            AI_STATE["id2phone"] = v.get("id2phone", [])

        if MODEL_BEST_PATH.exists():
            device = "mps" if torch.backends.mps.is_available() else "cpu"
            ckpt = torch.load(MODEL_BEST_PATH, map_location=device, weights_only=False)
            config = ckpt.get("config", {})
            phonetic_input_dim = int(config.get("phonetic_input_dim", 768))

            # The checkpoint was trained with Vietnamese wav2vec2 features.
            # Keep this optional so the heuristic fallback still works in a
            # minimal install without downloading the extractor.
            from transformers import AutoProcessor, Wav2Vec2ForCTC
            processor_name = config.get(
                "wav2vec2", "nguyenvulebinh/wav2vec2-base-vietnamese-250h"
            )
            processor = AutoProcessor.from_pretrained(processor_name)
            # The same checkpoint has a speech-to-text head: use its encoder for the phonetic
            # features (identical to AutoModel) and its lm_head for the transcript check.
            ctc_model = Wav2Vec2ForCTC.from_pretrained(processor_name).to(device)
            ctc_model.eval()
            phonetic_model = ctc_model.wav2vec2
            AI_STATE["asr_head"] = ctc_model.lm_head

            vocab_size = len(AI_STATE["id2phone"])
            model = PAPL_NCCF(vocab=vocab_size, ph_in=phonetic_input_dim).to(device)
            state_dict = ckpt.get("model_state", ckpt)
            model.load_state_dict(state_dict)
            model.eval()
            AI_STATE["model"] = model
            AI_STATE["device"] = device
            AI_STATE["phonetic_processor"] = processor
            AI_STATE["phonetic_model"] = phonetic_model
            AI_STATE["model_loaded"] = True
            log.info("PAPL_NCCF model loaded on device %s", device)
            return True
    except Exception:
        log.exception("Model initialization failed: /api/analyze-audio will answer 503")
    return False


def _ctc_greedy_decode(logits, length, blank_id=0):
    """Decodes one PAPL-NCCF frame sequence into phone IDs."""
    ids = logits.argmax(-1)[0, :length].detach().cpu().tolist()
    decoded = []
    previous = None
    for phone_id in ids:
        if phone_id != previous and phone_id != blank_id:
            decoded.append(phone_id)
        previous = phone_id
    return decoded


# Messages for recordings that are not scored. The child is told what to do, never given a score.
NOT_SCORED_MESSAGES = {
    "no_speech": ("Cá Xanh chưa nghe thấy con đọc", "Con bấm vào micro rồi đọc to và rõ từ này nhé."),
    "noisy": ("Xung quanh đang hơi ồn", "Con hoặc ba mẹ tìm chỗ yên tĩnh, tắt nhạc và quạt, rồi đọc lại nhé."),
    "off_target": ("Cá Xanh nghe chưa giống từ này", "Con đọc đúng từ trên màn hình nhé, Cá Xanh sẽ chấm điểm cho con."),
}


def not_scored_result(result_type, quality=None, transcript=None, engine="none"):
    """Response for a recording that must not receive a score (silence, loud noise, a different word)."""
    headline, instruction = NOT_SCORED_MESSAGES[result_type]
    return {
        "scored": False,
        "result_type": result_type,
        "score": 0,
        "engine": engine,
        "message": {"headline": headline, "instruction": instruction},
        "canonical": [],
        "predicted": [],
        "alignment_details": [],
        "elsa_rows": [],
        "letter_highlights": [],
        "errors": [],
        "feedback": {"headline": headline, "badge": "", "encouragement": instruction, "tips": []},
        "asr_transcript": transcript,
        "asr_match": False if transcript is not None else None,
        "audio_quality": quality,
        "noise_warning": bool(quality and quality.get("warning")),
    }


def analyze_audio_neural(audio_bytes, canonical_str, target_word="", quality=None):
    """Runs the trained PAPL-NCCF model when all required assets are loaded."""
    import torch

    canonical_phones = [p for p in str(canonical_str).strip().split() if p]
    if not canonical_phones:
        raise ValueError("Canonical phoneme sequence is empty")

    phone_ids = []
    for phone in canonical_phones:
        if phone not in AI_STATE["phone2id"]:
            raise ValueError(f"Unknown canonical phoneme: {phone}")
        phone_ids.append(AI_STATE["phone2id"][phone])

    wav, sample_rate = decode_audio_bytes(audio_bytes)
    processor = AI_STATE["phonetic_processor"]
    phonetic_model = AI_STATE["phonetic_model"]
    model = AI_STATE["model"]
    device = AI_STATE["device"]

    inputs = processor(wav, sampling_rate=sample_rate, return_tensors="pt")
    input_values = inputs.input_values.to(device)
    attention_mask = getattr(inputs, "attention_mask", None)
    if attention_mask is not None:
        attention_mask = attention_mask.to(device)

    with torch.inference_mode():
        phonetic = phonetic_model(
            input_values, attention_mask=attention_mask
        ).last_hidden_state[0]

    # Speech-to-text first: a different word or sentence is not scored, and it saves the rest of the work.
    transcript = None
    if AI_STATE.get("asr_head") is not None and str(target_word).strip():
        with torch.inference_mode():
            asr_ids = AI_STATE["asr_head"](phonetic).argmax(-1)
        transcript = processor.batch_decode(asr_ids.unsqueeze(0))[0].strip()
        if is_off_target(transcript, target_word):
            log.info("target=%r transcript=%r -> off_target (not scored)", target_word, transcript)
            return not_scored_result("off_target", quality, transcript, f"papl_nccf_vietmdd_neural ({device})")

    frame_count = max(1, int(phonetic.shape[0]))
    acoustic = resize_time(acoustic_81(wav, sample_rate), frame_count)
    pitch = resize_time(nccf_pitch(wav, sample_rate), frame_count)
    canonical = torch.tensor([phone_ids], dtype=torch.long, device=device)
    canonical_lengths = torch.tensor([len(phone_ids)], dtype=torch.long, device=device)
    frame_lengths = torch.tensor([frame_count], dtype=torch.long, device=device)

    with torch.inference_mode():
        logits = model(
            acoustic.unsqueeze(0).to(device),
            pitch.unsqueeze(0).to(device),
            phonetic[:frame_count].unsqueeze(0).to(device),
            frame_lengths,
            canonical,
            canonical_lengths,
        )

    predicted = [AI_STATE["id2phone"][i] for i in _ctc_greedy_decode(logits, frame_count)]
    pairs = needleman_wunsch(canonical_phones, predicted)
    elsa_rows, letter_highlights = map_alignment_to_elsa_format(target_word, pairs)

    # Second opinions (see verification.py): per-phone confidence and a speech-to-text check.
    log_probs = torch.log_softmax(logits[0, :frame_count].float(), dim=-1)
    confidences = phone_confidences(log_probs, phone_ids)
    mark_unsure_phones(elsa_rows, confidences)
    if confidences is not None:
        letter_highlights = generate_letter_highlights(target_word, elsa_rows)
    score = compute_pronunciation_score(elsa_rows)

    capped = cap_score_for_transcript(score, transcript, target_word)
    if quality and quality.get("warning"):
        capped = min(capped, SCORE_CAP_UNSURE)  # background noise: never the top band
    min_conf = f"{min(confidences):.2f}" if confidences else "n/a"
    log.info("target=%r transcript=%r score=%s->%s min_conf=%s", target_word, transcript, score, capped, min_conf)
    score = capped
    return {
        "scored": True,
        "result_type": "scored",
        "score": score,
        "engine": f"papl_nccf_vietmdd_neural ({device})",
        "canonical": canonical_phones,
        "predicted": predicted,
        "alignment_details": elsa_rows,
        "elsa_rows": elsa_rows,
        "letter_highlights": letter_highlights,
        "errors": [row for row in elsa_rows if not row["is_correct"]],
        "feedback": generate_feedback_summary(score, elsa_rows, target_word),
        "asr_transcript": transcript,
        "asr_match": None if transcript is None else transcript_matches(target_word, transcript),
        "audio_quality": quality,
        "noise_warning": bool(quality and quality.get("warning")),
    }

# Modern Starlette/FastAPI lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    init_db()
    # The model takes a while to load: do it in the background so health checks answer straight away
    # (/api/health reports model_loaded; /api/analyze-audio answers 503 until it is true).
    if config.MODEL_BACKGROUND_LOAD:
        threading.Thread(target=try_init_model, name="model-loader", daemon=True).start()
    else:
        try_init_model()
    yield

app = FastAPI(
    title="VietPhonics AI Backend API",
    description="Mispronunciation Detection and Diagnosis (VietMDD PAPL-NCCF) for Vietnamese Phonics",
    version="1.0.0",
    lifespan=lifespan,
    # The interactive API docs list every admin route: keep them for development only.
    docs_url=None if config.PRODUCTION else "/docs",
    redoc_url=None if config.PRODUCTION else "/redoc",
    openapi_url=None if config.PRODUCTION else "/openapi.json",
)

# Enable CORS for Frontend dev server and mobile preview
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=False,  # sign-in uses a bearer token, not cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(AuthError)
async def _auth_error(_: Request, exc: AuthError):
    return JSONResponse(status_code=exc.status, content={"detail": exc.message})


@app.exception_handler(KidError)
async def _kid_error(_: Request, exc: KidError):
    return JSONResponse(status_code=exc.status, content={"detail": exc.message})


@app.exception_handler(CommerceError)
async def _commerce_error(_: Request, exc: CommerceError):
    return JSONResponse(status_code=exc.status, content={"detail": exc.message})


@app.exception_handler(ValidationError)
@app.exception_handler(CatalogError)
async def _bad_input(_: Request, exc: Exception):
    return JSONResponse(status_code=422, content={"detail": str(exc)})


app.include_router(auth_router.router)
app.include_router(profiles_router.router)
app.include_router(content_router.router)
app.include_router(admin_router.router)

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.get("/")
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "VietPhonics AI Backend",
        "model_loaded": AI_STATE["model_loaded"],
        "device": AI_STATE["device"],
        "vocab_size": len(AI_STATE["id2phone"]) if AI_STATE["id2phone"] else 0,
        "checkpoint": str(MODEL_BEST_PATH.name) if MODEL_BEST_PATH.exists() else None,
    }


@app.post("/api/analyze-audio")
async def analyze_audio(
    audio: UploadFile = File(...),
    canonical: str = Form(...),
    target_word: str = Form(""),
    engine_mode: str = Form("auto"),
    account: dict = Depends(current_account),
):
    """
    Receives recorded speech audio from browser (standardized 16kHz mono WAV),
    performs phoneme alignment and diagnosis, returns score and ELSA feedback.
    A scored result also gets an `attempt_id`: /api/record-practice takes the score from the server by
    that id, so a client cannot invent a score.
    """
    audio_bytes = await audio.read()

    # Silence and loud noise are rejected before any model runs (the model would still produce a score).
    quality = None
    try:
        wav, sample_rate = decode_audio_bytes(audio_bytes)
        quality = analyze_signal(wav, sample_rate)
    except Exception as exc:
        log.warning("Audio quality check skipped: %s", exc)
    if quality and quality["status"] != "ok":
        log.info("target=%r not scored: %s", target_word, quality)
        kind = "no_speech" if quality["status"] == "silent" else "noisy"
        return {"status": "success", "data": not_scored_result(kind, quality)}

    # No simulated scores: if the model cannot run, say so instead of inventing a result.
    if not (AI_STATE["model_loaded"] and engine_mode in {"auto", "live"}):
        raise HTTPException(status_code=503, detail="Cá Xanh đang khởi động, con thử lại sau ít phút nhé")
    try:
        res = analyze_audio_neural(audio_bytes, canonical, target_word, quality)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception:
        log.exception("Neural inference failed")
        raise HTTPException(status_code=503, detail="Không chấm được bản ghi này")

    if res.get("scored"):
        res["target_word"] = target_word
        res["attempt_id"] = record_attempt(res, account["id"])
    return {"status": "success", "data": res}
