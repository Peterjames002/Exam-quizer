import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { getOwnedForm, requireOwnedForm } from "./authHelpers";
import { gradeResponses, type AnswerResult } from "./grading";
import { getActiveSession } from "./exams";

// Public: a student submits their answers. Marking happens here, on the server,
// so the score can't be forged and nothing is returned to the student.
export const saveResponse = mutation({
  args: {
    formId: v.id("forms"),
    responses: v.any(),
    submittedAt: v.string(),
    studentName: v.optional(v.string()),
    studentClass: v.optional(v.string()),
    tabSwitchCount: v.optional(v.number()),
    pasteAttempts: v.optional(v.number()),
    attachments: v.optional(v.any()),
    sessionId: v.optional(v.id("examSessions")),
    cameraPhotos: v.optional(v.array(v.id("_storage"))),
    cameraStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form) throw new Error("Form not found");

    // Quizzes only accept one submission per started session
    const session = await getActiveSession(ctx, args.formId, args.sessionId);
    if (form.isQuiz && !session) {
      throw new ConvexError(
        "This exam session is no longer valid, or was already submitted.",
      );
    }
    if (session) {
      await ctx.db.patch(session._id, { submittedAt: Date.now() });
    }

    const graded = form.isQuiz
      ? gradeResponses(form.fields, args.responses ?? {})
      : null;

    await ctx.db.insert("responses", {
      formId: args.formId,
      responses: args.responses,
      submittedAt: args.submittedAt,
      score: graded?.score,
      maxScore: graded?.maxScore,
      answers: graded?.answers,
      // From the session, so they can't be changed after Start
      studentName: session?.studentName ?? args.studentName,
      studentClass: session?.studentClass ?? args.studentClass,
      tabSwitchCount: args.tabSwitchCount,
      pasteAttempts: args.pasteAttempts,
      attachments: args.attachments,
      sessionId: session?._id,
      cameraPhotos: args.cameraPhotos,
      cameraStatus: args.cameraStatus,
    });
  },
});

// Tutor confirms (or changes) the mark for one student's essay answer (owner only).
// Only confirmed essay marks count toward the student's score.
export const gradeEssayAnswer = mutation({
  args: {
    responseId: v.id("responses"),
    fieldId: v.string(),
    points: v.number(),
  },
  handler: async (ctx, args) => {
    const response = await ctx.db.get(args.responseId);
    if (!response) throw new Error("Response not found");
    const form = await requireOwnedForm(ctx, response.formId);

    const field = (form.fields as Array<{ id: string; points?: number }>).find(
      (f) => f.id === args.fieldId,
    );
    const maxPoints = field?.points ?? 1;
    const clampedPoints = Math.max(0, Math.min(args.points, maxPoints));

    const existingAnswers: Record<string, AnswerResult> = { ...(response.answers || {}) };
    existingAnswers[args.fieldId] = {
      ...existingAnswers[args.fieldId],
      points: clampedPoints,
      needsGrading: false,
      autoGraded: false,
      markedAt: Date.now(),
    };

    const newScore = Object.values(existingAnswers).reduce(
      (sum, a) => sum + (a?.points || 0),
      0,
    );

    await ctx.db.patch(args.responseId, {
      answers: existingAnswers,
      score: newScore,
    });
  },
});

async function ownedResponses(
  ctx: Parameters<typeof getOwnedForm>[0],
  formId: Doc<"forms">["_id"],
) {
  if (!(await getOwnedForm(ctx, formId))) return [];
  return await ctx.db
    .query("responses")
    .withIndex("by_formId", (q) => q.eq("formId", formId))
    .collect();
}

// Full list for a single form (export, one-shot fetch) — owner only
export const getResponses = query({
  args: { formId: v.id("forms") },
  handler: async (ctx, args) => ownedResponses(ctx, args.formId),
});

/** @deprecated Legacy name — same as getResponses. Kept for older deployed clients. */
export const getAllResponses = query({
  args: { formId: v.id("forms") },
  handler: async (ctx, args) => ownedResponses(ctx, args.formId),
});

/** Paginated responses for a form (indexed) — owner only. */
export const listResponsesByForm = query({
  args: {
    formId: v.id("forms"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    if (!(await getOwnedForm(ctx, args.formId))) {
      return { page: [], isDone: true, continueCursor: "" };
    }
    return await ctx.db
      .query("responses")
      .withIndex("by_formId", (q) => q.eq("formId", args.formId))
      .order("asc")
      .paginate(args.paginationOpts);
  },
});

function statsFromRows(rows: Doc<"responses">[]) {
  if (rows.length === 0) {
    return {
      count: 0,
      averageScore: 0,
      averagePercent: 0,
      highestScore: 0,
      lowestScore: 0,
      maxPossibleScore: 0,
    };
  }

  const scores = rows.map((r) => r.score ?? 0);
  const sumScore = scores.reduce((a, b) => a + b, 0);
  const maxPossibleFromRows = Math.max(
    ...rows.map((r) => r.maxScore ?? 0),
    0,
  );
  const percents = rows
    .map((r) => {
      const max = r.maxScore ?? 0;
      if (max <= 0) return 0;
      return ((r.score ?? 0) / max) * 100;
    })
    .filter((p) => !Number.isNaN(p));

  return {
    count: rows.length,
    averageScore: Math.round(sumScore / rows.length),
    averagePercent:
      percents.length > 0
        ? Math.round(
            percents.reduce((a, b) => a + b, 0) / percents.length,
          )
        : 0,
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    maxPossibleScore: maxPossibleFromRows,
  };
}

export const getResponseStats = query({
  args: { formId: v.id("forms") },
  handler: async (ctx, args) => statsFromRows(await ownedResponses(ctx, args.formId)),
});

export const getResponseStatsForForms = query({
  args: { formIds: v.array(v.id("forms")) },
  handler: async (ctx, args) => {
    const result: { formId: string; count: number }[] = [];
    for (const formId of args.formIds) {
      const rows = await ownedResponses(ctx, formId);
      result.push({ formId, count: rows.length });
    }
    return result;
  },
});
