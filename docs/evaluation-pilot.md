# Run the first evaluation pilot

Start with a small human pilot to test whether Software Journey helps developers answer repository questions correctly and efficiently. Follow with a separate AI pilot to measure model context use and cost.

This document describes proposed trial work, not completed evaluation results. The current `compare-answers` command assembles recorded answers, human assessments, and supplied measurements. It does not run participants, time sessions, count tool calls, enforce trial budgets, or grade answers automatically. Use [the detailed evaluation procedure](answer-evaluation.md) for input formats, preparation commands, and reporting limits.

## 1. Review the reference answers

Have a human reviewer check the draft reference answers against the captured sources before inviting participants. Agree on required answer points, acceptable alternatives, and claims the evidence cannot support.

The first pilot has four usable questions at OpenSpec revision `bae58cf61479986431bb798acbe5a688a591c18c`:

- Where is the command registered?
- How does its implementation work?
- Which specification governs it?
- What do the captured tests actually establish?

The exact questions, criteria, and revision/path/line citations are in `openSpecAnswerBenchmark`. The [reference preparation instructions](answer-evaluation.md#prepare-the-reference-set) explain how to create local input files. Existing local drafts await human review; they are not participant answers or completed human assessments.

Keep the fifth, historical question marked unavailable. Its required parser and regression-test code is not captured at the older revisions. Commit metadata cannot replace that evidence. A separate collection change is needed before this question can support a quality comparison.

Freeze the reviewed rubric before collecting answers. If it changes, increment its version and regenerate its digest. Old trial and assessment bindings will no longer match.

## 2. Do one practice session

The project owner can be the first participant. Use one question to check whether the instructions, retrieval commands, and recording process are practical.

Try both methods in separate sessions:

| Method | Allowed evidence access |
| --- | --- |
| Direct exploration | Read and search the local committed repository at the pinned revision |
| Software Journey retrieval | Discover and request captured evidence using `context` and `retrieve` |

For each method, write a short answer with immutable source citations. Keep the question and declared limits identical. In the retrieval session, leave missing evidence explicit rather than filling it from the checkout.

Record problems with setup, navigation, evidence availability, or measurement. Fix the trial procedure before recruiting other developers. A participant will remember the first answer, so this practice session mainly checks the procedure. Keep any practice results separate from the formal pilot.

## 3. Run a small developer pilot

A suggested first sample is three developers, each answering the four supported questions through both methods. That produces 24 answers and 12 paired comparisons, with three paired repetitions per question. Record every attempted trial, including failures and missing answers.

Choose the participant instructions, question order, equal context/output/time budgets, and measurement scopes before starting. Give some participants direct exploration first and others retrieval first. With three participants, the order cannot be perfectly balanced; record the allocation and disclose the imbalance. Separate sessions and switched order reduce learning effects but do not eliminate them.

Record each participant's repository familiarity and prior exposure to the questions or reference answers. Use the same participant configuration and repetition identifier for the two records in each pair. The reporter requires matching questions, benchmark digests, revisions, participant/model configurations, and budgets.

If a limit is only declared rather than enforced, say so in the trial notes. Do not describe a declared token cap as measured enforcement without a consistent token counter.

## 4. Record what happened

| Record | Collection method |
| --- | --- |
| Answer and citations | Preserve the participant's exact submission |
| Elapsed time | Use a monotonic timer from revealing the question through final submission |
| Tool calls | Log each search, read, discovery, or retrieval operation using a definition fixed before the pilot |
| Returned bytes | Save tool outputs and count their UTF-8 bytes using the same scope for both methods |
| Prior exposure and session order | Record these in the trial's protocol notes |
| Tokens and account costs | Leave unknown unless actually measured with recorded provenance |

Manual timing and operation notes are enough to test the practice-session procedure. Before formal trials, add a small local recording helper for reliable tool-output and operation measurements. That helper is proposed follow-up work; it is not part of the current reporter.

For bytes, distinguish tool-response bytes from total input bytes. For time, distinguish participant question-to-answer time from the duration of an individual retrieval command. Do not compare measurements with different scopes. Save how each value was obtained alongside the value.

Human trials can establish recorded answer quality and time differences. They do not establish model token or billing savings. Unknown measurements must remain null, not zero placeholders or estimates derived from bytes.

Keep answers, source extracts, logs, reference drafts, and trial inputs in ignored local locations. Change a trial's provenance to `real` only after an actual participant session. Do not count editable templates or synthetic test records as real trials.

## 5. Review quality before interpreting savings

Have a reviewer assess each answer without seeing its method or resource measurements where practical:

- Does it cover the required answer points correctly?
- Do its citations support its claims?
- Does it acknowledge missing evidence and avoid unsupported conclusions?

Record pass/fail outcomes and concrete reasons for correctness, citation support, and handling of uncertainty. Resolving a citation does not automatically make an answer true.

Run `compare-answers` with the recorded trials and an empty assessment list first. Its unreviewed report supplies the exact benchmark and answer digests needed to bind the human reviews. Fill the assessment records, then generate a reviewed report in a new output directory. See [review and reporting commands](answer-evaluation.md#review-answers-and-produce-reports).

The report rejects stale review bindings. Unreviewed, unavailable, unmatched, synthetic, or failed-quality pairs cannot establish successful quality-preserving comparisons. A faster wrong answer remains a quality failure even when its measured resource differences are lower.

Review pass/fail rates, per-pair time and resource differences, missing evidence, and protocol limitations together. Report the sample size and all attempted trials. A pilot of this size describes these participants and questions; it does not establish general savings or developer readiness to modify a repository.

## 6. Run AI trials separately

An AI pilot answers whether bounded retrieval preserves answer quality while reducing agent context use or cost. It needs a trial runner and measurement logging beyond the current report command. Specify that work before implementing or conducting hosted trials.

For each question, use fresh sessions with the same model version, settings, declared budgets, repository revisions, and rubric. One session explores repository files directly. The other uses bounded retrieval. Repeat paired trials and retain all failures and incomplete runs.

Record actual input/output tokens, tool calls, elapsed time, and available cost information with consistent scopes and provenance. Keep account costs unknown if only a pricing estimate exists. Submit both answers to the same human quality-review process used in the developer pilot.

Hosted trials require approval of the exact selected source content and provider budget before transmission. `compare-answers` never sends that content or dispatches a model request. Approval for local evaluation does not authorize a hosted trial.

## Ready to begin

- [ ] A human reviewer has checked the four available reference answers and frozen the rubric.
- [ ] Local benchmark, evidence, trial, and assessment inputs are prepared.
- [ ] One practice question has been tried through both methods, with procedure problems recorded.
- [ ] The formal pilot has agreed instructions, budgets, measurement scopes, participant order, and a recording method.
- [ ] Participants and an answer reviewer are available.

The immediate next step is reference review and one recorded practice session. No live model request is needed for that work.
