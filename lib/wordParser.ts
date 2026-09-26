import mammoth from 'mammoth'
import { FormField, FieldType } from '@/types/form'
import { v4 as uuidv4 } from 'uuid'
import { agentDebugIngestJson } from '@/lib/agentDebugIngest'

// Helper function to split a line that might contain multiple options
function splitMultipleOptions(line: string): string[] {
  // Pattern to match options like "A) text", "B) text", etc.
  // Look for pattern: letter followed by ) or . followed by text, then another letter)
  const optionPattern = /([A-Za-z][.)])\s*([^A-Za-z)]+?)(?=\s*[A-Za-z][.)]|$)/g
  const matches = Array.from(line.matchAll(optionPattern))
  
  if (matches.length > 1) {
    // Multiple options found on same line
    return matches.map(match => {
      const optionText = match[2]?.trim() || ''
      return optionText
    }).filter(opt => opt.length > 0)
  }
  
  // Try splitting by common patterns: "A)", "B)", "C)", "D)" etc.
  // Split on pattern like "A) " or "B) " or "C) " or "D) "
  const splitPattern = /\s*([A-Za-z]\))\s*/g
  const parts = line.split(splitPattern)
  
  if (parts.length > 3) {
    // We have multiple options (parts will be: [text, "A)", text, "B)", text, ...])
    const options: string[] = []
    for (let i = 1; i < parts.length; i += 2) {
      if (parts[i + 1]) {
        options.push(parts[i + 1].trim())
      }
    }
    if (options.length > 1) {
      return options.filter(opt => opt.length > 0)
    }
  }
  
  // No multiple options found, return empty array to process as single option
  return []
}

// Helper function to detect answer patterns in a line
// Returns the answer letter(s) if found, null otherwise
function detectAnswerPattern(line: string): string | null {
  const normalizedLine = line.trim()
  
  // Pattern 1: "Answer: C" or "Answer: A, B" (multiple answers)
  const answerMatch = normalizedLine.match(/^Answer(?:s)?:\s*([A-Za-z,\s]+)/i)
  if (answerMatch) {
    // Extract first letter (for now, support single answer)
    const letters = answerMatch[1].match(/[A-Za-z]/g)
    return letters && letters.length > 0 ? letters[0].toUpperCase() : null
  }
  
  // Pattern 2: "Correct Answer: B" or "Correct: B"
  const correctMatch = normalizedLine.match(/^Correct(?: Answer)?:\s*([A-Za-z,\s]+)/i)
  if (correctMatch) {
    const letters = correctMatch[1].match(/[A-Za-z]/g)
    return letters && letters.length > 0 ? letters[0].toUpperCase() : null
  }
  
  // Pattern 3: "Key: D" or "Answer Key: D"
  const keyMatch = normalizedLine.match(/^(?:Answer\s+)?Key:\s*([A-Za-z,\s]+)/i)
  if (keyMatch) {
    const letters = keyMatch[1].match(/[A-Za-z]/g)
    return letters && letters.length > 0 ? letters[0].toUpperCase() : null
  }
  
  // Pattern 4: "Solution: A"
  const solutionMatch = normalizedLine.match(/^Solution(?:s)?:\s*([A-Za-z,\s]+)/i)
  if (solutionMatch) {
    const letters = solutionMatch[1].match(/[A-Za-z]/g)
    return letters && letters.length > 0 ? letters[0].toUpperCase() : null
  }
  
  return null
}

// Helper function to map answer letter to option text
// Converts letter (A, B, C, D) to index and returns corresponding option text
function mapLetterToOption(letter: string, options: string[]): string | null {
  if (!letter || !options || options.length === 0) {
    return null
  }
  
  const upperLetter = letter.toUpperCase()
  // Convert A=0, B=1, C=2, D=3, etc.
  const index = upperLetter.charCodeAt(0) - 'A'.charCodeAt(0)
  
  if (index >= 0 && index < options.length) {
    return options[index]
  }
  
  return null
}

