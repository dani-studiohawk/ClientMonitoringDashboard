'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

export default function ReportsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Reports page error:', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="p-8 max-w-md">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-300" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Error Loading Reports
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {error.message || 'Something went wrong while loading the reports page.'}
          </p>
          <Button onClick={reset} className="mt-4">
            Try Again
          </Button>
        </div>
      </Card>
    </div>
  )
}
