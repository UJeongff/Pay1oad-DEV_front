import { redirect } from 'next/navigation'

// 서버에서 바로 넘긴다 (클라이언트에서 넘기면 빈 화면이 잠깐 보였다)
export default function AdminPage() {
  redirect('/admin/users')
}