// Core parser reused for both Word and PDF: plain text -> FormField[]
export function parseQuestionsFromPlainText(text: string): FormField[] {
  let fields: FormField[] = []
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)

  // First pass: Detect answer key sections and populate answer key map
  let answerKeyMap: Map<number, string> = new Map() // Map question number to answer letter
  let inAnswerKeySection = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Check if this is an answer key section header
    if (line.match(/^(ANSWERS?|ANSWER\s+KEY|SOLUTIONS?|KEY):?$/i)) {
      inAnswerKeySection = true
      continue
    }
    
    // If we're in an answer key section, parse answers
    if (inAnswerKeySection) {
      // Pattern 1: "1. C" or "1) C"
      const numberedAnswerMatch = line.match(/^(\d+)[.)]\s*([A-Za-z])/i)
      if (numberedAnswerMatch) {
        const questionNum = parseInt(numberedAnswerMatch[1])
        const answerLetter = numberedAnswerMatch[2].toUpperCase()
        answerKeyMap.set(questionNum, answerLetter)
        continue
      }
      
      // Pattern 2: "1-C" or "1-C, 2-B, 3-A" (comma-separated)
      const commaSeparatedMatch = line.match(/(\d+)-([A-Za-z])/gi)
      if (commaSeparatedMatch) {
        commaSeparatedMatch.forEach(match => {
          const parts = match.match(/(\d+)-([A-Za-z])/i)
          if (parts) {
            const questionNum = parseInt(parts[1])
            const answerLetter = parts[2].toUpperCase()
            answerKeyMap.set(questionNum, answerLetter)
          }
        })
        continue
      }
      
      // If we hit a line that doesn't look like an answer, we might be out of the answer key section
      if (line.length > 0 && !line.match(/^(\d+)[.)]\s*[A-Za-z]/i) && !line.match(/\d+-[A-Za-z]/i)) {
        // Check if it looks like a new section (e.g., starts with a heading) or a question
        if (line.match(/^[A-Z][A-Z\s]+:?$/) || line.match(/^\d+[.)]/) || line.length < 5) {
          inAnswerKeySection = false
        }
      }
    }
  }

  // Second pass: Parse questions and options
  let currentQuestion: string | null = null
  let currentOptions: string[] = []
  let hadOptions = false // Track if we've seen options for current question
  let currentQuestionNumber: number | null = null // Track question number for answer key mapping
  let detectedAnswerLetter: string | null = null // Answer detected after current question's options

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Detect if this line contains multiple inline options like "A) ... B) ... C) ... D) ..."
    const inlineOptions = splitMultipleOptions(line)
    const hasInlineOptions = inlineOptions.length > 1

    // Check if line is a numbered question (1., 2., Q1, Question 1, etc.)
    const numberedQuestionMatch = line.match(/^(\d+[.)]|Q\d+[.:]|Question\s+\d+[.:])\s*(.+)/i)
    
    // Check if line is an option (starts with -, *, •, or letters a-z, A-Z with . or ))
    const isOption = line.match(/^[-*•]\s+/) || 
                     line.match(/^[a-zA-Z][.)]\s+/) ||
                     line.match(/^[a-zA-Z]\)\s+/) ||
                     line.match(/^\([a-zA-Z]\)\s+/)
    
    // Check if line starts a new question - be more aggressive in detection
    const isNewQuestion = numberedQuestionMatch || 
                          (line.match(/^\d+[.)]\s+/) && line.length > 5 && !isOption) ||
                          (line.match(/[?？]$/) && !isOption && line.length > 5) ||
                          (line.match(/^(what|which|who|when|where|how|why|do|does|did|are|is|can|could|would|should)/i) && !isOption && line.length > 10) ||
                          // Treat any line with multiple inline options as a new question as well
                          (hasInlineOptions && !isOption)
    
    // If we see a new question after having options, save the previous question
    if (isNewQuestion) {
      // Save previous question if exists
      if (currentQuestion) {
        // Use detected answer letter or check answer key map
        let answerLetter = detectedAnswerLetter
        if (!answerLetter && currentQuestionNumber !== null) {
          answerLetter = answerKeyMap.get(currentQuestionNumber) || null
        }
        fields.push(createFieldFromQuestion(currentQuestion, currentOptions, answerLetter))
        detectedAnswerLetter = null
      }
      
      // Extract question number and text
      let questionNumber: number | null = null
      if (numberedQuestionMatch) {
        const numberMatch = numberedQuestionMatch[1].match(/\d+/)
        if (numberMatch) {
          questionNumber = parseInt(numberMatch[0])
        }
        currentQuestion = numberedQuestionMatch[2].trim()
      } else {
        const numberMatch = line.match(/^(\d+)[.)]/)
        if (numberMatch) {
          questionNumber = parseInt(numberMatch[1])
        }
        currentQuestion = line.replace(/[?？]$/, '').trim()
        // Remove common question prefixes
        currentQuestion = currentQuestion.replace(/^(Q\d+[.:]|Question\s+\d+[.:])\s*/i, '').trim()
        // Remove leading numbers if present
        currentQuestion = currentQuestion.replace(/^\d+[.)]\s*/, '').trim()
      }
      
      currentQuestionNumber = questionNumber
      currentOptions = []
      hadOptions = false
      detectedAnswerLetter = null

      // If this same line also includes inline options (A) ... B) ... C) ...), extract them now
      if (hasInlineOptions) {
        currentOptions.push(...inlineOptions)
        hadOptions = true
      }
    }
    // Check if line is an option
    else if (isOption) {
      // First, try to split if line contains multiple options (e.g., "A) Option1 B) Option2 C) Option3 D) Option4")
      const splitOptions = splitMultipleOptions(line)
      
      if (splitOptions.length > 1) {
        // Multiple options found on this line
        if (currentQuestion) {
          currentOptions.push(...splitOptions)
          hadOptions = true
        } else if (fields.length > 0) {
          const lastField = fields[fields.length - 1]
          if (lastField && lastField.options) {
            lastField.options.push(...splitOptions)
          }
        }
      } else {
        // Single option on the line - extract it
        let option = line
          .replace(/^[-*•]\s+/, '')
          .replace(/^[a-zA-Z][.)]\s+/, '')
          .replace(/^[a-zA-Z]\)\s+/, '')
          .replace(/^\([a-zA-Z]\)\s+/, '')
          .trim()
        
        if (option) {
          if (currentQuestion) {
            currentOptions.push(option)
            hadOptions = true
          } else if (fields.length > 0) {
            const lastField = fields[fields.length - 1]
            if (lastField && lastField.options) {
              lastField.options.push(option)
            }
          }
        }
      }
    }
    // If we have a question and this line doesn't match patterns, it might be part of the question
    else if (currentQuestion && line.length > 0 && !isOption) {
      // First, check if this line contains an answer pattern (after options)
      if (hadOptions && currentOptions.length > 0) {
        const answerLetter = detectAnswerPattern(line)
        if (answerLetter) {
          detectedAnswerLetter = answerLetter
          // Skip this line, it's an answer indicator
          continue
        }
      }
      
      // Check if this line contains multiple options (even if not detected as isOption)
      const splitOptions = splitMultipleOptions(line)
      
      if (splitOptions.length > 1) {
        // This line contains multiple options, add them
        currentOptions.push(...splitOptions)
        hadOptions = true
      } else {
        // Check if this looks like a new question starting (especially after options)
        const looksLikeNewQuestion = (line.match(/^\d+[.)]\s+/) && line.length > 5) ||
                                      (hadOptions && line.match(/^\d+[.)]/) && line.length > 3)
        
        if (looksLikeNewQuestion) {
          // This looks like a new question, save current one first
          // Use detected answer letter or check answer key map
          let answerLetter = detectedAnswerLetter
          if (!answerLetter && currentQuestionNumber !== null) {
            answerLetter = answerKeyMap.get(currentQuestionNumber) || null
          }
          fields.push(createFieldFromQuestion(currentQuestion, currentOptions, answerLetter))
          detectedAnswerLetter = null
          
          // Extract question number from new question
          const numberMatch = line.match(/^(\d+)[.)]/)
          if (numberMatch) {
            currentQuestionNumber = parseInt(numberMatch[1])
          } else {
            currentQuestionNumber = null
          }
          
          currentQuestion = line.replace(/^\d+[.)]\s*/, '').replace(/^Q\d+[.:]\s*/i, '').trim()
          currentOptions = []
          hadOptions = false
        } else {
          // Continue current question text (only if we haven't seen options yet, or if it's clearly continuation)
          if (!hadOptions || line.length > 20) {
            currentQuestion += ' ' + line
          } else {
            // After options, if we see a short line that looks like a new question number, treat it as new question
            if (line.match(/^\d+[.)]/)) {
              // Use detected answer letter or check answer key map
              let answerLetter = detectedAnswerLetter
              if (!answerLetter && currentQuestionNumber !== null) {
                answerLetter = answerKeyMap.get(currentQuestionNumber) || null
              }
              fields.push(createFieldFromQuestion(currentQuestion, currentOptions, answerLetter))
              detectedAnswerLetter = null
              
              const numberMatch = line.match(/^(\d+)[.)]/)
              if (numberMatch) {
                currentQuestionNumber = parseInt(numberMatch[1])
              } else {
                currentQuestionNumber = null
              }
              
              currentQuestion = line.replace(/^\d+[.)]\s*/, '').trim()
              currentOptions = []
              hadOptions = false
            }
          }
        }
      }
    }
  }

  // Don't forget the last question
  if (currentQuestion) {
    // Use detected answer letter or check answer key map
    let answerLetter = detectedAnswerLetter
    if (!answerLetter && currentQuestionNumber !== null) {
      answerLetter = answerKeyMap.get(currentQuestionNumber) || null
    }
    fields.push(createFieldFromQuestion(currentQuestion, currentOptions, answerLetter))
  }
  
  // Final pass: If we found answers in the answer key section, update fields that don't have answers yet
  // Use field order as question numbers (1-based) for fields without explicit question numbers
  if (answerKeyMap.size > 0) {
    fields.forEach((field, index) => {
      if (!field.correctAnswers || field.correctAnswers.length === 0) {
        const questionNum = index + 1
        const answerLetter = answerKeyMap.get(questionNum)
        if (answerLetter && field.options && field.options.length > 0) {
          const correctOption = mapLetterToOption(answerLetter, field.options)
          if (correctOption) {
            field.correctAnswers = [correctOption]
          }
        }
      }
    })
  }

  // If we found fewer questions than expected, try alternative parsing
  // Look for all numbered lines that might be questions
  if (fields.length < 5) {
    // Try a more aggressive approach: find all numbered items
    const numberedLines: Array<{ number: number; text: string; index: number }> = []
    
    lines.forEach((line, index) => {
      const match = line.match(/^(\d+)[.)]\s*(.+)/)
      if (match) {
        numberedLines.push({
          number: parseInt(match[1]),
          text: match[2].trim(),
          index
        })
      }
    })
    
    // If we found many numbered items but few fields, try parsing them
    if (numberedLines.length > fields.length && numberedLines.length >= 5) {
      fields = [] // Reset and try again
      let questionText = ''
      let options: string[] = []
      let lastNumber = 0
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const numberMatch = line.match(/^(\d+)[.)]\s*(.+)/)
        const isOption = line.match(/^[-*•]\s+/) || 
                         line.match(/^[a-zA-Z][.)]\s+/) ||
                         line.match(/^[a-zA-Z]\)\s+/)
        
        if (numberMatch && !isOption) {
          const num = parseInt(numberMatch[1])
          
          // If we have a previous question, save it
          if (questionText) {
            // Check answer key map for this question number
            const answerLetter = answerKeyMap.get(lastNumber) || null
            fields.push(createFieldFromQuestion(questionText, options, answerLetter))
          }
          
          // Start new question
          questionText = numberMatch[2].trim()
          options = []
          lastNumber = num
        } else if (isOption && questionText) {
          // This is an option
          let option = line
            .replace(/^[-*•]\s+/, '')
            .replace(/^[a-zA-Z][.)]\s+/, '')
            .replace(/^[a-zA-Z]\)\s+/, '')
            .trim()
          if (option) {
            options.push(option)
          }
        } else if (questionText && line.length > 0 && !isOption && !line.match(/^\d+[.)]/)) {
          // Check for answer pattern after options
          if (options.length > 0) {
            const answerLetter = detectAnswerPattern(line)
            if (answerLetter) {
              // Store answer for current question (will be applied when saving)
              if (lastNumber > 0) {
                answerKeyMap.set(lastNumber, answerLetter)
              }
              continue
            }
          }
          // Continue question text
          questionText += ' ' + line
        }
      }
      
      // Add last question
      if (questionText) {
        const answerLetter = answerKeyMap.get(lastNumber) || null
        fields.push(createFieldFromQuestion(questionText, options, answerLetter))
      }
    }
  }
  
  // If still no questions found, try alternative parsing
  if (fields.length === 0) {
    // Try to find numbered items
    let questionText = ''
    let options: string[] = []
    
    for (const line of lines) {
      // Check for numbered items (1., 2., etc.)
      if (line.match(/^\d+[.)]\s+/)) {
        if (questionText && options.length === 0) {
          // Previous numbered item was a question without options
          fields.push({
            id: uuidv4(),
            type: 'text',
            label: questionText.replace(/^\d+[.)]\s*/, ''),
            required: false,
          })
        }
        questionText = line
        options = []
      } else if (line.match(/^[a-zA-Z][.)]\s+/) && questionText) {
        // This is an option
        options.push(line.replace(/^[a-zA-Z][.)]\s+/, '').trim())
      } else if (questionText && line.length > 0 && !line.match(/^[a-zA-Z][.)]\s+/)) {
        // Continue question text
        questionText += ' ' + line
      }
    }
    
    // Add last question
    if (questionText) {
      if (options.length > 0) {
        // Try to extract question number for answer key lookup
        const numberMatch = questionText.match(/^(\d+)[.)]/)
        let answerLetter: string | null = null
        if (numberMatch) {
          const questionNum = parseInt(numberMatch[1])
          answerLetter = answerKeyMap.get(questionNum) || null
        }
        fields.push(createFieldFromQuestion(questionText.replace(/^\d+[.)]\s*/, ''), options, answerLetter))
      } else {
        fields.push({
          id: uuidv4(),
          type: 'text',
          label: questionText.replace(/^\d+[.)]\s*/, ''),
          required: false,
        })
      }
    }
  }

  // If still no fields, create a text field for each non-empty line
  if (fields.length === 0) {
    lines.forEach(line => {
      if (line.length > 3) {
        fields.push({
          id: uuidv4(),
          type: 'text',
          label: line,
          required: false,
        })
      }
    })
  }

  // #region agent log
  agentDebugIngestJson({
    location: 'lib/wordParser.ts:parseQuestionsFromPlainText',
    message: 'Parsed questions from plain text',
    data: {
      totalLines: lines.length,
      totalFields: fields.length,
      sampleLabels: fields.slice(0, 5).map(f => f.label),
    },
    hypothesisId: 'Q1',
    runId: 'pre-fix',
  })
  // #endregion

  return fields
}

