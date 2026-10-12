import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

// Redirect to main dashboard with DPR filter
// DPR reports have been moved to the personalized dashboard
export default async function DprLeadReportPage({ params }: PageProps) {
  const { id } = await params
  redirect(`/dashboard?dpr=${id}`)
}