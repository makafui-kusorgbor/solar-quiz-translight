'use client';
import { useEffect, useMemo, useState } from 'react';

type Section = string;

type ApiStart = {
  quizId: string;
  sectionSeq: Section[];
  state: string;
  difficultyTier: number;
};

type ApiQuestion = {
  question_text: string;
  options: string[];
  correct_index: number;
  concept_tags?: string[];
  difficulty_rating?: number;
};

type ApiQuestions = { questions: ApiQuestion[] };

function AuthPanel({ onAuth }: { onAuth: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login'|'signup'>('login');
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    setMsg(null);
    const path = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    const res = await fetch(path, { method: 'POST', body: JSON.stringify({ email, password }) });
    if (!res.ok) { setMsg('Failed'); return; }
    const data = await res.json();
    if (mode === 'login' && data?.token) onAuth(email);
    else if (mode === 'signup') setMsg('Account created, switch to login');
  };

  return (
    <div className="card p-4">
      <h3 className="h2">Account</h3>
      <div className="mt-3 grid gap-2">
        <input placeholder="email" value={email} onChange={e => setEmail(e.target.value)} className="rounded-md bg-white/10 px-3 py-2 outline-none" />
        <input placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="rounded-md bg-white/10 px-3 py-2 outline-none" />
        <div className="flex gap-2">
          <button onClick={() => { setMode('login'); submit(); }} className="btn-primary">Login</button>
          <button onClick={() => { setMode('signup'); submit(); }} className="btn-ghost">Sign up</button>
        </div>
        {msg && <p className="text-sm p-muted">{msg}</p>}
      </div>
    </div>
  );
}

export default function ApiQuizPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [started, setStarted] = useState(false);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [seq, setSeq] = useState<Section[]>([]);
  const [secIdx, setSecIdx] = useState(0);

  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);

  const currentSection = seq[secIdx];
  const currentQ = questions[qIdx];
  const done = started && secIdx >= seq.length;
  const [auth, setAuth] = useState<{ email: string } | null>(null);

  const startQuiz = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/quiz/start', { method: 'POST', body: JSON.stringify({}) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ApiStart = await res.json();
      setQuizId(data.quizId);
      setSeq(data.sectionSeq);
      setSecIdx(0);
      setScore(0);
      setStarted(true);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to start quiz');
    } finally { setLoading(false); }
  };

  const loadSection = async (section: Section) => {
    if (!quizId) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/quiz/${quizId}/section/${section}/questions`, { method: 'POST', body: JSON.stringify({}) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ApiQuestions = await res.json();
      setQuestions(data.questions ?? []);
      setQIdx(0);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load questions');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (started && secIdx < seq.length) {
      loadSection(seq[secIdx]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, secIdx]);

  const answer = async (choice: number) => {
    if (!quizId || !currentQ) return;
    setLoading(true); setError(null);
    try {
      await fetch('/api/quiz/response', {
        method: 'POST',
        body: JSON.stringify({
          quizId,
          questionIdx: qIdx,
          questionText: currentQ.question_text,
          questionHash: `${currentSection}-${qIdx}`,
          chosenIdx: choice,
          correctIdx: currentQ.correct_index,
          timeRemaining: 0,
        }),
      });
      if (choice === currentQ.correct_index) setScore((s) => s + 1);
      const nextQ = qIdx + 1;
      if (nextQ < questions.length) {
        setQIdx(nextQ);
      } else {
        // next section
        const nextSec = secIdx + 1;
        setSecIdx(nextSec);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to submit answer');
    } finally { setLoading(false); }
  };

  const reset = () => {
    setStarted(false); setQuizId(null); setSeq([]); setSecIdx(0); setQuestions([]); setQIdx(0); setScore(0); setError(null);
  };

  const finish = async () => {
    if (!quizId) return;
    await fetch('/api/quiz/finish', { method: 'POST', body: JSON.stringify({ quizId, correct: score, total: seq.length * (questions.length || 3) }) });
  };

  return (
    <main className="section py-12">
      <h1 className="h1 mb-1">TransLight Solar Quiz — API</h1>
      <p className="p-muted">This flow uses the FastAPI backend via Next.js API routes.</p>

      {/* Auth panel */}
      {!auth && (
        <div className="mt-4 max-w-md">
          <AuthPanel onAuth={(email) => setAuth({ email })} />
        </div>
      )}

      {!started && (
        <div className="mt-4">
          <button onClick={startQuiz} disabled={loading || !auth} className="btn-primary disabled:opacity-50">
            {loading ? 'Starting…' : auth ? 'Start quiz' : 'Login to start'}
          </button>
          {error && <p className="text-red-300 mt-2">Error: {error}</p>}
        </div>
      )}

      {started && !done && (
        <div className="mt-6 card p-6">
          <div className="flex items-center justify-between">
            <div>Section: <strong>{currentSection}</strong></div>
            <div>Score: {score}</div>
          </div>

          {currentQ ? (
            <div className="mt-4">
              <h2 className="h2 mb-2">Q{qIdx + 1}. {currentQ.question_text}</h2>
              <div className="grid gap-2">
                {currentQ.options.map((opt, i) => (
                  <button key={i} onClick={() => answer(i)} disabled={loading}
                    className="text-left rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    {opt}
                  </button>
                ))}
              </div>
              {error && <p className="text-red-300 mt-2">Error: {error}</p>}
            </div>
          ) : (
            <p className="mt-3">Loading questions…</p>
          )}
        </div>
      )}

      {done && (
        <div className="mt-6 card p-6">
          <h2 className="h2">Finished</h2>
          <p className="mt-1">Final score: {score}</p>
          <div className="mt-3 flex gap-2">
            <button onClick={async () => { await finish(); }} className="btn-primary">Save score</button>
            <button onClick={reset} className="btn-ghost">Restart</button>
          </div>
        </div>
      )}
    </main>
  );
}
