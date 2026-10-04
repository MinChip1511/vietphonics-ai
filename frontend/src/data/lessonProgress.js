// Lesson states for one child, from the server-computed `child.progress` ({lessonId: {passed, total, completed, best}}):
// finished lessons are "done", the first unfinished one is "current", the next is "open", the rest "locked".
export function lessonStates(lessons, child) {
  const progress = child?.progress || {};
  const states = {};
  let unfinished = 0;
  for (const lesson of lessons) {
    if (progress[lesson.id]?.completed) {
      states[lesson.id] = "done";
    } else {
      states[lesson.id] = unfinished === 0 ? "current" : unfinished === 1 ? "open" : "locked";
      unfinished += 1;
    }
  }
  return states;
}

// The lesson a child should do next: the first unfinished one (or the last when everything is done).
export function nextLesson(lessons, child) {
  const states = lessonStates(lessons, child);
  return lessons.find((l) => states[l.id] === "current") || lessons[lessons.length - 1];
}
