import {
  createExplorerProjection,
  type ExplorerProjection,
  type WorkflowExplorerProjection,
} from "@software-journey/contracts";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";

import { demoSnapshot } from "../demo-snapshot";
import {
  findLearningCatalog,
  resolveLearningCitation,
} from "../learning-catalog";
import { loadSelectedSnapshot, loadSelectedWorkflow } from "../snapshot-loader";

export const Route = createFileRoute("/")({
  ssr: "data-only",
  component: Home,
});

const demoProjection = createExplorerProjection(demoSnapshot);

function shortSha(value: string) {
  return value.slice(0, 12);
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function coverageLabel(projection: ExplorerProjection) {
  const { coverage } = projection;
  if (coverage.history.completeness !== "complete") {
    return `History is ${coverage.history.completeness}`;
  }
  if (coverage.omissions.length > 0) {
    return `${coverage.omissions.length} recorded omission${coverage.omissions.length === 1 ? "" : "s"}`;
  }
  return "Recorded coverage available";
}

function Home() {
  const picker = useRef<HTMLInputElement>(null);
  const workflowPicker = useRef<HTMLInputElement>(null);
  const [projection, setProjection] = useState<ExplorerProjection | null>(
    demoProjection,
  );
  const [sessionName, setSessionName] = useState("Field-guide sample");
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [selectedPath, setSelectedPath] = useState(
    demoProjection.documentation[0]?.source.path ?? null,
  );
  const [workflow, setWorkflow] = useState<WorkflowExplorerProjection | null>(
    null,
  );
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [mode, setMode] = useState<"explore" | "learning">("explore");
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);

  const learning = workflow ? findLearningCatalog(workflow) : undefined;
  const activeLesson =
    learning?.steps.find((step) => step.id === selectedLesson) ??
    learning?.steps[0];
  const lessonHasCitationGap = !!(
    activeLesson &&
    learning &&
    workflow &&
    activeLesson.claims.some((claim) =>
      claim.status === "unknown"
        ? false
        : !!resolveLearningCitation(claim, learning, workflow).issue,
    )
  );

  const visibleNotes = useMemo(() => {
    if (!projection) return [];
    const query = filter.trim().toLocaleLowerCase();
    return query
      ? projection.documentation.filter((note) =>
          note.source.path.toLocaleLowerCase().includes(query),
        )
      : projection.documentation;
  }, [filter, projection]);

  const selectedNote =
    visibleNotes.find((note) => note.source.path === selectedPath) ?? null;

  async function selectSnapshot(file: File | undefined) {
    if (!file) return;

    setError(null);
    setProjection(null);
    setSelectedPath(null);
    setFilter("");

    try {
      const next = await loadSelectedSnapshot(file);
      setProjection(next);
      setSessionName(file.name);
      setSelectedPath(next.documentation[0]?.source.path ?? null);
      setWorkflow(null);
      setWorkflowError(null);
      setMode("explore");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The snapshot could not be opened.",
      );
    }
  }

  async function selectWorkflow(file: File | undefined) {
    if (!file || !projection) return;
    setWorkflowError(null);
    try {
      const next = await loadSelectedWorkflow(file);
      if (
        next.snapshot.repository.id !== projection.repository.id ||
        next.snapshot.repository.headCommit !== projection.repository.headCommit
      ) {
        throw new Error(
          "This workflow bundle belongs to a different snapshot revision.",
        );
      }
      setWorkflow(next);
      setSelectedStep(next.steps[0]?.id ?? null);
      setSelectedLesson(findLearningCatalog(next)?.steps[0]?.id ?? null);
    } catch (cause) {
      setWorkflow(null);
      setSelectedStep(null);
      setSelectedLesson(null);
      setWorkflowError(
        cause instanceof Error
          ? cause.message
          : "The workflow could not be opened.",
      );
    }
  }

  function restoreSample() {
    setProjection(demoProjection);
    setSessionName("Field-guide sample");
    setError(null);
    setFilter("");
    setSelectedPath(demoProjection.documentation[0]?.source.path ?? null);
    setWorkflow(null);
    setWorkflowError(null);
    setSelectedStep(null);
    setSelectedLesson(null);
    setMode("explore");
  }

  return (
    <main className="explorer-shell">
      <header>
        <a className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            ✦
          </span>
          software journey
        </a>
        <span className="status">
          <span aria-hidden="true">◈</span> Local session
        </span>
      </header>

      <section className="explorer-hero" aria-labelledby="explorer-title">
        <div>
          <p className="eyebrow">
            <span aria-hidden="true">✦</span> Trailhead / recorded evidence
          </p>
          <h1 id="explorer-title">
            Start with what
            <br />
            <span className="title-accent">the repository recorded.</span>
          </h1>
          <p className="lede">
            A calm first pass through a snapshot: its shape, its field notes,
            and the limits of what was collected.
          </p>
        </div>
        <div className="explorer-actions">
          <input
            ref={picker}
            className="snapshot-picker"
            type="file"
            accept="application/json,.json"
            aria-label="Choose a local snapshot JSON file"
            onChange={(event) => void selectSnapshot(event.target.files?.[0])}
          />
          <button
            className="primary-action"
            type="button"
            onClick={() => picker.current?.click()}
          >
            Open a local snapshot <span aria-hidden="true">↗</span>
          </button>
          <input
            ref={workflowPicker}
            className="snapshot-picker"
            type="file"
            accept="application/json,.json"
            aria-label="Choose a local workflow bundle JSON file"
            onChange={(event) => void selectWorkflow(event.target.files?.[0])}
          />
          <button
            className="sample-action"
            type="button"
            disabled={!projection}
            onClick={() => workflowPicker.current?.click()}
          >
            Open a workflow trail
          </button>
          <p>
            Chosen files stay in this browser session. Nothing is sent to a
            provider or used to access a checkout.
          </p>
          <button
            className="sample-action"
            type="button"
            onClick={restoreSample}
          >
            Return to the field-guide sample
          </button>
        </div>
      </section>

      <div className="session-line" aria-live="polite">
        <span aria-hidden="true">⌁</span> Viewing:{" "}
        <strong>{sessionName}</strong>
        {projection
          ? ` · ${coverageLabel(projection)}`
          : " · no evidence loaded"}
      </div>

      {error ? (
        <section className="explorer-message error-message" role="alert">
          <p className="eyebrow">Unable to open snapshot</p>
          <h2>The evidence is unavailable.</h2>
          <p>{error}</p>
          <button type="button" onClick={() => picker.current?.click()}>
            Choose another snapshot
          </button>
        </section>
      ) : null}

      {projection ? (
        <>
          <nav className="view-navigation" aria-label="Explorer mode">
            <button
              type="button"
              aria-pressed={mode === "explore"}
              onClick={() => setMode("explore")}
            >
              Explore
            </button>
            <button
              type="button"
              aria-pressed={mode === "learning"}
              onClick={() => setMode("learning")}
            >
              Learning
            </button>
          </nav>
          {mode === "learning" ? (
            <section
              className="learning-panel"
              aria-labelledby="learning-title"
            >
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Guided learning / authored tutorial</p>
                  <h2 id="learning-title">
                    Follow the evidence, one step at a time.
                  </h2>
                </div>
              </div>
              <p className="learning-provenance">
                Tutorial prompts and explanations are product-authored. Quoted
                text is recorded source evidence. No model-generated content is
                shown.
              </p>
              {workflowError ? (
                <p className="workflow-error" role="alert">
                  {workflowError}
                </p>
              ) : null}
              {!workflow ? (
                <p>Open a matching workflow trail to begin a tutorial.</p>
              ) : !learning ? (
                <p>
                  No authored tutorial is available for this repository and
                  revision.
                </p>
              ) : (
                <div className="learning-layout">
                  <ol className="learning-steps">
                    {learning.steps.map((step, index) => (
                      <li key={step.id}>
                        <button
                          type="button"
                          data-selected={activeLesson?.id === step.id}
                          onClick={() => setSelectedLesson(step.id)}
                        >
                          <span>{index + 1}. </span>
                          {step.title}
                        </button>
                      </li>
                    ))}
                  </ol>
                  {activeLesson ? (
                    <article className="learning-detail">
                      <p className="eyebrow">
                        Step {learning.steps.indexOf(activeLesson) + 1} of{" "}
                        {learning.steps.length}
                      </p>
                      <h3>{activeLesson.title}</h3>
                      <p>{activeLesson.prompt}</p>
                      {lessonHasCitationGap ? (
                        <p className="workflow-error" role="alert">
                          Some citations are unavailable or invalid. Check the
                          evidence below before relying on this step.
                        </p>
                      ) : null}
                      <ul className="learning-claims">
                        {activeLesson.claims.map((claim) => {
                          const evidence =
                            claim.status === "unknown"
                              ? null
                              : resolveLearningCitation(
                                  claim,
                                  learning,
                                  workflow,
                                ).evidence;
                          return (
                            <li
                              key={
                                claim.status === "unknown"
                                  ? claim.text
                                  : `${claim.status}-${claim.evidenceStepId}`
                              }
                              data-status={claim.status}
                            >
                              <strong>
                                {claim.status === "quote"
                                  ? "Quoted documentation"
                                  : claim.status === "inference"
                                    ? "Inference · authored explanation"
                                    : claim.status === "unknown"
                                      ? "Unknown"
                                      : "Fact · authored claim"}
                              </strong>
                              {claim.status === "quote" ? (
                                evidence ? (
                                  <blockquote>{evidence.text}</blockquote>
                                ) : (
                                  <p>Quoted evidence is unavailable.</p>
                                )
                              ) : (
                                <p>{claim.text}</p>
                              )}
                              {claim.status !== "unknown" ? (
                                evidence ? (
                                  <details>
                                    <summary>
                                      View cited source evidence
                                    </summary>
                                    <p>
                                      <code>{evidence.source.commitSha}</code> ·{" "}
                                      <code>{evidence.source.path}</code> ·
                                      Lines {evidence.source.lines?.start}–
                                      {evidence.source.lines?.end}
                                    </p>
                                    <pre>{evidence.text}</pre>
                                  </details>
                                ) : (
                                  <p className="workflow-error">
                                    The cited source is unavailable or does not
                                    match this revision.
                                  </p>
                                )
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    </article>
                  ) : null}
                </div>
              )}
            </section>
          ) : (
            <>
              <section className="trailhead" aria-labelledby="trailhead-title">
                <div className="trailhead-heading">
                  <p className="eyebrow">Trailhead / survey</p>
                  <h2 id="trailhead-title">
                    Know the ground before you explore.
                  </h2>
                  <p>
                    These values were recorded by the local analyzer. They
                    describe the snapshot, not a live repository.
                  </p>
                </div>
                <dl className="survey-stats">
                  <div>
                    <dt>Revision</dt>
                    <dd>
                      <code title={projection.repository.headCommit}>
                        {shortSha(projection.repository.headCommit)}
                      </code>
                    </dd>
                  </div>
                  <div>
                    <dt>Collected</dt>
                    <dd>{formatTimestamp(projection.run.completedAt)}</dd>
                  </div>
                  <div>
                    <dt>Files recorded</dt>
                    <dd>
                      {projection.coverage.inventory.recordedEntries} /{" "}
                      {projection.coverage.inventory.discoveredEntries}
                    </dd>
                  </div>
                  <div>
                    <dt>Field notes</dt>
                    <dd>
                      {projection.coverage.documentation.extractedFiles} /{" "}
                      {projection.coverage.documentation.eligibleFiles}
                    </dd>
                  </div>
                </dl>
                <div className="coverage-note">
                  <span aria-hidden="true">◈</span>
                  <div>
                    <strong>
                      History: {projection.coverage.history.completeness}
                    </strong>
                    <p>
                      {projection.coverage.history.recordedCommits} of{" "}
                      {projection.coverage.history.requestedCommits} requested
                      commits recorded.
                      {projection.coverage.omissions.length > 0
                        ? ` ${projection.coverage.omissions.length} omission${projection.coverage.omissions.length === 1 ? "" : "s"} recorded below.`
                        : " No omissions were recorded."}
                    </p>
                  </div>
                </div>
                {projection.coverage.omissions.length > 0 ? (
                  <ul className="omission-list" aria-label="Recorded omissions">
                    {projection.coverage.omissions.map((omission, index) => (
                      <li key={`${omission.reason}-${omission.path ?? index}`}>
                        <code>{omission.reason}</code>
                        <span>
                          {omission.detail ??
                            omission.path ??
                            "No further detail recorded."}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>

              <section
                className="workflow-trail"
                aria-labelledby="workflow-title"
              >
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Mine route / curated workflow</p>
                    <h2 id="workflow-title">
                      Follow one change from spark to proof.
                    </h2>
                  </div>
                  <span>
                    {workflow
                      ? `${workflow.steps.length} steps recorded`
                      : "Optional local bundle"}
                  </span>
                </div>
                {workflowError ? (
                  <p className="workflow-error" role="alert">
                    {workflowError}
                  </p>
                ) : null}
                {workflow ? (
                  <div className="workflow-layout">
                    <ol className="workflow-steps">
                      {workflow.steps.map((step, index) => (
                        <li key={step.id}>
                          <button
                            type="button"
                            data-selected={selectedStep === step.id}
                            onClick={() => setSelectedStep(step.id)}
                          >
                            <span>{index + 1}</span>
                            <strong>{step.label}</strong>
                            <small>{step.kind}</small>
                          </button>
                        </li>
                      ))}
                    </ol>
                    {(() => {
                      const step = workflow.steps.find(
                        (item) => item.id === selectedStep,
                      );
                      if (!step) return null;
                      const evidence = step.evidence;
                      return (
                        <article className="workflow-detail">
                          <p className="eyebrow">
                            {step.kind} / recorded evidence
                          </p>
                          <h3>{step.label}</h3>
                          {evidence.type === "source" ? (
                            <>
                              <p>
                                <code>
                                  {shortSha(evidence.source.commitSha)}
                                </code>{" "}
                                · <code>{evidence.source.path}</code> · Lines{" "}
                                {evidence.source.lines?.start}–
                                {evidence.source.lines?.end}
                              </p>
                              <p className="captured-label">
                                Captured text — display-only evidence
                              </p>
                              <pre>{evidence.text}</pre>
                              {"textTruncated" in evidence &&
                              evidence.textTruncated ? (
                                <p className="projection-note">
                                  This local view is bounded.
                                </p>
                              ) : null}
                            </>
                          ) : evidence.type === "history" ? (
                            <p>
                              Recorded history metadata:{" "}
                              <code>{shortSha(evidence.commit.sha)}</code> ·{" "}
                              {evidence.commit.subject}
                            </p>
                          ) : (
                            <p className="workflow-error">{evidence.reason}</p>
                          )}
                        </article>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="workflow-empty">
                    Choose a workflow bundle after loading its matching
                    snapshot. The trail is curated evidence, not a generated
                    explanation.
                  </p>
                )}
              </section>

              <section className="evidence-grid" aria-labelledby="notes-title">
                <div className="field-notes">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">Field notes / captured docs</p>
                      <h2 id="notes-title">Follow a source trail.</h2>
                    </div>
                    <span>
                      {projection.totalDocumentationExtracts} recorded
                    </span>
                  </div>
                  <label className="path-filter">
                    <span>Filter recorded paths</span>
                    <input
                      value={filter}
                      onChange={(event) => setFilter(event.target.value)}
                      placeholder="Try README or docs/"
                      type="search"
                    />
                  </label>
                  {projection.projectionTruncated ? (
                    <p className="projection-note" role="status">
                      This local view is bounded; some captured evidence is not
                      shown.
                    </p>
                  ) : null}
                  <div className="note-list" aria-live="polite">
                    {visibleNotes.length > 0 ? (
                      visibleNotes.map((note) => (
                        <button
                          className="note-item"
                          data-selected={note.source.path === selectedPath}
                          key={`${note.contentId}-${note.source.path}`}
                          type="button"
                          onClick={() => setSelectedPath(note.source.path)}
                        >
                          <span className="note-glyph" aria-hidden="true">
                            ✦
                          </span>
                          <span>
                            <strong>{note.source.path}</strong>
                            <small>
                              {note.source.lines
                                ? `Lines ${note.source.lines.start}–${note.source.lines.end}`
                                : "No line range recorded"}
                            </small>
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="empty-state">
                        <strong>No recorded evidence matches this path.</strong>
                        <p>
                          Adjust the filter or clear it to revisit the recorded
                          notes.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <article
                  className="evidence-lantern"
                  aria-labelledby="lantern-title"
                >
                  <p className="eyebrow">Evidence lantern / source detail</p>
                  {selectedNote ? (
                    <>
                      <h2 id="lantern-title">{selectedNote.source.path}</h2>
                      <dl className="citation">
                        <div>
                          <dt>Revision</dt>
                          <dd>
                            <code>
                              {shortSha(selectedNote.source.commitSha)}
                            </code>
                          </dd>
                        </div>
                        <div>
                          <dt>Path</dt>
                          <dd>
                            <code>{selectedNote.source.path}</code>
                          </dd>
                        </div>
                        <div>
                          <dt>Lines</dt>
                          <dd>
                            {selectedNote.source.lines
                              ? `${selectedNote.source.lines.start}–${selectedNote.source.lines.end}`
                              : "No line range recorded"}
                          </dd>
                        </div>
                      </dl>
                      <p className="captured-label">
                        Captured text — display-only evidence
                      </p>
                      <pre>{selectedNote.text}</pre>
                      {selectedNote.textTruncated ? (
                        <p className="projection-note">
                          The captured extract is longer than this local view
                          allows.
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <div className="empty-state lantern-empty">
                      <h2 id="lantern-title">Choose a field note.</h2>
                      <p>
                        Select a recorded path to inspect its captured text and
                        immutable citation.
                      </p>
                    </div>
                  )}
                </article>
              </section>
            </>
          )}
        </>
      ) : null}

      <footer>
        <span>
          <span className="footer-mark" aria-hidden="true">
            ⌁
          </span>{" "}
          Built to make software understandable.
        </span>
        <span>Local first. Evidence at every step.</span>
      </footer>
    </main>
  );
}
