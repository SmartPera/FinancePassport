// ═══════════════════════════════════════════════════════════════
// SMARTPERA PASSPORT — Firebase Configuration & Shared Utilities
// Project: smartpera-passport
// ═══════════════════════════════════════════════════════════════

import { initializeApp }         from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth }               from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

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

// ── Referral code from URL ──────────────────────────────────────
export function getReferralFromURL() {
  return new URLSearchParams(window.location.search).get("ref") || "";
}

// ── Auto-generate referral code from name + mobile ─────────────
export function generateCode(fullName, mobile) {
  const name = fullName.replace(/\s+/g, "").toUpperCase().substring(0, 4).padEnd(4, "X");
  const num  = mobile.replace(/\D/g, "").slice(-4);
  return name + num;
}

// ── Sanitise email for use as Firebase key ─────────────────────
export function sanitiseEmail(email) {
  return email.toLowerCase().replace(/\./g, "_").replace(/@/g, "_at_");
}

// ── Achievement title from people-helped count ─────────────────
export function getAchievement(count) {
  if (count >= 11) return { title: "Champion",   icon: "🏆" };
  if (count >= 6)  return { title: "Ambassador", icon: "🌟" };
  if (count >= 3)  return { title: "Mentor",     icon: "🎓" };
  if (count >= 1)  return { title: "Guide",      icon: "🗺️" };
  return             { title: "Explorer",   icon: "🔭" };
}

// ── Check if phone or email already registered ─────────────────
export async function checkDuplicate(mobile, email) {
  const mobileKey = mobile.replace(/\D/g, "");
  const emailKey  = sanitiseEmail(email);
  const [mSnap, eSnap] = await Promise.all([
    get(ref(db, `mobileIndex/${mobileKey}`)),
    get(ref(db, `emailIndex/${emailKey}`))
  ]);
  if (mSnap.exists()) return "mobile";
  if (eSnap.exists()) return "email";
  return null;
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
