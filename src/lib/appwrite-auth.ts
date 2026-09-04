"use client";

import { account, client } from "./appwrite";
import { ID, OAuthProvider } from "appwrite";

// Get current user session
export async function getCurrentUser() {
  try {
    const user = await account.get();
    return user;
  } catch {
    return null;
  }
}

// Email/Password Sign Up
export async function signUp(name: string, email: string, password: string) {
  const user = await account.create(ID.unique(), email, password, name);
  await account.createEmailPasswordSession(email, password);
  return user;
}

// Email/Password Sign In
export async function signIn(email: string, password: string) {
  await account.createEmailPasswordSession(email, password);
  return await account.get();
}

// Sign Out
export async function signOut() {
  await account.deleteSession("current");
}

// Google OAuth
export async function signInWithGoogle() {
  account.createOAuth2Session(
    OAuthProvider.Google,
    window.location.origin + "/feed",
    window.location.origin + "/login"
  );
}

// Update user profile
export async function updateProfile(name?: string, email?: string) {
  const updates: any = {};
  if (name) updates.name = name;
  if (email) updates.email = email;
  return await account.updateName(name || "");
}

// Update password
export async function updatePassword(newPassword: string, oldPassword?: string) {
  if (oldPassword) {
    return await account.updatePassword(newPassword, oldPassword);
  }
  return await account.updatePassword(newPassword);
}

// Create recovery (forgot password)
export async function forgotPassword(email: string) {
  return await account.createRecovery(email, window.location.origin + "/auth/reset-password");
}

// Complete password recovery
export async function resetPassword(userId: string, secret: string, password: string) {
  return await account.updateRecovery(userId, secret, password);
}

// Get avatar URL from Appwrite
export function getAvatarUrl(userId: string) {
  // Appwrite provides avatar generation
  return `https://cloud.appwrite.io/v1/avatars/initials?name=${userId}&width=80&height=80&background=4F46E5&color=ffffff`;
}
