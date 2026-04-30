export default function FriendsLoading() {
  return (
    <div
      className="space-y-3 p-4 max-w-2xl mx-auto"
      role="status"
      aria-label="Carregando lista de amigos..."
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list — order never changes
          key={i}
          className="animate-pulse flex items-center gap-3 p-3 rounded-lg bg-white shadow-sm"
        >
          <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 bg-gray-200 rounded w-2/3" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
          </div>
          <div className="w-20 h-8 bg-gray-200 rounded flex-shrink-0" />
        </div>
      ))}
      <span className="sr-only">Carregando...</span>
    </div>
  );
}