// Word-specific wrapper: file -> text -> questions
export async function parseWordDocument(file: File): Promise<FormField[]> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  const text = result.value
  return parseQuestionsFromPlainText(text)
}

// PDF text extraction using pdfjs
async function extractPdfText(file: File): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('PDF parsing is only available in the browser')
  }

  const pdfjsLib = await import('pdfjs-dist')
  const pdfjsAny = pdfjsLib as any

  if (pdfjsAny?.GlobalWorkerOptions) {
    pdfjsAny.GlobalWorkerOptions.workerSrc =
      `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsAny.version || '3.11.174'}/pdf.worker.min.js`
  }

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsAny.getDocument({ data: arrayBuffer }).promise
  let text = ''

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    const pageText = (content.items as any[])
      .map(item => ('str' in item ? (item as any).str : ''))
      .join(' ')
    text += '\n' + pageText
  }

  return text
}

export async function parsePdfDocument(file: File): Promise<FormField[]> {
  const text = await extractPdfText(file)
  if (!text || text.trim().length === 0) {
    throw new Error('Empty text extracted from PDF')
  }
  return parseQuestionsFromPlainText(text)
}

// Unified entry: choose parser based on extension / MIME
export async function parseDocument(file: File): Promise<FormField[]> {
  const lower = file.name.toLowerCase()
  if (file.type === 'application/pdf' || lower.endsWith('.pdf')) {
    return parsePdfDocument(file)
  }
  // Default to Word
  return parseWordDocument(file)
}

