// Server-side marking. Runs inside Convex so students never receive the answer
// key and can't submit their own score.

type GradableField = {
  id: string;
  type: string;
  isQuiz?: boolean;
  points?: number;
  correctAnswers?: string[];
  keywords?: string[];
};

export type AnswerResult = {
  isCorrect: boolean;
  points: number;
  needsGrading?: boolean; // essay with no keywords: tutor marks it by hand
  autoGraded?: boolean; // essay marked by keywords; tutor may still override
  matchedKeywords?: string[];
  missedKeywords?: string[];
};

// Answer-key data that must never reach a student's browser.
export function stripAnswerKey<T extends Record<string, unknown>>(field: T) {
  const { correctAnswers: _c, keywords: _k, ...rest } = field;
  return rest;
}

export function gradeResponses(
  fields: GradableField[],
  responses: Record<string, unknown>,
) {
  let score = 0;
  let maxScore = 0;
  const answers: Record<string, AnswerResult> = {};

  for (const field of fields) {
    if (!field.isQuiz) continue;
    const points = field.points || 1;
    maxScore += points;
    const userAnswer = responses[field.id];

    if (field.type === "essay") {
      const keywords = (field.keywords ?? []).filter((k) => k.trim());
      if (keywords.length === 0) {
        answers[field.id] = { isCorrect: false, points: 0, needsGrading: true };
        continue;
      }
      const { matched, missed } = matchKeywords(String(userAnswer ?? ""), keywords);
      // Share of keywords found, rounded to the nearest half point
      const earned = Math.round((matched.length / keywords.length) * points * 2) / 2;
      score += earned;
      answers[field.id] = {
        isCorrect: matched.length === keywords.length,
        points: earned,
        autoGraded: true,
        matchedKeywords: matched,
        missedKeywords: missed,
      };
      continue;
    }

    const correctAnswers = field.correctAnswers || [];
    let isCorrect: boolean;
    if (field.type === "checkbox") {
      const userAnswers = Array.isArray(userAnswer) ? userAnswer.map(String) : [];
      const correctSet = new Set(correctAnswers);
      const userSet = new Set(userAnswers);
      isCorrect =
        userAnswers.length === correctAnswers.length &&
        correctAnswers.every((a) => userSet.has(a)) &&
        userAnswers.every((a) => correctSet.has(a));
    } else if (field.type === "radio" || field.type === "select") {
      isCorrect = correctAnswers.includes(String(userAnswer));
    } else {
      const given = String(userAnswer ?? "").toLowerCase().trim();
      isCorrect = correctAnswers.some((c) => given === String(c).toLowerCase().trim());
    }

    if (isCorrect) score += points;
    answers[field.id] = { isCorrect, points: isCorrect ? points : 0 };
  }

  return { score, maxScore, answers };
}

// ---- Keyword matching that accepts close forms ----------------------------
// "photosynthesis" ~ "photosynthesize", "evaporate" ~ "evaporation",
// "running" ~ "run", and small typos like "photosynthsis".

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean);
}

const SUFFIXES = [
  "ational", "ization", "isation", "fulness", "ousness", "iveness",
  "ations", "ation", "itions", "ition", "ments", "ment", "nesses", "ness",
  "ities", "ity", "ings", "ing", "edly", "ies", "ied", "ers", "er",
  "izes", "ized", "ize", "ises", "ised", "ise", "ive", "ous", "ful",
  "less", "ly", "ed", "es", "al", "ic", "s",
];

function stem(word: string): string {
  if (word.length <= 3) return word;
  for (const suffix of SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
      let base = word.slice(0, -suffix.length);
      // "running" -> "runn" -> "run"
      if (base.length > 3 && base[base.length - 1] === base[base.length - 2]) {
        base = base.slice(0, -1);
      }
      return base;
    }
  }
  return word;
}

function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

function commonPrefix(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

function wordsMatch(keyword: string, word: string): boolean {
  if (keyword === word) return true;
  if (stem(keyword) === stem(word)) return true;
  const minLen = Math.min(keyword.length, word.length);
  // Shared root covering most of the shorter word: evaporate/evaporation
  if (minLen >= 5 && commonPrefix(keyword, word) >= Math.max(4, Math.ceil(minLen * 0.75))) {
    return true;
  }
  // Spelling slips: one wrong letter in 5+ letter words, two in 9+
  const allowed = minLen >= 9 ? 2 : minLen >= 5 ? 1 : 0;
  return allowed > 0 && editDistance(keyword, word) <= allowed;
}

// A keyword may be a phrase; every word of it must appear in the answer.
export function matchKeywords(answer: string, keywords: string[]) {
  const answerWords = words(answer);
  const matched: string[] = [];
  const missed: string[] = [];
  for (const keyword of keywords) {
    const parts = words(keyword);
    const found =
      parts.length > 0 &&
      parts.every((part) => answerWords.some((w) => wordsMatch(part, w)));
    (found ? matched : missed).push(keyword.trim());
  }
  return { matched, missed };
}
