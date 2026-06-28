"""
amasathi - Production FastAPI Backend v5.1
- Per-user token limits (daily)
- Per-user request limits (per minute + per day)
- Hard blocks so no user can exceed their plan
- MongoDB for users, chat history, token usage, payments
- JWT auth + Google OAuth2
- 4 subscription plans with expiry
- Device/session limiting (max 2 devices)
- Chat history stored in DB
- Admin panel with full visibility
"""

import os, time, uuid, shutil, json, hmac, hashlib, secrets, certifi
from typing import Optional
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import httpx

from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
from jose import JWTError, jwt

from google import genai
from google.genai import types
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from bson import ObjectId

load_dotenv()

IST = ZoneInfo("Asia/Kolkata")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
GEMINI_API_KEY       = os.environ.get("GEMINI_API_KEY", "")
MONGODB_URI          = os.environ.get("MONGODB_URI", "")
JWT_SECRET           = os.environ.get("JWT_SECRET", "changeme_32chars_minimum_please!")
JWT_ALGORITHM        = "HS256"
JWT_EXPIRE_MINUTES   = 60 * 24 * 7
GOOGLE_CLIENT_ID     = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI  = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")
SMTP_HOST            = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT            = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER            = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD        = os.environ.get("SMTP_PASSWORD", "")
EMAIL_FROM           = os.environ.get("EMAIL_FROM", "amasathi <no-reply@amasathi.com>")
FRONTEND_URL         = os.environ.get("FRONTEND_URL", "http://localhost:3000")
RAZORPAY_KEY_ID      = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET  = os.environ.get("RAZORPAY_KEY_SECRET", "")
ADMIN_EMAILS         = [e.strip() for e in os.environ.get("ADMIN_EMAILS", "").split(",")]
MAX_DEVICES          = 2

if not GEMINI_API_KEY:
    raise RuntimeError("Set GEMINI_API_KEY")

# ---------------------------------------------------------------------------
# Plans — safe limits per user
# ---------------------------------------------------------------------------
PLANS = {
    "free": {
        "name": "Free",
        "price": 0,
        "tokens_per_day": 5_000,
        "tokens_per_month": 40_000,
        "requests_per_minute": 2,
        "requests_per_day": 10,
        "features": ["translate", "chat"],
        "history": False,
        "expires_days": None,
        "max_history": 0,
    },

    "basic": {
        "name": "Basic",
        "price": 99,
        "tokens_per_day": 20_000,
        "tokens_per_month": 300_000,
        "requests_per_minute": 5,
        "requests_per_day": 40,
        "features": [
            "translate",
            "chat",
            "questions",
            "pdf",
            "images"
        ],
        "history": True,
        "expires_days": 30,
        "max_history": 20,
    },
    "science": {
        "name": "Science",
        "price": 149,
        "tokens_per_day": 30_000,
        "tokens_per_month": 700_000,
        "requests_per_minute": 7,
        "requests_per_day": 80,
        "features": [
            "translate",
            "chat",
            "questions",
            "pdf",
            "images",
            "video"
        ],
        "history": True,
        "expires_days": 30,
        "max_history": 100,
    },

    "standard": {
        "name": "Standard",
        "price": 199,
        "tokens_per_day": 35_000,
        "tokens_per_month": 900_000,
        "requests_per_minute": 10,
        "requests_per_day": 120,
        "features": [
            "translate",
            "chat",
            "questions",
            "pdf",
            "images",
            "video"
        ],
        "history": True,
        "expires_days": 30,
        "max_history": 100,
    },

    "pro": {
        "name": "Pro",
        "price": 499,
        "tokens_per_day": 100_000,
        "tokens_per_month": 3_000_000,
        "requests_per_minute": 20,
        "requests_per_day": 500,
        "features": [
            "translate",
            "chat",
            "questions",
            "pdf",
            "images",
            "video"
        ],
        "history": True,
        "expires_days": 30,
        "max_history": 1000,
    },
}

# ---------------------------------------------------------------------------
# DB setup
# ---------------------------------------------------------------------------
mongo_client = AsyncIOMotorClient(
    MONGODB_URI, tlsCAFile=certifi.where(),
    tls=True, tlsAllowInvalidCertificates=False,
    serverSelectionTimeoutMS=5000,
)
db           = mongo_client["amasathi"]
users_col    = db["users"]
payments_col = db["payments"]
reset_col    = db["password_resets"]
history_col  = db["chat_history"]
usage_col    = db["token_usage"]
sessions_col = db["sessions"]
requests_col = db["request_logs"]      # ← new: per-user request tracking

gemini_client = genai.Client(api_key=GEMINI_API_KEY)
MODEL_FLASH   = "gemini-2.5-flash"    # higher free tier limits
MODEL_PRO     = "gemini-2.5-pro"
UPLOAD_DIR    = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="amasathi API - Production")
app.add_middleware(
    CORSMiddleware, allow_origins=[
        "http://localhost",
        "http://localhost:3000",
        "http://127.0.0.1:8000",
        "https://amasathi.onrender.com",
        "https://ama-sathi-ai.vercel.app",
    ],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

from fastapi.openapi.utils import get_openapi
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(title="amasathi API", version="1.0", routes=app.routes)
    schema["components"]["securitySchemes"] = {
        "BearerAuth": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}
    }
    for path in schema["paths"].values():
        for method in path.values():
            method["security"] = [{"BearerAuth": []}]
    app.openapi_schema = schema
    return schema
app.openapi = custom_openapi

