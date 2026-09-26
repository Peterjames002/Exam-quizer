import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  forms: defineTable({
    userId: v.optional(v.string()), // Clerk user ID (optional for backward compatibility with existing forms)
    title: v.string(),
    description: v.optional(v.string()),
    isQuiz: v.optional(v.boolean()),
    timerMinutes: v.optional(v.number()), // Timer in minutes for quiz (optional)
    linkExpiresAt: v.optional(v.number()), // ms epoch; quiz can only be started before this
    fields: v.array(v.any()),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_userId", ["userId"]),

  responses: defineTable({
    formId: v.id("forms"),
    responses: v.any(),
    submittedAt: v.string(),
    score: v.optional(v.number()),
    maxScore: v.optional(v.number()),
    answers: v.optional(v.any()),
    studentName: v.optional(v.string()),
    studentClass: v.optional(v.string()),
    tabSwitchCount: v.optional(v.number()),
    pasteAttempts: v.optional(v.number()), // blocked pastes into essay answers
    attachments: v.optional(v.any()), // fieldId -> storage id, for essay answers with a photo/file attached
    sessionId: v.optional(v.id("examSessions")),
    cameraPhotos: v.optional(v.array(v.id("_storage"))), // webcam snapshots taken during the exam
    cameraStatus: v.optional(v.string()), // "on" | "blocked" | "unavailable"
  }).index("by_formId", ["formId"]),

  // One per student who pressed Start on a quiz. Gates questions, uploads
  // and submission, so an expired link can't be used from a fresh page.
  examSessions: defineTable({
    formId: v.id("forms"),
    studentName: v.string(),
    studentClass: v.string(),
    startedAt: v.number(),
    submittedAt: v.optional(v.number()),
  }).index("by_formId", ["formId"]),
});
