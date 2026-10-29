import type { User } from '@supabase/supabase-js';
import { requiredClient } from './supabase';

export type Habit = { id:string; name:string; cue:string; category:string; time:string; days:number[]; createdAt:string; archived:boolean };
export type Settings = { name:string; focus:number; shortBreak:number; longBreak:number; theme:'light'|'dark'; notifications:boolean; weekStartsMonday:boolean; timezone:string; blocked:string[]; allow:string[]; strict:boolean };
export type Session = { id:string; start:string; duration:number; completed:boolean };
export type AppData = { habits:Habit[]; checks:Record<string,string[]>; settings:Settings; sessions:Session[] };
export type HabitInput = Omit<Habit,'id'|'createdAt'|'archived'>;
export const defaultSettings:Settings={name:'',focus:25,shortBreak:5,longBreak:15,theme:'light',notifications:false,weekStartsMonday:true,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',blocked:[],allow:[],strict:false};
const fail=(error:any)=>{if(error)throw new Error(error.message||'The request failed. Please try again.');};
export async function loadUserData(user:User):Promise<AppData>{
  const db=requiredClient();
  const [profile,preferences,habits,completions,sessions,domains]=await Promise.all([
    db.from('profiles').select('display_name').eq('id',user.id).maybeSingle(),
    db.from('user_preferences').select('*').eq('user_id',user.id).maybeSingle(),
    db.from('habits').select('id,name,cue,category,reminder_time,archived,created_at,habit_schedules(day_of_week)').eq('user_id',user.id).order('sort_order').order('created_at'),
    db.from('habit_completions').select('habit_id,local_date').eq('user_id',user.id),
    db.from('focus_sessions').select('id,started_at,duration_minutes,completed').eq('user_id',user.id).order('started_at',{ascending:false}).limit(500),
    db.from('focus_domains').select('domain,kind').eq('user_id',user.id),
  ]);[profile,preferences,habits,completions,sessions,domains].forEach(x=>fail(x.error));
  const pref=preferences.data, domainRows=domains.data||[], completionRows=completions.data||[], habitRows=habits.data||[], sessionRows=sessions.data||[];const settings:Settings={...defaultSettings,name:profile.data?.display_name||user.email?.split('@')[0]||'Rise',focus:pref?.focus_minutes??25,shortBreak:pref?.short_break_minutes??5,longBreak:pref?.long_break_minutes??15,theme:pref?.theme??'light',notifications:pref?.notifications_enabled??false,weekStartsMonday:pref?.week_starts_monday??true,timezone:pref?.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',blocked:domainRows.filter(x=>x.kind==='blocked').map(x=>x.domain),allow:domainRows.filter(x=>x.kind==='allow').map(x=>x.domain),strict:pref?.strict_mode??false};
  const checks:Record<string,string[]>={};for(const c of completionRows) (checks[c.local_date]??=[]).push(c.habit_id);
  return {habits:habitRows.map(h=>({id:h.id,name:h.name,cue:h.cue||'',category:h.category,time:h.reminder_time||'09:00',days:(h.habit_schedules||[]).map((x:any)=>x.day_of_week),createdAt:h.created_at,archived:h.archived})),checks,settings,sessions:sessionRows.map(s=>({id:s.id,start:s.started_at,duration:s.duration_minutes,completed:s.completed}))};
}
export async function saveProfile(user:User,name:string){const db=requiredClient();const{error}=await db.from('profiles').upsert({id:user.id,display_name:name.trim(),updated_at:new Date().toISOString()});fail(error)}
export async function saveSettings(user:User,s:Settings){const db=requiredClient();const{error}=await db.from('user_preferences').upsert({user_id:user.id,timezone:s.timezone,theme:s.theme,focus_minutes:s.focus,short_break_minutes:s.shortBreak,long_break_minutes:s.longBreak,notifications_enabled:s.notifications,week_starts_monday:s.weekStartsMonday,strict_mode:s.strict,updated_at:new Date().toISOString()});fail(error);const values=[...new Set(s.blocked)].map(domain=>({user_id:user.id,domain,kind:'blocked'})).concat([...new Set(s.allow)].map(domain=>({user_id:user.id,domain,kind:'allow'})));if(values.length){const{error:upsertError}=await db.from('focus_domains').upsert(values,{onConflict:'user_id,domain,kind',ignoreDuplicates:true});fail(upsertError)}const{data:existing,error:readError}=await db.from('focus_domains').select('id,domain,kind').eq('user_id',user.id);fail(readError);const wanted=new Set(values.map(x=>`${x.kind}:${x.domain}`)),obsolete=(existing||[]).filter(x=>!wanted.has(`${x.kind}:${x.domain}`)).map(x=>x.id);if(obsolete.length){const{error:deleteError}=await db.from('focus_domains').delete().in('id',obsolete);fail(deleteError)}}
export async function saveHabit(user:User,input:HabitInput,id?:string){const{error}=await requiredClient().rpc('save_habit_with_schedule',{p_habit_id:id||null,p_name:input.name.trim(),p_cue:input.cue,p_category:input.category,p_reminder_time:input.time,p_days:input.days});fail(error)}
export async function completeHabit(user:User,habitId:string,date:string,complete:boolean){const db=requiredClient();if(complete){const{error}=await db.from('habit_completions').upsert({user_id:user.id,habit_id:habitId,local_date:date},{onConflict:'habit_id,local_date'});fail(error)}else{const{error}=await db.from('habit_completions').delete().eq('user_id',user.id).eq('habit_id',habitId).eq('local_date',date);fail(error)}}
export async function archiveHabit(user:User,id:string,archived:boolean){const{error}=await requiredClient().from('habits').update({archived,updated_at:new Date().toISOString()}).eq('user_id',user.id).eq('id',id);fail(error)}
export async function deleteHabit(user:User,id:string){const{error}=await requiredClient().from('habits').delete().eq('user_id',user.id).eq('id',id);fail(error)}
export async function saveSession(user:User,duration:number,startedAt:string){const{error}=await requiredClient().from('focus_sessions').insert({user_id:user.id,started_at:startedAt,duration_minutes:duration,completed:true});fail(error)}
