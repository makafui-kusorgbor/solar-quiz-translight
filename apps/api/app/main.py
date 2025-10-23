from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from uuid import uuid4
import random
import sqlite3
import os
import hashlib
import secrets
from datetime import datetime

app = FastAPI(title="TransLight Solar Quiz API", version="0.1.0")

DB_PATH = os.path.join(os.path.dirname(__file__), "app.db")

def db_connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = db_connect()
    cur = conn.cursor()
    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          pw_salt BLOB NOT NULL,
          pw_hash BLOB NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY(user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS scores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          quiz_id TEXT NOT NULL,
          correct INTEGER NOT NULL,
          total INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY(user_id) REFERENCES users(id)
        );
        """
    )
    conn.commit()
    conn.close()

init_db()

# CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models (simplified for scaffolding) ---
class QuizStartRequest(BaseModel):
    account_id: Optional[str] = None
    location: Optional[str] = "Unknown"

class QuizStartResponse(BaseModel):
    quizId: str
    sectionSeq: List[str]
    state: str
    difficultyTier: float

class SectionQuestionsRequest(BaseModel):
    recent_concepts: List[str] = []
    location: Optional[str] = "Unknown"
    readiness_score: float = 0.0
    difficulty_range: List[float] = [3.0, 6.0]

class Question(BaseModel):
    question_text: str
    options: List[str]
    correct_index: int
    concept_tags: List[str] = []
    difficulty_rating: float = 4.0

class SectionQuestionsResponse(BaseModel):
    questions: List[Question]

class QuizResponseIn(BaseModel):
    quizId: str
    questionIdx: int
    questionText: str
    questionHash: str
    chosenIdx: int
    correctIdx: int
    timeRemaining: int

class LeaderboardRow(BaseModel):
    accountId: str
    score: float
    rank: int

class LeaderboardResponse(BaseModel):
    weekId: str
    globalBoard: List[LeaderboardRow]
    friendsBoard: List[LeaderboardRow]

class IntentIn(BaseModel):
    accountId: Optional[str] = None
    email: Optional[str] = None

class AdminStats(BaseModel):
    intentClicks: int
    accounts: int
    avgReadiness: float
    conversionRate: float

class SignupIn(BaseModel):
    email: str
    password: str

class LoginIn(BaseModel):
    email: str
    password: str

# --- Simple in-memory content and sessions ---
QUESTION_BANK: Dict[str, List[Question]] = {
    "fundamentals": [
        Question(question_text="What is a typical panel efficiency?", options=["5-10%", "15-20%", "18-22%", "40-50%"], correct_index=2, concept_tags=["panel_efficiency"], difficulty_rating=4.0),
        Question(question_text="PV stands for?", options=["Potential Voltage", "Photovoltaic", "Phase Variation", "Power Vector"], correct_index=1, concept_tags=["pv"], difficulty_rating=3.0),
        Question(question_text="Main components of a grid-tied system?", options=["Panels + Inverter + Meter", "Panels + Battery + Turbine", "Panels only", "Inverter only"], correct_index=0, concept_tags=["components"], difficulty_rating=3.4),
        Question(question_text="What does kWh measure?", options=["Power", "Energy", "Voltage", "Current"], correct_index=1, concept_tags=["kwh"], difficulty_rating=3.2),
        Question(question_text="Typical panel DC output is?", options=["12V DC", "120V AC", "230V AC", "5V USB"], correct_index=0, concept_tags=["dc"], difficulty_rating=3.5),
    ],
    "economics": [
        Question(question_text="What reduces payback time most?", options=["Lower tariffs", "Higher consumption offset", "Cloudy climate", "Smaller system"], correct_index=1, concept_tags=["payback"], difficulty_rating=4.2),
        Question(question_text="Which is an incentive?", options=["Net metering", "Peak shaving", "Voltage drop", "Harmonics"], correct_index=0, concept_tags=["incentive"], difficulty_rating=3.8),
        Question(question_text="LCOE stands for?", options=["Levelized Cost of Energy", "Local Cost of Electricity", "Load Curve of Energy", "Least Cost of Equipment"], correct_index=0, concept_tags=["lcoe"], difficulty_rating=4.0),
    ],
    "technology": [
        Question(question_text="Device that converts DC to AC?", options=["Transformer", "Inverter", "Rectifier", "Converter"], correct_index=1, concept_tags=["inverter"], difficulty_rating=3.0),
        Question(question_text="Which panel type is common in rooftops?", options=["Monocrystalline", "Amorphous selenium", "Thin-film CdTe", "Concentrated PV"], correct_index=0, concept_tags=["panel_type"], difficulty_rating=3.6),
        Question(question_text="MPPT is used for?", options=["Tracking sun position", "Maximizing power point", "Measuring power", "Mounting panels"], correct_index=1, concept_tags=["mppt"], difficulty_rating=4.1),
    ],
}

SESSIONS: Dict[str, Dict] = {}

# --- Auth helpers ---

def hash_password(password: str, salt: bytes | None = None) -> tuple[bytes, bytes]:
    salt = salt or secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 120_000)
    return salt, dk

def verify_password(password: str, salt: bytes, pw_hash: bytes) -> bool:
    _, dk = hash_password(password, salt)
    return secrets.compare_digest(dk, pw_hash)


# --- Endpoints ---

@app.post("/auth/signup")
def signup(payload: SignupIn):
    conn = db_connect()
    cur = conn.cursor()
    salt, pw_hash = hash_password(payload.password)
    try:
        cur.execute(
            "INSERT INTO users(email, pw_salt, pw_hash, created_at) VALUES (?,?,?,?)",
            (payload.email.lower(), salt, pw_hash, datetime.utcnow().isoformat()),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="Email already exists")
    finally:
        conn.close()
    return {"created": True}

@app.post("/auth/login")
def login(payload: LoginIn):
    conn = db_connect()
    cur = conn.cursor()
    cur.execute("SELECT id, pw_salt, pw_hash FROM users WHERE email=?", (payload.email.lower(),))
    row = cur.fetchone()
    if not row or not verify_password(payload.password, row[1], row[2]):
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = uuid4().hex
    cur.execute(
        "INSERT OR REPLACE INTO sessions(token, user_id, created_at) VALUES (?,?,?)",
        (token, row[0], datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()
    return {"token": token, "userId": row[0], "email": payload.email.lower()}


def get_user_id_from_token(token: Optional[str]) -> Optional[int]:
    if not token:
        return None
    conn = db_connect()
    cur = conn.cursor()
    cur.execute("SELECT user_id FROM sessions WHERE token=?", (token,))
    r = cur.fetchone()
    conn.close()
    return int(r[0]) if r else None


@app.post("/quiz/start", response_model=QuizStartResponse)
def quiz_start(payload: QuizStartRequest, x_session: Optional[str] = None):
    quiz_id = f"q_{uuid4().hex[:8]}"
    # Optionally read user from session (not required to start)
    _uid = get_user_id_from_token(x_session)
    seq = ["fundamentals", "economics", "technology"]
    random.shuffle(seq)
    SESSIONS[quiz_id] = {"sectionSeq": seq, "state": "beginner", "difficultyTier": 3.0}
    return QuizStartResponse(
        quizId=quiz_id,
        sectionSeq=seq,
        state="beginner",
        difficultyTier=3.0,
    )

@app.post("/quiz/{quizId}/section/{section}/questions", response_model=SectionQuestionsResponse)
def get_section_questions(quizId: str, section: str, payload: SectionQuestionsRequest):
    bank = QUESTION_BANK.get(section)
    if not bank:
        raise HTTPException(status_code=404, detail="Unknown section")
    # Filter out recently used concepts if provided
    filtered = [q for q in bank if not set(q.concept_tags) & set(payload.recent_concepts or [])]
    population = filtered or bank
    k = min(3, len(population))
    qs = random.sample(population, k=k)
    return SectionQuestionsResponse(questions=qs)

@app.post("/quiz/finish")
def quiz_finish(payload: dict, x_session: Optional[str] = None):
    # payload: { quizId, correct, total }
    uid = get_user_id_from_token(x_session)
    if not uid:
        raise HTTPException(status_code=401, detail="Login required")
    quiz_id = str(payload.get("quizId"))
    correct = int(payload.get("correct", 0))
    total = int(payload.get("total", 0))
    conn = db_connect()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO scores(user_id, quiz_id, correct, total, created_at) VALUES (?,?,?,?,?)",
        (uid, quiz_id, correct, total, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()
    return {"saved": True}

@app.post("/quiz/response")
def post_quiz_response(payload: QuizResponseIn):
    # For now, just acknowledge and hint next
    sess = SESSIONS.get(payload.quizId)
    next_hint = "continue"
    return {"next": next_hint, "received": True}

@app.get("/leaderboard", response_model=LeaderboardResponse)
def get_leaderboard(weekId: Optional[str] = None):
    week = weekId or "2025-W43"
    conn = db_connect()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT u.id, u.email, SUM(s.correct*100.0/NULLIF(s.total,0)) as score
        FROM scores s JOIN users u ON u.id=s.user_id
        GROUP BY u.id, u.email
        ORDER BY score DESC
        LIMIT 10
        """
    )
    rows_db = cur.fetchall()
    conn.close()
    rows = [LeaderboardRow(accountId=str(r[1]), score=float(r[2]) if r[2] is not None else 0.0, rank=i+1) for i, r in enumerate(rows_db)]
    if not rows:
        rows = [LeaderboardRow(accountId="demo", score=720.0, rank=1)]
    return LeaderboardResponse(weekId=week, globalBoard=rows, friendsBoard=rows)

@app.post("/intent")
def post_intent(payload: IntentIn):
    return {"created": True, "redirect": "https://translightsolar.com/get-it-now"}

@app.get("/admin/stats", response_model=AdminStats)
def admin_stats():
    return AdminStats(intentClicks=0, accounts=0, avgReadiness=0.0, conversionRate=0.0)
