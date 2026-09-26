import { mutation, type QueryCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { getOwnedForm, requireOwnedForm } from "./authHelpers";

// How long a shared quiz link stays open for students to press Start
export const LINK_OPEN_MINUTES = 5;

// A started, not-yet-submitted session for this form, or null
export async function getActiveSession(
  ctx: QueryCtx,
  formId: Id<"forms">,
  sessionId: Id<"examSessions"> | undefined,
) {
  if (!sessionId) return null;
  const session = await ctx.db.get(sessionId);
  if (!session || session.formId !== formId || session.submittedAt) return null;
  return session;
}

// Tutor shares the link: open the quiz for LINK_OPEN_MINUTES from now.
// Sharing again reopens it (for latecomers).
export const openLink = mutation({
  args: { id: v.id("forms") },
  handler: async (ctx, args) => {
    await requireOwnedForm(ctx, args.id);
    const linkExpiresAt = Date.now() + LINK_OPEN_MINUTES * 60 * 1000;
    await ctx.db.patch(args.id, { linkExpiresAt });
    return linkExpiresAt;
  },
});

// Student presses Start. Only allowed while the link is open (the form's owner
// can always start, to try their own quiz).
export const startExam = mutation({
  args: {
    formId: v.id("forms"),
    studentName: v.string(),
    studentClass: v.string(),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form) throw new ConvexError("This exam no longer exists.");

    const isOwner = !!(await getOwnedForm(ctx, args.formId));
    const linkOpen = !!form.linkExpiresAt && Date.now() <= form.linkExpiresAt;
    if (form.isQuiz && !linkOpen && !isOwner) {
      throw new ConvexError(
        "This exam link has expired. Ask your tutor to share it again.",
      );
    }

    const studentName = args.studentName.trim();
    const studentClass = args.studentClass.trim();
    if (!studentName || !studentClass) {
      throw new ConvexError("Please enter your name and class.");
    }

    return await ctx.db.insert("examSessions", {
      formId: args.formId,
      studentName,
      studentClass,
      startedAt: Date.now(),
    });
  },
});
