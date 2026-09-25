import type { GuidedLesson } from "@software-journey/contracts";
import { useState } from "react";

export function GuidedLessonPanel({ lesson }: { lesson: GuidedLesson }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [plan, setPlan] = useState("");
  const step = lesson.steps[index];
  if (!step) return null;
  const completed = lesson.steps.filter(
    (item) =>
      item.ready && checked[item.id] && answers[item.id] === item.correctIndex,
  ).length;
  const done = completed === 5 && plan.trim().length > 0;
  function restart() {
    setIndex(0);
    setAnswers({});
    setChecked({});
    setPlan("");
  }
  function download() {
    const citations = lesson.steps.flatMap((item) =>
      item.evidence.items.map((evidence) =>
        evidence.type === "source"
          ? `${evidence.source.commitSha} ${evidence.source.path} ${evidence.source.lines ? `lines ${evidence.source.lines.start}-${evidence.source.lines.end}` : "line range unknown"}`
          : evidence.type === "history"
            ? `Revision ${evidence.commit.sha}`
            : "Evidence unavailable",
      ),
    );
    const blob = new Blob(
      [
        `My first-change plan\n\n${plan}\n\nSelf-reported exercise; no repository was modified.\n\n${citations.join("\n")}\n`,
      ],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "first-change-plan.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="guided-lesson" aria-labelledby="lesson-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Guided learning / authored lesson</p>
          <h2 id="lesson-title">{lesson.title}</h2>
        </div>
        <button type="button" onClick={restart}>
          Restart lesson
        </button>
      </div>
      <p role="status">
        {completed} of 5 checkpoints complete.{" "}
        {done
          ? "Lesson complete. This is a self-reported learning exercise."
          : "Progress stays in this session."}
      </p>
      <nav aria-label="Lesson steps">
        <ol className="lesson-navigation">
          {lesson.steps.map((item, i) => (
            <li key={item.id}>
              <button
                type="button"
                aria-current={i === index ? "step" : undefined}
                onClick={() => setIndex(i)}
              >
                {i + 1}. {item.title}
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <article>
        <h3>{step.title}</h3>
        <p className="captured-label">Authored reading guidance</p>
        <p>{step.guidance}</p>
        {step.evidence.reasons.length > 0 ? (
          <p className="projection-note">
            Coverage: {step.evidence.reasons.join(", ")}. History is{" "}
            {step.evidence.coverage.history.completeness}.
          </p>
        ) : null}
        {!step.ready ? (
          <p role="alert">
            This step has missing or truncated evidence. Its checkpoint is
            unavailable; load a complete matching bundle to finish the lesson.
          </p>
        ) : null}
        {step.evidence.items.map((item) => (
          <div key={item.id}>
            {item.type === "source" ? (
              <>
                <p className="captured-label">Captured source evidence</p>
                <p>
                  <code>{item.source.commitSha}</code> ·{" "}
                  <code>{item.source.path}</code> ·{" "}
                  {item.source.lines
                    ? `Lines ${item.source.lines.start}–${item.source.lines.end}`
                    : "Line range unknown"}
                </p>
                <pre>{item.text}</pre>
              </>
            ) : item.type === "history" ? (
              <>
                <p className="captured-label">Recorded history metadata</p>
                <p>
                  <code>{item.commit.sha}</code> · {item.commit.subject}
                </p>
              </>
            ) : (
              <p>Unknown: {item.reasons.join(", ")}</p>
            )}
          </div>
        ))}
        <fieldset disabled={!step.ready}>
          <legend>{step.question}</legend>
          {step.choices.map((choice, i) => (
            <label className="lesson-choice" key={choice}>
              <input
                type="radio"
                name={`checkpoint-${step.id}`}
                checked={answers[step.id] === i}
                onChange={() => {
                  setAnswers({ ...answers, [step.id]: i });
                  setChecked({ ...checked, [step.id]: false });
                }}
              />
              {choice}
            </label>
          ))}
          <button
            type="button"
            disabled={answers[step.id] === undefined}
            onClick={() => setChecked({ ...checked, [step.id]: true })}
          >
            Check answer
          </button>
        </fieldset>
        {checked[step.id] ? (
          <p role="status">
            {answers[step.id] === step.correctIndex ? "Correct." : "Try again."}{" "}
            {step.feedback}
          </p>
        ) : null}
        <div className="lesson-actions">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
          >
            Previous lesson step
          </button>
          <button
            type="button"
            disabled={index === 4}
            onClick={() => setIndex(index + 1)}
          >
            Next lesson step
          </button>
        </div>
      </article>
      <label className="lesson-plan">
        Your first-change plan
        <textarea
          value={plan}
          maxLength={4000}
          rows={4}
          onChange={(event) => setPlan(event.target.value)}
          placeholder="Describe one behavior to change, its governing spec, and the test you would add or update."
        />
      </label>
      <p>
        Learner notes, not verified repository facts. No code is executed or
        changed.
      </p>
      <button type="button" disabled={!done} onClick={download}>
        Export my plan and citations
      </button>
    </section>
  );
}
