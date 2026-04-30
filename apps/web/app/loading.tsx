export default function GlobalLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen" role="status" aria-label="Carregando...">
      <div className="animate-pulse space-y-4 w-full max-w-md p-8">
        <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-4/5" />
      </div>
      <span className="sr-only">Carregando...</span>
    </div>
  );
}
