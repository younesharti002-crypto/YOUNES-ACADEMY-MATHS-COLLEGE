export type AssessmentPublishIssue =
  | "QUESTION_REQUIRED"
  | "CHOICES_REQUIRED"
  | "EXACTLY_ONE_CORRECT_REQUIRED";

type ChoiceState = {
  questionId: string;
  isCorrect: boolean;
};

export function validateAssessmentPublish(
  questionIds: readonly string[],
  choices: readonly ChoiceState[],
): AssessmentPublishIssue | null {
  if (questionIds.length === 0) return "QUESTION_REQUIRED";

  for (const questionId of questionIds) {
    const questionChoices = choices.filter((choice) => choice.questionId === questionId);
    if (questionChoices.length < 2) return "CHOICES_REQUIRED";
    if (questionChoices.filter((choice) => choice.isCorrect).length !== 1) {
      return "EXACTLY_ONE_CORRECT_REQUIRED";
    }
  }

  return null;
}