# ---------------------------------------------------------------------------
# Startup indexes
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup():
    await users_col.create_index("email", unique=True)
    await reset_col.create_index("token", unique=True)
    await reset_col.create_index("expires_at", expireAfterSeconds=0)
    await usage_col.create_index([("user_id", 1), ("date", 1)], unique=True)
    await history_col.create_index([("user_id", 1), ("created_at", -1)])
    await sessions_col.create_index("user_id")
    await sessions_col.create_index("last_seen", expireAfterSeconds=60*60*24*30)
    await payments_col.create_index("razorpay_payment_id", unique=True, sparse=True)
    await requests_col.create_index([("user_id", 1), ("created_at", -1)])
    await requests_col.create_index("created_at", expireAfterSeconds=60*60*24*2)  # auto-delete after 2 days

# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------
def create_token(user_id: str, email: str) -> str:
    return jwt.encode(
        {"sub": user_id, "email": email,
         "exp": datetime.utcnow() + timedelta(minutes=JWT_EXPIRE_MINUTES)},
        JWT_SECRET, algorithm=JWT_ALGORITHM
    )

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")

async def get_current_user(authorization: str = Header(...), request: Request = None) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token")
    payload = decode_token(authorization.split(" ")[1])
    user = await users_col.find_one({"_id": payload["sub"]})
    if not user:
        raise HTTPException(401, "User not found")
    user = await check_plan_expiry(user)
    user["user_id"] = str(user["_id"])
    return user

async def require_admin(authorization: str = Header(...)) -> dict:
    user = await get_current_user(authorization)
    if user.get("email") not in ADMIN_EMAILS:
        raise HTTPException(403, "Admin access required")
    return user

# ---------------------------------------------------------------------------
# Plan expiry
# ---------------------------------------------------------------------------
async def check_plan_expiry(user: dict) -> dict:
    if user.get("plan", "free") == "free":
        return user
    plan_cfg = PLANS.get(user.get("plan", "free"), {})
    expires_days = plan_cfg.get("expires_days")
    if not expires_days:
        return user
    plan_started = user.get("plan_started_at")
    if plan_started:
        expiry = plan_started + timedelta(days=expires_days)
        if datetime.utcnow() > expiry:
            await users_col.update_one(
                {"_id": user["_id"]},
                {"$set": {"plan": "free", "plan_expired_at": datetime.utcnow()}}
            )
            user["plan"] = "free"
    return user

# ---------------------------------------------------------------------------
# Token usage tracking
# ---------------------------------------------------------------------------
def today_ist() -> str:
    return datetime.now(IST).strftime("%Y-%m-%d")

async def get_token_usage(user_id: str) -> int:
    rec = await usage_col.find_one({"user_id": user_id, "date": today_ist()})
    return rec.get("tokens_used", 0) if rec else 0

async def add_token_usage(user_id: str, tokens: int):
    await usage_col.update_one(
        {"user_id": user_id, "date": today_ist()},
        {"$inc": {"tokens_used": tokens}},
        upsert=True
    )

def estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)

# ---------------------------------------------------------------------------
# Rate limiting — per user, per minute + per day + token limit
# ---------------------------------------------------------------------------
async def check_token_limit(user: dict, estimated_input: int = 500):
    plan     = user.get("plan", "free")
    plan_cfg = PLANS.get(plan, PLANS["free"])
    user_id  = user["user_id"]

    # 1. Check daily TOKEN limit
    token_limit = plan_cfg["tokens_per_day"]
    used_tokens = await get_token_usage(user_id)

    if used_tokens >= token_limit:
        ist = ZoneInfo("Asia/Kolkata")
        now = datetime.now(ist)

        # Next midnight
        reset_time = (now + timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        remaining = reset_time - now
        hours = remaining.seconds // 3600
        minutes = (remaining.seconds % 3600) // 60

        raise HTTPException(
            status_code=429,
            detail=(
                f"⚠️ Daily token limit reached.\n\n"
                f"You've used {used_tokens:,}/{token_limit:,} tokens today "
                f"on the {plan_cfg['name']} plan.\n\n"
                f"⏰ Your limit resets in {hours}h {minutes}m "
                f"({reset_time.strftime('%I:%M %p IST')}).\n\n"
                f"Upgrade to Pro for more tokens."
            )
        )

    # 2. Check per-MINUTE request limit
    rpm_limit   = plan_cfg.get("requests_per_minute", 2)
    one_min_ago = datetime.utcnow() - timedelta(minutes=1)
    rpm_count   = await requests_col.count_documents({
        "user_id":    user_id,
        "created_at": {"$gte": one_min_ago}
    })
    if rpm_count >= rpm_limit:
        raise HTTPException(429,
            f"Slow down! Max {rpm_limit} requests/minute on the {plan_cfg['name']} plan. "
            f"Please wait a moment before trying again."
        )

    # 3. Check per-DAY request limit
    rpd_limit   = plan_cfg.get("requests_per_day", 10)
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    rpd_count   = await requests_col.count_documents({
        "user_id":    user_id,
        "created_at": {"$gte": today_start}
    })
    if rpd_count >= rpd_limit:
        raise HTTPException(429,
            f"Daily request limit reached. You've made {rpd_count}/{rpd_limit} requests today "
            f"on the {plan_cfg['name']} plan. Resets at midnight IST."
        )

    # 4. Log this request AFTER all checks pass
    await requests_col.insert_one({
        "user_id":    user_id,
        "plan":       plan,
        "feature":    "api",
        "created_at": datetime.utcnow(),
    })

# ---------------------------------------------------------------------------
# Device/session limiting
# ---------------------------------------------------------------------------
async def register_session(user_id: str, device_id: str, device_type: str):
    existing   = await sessions_col.find({"user_id": user_id}).to_list(100)
    device_ids = [s["device_id"] for s in existing]
    if device_id not in device_ids:
        if len(device_ids) >= MAX_DEVICES:
            raise HTTPException(403,
                f"Maximum {MAX_DEVICES} devices allowed. Logout from another device first."
            )
        await sessions_col.insert_one({
            "user_id": user_id, "device_id": device_id,
            "device_type": device_type,
            "last_seen": datetime.utcnow(), "created_at": datetime.utcnow(),
        })
    else:
        await sessions_col.update_one(
            {"user_id": user_id, "device_id": device_id},
            {"$set": {"last_seen": datetime.utcnow()}}
        )

# ---------------------------------------------------------------------------
# Password
# ---------------------------------------------------------------------------
def hash_password(pwd: str) -> str:
    return bcrypt.hashpw(pwd[:72].encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain[:72].encode(), hashed.encode())
    except Exception:
        return False

# ---------------------------------------------------------------------------
# Email
# ---------------------------------------------------------------------------
def send_email(to: str, subject: str, html: str):
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = EMAIL_FROM
        msg["To"]      = to
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.starttls(); s.login(SMTP_USER, SMTP_PASSWORD)
            s.sendmail(SMTP_USER, to, msg.as_string())
    except Exception as e:
        print(f"[Email error] {e}")

# ---------------------------------------------------------------------------
# Feature access
# ---------------------------------------------------------------------------
def plan_allows(plan: str, feature: str) -> bool:
    return feature in PLANS.get(plan, PLANS["free"])["features"]

# ---------------------------------------------------------------------------
# Gemini helpers
# ---------------------------------------------------------------------------
MIME_BY_EXT = {
    ".pdf": "application/pdf", ".png": "image/png",
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
    ".mp4": "video/mp4", ".mov": "video/quicktime",
    ".mkv": "video/x-matroska", ".webm": "video/webm",
}

def save_upload(file: UploadFile):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in MIME_BY_EXT:
        raise HTTPException(400, f"Unsupported file type: {ext or 'unknown'}")
    path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}{ext}")
    with open(path, "wb") as out:
        shutil.copyfileobj(file.file, out)
    return path, MIME_BY_EXT[ext]

