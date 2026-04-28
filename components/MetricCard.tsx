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
    <div className="border border-gray-700 p-3">
      <div className="text-2xl font-bold mb-1">{rooftops.toLocaleString()}</div>
      {companies && (
        <div className="text-xs text-gray-400 mb-2">
          {companies.toLocaleString()} companies
        </div>
      )}
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  )
}
