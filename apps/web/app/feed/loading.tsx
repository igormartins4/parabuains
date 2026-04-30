export default function FeedLoading() {
  return (
    <div className="space-y-4 p-4 max-w-2xl mx-auto" role="status" aria-label="Carregando feed de aniversários...">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse flex items-center gap-4 p-4 rounded-lg bg-white shadow-sm"
        >
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />
          {/* Content */}
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
          {/* Badge de data */}
          <div className="w-16 h-8 bg-gray-200 rounded-full flex-shrink-0" />
        </div>
      ))}
      <span className="sr-only">Carregando...</span>
    </div>
  );
}
