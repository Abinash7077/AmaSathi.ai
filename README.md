# Sahayak - GNM Nursing Assistant

AI study assistant for GNM Nursing and Intermediate Physics students.
Students capture/upload an image, PDF, or video of a topic, and can:

1. **Translate** — line-by-line Odia translation of the content
2. **Questions** — auto-generate MCQs / short / long exam questions from it
3. **Video Summary** — timestamped bilingual summary of a lecture video
4. **Chat** — ask any doubt directly (text, optionally with a file attached)

Stack: **Next.js 15** (App Router, frontend) + **Python FastAPI** (backend) + **Gemini API**.

```
gnm-assistant/
├── backend/        # FastAPI + Gemini
│   ├── main.py
│   └── requirements.txt
└── frontend/        # Next.js 15
    ├── app/
    ├── components/
    └── lib/
```

## 1. Backend setup (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate      # on Windows: venv\Scripts\activate
pip install -r requirements.txt

export GEMINI_API_KEY="your_gemini_api_key_here"   # get one at aistudio.google.com/apikey
# Windows (PowerShell): $env:GEMINI_API_KEY="your_key"

uvicorn main:app --reload --port 8000
```

Backend now runs at `http://localhost:8000`. Check `http://localhost:8000/health`.

## 2. Frontend setup (Next.js)

```bash
cd frontend
npm install

cp .env.local.example .env.local
# edit .env.local if your backend isn't on localhost:8000

npm run dev
```

Open `http://localhost:3000`.

## 3. How each feature calls Gemini (backend/main.py)

| Endpoint | What it does |
|---|---|
| `POST /api/translate` | Uploads file to Gemini File API → asks for line-by-line Odia translation |
| `POST /api/questions` | Same upload, asks for MCQs + short + long questions from the content |
| `POST /api/video-summary` | Video-only, asks for timestamped bilingual topic breakdown |
| `POST /api/chat` | Plain chat, optional file attachment, keeps conversation history |

All prompts (the "personality" and instructions) live as plain strings near the
top of `main.py` — edit `TRANSLATE_INSTRUCTION`, `QUESTIONS_INSTRUCTION`, etc.
to change tone, format, or add more subjects beyond GNM/Physics.

## 4. Deploying

- **Backend**: any Python host (Render, Railway, Fly.io, a VPS with `uvicorn` behind nginx). Just set `GEMINI_API_KEY` as an env var there too.
- **Frontend**: Vercel (native Next.js support) — set `NEXT_PUBLIC_API_BASE` to your deployed backend URL in Vercel's project env vars.

## 5. Notes / things to harden before production

- CORS is wide open (`allow_origins=["*"]`) in `main.py` — restrict it to your real frontend domain.
- No auth/rate-limiting yet — add an API key check or login if you don't want this open to the public internet.
- Uploaded files are deleted from local disk right after the Gemini call; Gemini's own File API keeps them for 48 hours then auto-deletes.
- Large videos can take 30–90 seconds to process (Gemini transcodes them) — the video page already shows a "this can take a minute" loading state.
