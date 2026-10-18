# Learning and measurement

## Persistent review scheduling

`src/core/study.ts` implements SM-2 independently, based on [Piotr Wozniak's published algorithm](https://www.super-memory.com/english/ol/sm2.htm).

A card begins at an ease of 2.5. A successful assessment uses intervals of 1 day, 6 days, then `ceil(previous interval × previous ease)`. Ease changes by `0.1 − (5 − quality) × (0.08 + (5 − quality) × 0.02)`, bounded below at 1.3. A failed assessment resets repetitions and schedules a one-day interval. The function rejects non-finite and out-of-range grades.

The UI maps a correct response to quality 4 and an incorrect response to quality 1. Simple ungraded card navigation records activity without changing a review schedule. Every graded interaction is an assessment; multiple answers on one day can advance scheduling. This is a deliberate practical adaptation, and is not the complete original daily-session procedure or FSRS.

IndexedDB stores card/set identity, ease, interval, repetitions, due date, last assessment, correct/incorrect counts and chronological interaction history. Deleting a set removes its review schedule; historical aggregate activity remains. Mastery in the overview/statistics means at least three consecutive successful scheduled assessments. It is an application metric, not a prediction of exam performance.

## Adaptive Learn

Unseen and overdue/missed cards sort ahead of stable cards. A Learn session selects unmastered or due cards. If every card is stable and not due, it samples at most five for maintenance. A normal session asks for two successful recalls per selected card; a cram session requires one. Correct cards leave after their target; incorrect cards reset their session success count and return to the queue. Questions move from multiple choice into written recall, with term and definition directions alternated in pairs.

## Recall and testing

Forgiving grading uses Unicode NFKC, trims and collapses whitespace, then compares case-insensitively. Strict grading keeps case. Punctuation, content and word order must match. There is no fuzzy or semantic grading.

Tests use each selected card once. Answer choices are de-duplicated, include the correct answer, and never invent distractors. Small sets can have fewer than four choices. True/false candidates come from actual card data; a one-card set produces a true statement. Matching questions use a drop-down of actual selected answers. Test scores include unanswered questions as incorrect.

Match uses at most six shuffled pairs and adds one second per wrong pair. A best time is persisted only after the whole board is completed. Match also records successful/incorrect retrieval activity.

## Statistics

Sets and cards come from the library. Cards studied are unique card IDs present in activity. Accuracy excludes ungraded flips. Time sums recorded time spent answering or moving to the next card; an individual interaction is capped at an hour. Streaks use local calendar dates and can continue from yesterday. History is retained after set deletion, so historical studied-card counts can exceed the size of the current library.