// Parse a standalone Word answer-key document into { questionNumber: letter }
export async function parseAnswerKeyFromWord(file: File): Promise<Record<number, string>> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  const text = result.value
  const map: Record<number, string> = {}

  // Try to focus on the ANSWERS section if present
  const lower = text.toLowerCase()
  let section = text
  const headingMatch = lower.match(/(answers?|answer\s+key)\s*:/i)
  if (headingMatch) {
    const idx = lower.indexOf(headingMatch[0])
    if (idx >= 0) {
      section = text.slice(idx + headingMatch[0].length)
    }
  }

  // First pass: capture all explicit "number + letter" pairs.
  // Supports:
  // "1. A, 2. C, 3. B"   (comma‑separated)
  // "1 A 2 C 3 B"        (space‑separated)
  // "1-A 2-C" or "1) A"  (dash / parenthesis)
  const regex = /(\d+)\s*[\.\-\):]?\s*([A-Za-z])/g
  let match: RegExpExecArray | null
  const seenNumbers = new Set<number>()
  while ((match = regex.exec(section)) !== null) {
    const qNum = parseInt(match[1], 10)
    const letter = match[2].toUpperCase()
    map[qNum] = letter
    seenNumbers.add(qNum)
  }

  // Second pass: handle bare letters like your bullets:
  // "• A, 2. A, 3. A, ..." → infer missing numbers by sequence.
  // We walk the section in order and whenever we see a lone letter
  // that is NOT part of an already‑matched "number + letter", we
  // assign it to the next question number after the last one we saw.
  let lastNumber = 0

  const tokens = section.split(/[\s,]+/).filter(t => t.length > 0)
  for (const token of tokens) {
    const numMatch = token.match(/^(\d+)/)
    const letterMatch = token.match(/^[A-Za-z]$/)

    if (numMatch) {
      // Explicit number token, update lastNumber
      lastNumber = parseInt(numMatch[1], 10)
    } else if (letterMatch) {
      const letter = letterMatch[0].toUpperCase()
      // Only infer if this number doesn't already exist
      const inferredNumber = lastNumber + 1
      if (!map[inferredNumber]) {
        map[inferredNumber] = letter
        lastNumber = inferredNumber
      }
    }
  }
  // #region agent log
  agentDebugIngestJson({
    location: 'lib/wordParser.ts:parseAnswerKeyFromWord',
    message: 'Answer key parsed from Word file',
    data: {
      totalEntries: Object.keys(map).length,
      sample: Object.entries(map).slice(0, 5),
    },
    hypothesisId: 'H1',
    runId: 'pre-fix',
  })
  // #endregion
  return map
}

