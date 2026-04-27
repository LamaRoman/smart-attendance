'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, XCircle } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

export default function ShortCheckinPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!slug) return

    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/attendance/org-slug/${slug}`)
        if (!res.ok) {
          setError(true)
          return
        }
        const data = await res.json()
        if (data.data?.id) {
          router.replace(`/checkin?org=${data.data.id}`)
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      }
    })()
  }, [slug, router])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-pink-50 p-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-md">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="mb-2 text-xl font-bold text-gray-900">Organization Not Found</h1>
          <p className="text-sm text-gray-500">
            This check-in link is invalid. Please contact your organization admin for the correct
            link.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-slate-400" />
        <p className="text-sm text-slate-500">Redirecting to check-in...</p>
      </div>
    </div>
  )
}