def upload_to_gemini(local_path: str, mime_type: str):
    uploaded = gemini_client.files.upload(path=local_path, config={"mime_type": mime_type})
    f = gemini_client.files.get(name=uploaded.name)
    waited = 0
    while f.state == "PROCESSING" and waited < 120:
        time.sleep(3); waited += 3
        f = gemini_client.files.get(name=uploaded.name)
    if f.state == "FAILED":
        raise HTTPException(500, "Gemini failed to process the file.")
    return f

def file_part(gf):
    return {"file_data": {"file_uri": gf.uri, "mime_type": gf.mime_type}}

def gemini_generate(model: str, system_instruction: str, parts: list) -> tuple[str, int]:
    try:
        response = gemini_client.models.generate_content(
            model=model,
            contents=[{"role": "user", "parts": parts}],
            config=types.GenerateContentConfig(system_instruction=system_instruction),
        )
        tokens_meta  = getattr(response, "usage_metadata", None)
        total_tokens = getattr(tokens_meta, "total_token_count", 0) if tokens_meta else 0
        if not total_tokens:
            total_tokens = estimate_tokens(response.text)
        return response.text, total_tokens
    except Exception as e:
        err = str(e)
        if "503" in err or "UNAVAILABLE" in err:
            raise HTTPException(503, "amasathi is busy. Please try again in a minute.")
        if "429" in err or "RESOURCE_EXHAUSTED" in err:
            raise HTTPException(429, "Service is busy. Please wait a moment and try again.")
        raise HTTPException(500, "Something went wrong. Please try again.")

# ---------------------------------------------------------------------------
# System prompts
# ---------------------------------------------------------------------------
BASE_PERSONA = (
    "You are 'amasathi', a friendly, patient AI study assistant for students "
    "in Odisha, India. You help students from all streams — GNM/BSc Nursing, "
    "Intermediate Science/Arts, College BA/BSc/BCom, and School classes. "
    "Students often send photos of textbook pages, notes or diagrams. "
    "Your job is to help them learn and understand any subject clearly. "
    "Be accurate — never invent facts. "
    "Always personalise your response based on the student's course and level. "
    "Keep responses concise and under 300 words unless the student asks for more."
)

TRANSLATE_INSTRUCTION = (
    BASE_PERSONA
    + "\n\nTASK: Translate the content line by line into Odia.\n\n"
    "Format for EVERY line:\n"
    "**📘 English:** <original text>\n\n"
    "**🔤 ଓଡ଼ିଆ:** <Odia translation>\n\n---\n\n"
    "Rules: Show English first, Odia below. Keep medical terms in English in brackets. Do not skip any line."
)

QUESTIONS_INSTRUCTION = (
    BASE_PERSONA
    + "\n\nTASK: Generate practice questions.\n\n"
    "MCQ format:\n**Q1. [question]**\n\n[Odia translation]\n\n(A) ...\n(B) ...\n(C) ...\n(D) ...\n\n✅ **Correct Answer: (X)**\n\n---\n\n"
    "Generate: 5 MCQs, 3 Short Answer, 1 Long/Descriptive question."
)

