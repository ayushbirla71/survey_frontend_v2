import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  }

  return (
    <div className={cn("animate-spin rounded-full border-2 border-slate-300 border-t-violet-600", sizeClasses[size], className)} />
  )
}

interface LoadingCardProps {
  title?: string
  description?: string
  className?: string
}

export function LoadingCard({ title = "Loading...", description, className }: LoadingCardProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
      <LoadingSpinner size="lg" className="mb-4" />
      <h3 className="text-lg font-medium text-slate-800 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-slate-600">{description}</p>
      )}
    </div>
  )
}

interface LoadingStateProps {
  children: React.ReactNode
  loading: boolean
  error?: string | null
  fallback?: React.ReactNode
  errorFallback?: React.ReactNode
}

export function LoadingState({ 
  children, 
  loading, 
  error, 
  fallback,
  errorFallback 
}: LoadingStateProps) {
  if (loading) {
    return fallback || <LoadingCard />
  }

  if (error) {
    return errorFallback || (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-800 mb-2">Something went wrong</h3>
        <p className="text-sm text-slate-600">{error}</p>
      </div>
    )
  }

  return <>{children}</>
}
