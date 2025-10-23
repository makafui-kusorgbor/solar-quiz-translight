'use client';
import { useMemo, useState } from 'react';

type Q = { text: string; options: string[]; correct: number };

const QUESTIONS: Q[] = [
  {
    text: 'What is a typical efficiency for modern residential solar panels?',
    options: ['5–10%', '15–20%', '18–22%', '40–50%'],
    correct: 2,
  },
  {
    text: 'Which unit measures electrical energy usage on bills?',
    options: ['Volt (V)', 'Watt (W)', 'Kilowatt-hour (kWh)', 'Ampere (A)'],
    correct: 2,
  },
  {
    text: 'Which device converts DC from panels to AC for home use?',
    options: ['Transformer', 'Inverter', 'Rectifier', 'Controller'],
    correct: 1,
  },
];

export default function Home() {
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);

  // Backend test panel state
  const [backendData, setBackendData] = useState<any>(null);
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  const current = QUESTIONS[idx];
  const done = started && idx >= QUESTIONS.length;
  const score = useMemo(
    () => answers.reduce((s, a, i) => s + (a === QUESTIONS[i].correct ? 1 : 0), 0),
    [answers]
  );

  const start = () => { setStarted(true); setIdx(0); setAnswers([]); setChosen(null); };
  const choose = (i: number) => setChosen(i);
  const next = () => {
    if (chosen == null) return;
    const nextAnswers = [...answers, chosen];
    setAnswers(nextAnswers);
    setChosen(null);
    setIdx(idx + 1);
  };
  const reset = () => { setStarted(false); setIdx(0); setAnswers([]); setChosen(null); };

  if (!started) {
    return (
      <main className="section py-16">
        <div className="grid gap-8 md:grid-cols-2 items-center">
          <div>
            <h1 className="h1">TransLight Solar Quiz — Local Demo</h1>
            <p className="p-muted mt-3">No backend required. Try a quick 3‑question mock quiz or head to the full API-driven flow.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={start} className="btn-primary">Start demo</button>
              <a href="/quiz" className="btn-ghost">Go to full quiz</a>
            </div>
          </div>
          <div className="card p-6">
            <h2 className="h2">What’s inside</h2>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>• Clean Tailwind theme with brand and accent colors</li>
              <li>• API integration via Next.js route handlers</li>
              <li>• Auth + score saving available on the full flow</li>
            </ul>
          </div>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="section py-16">
        <div className="card p-6">
          <h1 className="h1">Results</h1>
          <p className="mt-2">You scored {score} / {QUESTIONS.length}</p>
          <button onClick={reset} className="btn-primary mt-4">Restart</button>
          <div className="mt-6 space-y-3">
            {QUESTIONS.map((q, i) => (
              <div key={i} className="border-b border-white/10 pb-3">
                <strong>Q{i + 1}:</strong> {q.text}
                <div>
                  Your answer: {q.options[answers[i]]} {answers[i] === q.correct ? '✓' : '✗'}
                </div>
                <div>Correct: {q.options[q.correct]}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="section py-12">
      <div className="mb-4">
        <a href="/quiz" className="underline">Go to full API-driven quiz →</a>
      </div>
      <div className="grid gap-6 md:grid-cols-[1fr_360px]">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <strong>Question {idx + 1} / {QUESTIONS.length}</strong>
            <span>Score: {score}</span>
          </div>
          <h2 className="h2 mb-3">{current.text}</h2>
          <div className="grid gap-2">
            {current.options.map((opt, i) => {
              const isChosen = chosen === i;
              return (
                <button
                  key={i}
                  onClick={() => choose(i)}
                  className={`text-left rounded-lg border px-3 py-2 ${isChosen ? 'bg-white/10' : 'bg-white/5'} border-white/10`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          <div className="mt-4">
            <button onClick={next} disabled={chosen == null} className="btn-primary disabled:opacity-50">
              {idx + 1 === QUESTIONS.length ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>

        <aside className="card p-6">
          <h3 className="h2">Backend test</h3>
          <p className="p-muted mt-1">Calls Next.js proxy → FastAPI</p>

          <div className="grid gap-2 mt-3">
            <button
              onClick={async () => {
                setBackendLoading(true); setBackendError(null);
                try {
                  const res = await fetch('/api/quiz/start', { method: 'POST', body: JSON.stringify({}) });
                  if (!res.ok) throw new Error(`HTTP ${res.status}`);
                  const start = await res.json();
                  setBackendData(start);
                } catch (e: any) {
                  setBackendError(e?.message ?? 'Request failed');
                } finally {
                  setBackendLoading(false);
                }
              }}
              disabled={backendLoading}
              className="btn-primary"
            >Start API quiz</button>

            <button
              onClick={async () => {
                const d: any = backendData;
                if (!d?.quizId || !d?.sectionSeq?.length) { setBackendError('Start the quiz first'); return; }
                setBackendLoading(true); setBackendError(null);
                try {
                  const section = d.sectionSeq[0];
                  const res = await fetch(`/api/quiz/${d.quizId}/section/${section}/questions`, { method: 'POST', body: JSON.stringify({}) });
                  if (!res.ok) throw new Error(`HTTP ${res.status}`);
                  const qs = await res.json();
                  setBackendData({ ...d, lastSection: section, lastQuestions: qs });
                } catch (e: any) {
                  setBackendError(e?.message ?? 'Request failed');
                } finally {
                  setBackendLoading(false);
                }
              }}
              disabled={backendLoading}
              className="btn-ghost"
            >Get questions (section 1)</button>

            <button
              onClick={async () => {
                const d: any = backendData;
                const q = d?.lastQuestions?.questions?.[0];
                if (!d?.quizId || !q) { setBackendError('Fetch questions first'); return; }
                setBackendLoading(true); setBackendError(null);
                try {
                  const res = await fetch('/api/quiz/response', { method: 'POST', body: JSON.stringify({ quizId: d.quizId, questionIdx: 0, questionText: q.question_text, questionHash: 'demo', chosenIdx: 0, correctIdx: q.correct_index, timeRemaining: 0 }) });
                  if (!res.ok) throw new Error(`HTTP ${res.status}`);
                  const ack = await res.json();
                  setBackendData({ ...d, lastAck: ack });
                } catch (e: any) {
                  setBackendError(e?.message ?? 'Request failed');
                } finally {
                  setBackendLoading(false);
                }
              }}
              disabled={backendLoading}
              className="btn-ghost"
            >Submit sample answer</button>
          </div>

          {backendError && <p className="text-red-300 mt-2">Error: {backendError}</p>}
          <pre className="mt-3 max-h-[300px] overflow-auto rounded-md bg-black/20 p-3 text-xs">
            {backendData ? JSON.stringify(backendData, null, 2) : 'No data yet'}
          </pre>
        </aside>
      </div>
    </main>
  );
}
