// Input rules shared by sign-up, login, password reset, profile and admin forms.
// The name filter mirrors backend/app/name_filter.py: keep the two word lists in sync.

// ---------- phone: exactly 10 digits, starting with 0 ----------
export const PHONE_LENGTH = 10;
export const sanitizePhone = (value) => String(value || "").replace(/\D/g, "").slice(0, PHONE_LENGTH);
export const isValidPhone = (value) => /^0\d{9}$/.test(String(value || ""));
export const PHONE_ERROR = "Số điện thoại gồm đúng 10 chữ số, bắt đầu bằng số 0.";

// ---------- password: one rule everywhere ----------
export const PASSWORD_HINT = "Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.";
export const isValidPassword = (value) => {
  const pw = String(value || "");
  return pw.length >= 8 && /\p{Ll}/u.test(pw) && /\p{Lu}/u.test(pw) && /\d/.test(pw);
};

// ---------- names ----------
export const NAME_ERROR = "Tên này có từ chưa phù hợp. Vui lòng chọn tên khác.";
export const MAX_NAME_LENGTH = 30;

const EXACT_WITH_DIACRITICS = new Set(["đụ", "địt", "đéo", "đĩ", "điếm", "lồn", "cặc", "cứt", "buồi", "đm", "đmm", "đcm", "đcmm"]);
const EXACT_FOLDED = new Set([
  "dm", "dmm", "dcm", "dcmm", "dkm", "vcl", "vkl", "cmm", "cmn", "clm",
  "dick", "cock", "penis", "vagina", "porn", "sex", "ass", "arse", "fag", "kike", "chink", "spic"
]);
const SUBSTRINGS = ["nigg", "fuck", "shit", "bitch", "cunt", "pussy", "asshole", "faggot", "whore", "slut", "retard"];
const PHRASES = ["dit me", "du me", "dit con", "dit cu", "khon nan", "suc vat", "cho de"];
const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", $: "s", "!": "i" };

const fold = (text) =>
  String(text || "").normalize("NFC").toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "").replace(/đ/g, "d");
const words = (text) => text.match(/[\p{L}\p{N}]+/gu) || [];

/** The blocked word found in `text`, or null when the name is fine. */
export function findInappropriate(text) {
  const raw = String(text || "").normalize("NFC").toLowerCase();
  for (const word of words(raw)) if (EXACT_WITH_DIACRITICS.has(word)) return word;

  const folded = fold(text).replace(/[0134579@$!]/g, (c) => LEET[c]);
  const list = words(folded);
  for (const word of list) {
    if (EXACT_FOLDED.has(word)) return word;
    for (const bad of SUBSTRINGS) if (word.includes(bad)) return bad;
  }
  let run = [];
  for (const word of [...list, ""]) {
    if (word.length === 1) {
      run.push(word);
      continue;
    }
    const joined = run.join("");
    run = [];
    if (joined.length >= 4) for (const bad of SUBSTRINGS) if (joined.includes(bad)) return bad;
  }
  const spaced = list.join(" ");
  for (const phrase of PHRASES) if (spaced.includes(phrase)) return phrase;
  return null;
}

/** Returns an error message for a person's name, or null when it is acceptable. */
export function nameError(value, label = "tên") {
  const name = String(value || "").trim();
  if (!name) return `Vui lòng nhập ${label}.`;
  if (name.length > MAX_NAME_LENGTH) return `${label[0].toUpperCase() + label.slice(1)} tối đa ${MAX_NAME_LENGTH} ký tự.`;
  if (findInappropriate(name)) return NAME_ERROR;
  return null;
}