VIDEO_SUMMARY_INSTRUCTION = (
    BASE_PERSONA
    + "\n\nTASK: Summarise this lecture video with timestamps. "
    "For each segment: start-end time | English summary | Odia summary. Format as a clean list."
)

def build_student_context(user: dict) -> str:
    return (
        f"\n\nSTUDENT: {user.get('name','Student')} | "
        f"Course: {user.get('course_category','')} {user.get('course_level','')} | "
        f"College: {user.get('college','') or 'Not specified'} | "
        f"Subject: {user.get('subject','') or 'General'}\n"
        f"Personalise responses for this student's level and use Odisha context in examples."
    )

def build_chat_instruction(user: dict) -> str:
    return (
        BASE_PERSONA + build_student_context(user)
        + "\n\nTASK: Answer directly and clearly. "
        "Reply in the SAME language the student used (English/Odia/Hindi).\n\n"

        "MOST IMPORTANT: Match answer depth to student level from profile above.\n"
        "Class 8-10 → simple, short, daily life examples\n"
        "Class 11-12 → board exam level, medium detail\n"
        "BSc/BA/BCom 1st year → university level, more theory\n"
        "BSc/BA/BCom 2nd-3rd year → advanced, deep explanation\n"
        "GNM 1st year → basic nursing, simple clinical\n"
        "GNM 2nd-3rd year → advanced clinical, pharmacology\n"
        "BSc Nursing → full clinical, medical terminology\n"
        "NEVER over-explain to lower classes. NEVER under-explain to higher classes.\n\n"

        "RESPONSE RULES — follow based on what is asked:\n\n"

        "1. CHEMISTRY — structure/molecule/compound:\n"
        "   ALWAYS draw in a code block so spacing is preserved:\n"
        "   ```\n"
        "        H\n"
        "        |\n"
        "    H - C - H     (Methane, CH₄)\n"
        "        |\n"
        "        H\n"
        "   ```\n"
        "   After the diagram explain:\n"
        "   - Formula: CH₄\n"
        "   - Central atom: Carbon (C)\n"
        "   - Bond type: 4 single C-H covalent bonds\n"
        "   - How to draw: Place C in center → attach H on Top, Bottom, Left, Right\n"
        "   - Bond angle: 109.5° (tetrahedral)\n\n"

        "   For RING structures (Benzene, Ferrocene, Cyclopentadiene):\n"
        "   ```\n"
        "         H   H\n"
        "          \\ /\n"
        "      H - C   C - H\n"
        "           \\ /\n"
        "            C\n"
        "            |         ← top ring\n"
        "   ~~~~~~~~~~~~~~~~~\n"
        "          Fe          ← metal center\n"
        "   ~~~~~~~~~~~~~~~~~\n"
        "            C\n"
        "           / \\\n"
        "      H - C   C - H\n"
        "           / \\\n"
        "          H   H       ← bottom ring\n"
        "   ```\n"
        "   After diagram explain:\n"
        "   - Which atoms connect to which\n"
        "   - Bond type at each connection\n"
        "   - How to draw step by step\n\n"

        "   For ORGANIC chains (Ethane, Propane, Ethanol etc):\n"
        "   ```\n"
        "    H   H\n"
        "    |   |\n"
        "H - C - C - H     (Ethane, C₂H₆)\n"
        "    |   |\n"
        "    H   H\n"
        "   ```\n"
        "   Explain each bond after the diagram.\n\n"

        "2. CHEMISTRY — reaction:\n"
        "   Show in code block:\n"
        "   ```\n"
        "   2H₂  +  O₂  ──(spark)──→  2H₂O\n"
        "   ```\n"
        "   Then explain: what breaks, what forms, conditions needed.\n\n"

        "3. PHYSICS — circuit/diagram/force:\n"
        "   Draw ASCII + formula + solved example:\n"
        "   F→  [Block]  ←friction\n"
        "         ↓\n"
        "        mg\n\n"

        "4. MATHEMATICS:\n"
        "   Always step-by-step:\n"
        "   Given → Formula → Step 1 → Step 2 → Answer (with units)\n\n"

        "5. NURSING/MEDICAL:\n"
        "   Flow + clinical significance + patient care tip:\n"
        "   Body → RA → RV → Lungs → LA → LV → Body\n\n"

        "6. ESSAY/LONG ANSWER:\n"
        "   Introduction → Main Points → Conclusion\n\n"

        "7. PROCESS/FLOW:\n"
        "   Step1 → Step2 → Step3 → Result\n\n"

        "8. HISTORY/GEOGRAPHY:\n"
        "   Date/Place → Event → Impact. Use Odisha examples.\n\n"

        "9. ARTS/COMMERCE:\n"
        "   Clear bullet points, simple language, local examples.\n\n"

        "GOLDEN RULES:\n"
        "- Match depth to student level — not too simple, not too complex\n"
        "- If it CAN be drawn → draw it in ASCII\n"
        "- If it needs calculation → solve step by step\n"
        "- If it needs essay → structure it properly\n"
        "- Never give extra unnecessary information\n"
        "- Be a helpful study friend, not a textbook\n"
    )

def build_translate_instruction(user: dict) -> str:
    return TRANSLATE_INSTRUCTION + build_student_context(user)

def build_questions_instruction(user: dict) -> str:
    return (
        QUESTIONS_INSTRUCTION + build_student_context(user)
        + f"\nGenerate questions for {user.get('course_category','')} {user.get('course_level','')} level."
    )

