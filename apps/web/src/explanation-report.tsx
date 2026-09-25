import {
  capturedLines,
  type ExplanationReport,
  explanationReportSchema,
  type GuidedLesson,
  validateExplanationContent,
} from "@software-journey/contracts";
import { useRef, useState } from "react";
export async function loadExplanationReport(file: File, lesson: GuidedLesson) {
  if (file.size > 256 * 1024)
    throw new Error("Explanation report exceeds the 256 KiB limit.");
  const report = explanationReportSchema.parse(JSON.parse(await file.text()));
  if (
    report.inputs.snapshot !== lesson.snapshotIdentity ||
    report.inputs.bundle !== lesson.bundleIdentity
  )
    throw new Error("Explanation belongs to different evidence artifacts.");
  const repository = lesson.steps[0]?.evidence.repository;
  if (
    report.repository.id !== repository?.id ||
    report.repository.headCommit !== repository?.headCommit
  )
    throw new Error("Explanation repository does not match.");
  const captures = lesson.steps.flatMap((step) =>
    step.evidence.items.filter((item) => item.type === "source"),
  );
  if (
    new Set(report.sources.map((source) => source.id)).size !==
    report.sources.length
  )
    throw new Error("Duplicate explanation source IDs.");
  for (const source of report.sources) {
    const matches = captures.some((capture) => {
      if (
        capture.source.path !== source.source.path ||
        capture.source.repositoryId !== source.source.repositoryId ||
        capture.source.commitSha !== source.source.commitSha
      )
        return false;
      const outer = capture.source.lines,
        inner = source.source.lines;
      if (!outer || !inner)
        return outer === null && inner === null && source.text === capture.text;
      if (inner.start < outer.start || inner.end > outer.end) return false;
      return (
        capturedLines(capture.text)
          .slice(inner.start - outer.start, inner.end - outer.start + 1)
          .join("") === source.text
      );
    });
    if (!matches)
      throw new Error(
        "Explanation source does not match the active lesson capture.",
      );
  }
  validateExplanationContent(report.content, report.sources);
  return report;
}
export function ExplanationReportPanel({ lesson }: { lesson: GuidedLesson }) {
  const generation = useRef(0);
  const [report, setReport] = useState<ExplanationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function select(file: File | undefined) {
    const current = ++generation.current;
    setReport(null);
    setError(null);
    if (!file) return;
    try {
      const next = await loadExplanationReport(file, lesson);
      if (current === generation.current) setReport(next);
    } catch {
      if (current === generation.current)
        setError(
          "This report is malformed, too large, or does not match the active lesson evidence.",
        );
    }
  }
  return (
    <section className="explanation-report" aria-labelledby="explanation-title">
      <h3 id="explanation-title">Optional assisted explanation</h3>
      <p>
        Create a preview with the explain CLI command, review its selected
        source and cost, and explicitly approve it to request an explanation.
        Opening a report here stays local.
      </p>
      <label>
        Open a local explanation report
        <input
          type="file"
          accept=".json,application/json"
          onChange={(event) => {
            void select(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      {report ? (
        <>
          <p className="projection-note">{report.warning}</p>
          <p>
            Provider: {report.provider} · Model: {report.model} · Prompt
            version: {report.promptVersion}
          </p>
          <p>
            Reported tokens: {report.usage.inputTokens} input,{" "}
            {report.usage.outputTokens} output. Estimated charge: $
            {report.cost.reportedUsageEstimateUsd.toFixed(6)} at{" "}
            {report.cost.pricingDate} rates.
          </p>
          {report.content.blocks.map((block, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Imported blocks are an immutable read-only list with no child state.
            <div key={`${index}-${block.kind}`}>
              <h4>Model {block.kind}</h4>
              <p>{block.text}</p>
              {block.citations.map((id) => {
                const source = report.sources.find((item) => item.id === id);
                return source ? (
                  <p key={id}>
                    <code>{source.source.commitSha}</code> ·{" "}
                    <code>{source.source.path}</code> ·{" "}
                    {source.source.lines
                      ? `Lines ${source.source.lines.start}–${source.source.lines.end}`
                      : "Line range unknown"}
                  </p>
                ) : null;
              })}
            </div>
          ))}
        </>
      ) : null}
    </section>
  );
}
