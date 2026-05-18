'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import {
  AreaChart, Area,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts'

interface StatsData {
  trafficData: { date: string; label: string; clicks: number; pageviews: number; buttonClicks: number }[]
  funnelData: { stage: string; count: number; percentage: number }[]
  eventBreakdown: Record<string, number>
}

const EVENT_LABELS: Record<string, string> = {
  btn_hero_demo: 'Hero Demo',
  btn_pricing_tier: 'Pricing Tier',
  btn_cta_signup: 'CTA Signup',
  btn_nav_contact: 'Nav Contact',
}

export default function AnalyticsCanvas({ affid }: { affid: string }) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/stats?affid=${affid}`)
      .then(res => res.json())
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [affid])

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  const funnelColors = ['#9333ea', '#a855f7', '#c084fc', '#d8b4fe']

  // Event breakdown chart data
  const eventData = Object.entries(stats.eventBreakdown || {}).map(([id, count]) => ({
    name: EVENT_LABELS[id] || id,
    count,
    id,
  }))

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Traffic Area Chart */}
      <Card className="border-purple-100">
        <CardHeader>
          <CardTitle className="text-base">Traffic & Conversions — Last 30 Days</CardTitle>
          <CardDescription>Page views and button clicks over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trafficData}>
                <defs>
                  <linearGradient id="pvGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bcGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                  tickFormatter={(value: string) => {
                    const parts = value.split(' ')
                    return parts[0] || value
                  }}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e9d5ff',
                    boxShadow: '0 2px 8px rgba(147, 51, 234, 0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="pageviews"
                  stroke="#9333ea"
                  strokeWidth={2}
                  fill="url(#pvGradient)"
                  name="Page Views"
                />
                <Area
                  type="monotone"
                  dataKey="buttonClicks"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fill="url(#bcGradient)"
                  name="Button Clicks"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card className="border-purple-100">
        <CardHeader>
          <CardTitle className="text-base">Conversion Funnel</CardTitle>
          <CardDescription>From traffic to paid signups</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.funnelData}
                layout="vertical"
                margin={{ left: 20, right: 20, top: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  dataKey="stage"
                  type="category"
                  tick={{ fontSize: 12 }}
                  width={110}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e9d5ff',
                    boxShadow: '0 2px 8px rgba(147, 51, 234, 0.1)',
                  }}
                  formatter={(value: number, _name: string, props: { payload: { percentage: number } }) => [
                    `${value} (${props.payload.percentage}%)`,
                    'Count',
                  ]}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={32}>
                  {stats.funnelData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={funnelColors[index % funnelColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Funnel stats below chart */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {stats.funnelData.map((stage, i) => (
              <div key={stage.stage} className="text-center">
                <div className="text-xs font-medium text-gray-500">{stage.stage}</div>
                <div className="text-lg font-bold" style={{ color: funnelColors[i] }}>
                  {stage.count.toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">{stage.percentage}%</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Event Breakdown */}
      {eventData.length > 0 && (
        <Card className="border-purple-100 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Button Click Events</CardTitle>
            <CardDescription>Which CTAs are getting clicked on your referral links</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e9d5ff',
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                    {eventData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={funnelColors[index % funnelColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
