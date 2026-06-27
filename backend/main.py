"""
GNM Nursing Assistant - FastAPI Backend
Handles: image/pdf/video upload -> Gemini parsing -> Odia translation /
question generation / free-form chat assistant.

Run:
    pip install -r requirements.txt
    export GEMINI_API_KEY="your_key_here"
    uvicorn main:app --reload --port 8000
"""

import os
import time
import uuid
import shutil
from typing import Optional, List

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from google import genai
from google.genai import types
from dotenv import load_dotenv
load_dotenv()

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("Set GEMINI_API_KEY environment variable before starting the server.")

client = genai.Client(api_key=GEMINI_API_KEY)

MODEL_FLASH = "gemini-2.5-flash"
MODEL_PRO = "gemini-2.5-pro"

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="GNM Nursing Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

MIME_BY_EXT = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".mkv": "video/x-matroska",
    ".webm": "video/webm",
}


def save_upload(file: UploadFile) -> str:
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in MIME_BY_EXT:
        raise HTTPException(400, f"Unsupported file type: {ext or 'unknown'}")
    local_name = f"{uuid.uuid4().hex}{ext}"
    local_path = os.path.join(UPLOAD_DIR, local_name)
    with open(local_path, "wb") as out:
        shutil.copyfileobj(file.file, out)
    return local_path, MIME_BY_EXT[ext]


def upload_to_gemini(local_path: str, mime_type: str):
    uploaded = client.files.upload(path=local_path, config={"mime_type": mime_type})
    f = client.files.get(name=uploaded.name)
    waited = 0
    while f.state == "PROCESSING" and waited < 120:
        time.sleep(3)
        waited += 3
        f = client.files.get(name=uploaded.name)
    if f.state == "FAILED":
        raise HTTPException(500, "Gemini failed to process the uploaded file.")
    return f


def gemini_generate(model: str, system_instruction: str, parts: list, json_schema: Optional[dict] = None) -> str:
    config_kwargs = {"system_instruction": system_instruction}
    if json_schema:
        config_kwargs["response_mime_type"] = "application/json"
        config_kwargs["response_schema"] = json_schema

    try:
        response = client.models.generate_content(
            model=model,
            contents=[{"role": "user", "parts": parts}],
            config=types.GenerateContentConfig(**config_kwargs),
        )
        return response.text
    except Exception as e:
        err = str(e)
        if "503" in err or "UNAVAILABLE" in err:
            raise HTTPException(503, "Gemini is busy right now. Please try again in a minute.")
        raise HTTPException(500, f"AI error: {err}")


def file_part(gemini_file):
    return {"file_data": {"file_uri": gemini_file.uri, "mime_type": gemini_file.mime_type}}


# ---------------------------------------------------------------------------
# System prompts
# ---------------------------------------------------------------------------

BASE_PERSONA = (
    "You are 'Sahayak', a friendly, patient teaching assistant for GNM "
    "(General Nursing and Midwifery) and Intermediate Physics/Science students "
    "in Odisha, India. Students often capture photos of textbook pages, class "
    "notes, or diagrams with their phone camera. Your job is to help them learn, "
    "exactly as instructed in each task below. Be accurate with medical and "
    "scientific terms - do not invent facts."
)

TRANSLATE_INSTRUCTION = (
    BASE_PERSONA
    + "\n\nTASK: The student has shared an image/PDF/video of a topic (could be "
    "handwritten notes, a printed textbook page, or a lecture). "
    "1) First, transcribe the original text/content line by line, exactly as it appears "
    "(preserve numbering, headings, and structure).\n"
    "2) Immediately below each original line, give its Odia translation.\n"
    "Format strictly like this for every line:\n\n"
    "**Line 1 (English/Original):** <original text>\n"
    "**ଓଡ଼ିଆ:** <Odia translation>\n\n"
    "Keep medical/technical terms (like 'Hemoglobin', 'Diabetes Mellitus') in English "
    "inside brackets after the Odia term so the student learns both, e.g. "
    "'ରକ୍ତ ସର୍କରା (Blood Sugar)'. If the image is a diagram, describe each labelled "
    "part the same line-by-line way. Do not skip any line."
)

