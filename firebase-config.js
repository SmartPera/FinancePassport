// ═══════════════════════════════════════════════════════════════
// SMARTPERA PASSPORT — Firebase Configuration & Shared Utilities
// Project: smartpera-passport
// ═══════════════════════════════════════════════════════════════

import { initializeApp }         from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth }               from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";

const firebaseConfig = {
  apiKey:            "AIzaSyBlS1XvDnaITlCCACPOUn1YbrV_kRI0uQ0",
  authDomain:        "smartpera-passport.firebaseapp.com",
  databaseURL:       "https://smartpera-passport-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "smartpera-passport",
  storageBucket:     "smartpera-passport.firebasestorage.app",
  messagingSenderId: "532653072063",
  appId:             "1:532653072063:web:e22685f1d9316edd35700a",
  measurementId:     "G-NVERBJPJEW"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getDatabase(app);

// Match the region your Cloud Functions are actually deployed to.
const functionsInstance = getFunctions(app, "asia-southeast1");

// ── Referral code from URL ──────────────────────────────────────
export function getReferralFromURL() {
  return new URLSearchParams(window.location.search).get("ref") || "";
}

// ── Auto-generate referral code from name + a random suffix ────
// Previously used the last 4 digits of a mobile number — mobile is
// no longer collected at registration, so this uses a random 4-digit
// number instead. Same purpose: a memorable, likely-unique default
// the user can accept or replace with their own.
export function generateCode(fullName) {
  const name = fullName.replace(/\s+/g, "").toUpperCase().substring(0, 4).padEnd(4, "X");
  const num  = String(Math.floor(1000 + Math.random() * 9000));
  return name + num;
}

// ── Sanitise email for use as Firebase key ─────────────────────
export function sanitiseEmail(email) {
  return email.toLowerCase().replace(/\./g, "_").replace(/@/g, "_at_");
}

// ── Achievement title from people-helped count ─────────────────
export function getAchievement(count) {
  if (count >= 51) return { title: "Champion",   icon: "🏆" };
  if (count >= 31) return { title: "Ambassador", icon: "🌟" };
  if (count >= 16) return { title: "Mentor",     icon: "🎓" };
  if (count >= 6)  return { title: "Guide",      icon: "🗺️" };
  return             { title: "Explorer",   icon: "🔭" };
}

// ── Check if email is already registered ────────────────────────
// Mobile number is no longer collected at registration, so this
// only ever checks email now. Still calls the same Cloud Function —
// it already handles mobileKey being absent — so nothing needed to
// change there, only what the client sends.
export async function checkDuplicate(email) {
  const emailKey  = sanitiseEmail(email);
  const checkFn = httpsCallable(functionsInstance, "checkDuplicateLead");
  try {
    const result = await checkFn({ emailKey });
    return result.data.duplicate; // "email" | null
  } catch (err) {
    console.error("checkDuplicate: Cloud Function call failed:", err);
    // Fail closed on the UX side (don't block signup entirely), but
    // surface the error so it's visible during testing/rollout.
    return null;
  }
}

// ── Check referral code availability ───────────────────────────
export async function isCodeAvailable(code) {
  const snap = await get(ref(db, `referralCodes/${code}`));
  return !snap.exists();
}

// ── Founding member check (first 50 users) ─────────────────────
export async function isFoundingMember() {
  const snap = await get(ref(db, "stats/totalUsers"));
  return !snap.exists() || snap.val() < 50;
}
