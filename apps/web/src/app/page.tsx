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
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <h1>TransLight Solar Quiz — Local Demo</h1>
        <p>No backend required. Click start to try a 3‑question mock quiz.</p>
        <button onClick={start} style={{ padding: '10px 14px' }}>Start demo</button>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <h1>Results</h1>
        <p>You scored {score} / {QUESTIONS.length}</p>
        <button onClick={reset} style={{ padding: '10px 14px' }}>Restart</button>
        <div style={{ marginTop: 16 }}>
          {QUESTIONS.map((q, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <strong>Q{i + 1}:</strong> {q.text}
              <div>
                Your answer: {q.options[answers[i]]} {answers[i] === q.correct ? '✓' : '✗'}
              </div>
              <div>Correct: {q.options[q.correct]}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: 12 }}>
        <a href="/quiz" style={{ textDecoration: 'underline' }}>Go to full API-driven quiz →</a>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
        <div style={{ maxWidth: 800 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <strong>Question {idx + 1} / {QUESTIONS.length}</strong>
            <span>Score: {score}</span>
          </div>
          <h2 style={{ marginBottom: 12 }}>{current.text}</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            {current.options.map((opt, i) => {
              const isChosen = chosen === i;
              return (
                <button
                  key={i}
                  onClick={() => choose(i)}
                  style={{
                    textAlign: 'left', padding: '10px 12px', borderRadius: 8,
                    border: '1px solid #ccc', background: isChosen ? '#e6f0ff' : 'white'
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 12 }}>
            <button onClick={next} disabled={chosen == null} style={{ padding: '10px 14px' }}>
              {idx + 1 === QUESTIONS.length ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>

        <aside style={{ border: '1px solid #e5e5e5', borderRadius: 8, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Backend test</h3>
          <p style={{ marginTop: 0 }}>Calls Next.js proxy → FastAPI</p>

          <div style={{ display: 'grid', gap: 8 }}>
            <button
              onClick={async () => {
                // Start quiz
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
              style={{ padding: '8px 12px' }}
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
              style={{ padding: '8px 12px' }}
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
              style={{ padding: '8px 12px' }}
            >Submit sample answer</button>
          </div>

          {backendError && <p style={{ color: 'crimson' }}>Error: {backendError}</p>}
          <pre style={{ marginTop: 12, background: '#f6f6f6', padding: 8, maxHeight: 300, overflow: 'auto' }}>
            {backendData ? JSON.stringify(backendData, null, 2) : 'No data yet'}
          </pre>
        </aside>
      </div>
    </div>
  );
}
