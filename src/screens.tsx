import { useId, useMemo } from 'react';
import {
  Check, Plus, Flame, Pencil, Trash2, Archive, ArrowUpRight, Sunrise, Sun, Moon, Clock3,
  Play, Pause, Square, Target, CalendarDays, MoreHorizontal, TrendingUp,
} from 'lucide-react';
import type { AppData, Habit, Session } from './lib/data';

/* ---------- Date helpers (timezone-aware, same rules as the rest of the app) ---------- */
const keyAt = (d: Date, tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const utcKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
/** Day keys ending today, oldest first. */
export function lastDays(n: number, tz: string) {
  const base = new Date(`${keyAt(new Date(), tz)}T12:00:00Z`);
  return Array.from({ length: n }, (_, i) => { const d = new Date(base); d.setUTCDate(d.getUTCDate() - (n - 1 - i)); return { key: utcKey(d), date: d, weekday: d.getUTCDay() }; });
}
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const created = (h: Habit) => (h.createdAt || '').slice(0, 10);
/** Scheduled vs. done for one day; a habit only counts from the day it was created. */
export function dayStat(data: AppData, key: string, weekday: number) {
  const scheduled = data.habits.filter(h => !h.archived && h.days.includes(weekday) && (!created(h) || created(h) <= key));
  const checks = data.checks[key] || [];
  const done = scheduled.filter(h => checks.includes(h.id)).length;
  return { done, total: scheduled.length, pct: scheduled.length ? done / scheduled.length : 0 };
}
function rateOver(data: AppData, days: { key: string; weekday: number }[]) {
  let done = 0, total = 0;
  for (const d of days) { const s = dayStat(data, d.key, d.weekday); done += s.done; total += s.total; }
  return { done, total, pct: total ? done / total : 0 };
}
/** Consecutive scheduled days completed, ending today (today may still be open). */
export function currentStreak(data: AppData, h: Habit) {
  const days = lastDays(366, data.settings.timezone).reverse();
  let n = 0;
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    if (!h.days.includes(d.weekday)) continue;
    if (created(h) && d.key < created(h)) break;
    if ((data.checks[d.key] || []).includes(h.id)) n++;
    else if (i > 0) break;
  }
  return n;
}
export function frequencyLabel(days: number[]) {
  const s = [...days].sort();
  if (s.length === 7) return 'Every day';
  if (s.join() === '1,2,3,4,5') return 'Weekdays';
  if (s.join() === '0,6') return 'Weekends';
  if (s.length === 1) return `${DAY_NAMES[s[0]]}s`;
  return s.map(d => DAY_SHORT[d]).join(', ');
}
export const categoryIcon = (c: string, size = 16) =>
  c === 'Morning' ? <Sunrise size={size} /> : c === 'Afternoon' ? <Sun size={size} /> : c === 'Evening' ? <Moon size={size} /> : <Clock3 size={size} />;
const fmtTime12 = (t: string) => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(`2000-01-01T${t || '09:00'}`));
const pctText = (p: number) => `${Math.round(p * 100)}%`;