function createFieldFromQuestion(question: string, options: string[], correctAnswerLetter?: string | null): FormField {
  const id = uuidv4()
  
  // Determine field type based on question and options
  // Default to radio for objective questions (A, B, C, D pattern)
  let type: FieldType = 'text'
  
  if (options.length > 0) {
    // If it has exactly 4 options, it's likely A, B, C, D - use radio
    if (options.length === 4) {
      type = 'radio'
    } else if (question.toLowerCase().includes('select') || question.toLowerCase().includes('choose')) {
      type = 'select'
    } else if (question.toLowerCase().includes('multiple') || question.toLowerCase().includes('check')) {
      type = 'checkbox'
    } else {
      // Default to radio for objective questions
      type = 'radio'
    }
  } else if (question.toLowerCase().includes('email')) {
    type = 'email'
  } else if (question.toLowerCase().includes('date')) {
    type = 'date'
  } else if (question.toLowerCase().includes('number') || question.toLowerCase().includes('age')) {
    type = 'number'
  } else if (question.length > 100) {
    type = 'textarea'
  }

  // Map correct answer letter to option text if provided
  let correctAnswers: string[] | undefined = undefined
  if (correctAnswerLetter && options.length > 0) {
    const correctOption = mapLetterToOption(correctAnswerLetter, options)
    if (correctOption) {
      correctAnswers = [correctOption]
    }
  }

  return {
    id,
    type,
    label: question,
    required: question.toLowerCase().includes('required') || question.includes('*'),
    options: options.length > 0 ? options : undefined,
    isQuiz: options.length > 0, // Auto-enable quiz mode for questions with options
    points: options.length > 0 ? 1 : undefined, // Default 1 point for quiz questions
    correctAnswers, // Set correct answers if detected
  }
}
