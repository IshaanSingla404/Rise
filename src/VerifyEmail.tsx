import { useEffect, useState } from 'react';
import { MailCheck, LoaderCircle, CheckCircle2, CircleAlert, ArrowLeft } from 'lucide-react';
import { authErrorText, resendVerification } from './lib/auth';

export type VerifyReason = 'sent' | 'unverified' | 'link-error';

/** Explain what a failed Supabase email link means, in plain language. */
export function linkErrorText(code: string | null, description: string | null): string {
  const c = (code || '').toLowerCase(), d = (description || '').toLowerCase();
  if (c === 'otp_expired' || d.includes('expired')) return 'This verification link has expired or was already used. If you’ve already verified your email, just log in. Otherwise, send yourself a new link below.';
  if (d.includes('already') && d.includes('confirm')) return 'Your email is already verified. You can log in now.';
  if (c === 'access_denied' || d.includes('invalid')) return 'This verification link isn’t valid. It may have been copied incompletely. Send yourself a new link below.';
  return description ? `We couldn’t verify that link: ${description}` : 'We couldn’t verify that link. Send yourself a new one below.';
}

const COOLDOWN = 60;

export default function VerifyEmail({ email: initialEmail, reason, linkError, onBackToLogin, onHome }: {
  email: string;
  reason: VerifyReason;
  linkError?: string;
  onBackToLogin: () => void;
  onHome: () => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(reason === 'sent' && initialEmail ? COOLDOWN : 0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const resend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Enter the email address you signed up with.'); return; }
    setBusy(true); setError(''); setSent('');
    try {
      await resendVerification(email.trim());
      setSent(`A new verification email is on its way to ${email.trim()}.`);
      setCooldown(COOLDOWN);
    } catch (err) {
      const msg = authErrorText(err);
      setError(/already|confirmed/i.test(msg) ? 'This email is already verified. You can log in now.' : msg);
    } finally { setBusy(false); }
  };

  const title = reason === 'link-error' ? 'That link didn’t work.' : 'Verify your email.';

  return (
    <div className="app auth-screen">
      <div className="auth-card verify-card">
        <button className="brand" onClick={onHome}><span>Rise</span><i /></button>
        <div className={`verify-mark ${reason === 'link-error' ? 'verify-mark-warn' : ''}`}>
          {reason === 'link-error' ? <CircleAlert size={22} /> : <MailCheck size={22} />}
        </div>
        <div className="eyebrow">{reason === 'link-error' ? 'EMAIL VERIFICATION' : 'ONE LAST STEP'}</div>
        <h1>{title}</h1>
        {reason === 'link-error'
          ? <p className="subhead">{linkError}</p>
          : <>
              <p className="subhead">{reason === 'unverified' ? 'Your email isn’t verified yet. ' : ''}Check your inbox to verify your email address.</p>
              {initialEmail && <p className="verify-email">We sent a link to <strong>{initialEmail}</strong></p>}
              <p className="small muted verify-hint">Open the link in that email to activate your account. It can take a minute to arrive, so check your spam folder too.</p>
            </>}

        <form className="auth-form" onSubmit={resend}>
          {(!initialEmail || reason === 'link-error') && (
            <label className="field-label">Email address
              <input type="email" autoComplete="email" required value={email} onChange={e => { setEmail(e.target.value); setError(''); }} placeholder="you@example.com" />
            </label>
          )}
          {sent && <p role="status" className="form-success"><CheckCircle2 size={14} />{sent}</p>}
          {error && <p role="alert" className="form-error">{error}</p>}
          <button className="button outline-button auth-submit" disabled={busy || cooldown > 0}>
            {busy ? <LoaderCircle className="spinner" size={16} /> : cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend verification email'}
          </button>
        </form>
        <button className="button dark-button auth-submit verify-login" onClick={onBackToLogin}>
          <ArrowLeft size={15} /> Return to log in
        </button>
        <p className="small muted auth-foot">Wrong address? Return to log in and create your account again with the right email.</p>
      </div>
    </div>
  );
}
