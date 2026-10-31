import { ArrowRight, Check, CheckCircle2, ChartNoAxesColumnIncreasing, Timer, LockKeyhole, Sunrise, Flame, Settings as SettingsIcon } from 'lucide-react';
import { ProgressRing } from './screens';

const previewHabits = [
  { name: 'Morning pages', cue: 'Three pages, before the phone', time: '7:00 AM', done: true, streak: 12 },
  { name: 'Stretch for ten minutes', cue: 'Right after coffee', time: '7:30 AM', done: true, streak: 8 },
  { name: 'Read twenty pages', cue: 'Phone in the other room', time: '9:00 PM', done: false, streak: 3 },
];

const features = [
  { icon: CheckCircle2, title: 'Habit tracking', text: 'Shape small habits around your mornings, afternoons and evenings. Choose the days, check them off, keep going.' },
  { icon: ChartNoAxesColumnIncreasing, title: 'Insights', text: 'A calm picture of your week: completion by day, what’s becoming natural, and streaks worth protecting.' },
  { icon: Timer, title: 'Focus sessions', text: 'A gentle timer for deep work, with short and long breaks set to your rhythm. Every finished session is saved.' },
  { icon: LockKeyhole, title: 'Rise Focus', text: 'Keep a list of the sites that pull you away, with strict mode for harder days. The Rise Focus browser extension pauses them during sessions.' },
];

export default function Landing({ onGetStarted, onLogIn }: { onGetStarted: () => void; onLogIn: () => void }) {
  return (
    <div className="app landing">
      <header className="topbar lp-top">
        <a className="brand" href="/" aria-label="Rise home"><span>Rise</span><i /></a>
        <nav className="lp-nav" aria-label="Account">
          <button className="button quiet-button" onClick={onLogIn}>Log in</button>
          <button className="button dark-button" onClick={onGetStarted}>Get started</button>
        </nav>
      </header>

      <main>
        <section className="lp-hero">
          <div className="eyebrow">A calmer way to build habits</div>
          <h1 className="lp-title">Small rituals,<br /><em>kept gently.</em></h1>
          <p className="lp-lede">Rise is a calm place to build habits and protect your focus. Plan a few daily habits, check them off, and see your consistency grow, without streak anxiety or noise.</p>
          <div className="lp-ctas">
            <button className="button dark-button lp-cta" onClick={onGetStarted}>Get started, it’s free <ArrowRight size={16} /></button>
            <button className="button outline-button lp-cta" onClick={onLogIn}>Log in</button>
          </div>
        </section>

        <section className="lp-preview-wrap" aria-label="Preview of the Rise dashboard">
          <div className="lp-window" aria-hidden="true">
            <div className="lp-window-bar"><span /><span /><span /></div>
            <div className="lp-window-body">
              <div className="lp-mini-top"><span className="mini-brand">Rise<i /></span><span className="quiet">maya@example.com</span></div>
              <div className="card glass-card today-hero-card lp-mini-hero">
                <div className="th-copy">
                  <div className="eyebrow">Thursday, November 5</div>
                  <h2 className="lp-mini-greeting">Good morning, Maya.</h2>
                  <div className="th-progress">
                    <div className="progress-line"><div><strong>2</strong><span> of 3 habits done</span></div><span className="small muted">67%</span></div>
                    <div className="line-track"><span style={{ width: '67%' }} /></div>
                  </div>
                </div>
                <ProgressRing value={2 / 3} size={150} stroke={11} className="th-ring">
                  <span className="ring-number">2</span><span className="small muted">of 3 today</span>
                </ProgressRing>
              </div>
              <div className="card group lp-mini-group">
                <div className="group-label"><span className="gl-title"><Sunrise size={14} /> Today</span><span className="group-count">2/3</span></div>
                {previewHabits.map(h => (
                  <div key={h.name} className={`habit-line ${h.done ? 'habit-done' : ''}`}>
                    <span className={`check-circle ${h.done ? 'checked' : ''}`}>{h.done && <Check size={14} strokeWidth={3} />}</span>
                    <span className="habit-description"><span className="habit-name">{h.name}</span><span className="habit-cue">{h.cue}</span></span>
                    <span className="streak-badge"><Flame size={13} />{h.streak}</span>
                    <span className="habit-time">{h.time}</span>
                  </div>
                ))}
              </div>
              <div className="lp-mini-dock">
                {[Sunrise, CheckCircle2, ChartNoAxesColumnIncreasing, Timer, LockKeyhole, SettingsIcon].map((Icon, i) => (
                  <span key={i} className={i === 0 ? 'lp-dock-active' : ''}><Icon size={16} strokeWidth={1.75} /></span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="lp-features" aria-labelledby="lp-features-title">
          <div className="lp-section-head">
            <div className="eyebrow">WHAT’S INSIDE</div>
            <h2 id="lp-features-title">Four quiet tools, one steady practice.</h2>
          </div>
          <div className="lp-feature-grid">
            {features.map(({ icon: Icon, title, text }, i) => (
              <article className="lp-feature" key={title}>
                <div className="lp-feature-top"><Icon size={18} /><span className="lp-num">0{i + 1}</span></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-close">
          <h2>Begin with one small thing.</h2>
          <p className="subhead">Your habits and focus history sync privately to your account.</p>
          <button className="button dark-button lp-cta" onClick={onGetStarted}>Get started <ArrowRight size={16} /></button>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <span className="mini-brand">Rise<i /></span>
          <nav aria-label="Footer">
            <button onClick={onGetStarted}>Create account</button>
            <button onClick={onLogIn}>Log in</button>
          </nav>
          <span className="small muted">© {new Date().getFullYear()} Rise. Private by design.</span>
        </div>
      </footer>
    </div>
  );
}