/* ---------- Progress ring ---------- */
export function ProgressRing({ value, size = 220, stroke = 14, children, className = '' }: { value: number; size?: number; stroke?: number; children?: React.ReactNode; className?: string }) {
  const id = useId().replace(/:/g, '');
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
  return (
    <div className={`pring ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--arctic)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <circle className="pring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle className="pring-value" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" stroke={`url(#g${id})`}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ opacity: v > 0 ? 1 : 0 }} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="pring-center">{children}</div>
    </div>
  );
}

/* ---------- Skeleton ---------- */
export function DashboardSkeleton() {
  return (
    <div className="skeleton-page" aria-busy="true" aria-label="Loading your habits">
      <div className="card sk-hero"><div className="sk-col"><span className="sk sk-xs" /><span className="sk sk-xl" /><span className="sk sk-md" /><span className="sk sk-bar" /></div><span className="sk sk-ring" /></div>
      <div className="card sk-week">{Array.from({ length: 7 }, (_, i) => <span key={i} className="sk sk-dot" />)}</div>
      <div className="card sk-list">{Array.from({ length: 4 }, (_, i) => <div key={i} className="sk-row"><span className="sk sk-check" /><div className="sk-col"><span className="sk sk-md" /><span className="sk sk-sm" /></div></div>)}</div>
    </div>
  );
}

/* ---------- Today ---------- */
export function TodayScreen({ data, activeToday, todayChecks, onToggle, onEdit, onAdd, onOpenInsights }: {
  data: AppData; activeToday: Habit[]; todayChecks: string[];
  onToggle: (id: string) => void; onEdit: (h: Habit) => void; onAdd: () => void; onOpenInsights: () => void;
}) {
  const tz = data.settings.timezone;
  const done = activeToday.filter(h => todayChecks.includes(h.id)).length;
  const pct = activeToday.length ? done / activeToday.length : 0;
  const week = useMemo(() => lastDays(7, tz).map(d => ({ ...d, ...dayStat(data, d.key, d.weekday) })), [data, tz]);
  const weekRate = rateOver(data, week);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const nowLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: tz }).format(new Date());
  const remaining = activeToday.length - done;

  return (
    <div className="today">
      <section className="card glass-card today-hero-card">
        <div className="th-copy">
          <div className="eyebrow">{nowLabel}</div>
          <h1>Good {greeting}, {data.settings.name || 'there'}.</h1>
          <p className="subhead">{!activeToday.length ? 'Nothing scheduled yet. Start with one small habit.' : remaining === 0 ? 'Everything’s done for today. Lovely work.' : `${remaining} habit${remaining === 1 ? '' : 's'} left today. A little progress is still progress.`}</p>
          <div className="th-progress">
            <div className="progress-line"><div><strong>{done}</strong><span> of {activeToday.length} habits done</span></div><span className="small muted">{pctText(pct)}</span></div>
            <div className="line-track"><span style={{ width: `${pct * 100}%` }} /></div>
          </div>
          <div className="th-actions">
            <button className="button dark-button large-button" onClick={onAdd}><Plus size={17} /> Add habit</button>
            <button className="button quiet-button" onClick={onOpenInsights}>View insights <ArrowUpRight size={15} /></button>
          </div>
        </div>
        <ProgressRing value={pct} className="th-ring">
          <span className="ring-number">{done}</span>
          <span className="small muted">of {activeToday.length} today</span>
        </ProgressRing>
      </section>

      <section className="card week-card" aria-label="This week">
        <div className="week-head"><div className="eyebrow">This week</div><span className="small muted"><strong className="week-rate">{pctText(weekRate.pct)}</strong> complete</span></div>
        <div className="week-strip">
          {week.map((d, i) => {
            const isToday = i === week.length - 1;
            return (
              <div key={d.key} className={`week-day ${isToday ? 'is-today' : ''}`} title={`${DAY_NAMES[d.weekday]}: ${d.done}/${d.total}`}>
                <span className="wd-name">{DAY_SHORT[d.weekday].slice(0, 1)}</span>
                <ProgressRing value={d.pct} size={40} stroke={4} className={d.total && d.done === d.total ? 'pring-full' : ''}>
                  {d.total && d.done === d.total ? <Check size={14} /> : <span className="wd-num">{d.date.getUTCDate()}</span>}
                </ProgressRing>
              </div>
            );
          })}
        </div>
      </section>

      <section className="today-list">
        <div className="schedule-head"><div><div className="eyebrow">Your rhythm</div><h2>Today’s habits</h2></div><button className="button outline-button" onClick={onAdd}><Plus size={16} /> New</button></div>
        {['Morning', 'Afternoon', 'Evening', 'Anytime'].map(group => {
          const list = activeToday.filter(h => h.category === group).sort((a, b) => a.time.localeCompare(b.time));
          if (!list.length) return null;
          return (
            <div className="card group" key={group}>
              <div className="group-label"><span className="gl-title">{categoryIcon(group, 14)} {group}</span><span className="group-count">{list.filter(h => todayChecks.includes(h.id)).length}/{list.length}</span></div>
              {list.map(h => <HabitLine key={h.id} habit={h} done={todayChecks.includes(h.id)} streak={currentStreak(data, h)} onToggle={() => onToggle(h.id)} onEdit={() => onEdit(h)} />)}
            </div>
          );
        })}
        {!activeToday.length && <EmptyCard title="A quiet day ahead." text="Add a small habit to begin your rhythm." action="Add a habit" onClick={onAdd} />}
      </section>
    </div>
  );
}

