import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getActiveSession } from "./exams";

// Get a short-lived URL the client can POST a file to directly. Only students
// in a live exam session upload (essay attachments, camera photos); forms that
// aren't quizzes have no session and accept uploads as before.
export const generateUploadUrl = mutation({
  args: {
    formId: v.id("forms"),
    sessionId: v.optional(v.id("examSessions")),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form) throw new ConvexError("Form not found");
    if (form.isQuiz && !(await getActiveSession(ctx, args.formId, args.sessionId))) {
      throw new ConvexError("No active exam session");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

// Resolve a stored file's id to a fetchable URL
export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
