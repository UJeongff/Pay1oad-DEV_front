import { notFound } from 'next/navigation'
import { isNumericId } from '@/app/lib/isNumericId'

/** 숫자가 아닌 assignmentId 는 API 경로에 끼워 넣지 않고 바로 404 로 보낸다 */
export default async function AssignmentIdLayout({ children, params }: { children: React.ReactNode; params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params
  if (!isNumericId(assignmentId)) notFound()
  return children
}
