export function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse" aria-hidden="true">
      {/* Avatar skeleton */}
      <div className="flex flex-col items-center gap-4 mb-8">
        <div className="w-24 h-24 rounded-full bg-gray-200" />
        <div className="h-6 w-48 bg-gray-200 rounded" />
        <div className="h-4 w-24 bg-gray-200 rounded" />
      </div>

      {/* Countdown skeleton */}
      <div className="flex flex-col items-center gap-2 mb-6">
        <div className="h-12 w-20 bg-gray-200 rounded" />
        <div className="h-4 w-40 bg-gray-200 rounded" />
      </div>

      {/* Bio skeleton */}
      <div className="space-y-2 mb-6">
        <div className="h-4 w-full bg-gray-200 rounded" />
        <div className="h-4 w-3/4 bg-gray-200 rounded" />
      </div>

      {/* Mutual friends skeleton */}
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white" />
          ))}
        </div>
        <div className="h-4 w-32 bg-gray-200 rounded" />
      </div>
    </div>
  );
}
