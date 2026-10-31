import type { User } from '@supabase/supabase-js';
import { requiredClient } from './supabase';

const redirectTo = () => `${location.origin}/`;

/** Translate Supabase auth errors into calm, actionable copy. */
export function authErrorText(e: unknown): string {
  const raw = (e as { message?: string; code?: string })?.message || '';
  const code = (e as { code?: string })?.code || '';
  const m = raw.toLowerCase();
  if (code === 'email_not_confirmed' || m.includes('email not confirmed')) return 'Please verify your email address before logging in. Check your inbox for the link.';
  if (code === 'invalid_credentials' || m.includes('invalid login credentials')) return 'That email and password don’t match. Try again or reset your password.';
  if (code === 'over_email_send_rate_limit' || m.includes('rate limit') || m.includes('for security purposes')) return 'Too many emails sent recently. Please wait a minute and try again.';
  if (code === 'email_address_invalid' || (m.includes('email address') && m.includes('invalid'))) return 'That email address can’t be used. Check it and try again.';
  if (code === 'weak_password' || m.includes('password should')) return raw || 'Choose a stronger password (at least 8 characters).';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Can’t reach Rise right now. Check your connection and try again.';
  return raw || 'Something went wrong. Please try again.';
}

export type SignUpResult =
  | { status: 'verify'; email: string } // account created, email confirmation required
  | { status: 'exists'; email: string } // email already registered (Supabase hides details)
  | { status: 'signed_in'; email: string }; // project has email confirmation disabled

export async function signUp(email: string, password: string, displayName: string): Promise<SignUpResult> {
  const { data, error } = await requiredClient().auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo(), data: { display_name: displayName.trim() } },
  });
  if (error) throw error;
  // With confirmation on, Supabase returns a user with no identities for an
  // address that's already registered, and sends no email.
  if (data.user && (data.user.identities?.length ?? 0) === 0) return { status: 'exists', email };
  // Only a session whose user has a confirmed email counts as signed in.
  if (data.session && isVerified(data.session.user)) return { status: 'signed_in', email };
  return { status: 'verify', email };
}

export async function resendVerification(email: string) {
  const { error } = await requiredClient().auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectTo() } });
  if (error) throw error;
}

export function isVerified(user: User | null | undefined) {
  return Boolean(user && (user.email_confirmed_at || user.confirmed_at));
}

export async function signIn(email: string, password: string) { const { data, error } = await requiredClient().auth.signInWithPassword({ email, password }); if (error) throw error; return data; }
export async function signOut() { const { error } = await requiredClient().auth.signOut(); if (error) throw error; }
export async function resetPassword(email: string) { const { error } = await requiredClient().auth.resetPasswordForEmail(email, { redirectTo: redirectTo() }); if (error) throw error; }
export async function updatePassword(password: string) { const { error } = await requiredClient().auth.updateUser({ password }); if (error) throw error; }
