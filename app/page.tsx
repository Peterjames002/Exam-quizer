import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Camera,
  ChevronDown,
  Clock,
  FileText,
  NotebookPen,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

const FEATURES = [
  {
    icon: FileText,
    color: 'bg-green-100 text-green-700',
    title: 'Import from Word or PDF',
    body: 'Upload one document with your questions and answers. Objective and essay questions are built for you — no retyping.',
  },
  {
    icon: Sparkles,
    color: 'bg-blue-100 text-blue-700',
    title: 'Smart essay marking',
    body: 'Give each essay a few keywords. Answers are marked by how many appear — close word forms and small spelling slips still count.',
  },
  {
    icon: Clock,
    color: 'bg-amber-100 text-amber-700',
    title: 'Time-limited links',
    body: 'A shared exam link stays open for 5 minutes. Students who don’t start in time are locked out; you can reopen it anytime.',
  },
  {
    icon: Camera,
    color: 'bg-purple-100 text-purple-700',
    title: 'Camera monitoring',
    body: 'The webcam turns on during the exam and photos are taken at random moments, so you can see who is writing.',
  },
  {
    icon: ShieldCheck,
    color: 'bg-red-100 text-red-700',
    title: 'Anti-cheating built in',
    body: 'No copying questions or pasting answers, and leaving the exam tab submits it. Scores are calculated on the server.',
  },
  {
    icon: BarChart3,
    color: 'bg-teal-100 text-teal-700',
    title: 'Results in one place',
    body: 'See each student by name and matric number, review flags, adjust marks and export everything to CSV.',
  },
]

const STEPS = [
  { title: 'Prepare', body: 'Upload a Word/PDF document or write questions in the builder.' },
  { title: 'Share', body: 'Copy the exam link and send it to your students — they don’t need an account.' },
  { title: 'Review', body: 'Scores come in automatically. Check essays, photos and flags, then export.' },
]

const FAQS = [
  {
    q: 'Do students need an account?',
    a: 'No. Students open the link, enter their full name and matriculation number, and start. Only tutors sign in.',
  },
  {
    q: 'Why does my exam link say it has expired?',
    a: 'Links stay open for 5 minutes after you copy them, so everyone starts together. Copy the link again from Prepare Exams to reopen it for another 5 minutes.',
  },
  {
    q: 'How are essays marked?',
    a: 'If you give an essay question keywords, it is marked by the share of keywords the student uses — “evaporate” also matches “evaporation”. Without keywords you mark it yourself. You can change any mark afterwards.',
  },
  {
    q: 'Do students see their score?',
    a: 'No. Students only see that their exam was submitted. You decide when and how to share results.',
  },
  {
    q: 'Why does the browser ask for camera permission?',
    a: 'Every browser requires a student to allow camera access once — no website can switch a camera on silently. After they allow it, the browser remembers the choice for future exams. If the camera is blocked, the exam still runs and the response is flagged for you.',
  },
  {
    q: 'How do I put answers in my Word document?',
    a: 'Write “Answer: B” under an objective question, and “Keywords: …” (optionally “Points: 10”) under an essay question. The upload page has a full example.',
  },
]

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-gray-50">
        <div className="max-w-6xl mx-auto px-4 pt-14 pb-16 sm:pt-20 sm:pb-24 text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mb-6">
            <NotebookPen className="w-4 h-4" />
            Online exams for schools and universities
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 text-balance">
            Set, share and mark exams — <span className="text-blue-600">in minutes</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-gray-600 text-balance">
            Turn a Word document into an online exam, share a link that expires, and let the system mark objective
            and essay answers for you.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/prepare"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg transition-colors"
            >
              Prepare Exams
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="#how"
              className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3 rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 font-semibold text-lg"
            >
              How it works
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-gray-900 text-center">Everything an exam needs</h2>
        <p className="mt-3 text-gray-600 text-center max-w-2xl mx-auto">
          Built with tutors and exam officers in mind — fair for students, fast for you.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className={`inline-flex items-center justify-center w-11 h-11 rounded-lg ${f.color}`}>
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-white border-y border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center">How it works</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="text-center">
                <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-blue-600 text-white font-bold text-lg">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{s.title}</h3>
                <p className="mt-2 text-gray-600 max-w-xs mx-auto">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* About */}
      <section id="about" className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">About Exam Builder</h2>
            <p className="mt-4 text-gray-600 leading-relaxed">
              Exam Builder helps tutors run fair exams online without the paperwork. Prepare questions the way you
              already do — in a Word document — and the app turns them into an exam students can take on any phone or
              laptop.
            </p>
            <p className="mt-4 text-gray-600 leading-relaxed">
              Marking happens automatically: objective answers instantly, and essays by the keywords you choose.
              Monitoring features like expiring links, camera photos and paste blocking keep results trustworthy.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <dl className="grid grid-cols-2 gap-6 text-center">
              <div>
                <dt className="text-sm text-gray-500">Question types</dt>
                <dd className="mt-1 text-2xl font-bold text-gray-900">Objective &amp; essay</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Link window</dt>
                <dd className="mt-1 text-2xl font-bold text-gray-900">5 minutes</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Student sign-up</dt>
                <dd className="mt-1 text-2xl font-bold text-gray-900">Not needed</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Results export</dt>
                <dd className="mt-1 text-2xl font-bold text-gray-900">CSV</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-white border-y border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center">Frequently asked questions</h2>
          <div className="mt-10 divide-y divide-gray-200 border-y border-gray-200">
            {FAQS.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-medium text-gray-900">
                  {f.q}
                  <ChevronDown className="w-5 h-5 shrink-0 text-gray-500 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-gray-600 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold text-gray-900">Ready to set your next exam?</h2>
        <p className="mt-3 text-gray-600">Sign in and have your first exam ready to share in minutes.</p>
        <Link
          href="/prepare"
          className="mt-6 inline-flex items-center gap-2 px-7 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg"
        >
          Prepare Exams
          <ArrowRight className="w-5 h-5" />
        </Link>
      </section>
    </div>
  )
}