export function HabitLine({ habit, done, streak, onToggle, onEdit }: { habit: Habit; done: boolean; streak: number; onToggle: () => void; onEdit: () => void }) {
  return (
    <div className={`habit-line ${done ? 'habit-done' : ''}`}>
      <button className={`check-circle ${done ? 'checked' : ''}`} onClick={onToggle} aria-pressed={done} aria-label={`${done ? 'Mark not done' : 'Complete'}: ${habit.name}`}>{done && <Check size={14} strokeWidth={3} />}</button>
      <button className="habit-description" onClick={onEdit}><span className="habit-name">{habit.name}</span><span className="habit-cue">{habit.cue || 'A moment for yourself'}</span></button>
      {streak > 0 && <span className="streak-badge" title={`${streak}-day streak`}><Flame size={13} />{streak}</span>}
      <span className="habit-time">{fmtTime12(habit.time)}</span>
      <button className="icon-button inline-edit" title="Edit habit" aria-label={`Edit ${habit.name}`} onClick={onEdit}><MoreHorizontal size={17} /></button>
    </div>
  );
}

export function EmptyCard({ title, text, action, onClick }: { title: string; text: string; action: string; onClick: () => void }) {
  return <div className="card empty-state"><div className="empty-icon"><Sunrise size={22} /></div><h2>{title}</h2><p>{text}</p><button className="button dark-button" onClick={onClick}><Plus size={15} />{action}</button></div>;
}

