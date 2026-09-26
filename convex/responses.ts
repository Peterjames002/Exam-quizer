import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

// Save a response
export const saveResponse = mutation({
  args: {
    formId: v.id("forms"),
    responses: v.any(),
    submittedAt: v.string(),
    score: v.optional(v.number()),
    maxScore: v.optional(v.number()),
    answers: v.optional(v.any()),
    studentName: v.optional(v.string()),
    studentClass: v.optional(v.string()),
    tabSwitchCount: v.optional(v.number()),
    attachments: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("responses", {
      formId: args.formId,
      responses: args.responses,
      submittedAt: args.submittedAt,
      score: args.score,
      maxScore: args.maxScore,
      answers: args.answers,
      studentName: args.studentName,
      studentClass: args.studentClass,
      tabSwitchCount: args.tabSwitchCount,
      attachments: args.attachments,
    });
  },
});

// Manually grade an essay answer (teacher only, must own the form)
export const gradeEssayAnswer = mutation({
  args: {
    responseId: v.id("responses"),
    fieldId: v.string(),
    points: v.number(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const response = await ctx.db.get(args.responseId);
    if (!response) throw new Error("Response not found");

    const form = await ctx.db.get(response.formId);
    if (!form || form.userId !== args.userId) {
      throw new Error("Unauthorized");
    }

    const field = (form.fields as Array<{ id: string; points?: number }>).find(
      (f) => f.id === args.fieldId,
    );
    const maxPoints = field?.points ?? 1;
    const clampedPoints = Math.max(0, Math.min(args.points, maxPoints));

    const existingAnswers = { ...(response.answers || {}) };
    existingAnswers[args.fieldId] = {
      ...existingAnswers[args.fieldId],
      points: clampedPoints,
      needsGrading: false,
    };

    const newScore = Object.values(existingAnswers).reduce(
      (sum: number, a: any) => sum + (a?.points || 0),
      0,
    );

    await ctx.db.patch(args.responseId, {
      answers: existingAnswers,
      score: newScore,
    });
  },
});

// Full list for a single form (export, one-shot fetch)
export const getResponses = query({
  args: { formId: v.id("forms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("responses")
      .withIndex("by_formId", (q) => q.eq("formId", args.formId))
      .collect();
  },
});

/** @deprecated Legacy name — same as getResponses. Kept for older deployed clients. */
export const getAllResponses = query({
  args: { formId: v.id("forms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("responses")
      .withIndex("by_formId", (q) => q.eq("formId", args.formId))
      .collect();
  },
});

/** Paginated responses for a form (indexed). */
export const listResponsesByForm = query({
  args: {
    formId: v.id("forms"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
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
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("responses")
      .withIndex("by_formId", (q) => q.eq("formId", args.formId))
      .collect();
    return statsFromRows(rows);
  },
});

export const getResponseStatsForForms = query({
  args: { formIds: v.array(v.id("forms")) },
  handler: async (ctx, args) => {
    const result: { formId: string; count: number }[] = [];
    for (const formId of args.formIds) {
      const rows = await ctx.db
        .query("responses")
        .withIndex("by_formId", (q) => q.eq("formId", formId))
        .collect();
      result.push({ formId, count: rows.length });
    }
    return result;
  },
});
