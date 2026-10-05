// Calls used by the learning screens. Account, admin and store state live in services/store.jsx.
import { api, ApiError } from "./apiClient";

// The AI backend is the only source of a score: there is no client-side simulation. When it cannot
// answer, the caller gets an error and the child is asked to try again.
export class AnalysisUnavailableError extends Error {}

// The server looks up the word and its phonemes from the lesson: the app only says which word was read.
export async function submitAudioAnalysis(audioBlob, { childId, lessonId, wordId }) {
  const form = new FormData();
  form.append("audio", audioBlob, "recording.wav");
  form.append("child_id", childId);
  form.append("lesson_id", lessonId);
  form.append("word_id", wordId);
  try {
    return (await api("/analyze-audio", { method: "POST", form })).data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) throw err;
    throw new AnalysisUnavailableError(err.message, { cause: err });
  }
}

// The score comes from the server by attempt id: the browser cannot send its own score.
export async function recordPracticeSession(childId, attemptId) {
  return api("/record-practice", { method: "POST", body: { child_id: childId, attempt_id: attemptId } });
}

export async function fetchPracticeHistory(childId, limit = 15) {
  if (!childId) return [];
  try {
    return (await api(`/practice-history?child_id=${encodeURIComponent(childId)}&limit=${limit}`)).history || [];
  } catch {
    return [];
  }
}

export const fetchChildRewards = (childId) => api(`/profiles/${encodeURIComponent(childId)}/rewards`);
export const redeemReward = (childId, rewardId) => api(`/profiles/${encodeURIComponent(childId)}/redeem`, { method: "POST", body: { reward_id: rewardId } });