# ---------------------------------------------------------------------------
# Serializer
# ---------------------------------------------------------------------------
def serialize(obj):
    if isinstance(obj, ObjectId): return str(obj)
    if isinstance(obj, datetime):  return obj.isoformat()
    if isinstance(obj, dict):      return {k: serialize(v) for k, v in obj.items()}
    if isinstance(obj, list):      return [serialize(i) for i in obj]
    return obj

# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok", "version": "5.1-production"}

@app.get("/api/plans")
def get_plans():
    return {k: {**v} for k, v in PLANS.items()}

# ---------------------------------------------------------------------------
# Auth — Signup
# ---------------------------------------------------------------------------
@app.post("/api/auth/signup")
async def signup(body: dict):
    name     = body.get("name", "").strip()
    email    = body.get("email", "").strip().lower()
    password = body.get("password", "")
    if not all([name, email, password]):
        raise HTTPException(400, "Name, email and password are required")
    if len(password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if await users_col.find_one({"email": email}):
        raise HTTPException(409, "Email already registered")

    user_id = str(uuid.uuid4())
    await users_col.insert_one({
        "_id": user_id, "name": name, "email": email,
        "password": hash_password(password), "auth_type": "email",
        "plan": "free", "onboarded": False,
        "mobile": "", "college": "", "subject": "",
        "course_category": "", "course_level": "",
        "plan_started_at": None, "plan_expired_at": None,
        "razorpay_payment_id": None,
        "created_at": datetime.utcnow(), "updated_at": datetime.utcnow(),
    })
    send_email(email, "Welcome to amasathi! 🎓", f"""
        <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:32px">
          <h2 style="color:#22c55e">ନମସ୍କାର {name}! 👋</h2>
          <p>Welcome to <strong>amasathi</strong> — your AI study friend.</p>
          <a href="{FRONTEND_URL}/onboarding" style="display:inline-block;background:#22c55e;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">Complete Profile →</a>
        </div>""")
    token = create_token(user_id, email)
    return {"token": token, "user": {"id": user_id, "name": name, "email": email, "plan": "free", "onboarded": False}}

# ---------------------------------------------------------------------------
# Auth — Signin
# ---------------------------------------------------------------------------
@app.post("/api/auth/signin")
async def signin(body: dict, request: Request):
    email       = body.get("email", "").strip().lower()
    password    = body.get("password", "")
    device_id   = body.get("device_id", str(uuid.uuid4()))
    device_type = body.get("device_type", "web")

    user = await users_col.find_one({"email": email})
    if not user:
        raise HTTPException(401, "Invalid email or password")
    if user.get("auth_type") == "google":
        raise HTTPException(400, "This account uses Google login.")
    if not verify_password(password, user.get("password", "")):
        raise HTTPException(401, "Invalid email or password")

    user  = await check_plan_expiry(user)
    await register_session(str(user["_id"]), device_id, device_type)
    token = create_token(str(user["_id"]), email)
    return {
        "token": token,
        "user": {
            "id": str(user["_id"]), "name": user.get("name"),
            "email": user.get("email"), "plan": user.get("plan", "free"),
            "onboarded": user.get("onboarded", False),
            "course_category": user.get("course_category", ""),
            "course_level": user.get("course_level", ""),
            "college": user.get("college", ""),
            "mobile": user.get("mobile", ""),
        }
    }

# ---------------------------------------------------------------------------
# Auth — Forgot / Reset Password
# ---------------------------------------------------------------------------
@app.post("/api/auth/forgot-password")
async def forgot_password(body: dict):
    email = body.get("email", "").strip().lower()
    user  = await users_col.find_one({"email": email})
    if not user or user.get("auth_type") == "google":
        return {"message": "If that email exists, a reset link has been sent."}
    token      = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=1)
    await reset_col.delete_many({"email": email})
    await reset_col.insert_one({"token": token, "email": email, "expires_at": expires_at})
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
    send_email(email, "Reset your amasathi password", f"""
        <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:32px">
          <h2 style="color:#22c55e">Password Reset</h2>
          <p>Click below to reset your password. Expires in <strong>1 hour</strong>.</p>
          <a href="{reset_link}" style="display:inline-block;background:#22c55e;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">Reset Password →</a>
        </div>""")
    return {"message": "If that email exists, a reset link has been sent."}

