'use client'

import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'

export function MetricCard({
  label,
  rooftops,
  companies,
  trend,
}: {
  label: string
  rooftops: number
  companies?: number
  trend?: number
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            {label}
          </p>
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-3xl font-bold text-white">
                {rooftops.toLocaleString()}
              </p>
              {companies && (
                <p className="text-sm text-gray-400 mt-1">
                  {companies.toLocaleString()} companies
                </p>
              )}
            </div>
            {trend && (
              <div className="flex items-center gap-1 text-green-500 text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>{trend}%</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
