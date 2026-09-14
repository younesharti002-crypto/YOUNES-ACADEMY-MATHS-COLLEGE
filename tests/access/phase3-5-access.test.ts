import assert from "node:assert/strict";
import test from "node:test";
import { validateAssessmentPublish } from "../../src/lib/assessments/publish-validation.ts";
import { normalizePostgresConnectionString } from "../../src/lib/db/connection-string.ts";
import { sanitizeStudentLiveResources } from "../../src/lib/live/student-visibility.ts";

test("scheduled live sessions never expose join or replay resources", () => {
  const visible = sanitizeStudentLiveResources({
    status: "SCHEDULED" as const,
    joinUrl: "https://meet.example/private-room",
    replayUrl: "https://video.example/replay",
    replayPdfUrl: "https://files.example/notes.pdf",
  });

  assert.equal(visible.joinUrl, null);
  assert.equal(visible.replayUrl, null);
  assert.equal(visible.replayPdfUrl, null);
});

test("live sessions expose only the live join resource", () => {
  const visible = sanitizeStudentLiveResources({
    status: "LIVE" as const,
    joinUrl: "https://meet.example/private-room",
    replayUrl: "https://video.example/replay",
    replayPdfUrl: "https://files.example/notes.pdf",
  });

  assert.equal(visible.joinUrl, "https://meet.example/private-room");
  assert.equal(visible.replayUrl, null);
  assert.equal(visible.replayPdfUrl, null);
});

test("completed sessions expose replay resources but never the old join link", () => {
  const visible = sanitizeStudentLiveResources({
    status: "COMPLETED" as const,
    joinUrl: "https://meet.example/private-room",
    replayUrl: "https://video.example/replay",
    replayPdfUrl: "https://files.example/notes.pdf",
  });

  assert.equal(visible.joinUrl, null);
  assert.equal(visible.replayUrl, "https://video.example/replay");
  assert.equal(visible.replayPdfUrl, "https://files.example/notes.pdf");
});

test("quiz publishing requires questions, two choices, and exactly one correct choice", () => {
  assert.equal(validateAssessmentPublish([], []), "QUESTION_REQUIRED");
  assert.equal(
    validateAssessmentPublish(["q1"], [{ questionId: "q1", isCorrect: true }]),
    "CHOICES_REQUIRED",
  );
  assert.equal(
    validateAssessmentPublish(
      ["q1"],
      [
        { questionId: "q1", isCorrect: true },
        { questionId: "q1", isCorrect: true },
      ],
    ),
    "EXACTLY_ONE_CORRECT_REQUIRED",
  );
  assert.equal(
    validateAssessmentPublish(
      ["q1"],
      [
        { questionId: "q1", isCorrect: false },
        { questionId: "q1", isCorrect: false },
      ],
    ),
    "EXACTLY_ONE_CORRECT_REQUIRED",
  );
  assert.equal(
    validateAssessmentPublish(
      ["q1"],
      [
        { questionId: "q1", isCorrect: true },
        { questionId: "q1", isCorrect: false },
      ],
    ),
    null,
  );
});

test("postgres connection strings explicitly retain strict certificate verification", () => {
  const normalized = normalizePostgresConnectionString(
    "postgresql://user:pass@example.com/db?sslmode=require&channel_binding=require",
  );

  assert.ok(normalized);
  assert.equal(new URL(normalized).searchParams.get("sslmode"), "verify-full");
  assert.equal(new URL(normalized).searchParams.get("channel_binding"), "require");
  assert.equal(normalizePostgresConnectionString(undefined), undefined);
  assert.equal(normalizePostgresConnectionString("not-a-url"), "not-a-url");
});
