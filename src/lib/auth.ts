import { requiredClient } from './supabase';
export async function signUp(email:string,password:string,displayName:string){const{data,error}=await requiredClient().auth.signUp({email,password,options:{emailRedirectTo:`${location.origin}/`,data:{display_name:displayName.trim()}}});if(error)throw error;return data}
export async function signIn(email:string,password:string){const{data,error}=await requiredClient().auth.signInWithPassword({email,password});if(error)throw error;return data}
export async function signOut(){const{error}=await requiredClient().auth.signOut();if(error)throw error}
export async function resetPassword(email:string){const{error}=await requiredClient().auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}/`});if(error)throw error}
export async function updatePassword(password:string){const{error}=await requiredClient().auth.updateUser({password});if(error)throw error}
