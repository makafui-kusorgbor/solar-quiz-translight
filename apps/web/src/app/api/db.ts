// Simple in-memory database and quiz logic for Vercel (ephemeral). Not for production.
import { randomUUID } from "node:crypto";
import { hashPassword, verifyPassword } from "./_utils";

export const runtime = "nodejs";

type Question = {
  question_text: string;
  options: string[];
  correct_index: number;
  concept_tags?: string[];
  difficulty_rating?: number;
};

type Section = string;

class DB {
  users = new Map<number, { email: string; salt: Buffer; hash: Buffer }>();
  usersByEmail = new Map<string, number>();
  sessions = new Map<string, number>(); // token -> userId
  scores: { userId: number; quizId: string; correct: number; total: number; at: number }[] = [];

  questions: Record<Section, Question[]> = {
    fundamentals: [
      { question_text: "What is a typical panel efficiency?", options: ["5-10%", "15-20%", "18-22%", "40-50%"], correct_index: 2, concept_tags: ["panel_efficiency"], difficulty_rating: 4.0 },
      { question_text: "PV stands for?", options: ["Potential Voltage", "Photovoltaic", "Phase Variation", "Power Vector"], correct_index: 1, concept_tags: ["pv"], difficulty_rating: 3.0 },
      { question_text: "Main components of a grid-tied system?", options: ["Panels + Inverter + Meter", "Panels + Battery + Turbine", "Panels only", "Inverter only"], correct_index: 0, concept_tags: ["components"], difficulty_rating: 3.4 },
      { question_text: "What does kWh measure?", options: ["Power", "Energy", "Voltage", "Current"], correct_index: 1, concept_tags: ["kwh"], difficulty_rating: 3.2 },
      { question_text: "Typical panel DC output is?", options: ["12V DC", "120V AC", "230V AC", "5V USB"], correct_index: 0, concept_tags: ["dc"], difficulty_rating: 3.5 },
    ],
    economics: [
      { question_text: "What reduces payback time most?", options: ["Lower tariffs", "Higher consumption offset", "Cloudy climate", "Smaller system"], correct_index: 1, concept_tags: ["payback"], difficulty_rating: 4.2 },
      { question_text: "Which is an incentive?", options: ["Net metering", "Peak shaving", "Voltage drop", "Harmonics"], correct_index: 0, concept_tags: ["incentive"], difficulty_rating: 3.8 },
      { question_text: "LCOE stands for?", options: ["Levelized Cost of Energy", "Local Cost of Electricity", "Load Curve of Energy", "Least Cost of Equipment"], correct_index: 0, concept_tags: ["lcoe"], difficulty_rating: 4.0 },
    ],
    technology: [
      { question_text: "Device that converts DC to AC?", options: ["Transformer", "Inverter", "Rectifier", "Converter"], correct_index: 1, concept_tags: ["inverter"], difficulty_rating: 3.0 },
      { question_text: "Which panel type is common in rooftops?", options: ["Monocrystalline", "Amorphous selenium", "Thin-film CdTe", "Concentrated PV"], correct_index: 0, concept_tags: ["panel_type"], difficulty_rating: 3.6 },
      { question_text: "MPPT is used for?", options: ["Tracking sun position", "Maximizing power point", "Measuring power", "Mounting panels"], correct_index: 1, concept_tags: ["mppt"], difficulty_rating: 4.1 },
    ],
  };

  weekId() {
    return "live";
  }

  signup(email: string, password: string) {
    const key = email.toLowerCase();
    if (this.usersByEmail.has(key)) return false;
    const id = this.users.size + 1;
    const { salt, hash } = hashPassword(password);
    this.users.set(id, { email: key, salt, hash });
    this.usersByEmail.set(key, id);
    return true;
  }

  login(email: string, password: string) {
    const key = email.toLowerCase();
    const id = this.usersByEmail.get(key);
    if (!id) return null;
    const rec = this.users.get(id)!;
    if (!verifyPassword(password, rec.salt, rec.hash)) return null;
    const token = randomUUID().replace(/-/g, "");
    this.sessions.set(token, id);
    return token;
  }

  userIdFromSession(token: string | null) {
    if (!token) return null;
    return this.sessions.get(token) ?? null;
    }

  quizStart() {
    const quizId = `q_${randomUUID().slice(0, 8)}`;
    const sections = ["fundamentals", "economics", "technology"] as Section[];
    // shuffle
    for (let i = sections.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sections[i], sections[j]] = [sections[j], sections[i]];
    }
    return { quizId, sectionSeq: sections, state: "beginner", difficultyTier: 3.0 };
  }

  sectionQuestions(quizId: string, section: Section, payload: any) {
    const bank = this.questions[section];
    if (!bank) return { questions: [] };
    const recent = new Set<string>((payload?.recent_concepts as string[]) || []);
    const filtered = bank.filter(q => !(q.concept_tags || []).some(t => recent.has(t)));
    const pool = filtered.length ? filtered : bank;
    // sample up to 3
    const copy = [...pool];
    const out: Question[] = [];
    for (let i = 0; i < Math.min(3, copy.length); i++) {
      const idx = Math.floor(Math.random() * copy.length);
      out.push(copy.splice(idx, 1)[0]);
    }
    return { questions: out };
  }

  saveScore(token: string, quizId: string, correct: number, total: number) {
    const uid = this.userIdFromSession(token);
    if (!uid) return false;
    this.scores.push({ userId: uid, quizId, correct, total, at: Date.now() });
    return true;
  }

  getLeaderboard() {
    const agg = new Map<number, { email: string; score: number }>();
    for (const s of this.scores) {
      const email = this.users.get(s.userId)?.email || String(s.userId);
      const prev = agg.get(s.userId) || { email, score: 0 };
      const pct = s.total ? (s.correct * 100) / s.total : 0;
      prev.score += pct;
      agg.set(s.userId, prev);
    }
    const rows = [...agg.entries()].map(([userId, v]) => v).sort((a, b) => b.score - a.score).slice(0, 10);
    return rows.map((r, i) => ({ accountId: r.email, score: Math.round(r.score * 100) / 100, rank: i + 1 }));
  }
}

let _db: DB | null = null;
export function getDB() {
  if (!_db) _db = new DB();
  return _db;
}
