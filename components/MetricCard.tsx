export function MetricCard({
  label,
  rooftops,
  companies,
}: {
  label: string
  rooftops: number
  companies?: number
}) {
  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-600 p-4 rounded-lg shadow-md hover:shadow-lg hover:border-gray-500 transition-all">
      <div className="text-3xl font-black mb-2 text-white">{rooftops.toLocaleString()}</div>
      {companies && (
        <div className="text-xs text-gray-300 mb-2 font-medium">
          {companies.toLocaleString()} companies
        </div>
      )}
      <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{label}</div>
    </div>
  )
}
