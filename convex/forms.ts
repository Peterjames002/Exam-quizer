import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserId, requireOwnedForm, requireUserId } from "./authHelpers";
import { stripAnswerKey } from "./grading";

// Save or update a form owned by the signed-in tutor
export const saveForm = mutation({
  args: {
    id: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    isQuiz: v.optional(v.boolean()),
    timerMinutes: v.optional(v.number()),
    fields: v.array(v.any()),
    createdAt: v.string(),
    updatedAt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    // Prefer the id the client already has; fall back to matching by title
    const byId = ctx.db.normalizeId("forms", args.id);
    let existing = byId ? await ctx.db.get(byId) : null;
    if (existing && existing.userId !== userId) {
      throw new Error("Unauthorized");
    }
    if (!existing) {
      existing = await ctx.db
        .query("forms")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("title"), args.title))
        .first();
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        title: args.title,
        description: args.description,
        isQuiz: args.isQuiz,
        timerMinutes: args.timerMinutes,
        fields: args.fields,
        updatedAt: args.updatedAt,
      });
      return existing._id;
    }

    return await ctx.db.insert("forms", {
      userId,
      title: args.title,
      description: args.description,
      isQuiz: args.isQuiz,
      timerMinutes: args.timerMinutes,
      fields: args.fields,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
    });
  },
});

// Public: what a student sees when taking the exam — no answer key.
export const getForm = query({
  args: { id: v.id("forms") },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.id);
    if (!form) return null;
    const { userId: _owner, ...rest } = form;
    return {
      ...rest,
      fields: form.fields.map((f) => stripAnswerKey(f)) as typeof form.fields,
    };
  },
});

// Full form, answer key included — owner only
export const getFormByUser = query({
  args: { id: v.id("forms") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;
    const form = await ctx.db.get(args.id);
    return form && form.userId === userId ? form : null;
  },
});

// All forms belonging to the signed-in tutor
export const getAllForms = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("forms")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

// Delete a form and its responses (owner only)
export const deleteForm = mutation({
  args: { id: v.id("forms") },
  handler: async (ctx, args) => {
    await requireOwnedForm(ctx, args.id);

    const responses = await ctx.db
      .query("responses")
      .withIndex("by_formId", (q) => q.eq("formId", args.id))
      .collect();
    for (const response of responses) {
      await ctx.db.delete(response._id);
    }

    await ctx.db.delete(args.id);
  },
});