@app.post("/api/auth/reset-password")
async def reset_password(body: dict):
    token        = body.get("token", "")
    new_password = body.get("password", "")
    if len(new_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    record = await reset_col.find_one({"token": token})
    if not record or record["expires_at"] < datetime.utcnow():
        raise HTTPException(400, "Invalid or expired reset link")
    await users_col.update_one(
        {"email": record["email"]},
        {"$set": {"password": hash_password(new_password), "updated_at": datetime.utcnow()}}
    )
    await reset_col.delete_one({"token": token})
    return {"message": "Password reset successfully."}

# ---------------------------------------------------------------------------
# Auth — Me / Profile
# ---------------------------------------------------------------------------
@app.get("/api/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    plan         = user.get("plan", "free")
    plan_cfg     = PLANS.get(plan, PLANS["free"])
    used_tokens  = await get_token_usage(user["user_id"])
    plan_started = user.get("plan_started_at")
    expires_at   = None
    if plan_started and plan_cfg.get("expires_days"):
        expires_at = (plan_started + timedelta(days=plan_cfg["expires_days"])).isoformat()

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    requests_today = await requests_col.count_documents({
        "user_id": user["user_id"],
        "created_at": {"$gte": today_start}
    })

    return {
        "id": str(user["_id"]), "name": user.get("name"), "email": user.get("email"),
        "plan": plan, "onboarded": user.get("onboarded", False),
        "mobile": user.get("mobile", ""), "college": user.get("college", ""),
        "subject": user.get("subject", ""), "auth_type": user.get("auth_type", "email"),
        "course_category": user.get("course_category", ""),
        "course_level": user.get("course_level", ""),
        "plan_started_at":      plan_started.isoformat() if plan_started else None,
        "plan_expires_at":      expires_at,
        "tokens_used_today":    used_tokens,
        "tokens_limit_today":   plan_cfg["tokens_per_day"],
        "requests_used_today":  requests_today,
        "requests_limit_today": plan_cfg["requests_per_day"],
        "is_admin": user.get("email") in ADMIN_EMAILS,
        "created_at": user.get("created_at", ""),
    }

@app.put("/api/profile")
async def update_profile(body: dict, user: dict = Depends(get_current_user)):
    await users_col.update_one({"_id": user["_id"]}, {"$set": {
        "name":            body.get("name", user.get("name")),
        "mobile":          body.get("mobile", ""),
        "college":         body.get("college", ""),
        "subject":         body.get("subject", ""),
        "course_category": body.get("course_category", ""),
        "course_level":    body.get("course_level", ""),
        "onboarded":       body.get("onboarded", user.get("onboarded", False)),
        "updated_at":      datetime.utcnow(),
    }})
    return {"message": "Profile updated"}

# ---------------------------------------------------------------------------
# Google OAuth2
# ---------------------------------------------------------------------------
@app.get("/api/auth/google")
async def google_login():
    from urllib.parse import urlencode
    params = {
        "client_id": GOOGLE_CLIENT_ID, "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code", "scope": "openid email profile",
        "access_type": "offline", "prompt": "select_account",
    }
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}")

@app.get("/api/auth/google/callback")
async def google_callback(code: str):
    async with httpx.AsyncClient() as http:
        token_r = await http.post("https://oauth2.googleapis.com/token", data={
            "code": code, "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI, "grant_type": "authorization_code",
        })
    td = token_r.json()
    if "error" in td:
        raise HTTPException(400, f"Google OAuth error: {td['error']}")
    async with httpx.AsyncClient() as http:
        ur = await http.get("https://www.googleapis.com/oauth2/v2/userinfo",
                            headers={"Authorization": f"Bearer {td['access_token']}"})
    gu       = ur.json()
    email    = gu.get("email", "").lower()
    name     = gu.get("name", "")
    existing = await users_col.find_one({"email": email})
    if existing:
        user_id   = str(existing["_id"])
        onboarded = existing.get("onboarded", False)
        await users_col.update_one({"_id": user_id}, {"$set": {
            "google_id": gu.get("id"), "auth_type": "google", "updated_at": datetime.utcnow()
        }})
    else:
        user_id = str(uuid.uuid4())
        await users_col.insert_one({
            "_id": user_id, "name": name, "email": email,
            "password": None, "auth_type": "google", "google_id": gu.get("id"),
            "plan": "free", "onboarded": False,
            "mobile": "", "college": "", "subject": "",
            "course_category": "", "course_level": "",
            "plan_started_at": None, "created_at": datetime.utcnow(), "updated_at": datetime.utcnow(),
        })
        onboarded = False
    token = create_token(user_id, email)
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={token}&onboarded={str(onboarded).lower()}")

# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------
@app.get("/api/auth/sessions")
async def get_sessions(user: dict = Depends(get_current_user)):
    sessions = await sessions_col.find({"user_id": user["user_id"]}).to_list(10)
    return serialize(sessions)

@app.delete("/api/auth/sessions/{device_id}")
async def revoke_session(device_id: str, user: dict = Depends(get_current_user)):
    await sessions_col.delete_one({"user_id": user["user_id"], "device_id": device_id})
    return {"status": "ok"}

# ---------------------------------------------------------------------------
# Payment
# ---------------------------------------------------------------------------
@app.post("/api/payment/create-order")
async def create_order(body: dict, user: dict = Depends(get_current_user)):
    import razorpay
    plan = body.get("plan", "basic")
    if plan not in PLANS or plan == "free":
        raise HTTPException(400, "Invalid plan")
    current_plan = user.get("plan", "free")
    plan_rank    = {"free": 0, "basic": 1, "standard": 2, "pro": 3}
    if current_plan == plan:
        raise HTTPException(400, f"You already have the {plan} plan.")
    if plan_rank.get(plan, 0) <= plan_rank.get(current_plan, 0):
        raise HTTPException(400, f"You are on {current_plan}. Choose a higher plan.")
    price_paise = PLANS[plan]["price"] * 100
    rz    = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    order = rz.order.create({
        "amount": price_paise, "currency": "INR",
        "receipt": f"order_{user['_id'][:8]}_{plan}",
        "notes": {"user_id": str(user["_id"]), "plan": plan},
    })
    return {"order_id": order["id"], "amount": price_paise, "currency": "INR", "plan": plan}

@app.post("/api/payment/verify")
async def verify_payment(body: dict, user: dict = Depends(get_current_user)):
    import razorpay
    rz = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    try:
        rz.utility.verify_payment_signature({
            "razorpay_order_id":   body["razorpay_order_id"],
            "razorpay_payment_id": body["razorpay_payment_id"],
            "razorpay_signature":  body["razorpay_signature"],
        })
    except Exception:
        raise HTTPException(400, "Payment verification failed")
    existing = await payments_col.find_one({"razorpay_payment_id": body["razorpay_payment_id"]})
    if existing:
        return {"status": "ok", "plan": existing["plan"], "message": "already recorded"}
    plan = body.get("plan", "basic")
    now  = datetime.utcnow()
    await users_col.update_one({"_id": user["_id"]}, {"$set": {
        "plan": plan, "plan_started_at": now,
        "razorpay_payment_id": body["razorpay_payment_id"], "updated_at": now,
    }})
    await payments_col.insert_one({
        "user_id": str(user["_id"]), "email": user.get("email"), "name": user.get("name"),
        "plan": plan, "amount": PLANS[plan]["price"], "currency": "INR",
        "razorpay_payment_id": body["razorpay_payment_id"],
        "razorpay_order_id":   body["razorpay_order_id"],
        "status": "captured", "created_at": now,
    })
    return {"status": "ok", "plan": plan}

@app.post("/api/payment/webhook")
async def razorpay_webhook(request: Request):
    body      = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    expected  = hmac.new(RAZORPAY_KEY_SECRET.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(400, "Invalid signature")
    event = json.loads(body)
    if event.get("event") == "payment.captured":
        payment = event["payload"]["payment"]["entity"]
        notes   = payment.get("notes", {})
        user_id = notes.get("user_id")
        plan    = notes.get("plan", "basic")
        if user_id:
            await users_col.update_one({"_id": user_id}, {"$set": {
                "plan": plan, "plan_started_at": datetime.utcnow(),
                "razorpay_payment_id": payment["id"],
            }})
    return {"status": "ok"}

# ---------------------------------------------------------------------------
# Chat History
# ---------------------------------------------------------------------------
@app.get("/api/history")
async def get_history(user: dict = Depends(get_current_user)):
    if not PLANS.get(user.get("plan", "free"), {}).get("history", False):
        raise HTTPException(403, "Upgrade to Basic or above to access chat history.")
    sessions = await history_col.find(
        {"user_id": user["user_id"]}, {"messages": 0}
    ).sort("created_at", -1).to_list(100)
    return serialize(sessions)

@app.get("/api/history/{session_id}")
async def get_history_session(session_id: str, user: dict = Depends(get_current_user)):
    if not PLANS.get(user.get("plan", "free"), {}).get("history", False):
        raise HTTPException(403, "Upgrade to access chat history.")
    session = await history_col.find_one({"_id": session_id, "user_id": user["user_id"]})
    if not session:
        raise HTTPException(404, "Session not found")
    return serialize(session)

@app.delete("/api/history/{session_id}")
async def delete_history_session(session_id: str, user: dict = Depends(get_current_user)):
    await history_col.delete_one({"_id": session_id, "user_id": user["user_id"]})
    return {"status": "ok"}

# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------
@app.get("/api/admin/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    users       = await users_col.find({}, {"password": 0}).sort("created_at", -1).to_list(5000)
    payments    = await payments_col.find({}).sort("created_at", -1).to_list(5000)
    today       = today_ist()
    usage_today = await usage_col.find({"date": today}).to_list(5000)
    plan_counts = {k: 0 for k in PLANS}
    for u in users:
        p = u.get("plan", "free")
        plan_counts[p] = plan_counts.get(p, 0) + 1
    return serialize({
        "total_users":       len(users),
        "total_revenue":     sum(p.get("amount", 0) for p in payments),
        "plan_counts":       plan_counts,
        "total_payments":    len(payments),
        "active_today":      len(usage_today),
        "tokens_used_today": sum(u.get("tokens_used", 0) for u in usage_today),
        "recent_users":      users[:10],
        "recent_payments":   payments[:10],
    })

@app.get("/api/admin/users")
async def admin_users(admin: dict = Depends(require_admin)):
    users  = await users_col.find({}, {"password": 0}).sort("created_at", -1).to_list(5000)
    result = []
    for u in users:
        uid        = str(u["_id"])
        sessions   = await sessions_col.find({"user_id": uid}).to_list(10)
        used_today = await get_token_usage(uid)
        plan_cfg   = PLANS.get(u.get("plan", "free"), PLANS["free"])
        plan_started = u.get("plan_started_at")
        expires_at = None
        if plan_started and plan_cfg.get("expires_days"):
            expires_at = plan_started + timedelta(days=plan_cfg["expires_days"])
        result.append({
            **u,
            "device_count":      len(sessions),
            "devices":           sessions,
            "tokens_used_today": used_today,
            "tokens_limit":      plan_cfg["tokens_per_day"],
            "plan_expires_at":   expires_at,
        })
    return serialize(result)

@app.get("/api/admin/payments")
async def admin_payments(admin: dict = Depends(require_admin)):
    payments = await payments_col.find({}).sort("created_at", -1).to_list(5000)
    return serialize(payments)

@app.patch("/api/admin/users/{user_id}/plan")
async def admin_update_plan(user_id: str, body: dict, admin: dict = Depends(require_admin)):
    plan   = body.get("plan", "free")
    update = {"plan": plan, "updated_at": datetime.utcnow()}
    if plan != "free":
        update["plan_started_at"] = datetime.utcnow()
    await users_col.update_one({"_id": user_id}, {"$set": update})
    return {"status": "ok"}

@app.delete("/api/admin/users/{user_id}/sessions")
async def admin_clear_sessions(user_id: str, admin: dict = Depends(require_admin)):
    await sessions_col.delete_many({"user_id": user_id})
    return {"status": "ok"}

@app.get("/api/admin/usage")
async def admin_usage(admin: dict = Depends(require_admin)):
    usage = await usage_col.find({}).sort("date", -1).to_list(10000)
    return serialize(usage)

# ---------------------------------------------------------------------------
# AI Routes
# ---------------------------------------------------------------------------
@app.post("/api/translate")
async def translate_to_odia(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    if not plan_allows(user.get("plan", "free"), "translate"):
        raise HTTPException(403, "Upgrade your plan to use this feature.")
    await check_token_limit(user, 1000)
    local_path, mime_type = save_upload(file)
    try:
        gfile        = upload_to_gemini(local_path, mime_type)
        model        = MODEL_PRO if mime_type.startswith("video") else MODEL_FLASH
        result, tokens = gemini_generate(
            model, build_translate_instruction(user),
            [file_part(gfile), {"text": "Translate this content line by line into Odia as instructed."}]
        )
        await add_token_usage(user["user_id"], tokens)
        return {"result": result, "tokens_used": tokens}
    finally:
        os.remove(local_path)

@app.post("/api/questions")
async def generate_questions(
    file: UploadFile = File(...),
    difficulty: str = Form("medium"),
    user: dict = Depends(get_current_user),
):
    if not plan_allows(user.get("plan", "free"), "questions"):
        raise HTTPException(403, "Upgrade to Basic or above to generate questions.")
    await check_token_limit(user, 1000)
    local_path, mime_type = save_upload(file)
    try:
        gfile        = upload_to_gemini(local_path, mime_type)
        model        = MODEL_PRO if mime_type.startswith("video") else MODEL_FLASH
        result, tokens = gemini_generate(
            model, build_questions_instruction(user),
            [file_part(gfile), {"text": f"Generate {difficulty}-difficulty practice questions as instructed."}]
        )
        await add_token_usage(user["user_id"], tokens)
        return {"result": result, "tokens_used": tokens}
    finally:
        os.remove(local_path)

@app.post("/api/video-summary")
async def video_summary(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    if not plan_allows(user.get("plan", "free"), "video"):
        raise HTTPException(403, "Upgrade to Standard or Pro to use Video Summary.")
    await check_token_limit(user, 2000)
    local_path, mime_type = save_upload(file)
    if not mime_type.startswith("video"):
        os.remove(local_path); raise HTTPException(400, "Video files only.")
    try:
        gfile        = upload_to_gemini(local_path, mime_type)
        result, tokens = gemini_generate(
            MODEL_PRO,
            VIDEO_SUMMARY_INSTRUCTION + build_student_context(user),
            [file_part(gfile), {"text": "Summarize this video with timestamps as instructed."}]
        )
        await add_token_usage(user["user_id"], tokens)
        return {"result": result, "tokens_used": tokens}
    finally:
        os.remove(local_path)

@app.post("/api/chat")
async def chat(
    message: str = Form(...),
    session_id: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    user: dict = Depends(get_current_user),
):
    if not plan_allows(user.get("plan", "free"), "chat"):
        raise HTTPException(403, "Upgrade your plan to use Chat.")
    await check_token_limit(user, estimate_tokens(message) + 500)

    parts      = []
    local_path = None
    try:
        if file:
            local_path, mime_type = save_upload(file)
            gfile = upload_to_gemini(local_path, mime_type)
            parts.append(file_part(gfile))
        parts.append({"text": message})

        contents     = []
        hist_session = None
        if session_id:
            hist_session = await history_col.find_one({"_id": session_id, "user_id": user["user_id"]})
        if hist_session:
            for msg in hist_session.get("messages", [])[-20:]:
                contents.append({
                    "role": "model" if msg["role"] == "assistant" else "user",
                    "parts": [{"text": msg["text"]}]
                })
        contents.append({"role": "user", "parts": parts})

        try:
            response = gemini_client.models.generate_content(
                model=MODEL_FLASH,
                contents=contents,
                config=types.GenerateContentConfig(system_instruction=build_chat_instruction(user)),
            )
            result      = response.text
            tokens_meta = getattr(response, "usage_metadata", None)
            tokens      = getattr(tokens_meta, "total_token_count", estimate_tokens(message + result)) if tokens_meta else estimate_tokens(message + result)
        except Exception as e:
            err = str(e)
            if "503" in err or "UNAVAILABLE" in err:
                raise HTTPException(503, "Gemini is busy. Please try again.")
            raise HTTPException(500, f"AI error: {err}")

        await add_token_usage(user["user_id"], tokens)

        plan_cfg       = PLANS.get(user.get("plan", "free"), PLANS["free"])
        new_session_id = session_id
        if plan_cfg.get("history", False):
            if not session_id or not hist_session:
                new_session_id = str(uuid.uuid4())
                await history_col.insert_one({
                    "_id":      new_session_id,
                    "user_id":  user["user_id"],
                    "title":    message[:60] + ("..." if len(message) > 60 else ""),
                    "messages": [
                        {"role": "user",      "text": message, "ts": datetime.utcnow()},
                        {"role": "assistant", "text": result,  "ts": datetime.utcnow()},
                    ],
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                })
            else:
                max_hist     = plan_cfg.get("max_history", 50)
                session_msgs = hist_session.get("messages", [])
                if len(session_msgs) >= max_hist * 2:
                    session_msgs = session_msgs[-(max_hist * 2 - 2):]
                session_msgs.extend([
                    {"role": "user",      "text": message, "ts": datetime.utcnow()},
                    {"role": "assistant", "text": result,  "ts": datetime.utcnow()},
                ])
                await history_col.update_one({"_id": session_id}, {"$set": {
                    "messages": session_msgs, "updated_at": datetime.utcnow(),
                }})

        return {"result": result, "session_id": new_session_id, "tokens_used": tokens}
    finally:
        if local_path:
            os.remove(local_path)