/* ---------- Habits ---------- */
export function HabitsScreen({ data, habits, query, setQuery, showArchived, setShowArchived, onAdd, onEdit, onArchive, onDelete }: {
  data: AppData; habits: Habit[]; query: string; setQuery: (q: string) => void; showArchived: boolean; setShowArchived: (v: boolean) => void;
  onAdd: () => void; onEdit: (h: Habit) => void; onArchive: (h: Habit) => void; onDelete: (h: Habit) => void;
}) {
  const order = ['Morning', 'Afternoon', 'Evening', 'Anytime'];
  const list = habits.filter(h => h.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.time.localeCompare(b.time));
  const week = lastDays(7, data.settings.timezone);
  return (
    <>
      <section className="page-intro"><div className="eyebrow">Your practice</div><h1>Habits</h1><p className="subhead">Small habits, made your own.</p></section>
      <div className="toolbar">
        <span className="muted small">{habits.length} {showArchived ? 'archived' : 'active'} habit{habits.length === 1 ? '' : 's'}</span>
        <div className="row gap">
          <input className="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a habit…" aria-label="Search habits" />
          <button className={`button outline-button ${showArchived ? 'is-on' : ''}`} onClick={() => setShowArchived(!showArchived)}><Archive size={15} />{showArchived ? 'Show active' : 'Archived'}</button>
          <button className="button dark-button" onClick={onAdd}><Plus size={16} /> New habit</button>
        </div>
      </div>
      {list.length ? (
        <div className="habit-grid">
          {list.map(h => {
            const streak = currentStreak(data, h);
            return (
              <article className="card habit-card lift" key={h.id}>
                <div className="hc-top">
                  <span className="hc-icon">{categoryIcon(h.category, 18)}</span>
                  <button className="hc-title" onClick={() => onEdit(h)}><span className="habit-name">{h.name}</span><span className="habit-cue">{h.cue || 'A moment for yourself'}</span></button>
                  <div className="manage-actions">
                    <button className="icon-button" title="Edit habit" aria-label={`Edit ${h.name}`} onClick={() => onEdit(h)}><Pencil size={15} /></button>
                    <button className="icon-button" title={h.archived ? 'Restore habit' : 'Archive habit'} aria-label={`${h.archived ? 'Restore' : 'Archive'} ${h.name}`} onClick={() => onArchive(h)}><Archive size={15} /></button>
                    <button className="icon-button danger" title="Delete habit" aria-label={`Delete ${h.name}`} onClick={() => onDelete(h)}><Trash2 size={15} /></button>
                  </div>
                </div>
                <div className="hc-meta">
                  <span className="chip">{h.category} · {fmtTime12(h.time)}</span>
                  <span className="chip"><CalendarDays size={12} /> {frequencyLabel(h.days)}</span>
                </div>
                <div className="hc-bottom">
                  <div className="hc-week" aria-label="Last 7 days">
                    {week.map(d => {
                      const scheduled = h.days.includes(d.weekday), did = (data.checks[d.key] || []).includes(h.id);
                      return <span key={d.key} className={`hc-dot ${did ? 'did' : scheduled ? 'missed' : 'off'}`} title={`${DAY_NAMES[d.weekday]}: ${did ? 'done' : scheduled ? 'not done' : 'not scheduled'}`}><i>{DAY_SHORT[d.weekday].slice(0, 1)}</i></span>;
                    })}
                  </div>
                  <span className={`streak-badge ${streak ? '' : 'is-zero'}`}><Flame size={13} />{streak} day{streak === 1 ? '' : 's'}</span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyCard title={showArchived ? 'No archived habits.' : query ? 'No habits found.' : 'No habits yet.'} text={query ? 'Try another search, or create a new habit.' : 'Create your first habit to start building your rhythm.'} action="Create a habit" onClick={() => { setQuery(''); setShowArchived(false); onAdd(); }} />
      )}
    </>
  );
}

/* ---------- Insights ---------- */
function LineChart({ points }: { points: { label: string; value: number }[] }) {
  const id = useId().replace(/:/g, '');
  const w = 640, h = 180, px = 8, py = 14;
  const xs = (i: number) => px + (i * (w - px * 2)) / Math.max(1, points.length - 1);
  const ys = (v: number) => py + (1 - v) * (h - py * 2);
  // Smooth curve: horizontal-tangent cubic segments never overshoot the 0–100% range.
  const line = points.map((p, i) => {
    const x = xs(i), y = ys(p.value);
    if (!i) return `M${x.toFixed(1)},${y.toFixed(1)}`;
    const px0 = xs(i - 1), py0 = ys(points[i - 1].value), xm = (px0 + x) / 2;
    return `C${xm.toFixed(1)},${py0.toFixed(1)} ${xm.toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const area = `${line} L${xs(points.length - 1)},${h} L${xs(0)},${h} Z`;
  return (
    <svg className="line-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Daily completion rate, last 30 days">
      <defs><linearGradient id={`a${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity=".18" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
      {[0, .5, 1].map(g => <line key={g} x1={0} x2={w} y1={ys(g)} y2={ys(g)} className="lc-grid" />)}
      <path d={area} fill={`url(#a${id})`} />
      <path d={line} className="lc-line" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function InsightsScreen({ data }: { data: AppData }) {
  const tz = data.settings.timezone;
  const d30 = lastDays(30, tz), d7 = d30.slice(-7);
  const week = rateOver(data, d7), month = rateOver(data, d30);
  const active = data.habits.filter(h => !h.archived);
  const streaks = active.map(h => ({ h, s: currentStreak(data, h) })).sort((a, b) => b.s - a.s);
  const best = streaks[0]?.s || 0;
  const focusHours = Math.round(data.sessions.reduce((s, x) => s + x.duration, 0) / 6) / 10;
  const daily = d30.map(d => ({ label: d.key, value: dayStat(data, d.key, d.weekday).pct }));
  const weeks = lastDays(56, tz);
  const weekly = Array.from({ length: 8 }, (_, i) => { const chunk = weeks.slice(i * 7, i * 7 + 7); const r = rateOver(data, chunk); return { label: `${chunk[0].date.getUTCMonth() + 1}/${chunk[0].date.getUTCDate()}`, ...r }; });
  const consistency = active.map(h => {
    const sched = d30.filter(d => h.days.includes(d.weekday) && (!created(h) || created(h) <= d.key));
    const did = sched.filter(d => (data.checks[d.key] || []).includes(h.id)).length;
    return { h, rate: sched.length ? did / sched.length : 0, did, total: sched.length };
  }).sort((a, b) => b.rate - a.rate);

  return (
    <>
      <section className="page-intro"><div className="eyebrow">Looking back</div><h1>Insights</h1><p className="subhead">A clear picture of the care you’ve put in.</p></section>
      <div className="stat-grid">
        <div className="card stat"><span className="eyebrow">This week</span><strong>{pctText(week.pct)}</strong><span className="small muted">{week.done} of {week.total} completed</span></div>
        <div className="card stat"><span className="eyebrow">Last 30 days</span><strong>{pctText(month.pct)}</strong><span className="small muted">{month.done} of {month.total} completed</span></div>
        <div className="card stat"><span className="eyebrow">Best current streak</span><strong>{best}<small> day{best === 1 ? '' : 's'}</small></strong><span className="small muted">{streaks[0]?.s ? streaks[0].h.name : 'Complete a habit to start one'}</span></div>
        <div className="card stat"><span className="eyebrow">Focus time</span><strong>{focusHours}<small>h</small></strong><span className="small muted">{data.sessions.length} session{data.sessions.length === 1 ? '' : 's'}</span></div>
      </div>
      <div className="insight-grid">
        <section className="card insight-section is-wide">
          <div className="section-heading"><div><div className="eyebrow">Daily trend</div><h2>Last 30 days</h2></div><span className="trend-pill"><TrendingUp size={14} /> {pctText(month.pct)} average</span></div>
          <LineChart points={daily} />
          <div className="lc-axis"><span>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(d30[0].date)}</span><span>Today</span></div>
        </section>
        <section className="card insight-section">
          <div className="section-heading"><div><div className="eyebrow">Weekly trend</div><h2>Completion by week</h2></div></div>
          <div className="chart">
            {weekly.map((w, i) => (
              <div className="chart-col" key={i}>
                <div className="bar-wrap"><span className="bar-value">{w.total ? pctText(w.pct) : '–'}</span><div className="bar-bg"><div className="bar-fill" style={{ height: `${w.pct ? Math.max(6, w.pct * 100) : 0}%` }} /></div></div>
                <span className={`chart-day ${i === weekly.length - 1 ? 'current' : ''}`}>{i === weekly.length - 1 ? 'Now' : w.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="card insight-section">
          <div className="section-heading"><div><div className="eyebrow">By habit</div><h2>Consistency</h2></div><span className="small muted">Last 30 days</span></div>
          <div className="consistency">
            {consistency.map(({ h, rate, did, total }) => (
              <div className="consistency-row" key={h.id}>
                <span className="cr-name">{h.name}</span>
                <div className="mini-track"><span style={{ width: `${rate * 100}%` }} /></div>
                <span className="small muted cr-val">{did}/{total}</span>
                <span className="streak-badge is-compact"><Flame size={12} />{currentStreak(data, h)}</span>
              </div>
            ))}
            {!active.length && <p className="muted small">Your habit history will appear here once you create a habit.</p>}
          </div>
        </section>
      </div>
    </>
  );
}

/* ---------- Focus ---------- */
export function FocusScreen({ data, seconds, timerOn, timerState, timerDuration, onStart, onPause, onEnd, onMode, onCustomize }: {
  data: AppData; seconds: number; timerOn: boolean; timerState: 'focus' | 'shortBreak' | 'longBreak'; timerDuration: number;
  onStart: () => void; onPause: () => void; onEnd: () => void; onMode: (m: 'focus' | 'shortBreak' | 'longBreak') => void; onCustomize: () => void;
}) {
  const total = timerDuration * 60, left = seconds || total, elapsed = seconds ? total - seconds : 0, progress = seconds ? elapsed / total : 0;
  const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const state = timerOn ? 'In session' : seconds ? 'Paused' : 'Ready';
  const todayKey = keyAt(new Date(), data.settings.timezone);
  const todayMinutes = data.sessions.filter(s => keyAt(new Date(s.start), data.settings.timezone) === todayKey).reduce((a, s) => a + s.duration, 0);
  const modes = [['focus', 'Focus', data.settings.focus], ['shortBreak', 'Short break', data.settings.shortBreak], ['longBreak', 'Long break', data.settings.longBreak]] as const;
  return (
    <>
      <section className="page-intro"><div className="eyebrow">Make a little space</div><h1>Focus</h1><p className="subhead">One thing at a time is enough.</p></section>
      <div className="focus-layout">
        <section className={`focus-stage ${timerOn ? 'is-running' : ''}`}>
          <div className="timer-label"><span className={`state-pill ${timerOn ? 'live' : ''}`}><i />{state}</span><button className="text-link" onClick={onCustomize}>Customize <ArrowUpRight size={14} /></button></div>
          <ProgressRing value={progress} size={272} stroke={12} className="timer-ring">
            <span className="eyebrow">{modes.find(m => m[0] === timerState)?.[1]}</span>
            <span className="timer-readout" aria-live="off">{mmss(left)}</span>
            <span className="small muted">{seconds ? `${mmss(elapsed)} elapsed · ${pctText(progress)}` : `${timerDuration} minute session`}</span>
          </ProgressRing>
          <div className="timer-dock glass">
            <div className="timer-controls">
              {!timerOn
                ? <button className="button dark-button large-button" onClick={onStart}><Play size={16} fill="currentColor" /> {seconds ? 'Resume' : 'Start'}</button>
                : <button className="button dark-button large-button" onClick={onPause}><Pause size={16} fill="currentColor" /> Pause</button>}
              <button className="button outline-button large-button" onClick={onEnd} disabled={!seconds}><Square size={14} fill="currentColor" /> End</button>
            </div>
            <div className="timer-modes" role="group" aria-label="Timer mode">
              {modes.map(([key, label, minutes]) => <button key={key} className={timerState === key ? 'mode active-mode' : 'mode'} aria-pressed={timerState === key} onClick={() => onMode(key)}>{label} <span>{minutes}m</span></button>)}
            </div>
          </div>
        </section>
        <aside className="card focus-aside">
          <div className="eyebrow">Focus history</div>
          <div className="fa-today"><strong>{todayMinutes}</strong><span className="small muted"> min focused today</span></div>
          <SessionList sessions={data.sessions.slice(0, 6)} />
          <div className="focus-note"><Target size={15} /><span>Completed sessions are saved to your account.</span></div>
        </aside>
      </div>
    </>
  );
}
function SessionList({ sessions }: { sessions: Session[] }) {
  if (!sessions.length) return <div className="empty-inline"><Clock3 size={18} /><p>Your finished focus sessions will appear here.</p></div>;
  return <div className="session-list">{sessions.map(s => <div className="session-row" key={s.id}><span className="session-mark"><Check size={13} strokeWidth={3} /></span><span className="session-date">{new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(s.start))}</span><span className="session-duration">{s.duration} min</span></div>)}</div>;
}
