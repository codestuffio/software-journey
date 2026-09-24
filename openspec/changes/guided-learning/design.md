## Design

The checked-in tutorial catalog selects the existing revision-pinned workflow bundle by repository identity, commit, workflow ID, and catalog version. A lesson contains authored claims with explicit fact, inference, quote, or unknown status. Factual and inferred claims name an evidence step and expected source path. A quote displays the captured source excerpt directly rather than storing a second copy of third-party text. Unknowns have no citation and explicitly identify a limit.

The browser validates a selected local snapshot and workflow bundle using existing contracts, then matches the catalog. It does not read the checkout, run a process, or make a network call. Imported text remains display-only. A missing, mismatched, or truncated citation is shown as unavailable. The matching catalog is intentionally narrow; other revisions show an unsupported tutorial state.

The R4-style citation check verifies that referenced evidence exists, is source evidence, has a line range, and matches the selected repository, commit, and expected path. The workflow contract validates that each source extract has a content ID; source extract, snapshot, and workflow bundle IDs identify different content and are not interchangeable. The check cannot establish that prose accurately interprets the source. That requires editorial review; generated-content quality gates remain R7 work.

The existing workflow bundle and snapshot size limits bound the data admitted to the browser. There is no long-running operation or persistence to cancel. No source content leaves the machine, so source-sharing consent is not requested in this slice. If a later feature sends selected snippets to a provider, it must obtain explicit consent first.
