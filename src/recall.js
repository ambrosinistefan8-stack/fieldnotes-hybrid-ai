export function newRound(lesson) {
  return { lesson, position: 0, selected: null, solved: false, firstTry: 0, needsReview: [], order: lesson.questions.map((_, i) => i), review: false };
}

export function questionFor(round) {
  return round.lesson.questions[round.order[round.position]];
}

export function choose(round, index) {
  const q = questionFor(round);
  if (!q || round.solved || !Number.isInteger(index) || index < 0 || index >= q.options.length) return;
  const first = round.selected === null;
  round.selected = index;
  round.solved = index === q.answer;
  if (first && !round.review) {
    if (round.solved) round.firstTry++;
    else round.needsReview.push(round.order[round.position]);
  }
}

export function advance(round) {
  if (!round.solved) return;
  round.position++;
  round.selected = null;
  round.solved = false;
}

export function reviewMisses(round) {
  if (round.position < round.order.length || !round.needsReview.length) return;
  round.order = [...round.needsReview];
  round.position = 0;
  round.selected = null;
  round.solved = false;
  round.review = true;
}

export function evidenceRow(lesson, i, language) {
  const [min, a, b] = lesson.rows[i];
  return min + ' min · ' + lesson.series[0][language] + ' ' + a + ' ' + lesson.unit + ' · ' + lesson.series[1][language] + ' ' + b + ' ' + lesson.unit;
}

export function coachGuide(round, language, selection = 'A') {
  if (!['en', 'de'].includes(language)) throw new Error('Unsupported language');
  const q = questionFor(round);
  const strategy = selection === 'B' ? q.alternateHint : q.hint;
  return { text: strategy[language], rows: q.rows.map(i => evidenceRow(round.lesson, i, language)) };
}

export function buildHintPrompt(round, language) {
  if (!['en', 'de'].includes(language)) throw new Error('Unsupported language');
  const q = questionFor(round);
  const lines = q.rows.map(i => '[' + (i + 1) + '] ' + evidenceRow(round.lesson, i, language));
  return [
    'Select a coaching strategy for an adult in vocational training. The two choices below are both based on this shift log.',
    ...lines, 'Question: ' + q.ask[language],
    round.selected === null ? 'No answer attempted yet.' : 'Their last choice: ' + q.options[round.selected][language],
    'Choose the most helpful next step given the question and the learner’s last choice.',
    'A: ' + q.hint[language], 'B: ' + q.alternateHint[language],
    'Return exactly one uppercase letter: A or B.'
  ].join('\n');
}
