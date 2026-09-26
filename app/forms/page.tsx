import { redirect } from 'next/navigation'

// The exam list now lives on Prepare Exams
export default function FormsPage() {
  redirect('/prepare')
}
