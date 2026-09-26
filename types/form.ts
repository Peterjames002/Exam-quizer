export type FieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'number'
  | 'date'
  | 'radio'
  | 'checkbox'
  | 'select'
  | 'file'
  | 'rating'
  | 'essay' // Long-form answer, manually graded by the teacher
  | 'textblock' // For descriptive text sections

export interface FormField {
  id: string
  type: FieldType
  label: string
  description?: string // Help text or description below the question
  placeholder?: string
  required?: boolean
  options?: string[] // For radio, checkbox, select
  isQuiz?: boolean // Whether this is an objective question with correct answers
  correctAnswers?: string[] // Correct answers for quiz questions
  points?: number // Points for this question (default: 1)
  keywords?: string[] // Essay questions: auto-marked by how many of these appear (close forms count)
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
}

export interface Form {
  id: string
  title: string
  description?: string
  isQuiz?: boolean // Whether this form is a quiz/test
  timerMinutes?: number // Timer in minutes for quiz (optional)
  linkExpiresAt?: number // ms epoch; students must press Start before this
  fields: FormField[]
  createdAt: string
  updatedAt: string
}

export interface FormResponse {
  id: string
  formId: string
  responses: Record<string, any>
  submittedAt: string
  score?: number // Total score for quiz responses
  maxScore?: number // Maximum possible score
  answers?: Record<string, {
    isCorrect?: boolean
    points?: number
    needsGrading?: boolean // True for essay answers awaiting manual grading
    autoGraded?: boolean // Essay marked from the tutor's keywords
    matchedKeywords?: string[]
    missedKeywords?: string[]
  }> // Quiz answer results
  studentName?: string // Student's name
  studentClass?: string // Student's matriculation number (field kept as studentClass for existing data)
  tabSwitchCount?: number // Number of times the student left the quiz tab
  pasteAttempts?: number // Number of blocked pastes into essay answers
  attachments?: Record<string, string> // fieldId -> Convex storage id, for essay answers with a photo/file attached
  sessionId?: string // Exam session created when the student pressed Start
  cameraPhotos?: string[] // Convex storage ids of webcam snapshots
  cameraStatus?: 'on' | 'blocked' | 'unavailable'
}
