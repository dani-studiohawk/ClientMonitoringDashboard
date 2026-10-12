/** Shown to signed-in staff who are neither an admin nor a DPR lead. */
export function NoAccess({ name }: { name: string }) {
  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome, {name}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          You don&apos;t have access to any reports yet. Please contact an administrator.
        </p>
      </div>
    </div>
  )
}
