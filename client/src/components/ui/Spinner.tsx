interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; className?: string; }

export default function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size];
  return (
    <div className={`${s} animate-spin rounded-full border-2 border-gray-200 border-t-blue-600 ${className}`} />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-64">
      <Spinner size="lg" />
    </div>
  );
}
