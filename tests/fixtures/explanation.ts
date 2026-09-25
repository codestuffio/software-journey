import {
  explainEvidence,
  previewExplanation,
} from "../../packages/explanations/src/index.ts";
import { lessonFixture } from "./lesson.ts";
export async function explanationFixture() {
  const input = lessonFixture();
  const request = {
    schemaVersion: 1,
    selector: {
      type: "step",
      workflowId: "openspec-new-change",
      stepId: "implementation",
    },
  };
  const preview = await previewExplanation(input, request);
  const report = await explainEvidence(input, request, {
    approval: preview.approvalDigest,
    getApiKey: () => "fixture-only",
    transport: async () =>
      new Response(
        JSON.stringify({
          id: "resp_fixture",
          model: preview.model,
          status: "completed",
          usage: { input_tokens: 100, output_tokens: 50 },
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    blocks: [
                      {
                        kind: "inference",
                        text: '<img src="https://example.invalid/leak"> is inert model text.',
                        citations: [preview.sources[0]?.id],
                      },
                    ],
                  }),
                },
              ],
            },
          ],
        }),
      ),
  });
  if (report.kind !== "explanation-report")
    throw new Error("Expected fixture report");
  return { input, report };
}