QUESTIONS_INSTRUCTION = (
    BASE_PERSONA
    + "\n\nTASK: The student has shared study material (image/PDF/video) and wants "
    "practice questions to test themselves, exam-style, suitable for GNM nursing "
    "or Intermediate Physics exams. From the content provided, generate a mix of:\n"
    "- 5 Multiple Choice Questions (MCQs) with 4 options each and the correct answer marked\n"
    "- 3 Short Answer questions\n"
    "- 1 Long/Descriptive answer question\n"
    "Base every question strictly on the content shown - do not bring in unrelated topics. "
    "Write questions in English, but add the Odia translation of just the question text "
    "in brackets after each question."
)

CHAT_INSTRUCTION = (
    BASE_PERSONA
    + "\n\nTASK: Answer the student's question directly and clearly. "
    "IMPORTANT: Always reply in the SAME language the student used to ask. "
    "If they write in English → reply in English. "
    "If they write in Odia → reply in Odia. "
    "If they write in Hindi → reply in Hindi. "
    "Do NOT switch languages unless the student explicitly asks you to. "
    "If a file (image/PDF/video) is attached, use it as context for your answer. "
    "Keep explanations simple, use everyday examples relatable to students in Odisha, "
    "and avoid being overly long unless the student asks for detail."
)

VIDEO_SUMMARY_INSTRUCTION = (
    BASE_PERSONA
    + "\n\nTASK: The student uploaded a lecture/topic video. Break it down into a "
    "timestamped summary: for each distinct topic/segment, give the start-end "
    "timestamp, a short English summary, and an Odia summary. Format as a clean list."
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/translate")
async def translate_to_odia(file: UploadFile = File(...)):
    local_path, mime_type = save_upload(file)
    try:
        gfile = upload_to_gemini(local_path, mime_type)
        model = MODEL_PRO if mime_type.startswith("video") else MODEL_FLASH
        parts = [
            file_part(gfile),
            {"text": "Translate this content line by line into Odia as instructed."},
        ]
        result = gemini_generate(model, TRANSLATE_INSTRUCTION, parts)
        return {"result": result}
    finally:
        os.remove(local_path)


@app.post("/api/questions")
async def generate_questions(file: UploadFile = File(...), difficulty: str = Form("medium")):
    local_path, mime_type = save_upload(file)
    try:
        gfile = upload_to_gemini(local_path, mime_type)
        model = MODEL_PRO if mime_type.startswith("video") else MODEL_FLASH
        parts = [
            file_part(gfile),
            {"text": f"Generate {difficulty}-difficulty practice questions from this content as instructed."},
        ]
        result = gemini_generate(model, QUESTIONS_INSTRUCTION, parts)
        return {"result": result}
    finally:
        os.remove(local_path)


@app.post("/api/video-summary")
async def video_summary(file: UploadFile = File(...)):
    local_path, mime_type = save_upload(file)
    if not mime_type.startswith("video"):
        os.remove(local_path)
        raise HTTPException(400, "This endpoint accepts video files only.")
    try:
        gfile = upload_to_gemini(local_path, mime_type)
        parts = [
            file_part(gfile),
            {"text": "Summarize this video topic by topic with timestamps as instructed."},
        ]
        result = gemini_generate(MODEL_PRO, VIDEO_SUMMARY_INSTRUCTION, parts)
        return {"result": result}
    finally:
        os.remove(local_path)


@app.post("/api/chat")
async def chat(
    message: str = Form(...),
    history: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    import json

    parts = []
    local_path = None
    try:
        if file is not None:
            local_path, mime_type = save_upload(file)
            gfile = upload_to_gemini(local_path, mime_type)
            parts.append(file_part(gfile))

        parts.append({"text": message})

        contents = []
        if history:
            try:
                prior_turns = json.loads(history)
                for turn in prior_turns:
                    contents.append({
                        "role": "model" if turn["role"] == "assistant" else "user",
                        "parts": [{"text": turn["text"]}]
                    })
            except Exception:
                pass

        contents.append({"role": "user", "parts": parts})

        try:
            response = client.models.generate_content(
                model=MODEL_FLASH,
                contents=contents,
                config=types.GenerateContentConfig(system_instruction=CHAT_INSTRUCTION),
            )
            return {"result": response.text}
        except Exception as e:
            err = str(e)
            if "503" in err or "UNAVAILABLE" in err:
                raise HTTPException(503, "Gemini is busy right now. Please try again in a minute.")
            raise HTTPException(500, f"AI error: {err}")

    finally:
        if local_path:
            os.remove(local_path)
