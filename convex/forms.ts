import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Save or update a form
export const saveForm = mutation({
  args: {
    id: v.string(),
    userId: v.string(), // Add userId
    title: v.string(),
    description: v.optional(v.string()),
    isQuiz: v.optional(v.boolean()),
    timerMinutes: v.optional(v.number()),
    fields: v.array(v.any()),
    createdAt: v.string(),
    updatedAt: v.string(),
  },
  handler: async (ctx, args) => {
    // Find existing form by title and userId
    const existing = await ctx.db
      .query("forms")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("title"), args.title))
      .first();

    if (existing) {
      // Update existing form (only if user owns it)
      if (existing.userId === args.userId) {
        await ctx.db.patch(existing._id, {
          title: args.title,
          description: args.description,
          isQuiz: args.isQuiz,
          timerMinutes: args.timerMinutes,
          fields: args.fields,
          updatedAt: args.updatedAt,
        });
        return existing._id;
      } else {
        throw new Error("Unauthorized");
      }
    } else {
      // Insert new form
      const formId = await ctx.db.insert("forms", {
        userId: args.userId,
        title: args.title,
        description: args.description,
        isQuiz: args.isQuiz,
        timerMinutes: args.timerMinutes,
        fields: args.fields,
        createdAt: args.createdAt,
        updatedAt: args.updatedAt,
      });
      return formId;
    }
  },
});

// Get a form by Convex ID (public - for students to view/take quizzes)
export const getForm = query({
  args: { id: v.id("forms") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get a form by Convex ID (only if user owns it - for editing)
export const getFormByUser = query({
  args: { id: v.id("forms"), userId: v.string() },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.id);
    if (form && form.userId === args.userId) {
      return form;
    }
    return null;
  },
});

// Get all forms for a user
export const getAllForms = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Query forms by userId, filtering out any that don't match (for safety)
    const forms = await ctx.db
      .query("forms")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    
    // Also filter to ensure userId matches (in case of optional userId in old records)
    return forms.filter(f => f.userId === args.userId);
  },
});

// Delete a form (only if user owns it)
export const deleteForm = mutation({
  args: { id: v.id("forms"), userId: v.string() },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.id);
    if (!form || form.userId !== args.userId) {
      throw new Error("Unauthorized");
    }
    
    // Also delete all responses for this form
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
