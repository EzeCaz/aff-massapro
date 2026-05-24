'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Eye, Target, FileText, Phone, Users, TrendingUp, TrendingDown, MousePointerClick, FormInput, CalendarIcon, Filter, X } from 'lucide-react'
import { format, subDays } from 'date-fns'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

interface AdminStats {
  totalTraffic: number
  uniqueVisitors: number
  totalReferrals: number
  bookedCalls: number
  payingCustomers: number
  activeAffiliates: number
  affiliateTraffic: number
  blendedRate: number
  bookingRate: number
  eventBreakdown: Record<string, number>
  trafficSources: Record<string, number>
  trafficByAffid: Record<string, number>
  leadFormOpens: number
  leadFormCtaClicks: number
  leadFormSubmitRate: number
  ctaToFormRate: number
  trendData: { thisWeek: number; lastWeek: number; change: number }
  filters?: {
    utmSources: string[]
    utmMediums: string[]
    utmCampaigns: string[]
    affids: { affid: string; name: string }[]
  }
  dateRange?: {
    from: string
    to: string
  }
}

const EVENT_LABELS: Record<string, string> = {
  btn_hero_demo: 'Hero Demo',
  btn_pricing_tier: 'Pricing Tier',
  btn_cta_signup: 'CTA Signup',
  btn_nav_contact: 'Nav Contact',
  lead_form_open: 'Lead Form Open',
  btn_buy_basic: 'Buy Basic',
  btn_buy_pro: 'Buy Professional',
  btn_buy_enterprise: 'Buy Enterprise',
}

const PIE_COLORS = ['#9333ea', '#a855f7', '#c084fc', '#7c3aed', '#d8b4fe', '#6b21a8']

export default function AnalyticsOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Date range state - default last 30 days
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [fromOpen, setFromOpen] = useState(false)
  const [toOpen, setToOpen] = useState(false)

  // Filter state
  const [filterAffid, setFilterAffid] = useState<string>('')
  const [filterUtmSource, setFilterUtmSource] = useState<string>('')
  const [filterUtmMedium, setFilterUtmMedium] = useState<string>('')
  const [filterUtmCampaign, setFilterUtmCampaign] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  const fetchStats = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ mode: 'admin' })
    if (dateFrom) params.set('from', format(dateFrom, 'yyyy-MM-dd'))
    if (dateTo) params.set('to', format(dateTo, 'yyyy-MM-dd'))
    if (filterAffid && filterAffid !== 'all') params.set('filter_affid', filterAffid)
    if (filterUtmSource && filterUtmSource !== 'all') params.set('filter_utm_source', filterUtmSource)
    if (filterUtmMedium && filterUtmMedium !== 'all') params.set('filter_utm_medium', filterUtmMedium)
    if (filterUtmCampaign && filterUtmCampaign !== 'all') params.set('filter_utm_campaign', filterUtmCampaign)

    fetch(`/api/stats?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [dateFrom, dateTo, filterAffid, filterUtmSource, filterUtmMedium, filterUtmCampaign])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const resetFilters = () => {
    setDateFrom(undefined)
    setDateTo(undefined)
    setFilterAffid('')
    setFilterUtmSource('')
    setFilterUtmMedium('')
    setFilterUtmCampaign('')
  }

  const hasActiveFilters = filterAffid || filterUtmSource || filterUtmMedium || filterUtmCampaign || dateFrom || dateTo

  const formatNumber = (n: number) => n.toLocaleString('en-US')

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  const trendIcon = stats.trendData.change >= 0 ? TrendingUp : TrendingDown
  const TrendIcon = trendIcon

  // Event breakdown chart data
  const eventData = Object.entries(stats.eventBreakdown).map(([id, count]) => ({
    name: EVENT_LABELS[id] || id,
    count,
    id,
  }))

  // Traffic sources pie data
  const sourceData = Object.entries(stats.trafficSources)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }))

  // Affid pie data
  const affidData = Object.entries(stats.trafficByAffid)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }))

  // Available filter options from API response
  const availableSources = stats.filters?.utmSources || []
  const availableMediums = stats.filters?.utmMediums || []
  const availableCampaigns = stats.filters?.utmCampaigns || []
  const availableAffids = stats.filters?.affids || []

  const kpis = [
    {
      label: 'Total Traffic',
      value: formatNumber(stats.totalTraffic),
      sub: `${formatNumber(stats.uniqueVisitors)} unique`,
      icon: Eye,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    {
      label: 'CTA → Lead Form Clicks',
      value: formatNumber(stats.leadFormCtaClicks),
      sub: stats.ctaToFormRate > 0 ? `${stats.ctaToFormRate}% opened form` : 'Clicks on lead form CTAs',
      icon: MousePointerClick,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100',
    },
    {
      label: 'Lead Forms Opened',
      value: formatNumber(stats.leadFormOpens),
      sub: stats.leadFormSubmitRate > 0 ? `${stats.leadFormSubmitRate}% submitted` : 'Form open events',
      icon: FormInput,
      color: 'text-cyan-600',
      bg: 'bg-cyan-100',
    },
    {
      label: 'Lead Forms Sent',
      value: formatNumber(stats.totalReferrals),
      sub: `${stats.bookedCalls} booked calls`,
      icon: FileText,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      label: 'Conversion Rate',
      value: `${stats.blendedRate}%`,
      sub: 'Visitors → Leads',
      icon: Target,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      label: 'Booking Rate',
      value: `${stats.bookingRate}%`,
      sub: 'Leads → Booked',
      icon: Phone,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
    },
    {
      label: 'Active Affiliates',
      value: formatNumber(stats.activeAffiliates),
      sub: `${formatNumber(stats.affiliateTraffic)} clicks driven`,
      icon: Users,
      color: 'text-purple-700',
      bg: 'bg-purple-100',
    },
    {
      label: 'Week-over-Week',
      value: `${stats.trendData.change >= 0 ? '+' : ''}${stats.trendData.change}%`,
      sub: `${stats.trendData.thisWeek} this week`,
      icon: TrendIcon,
      color: stats.trendData.change >= 0 ? 'text-green-600' : 'text-red-600',
      bg: stats.trendData.change >= 0 ? 'bg-green-100' : 'bg-red-100',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics Command Center</h1>
        <p className="text-sm text-gray-500">Real-time overview of your affiliate program performance</p>
      </div>

      {/* Date Range & Filter Controls */}
      <Card className="border-purple-100">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Date From */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">From</span>
              <Popover open={fromOpen} onOpenChange={setFromOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-[140px] justify-start text-left font-normal border-purple-200 hover:border-purple-400"
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-purple-500" />
                    {dateFrom ? format(dateFrom, 'MMM dd, yyyy') : '30 days ago'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={(d) => { setDateFrom(d); setFromOpen(false) }}
                    disabled={(d) => d > new Date() || (dateTo ? d > dateTo : false)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">To</span>
              <Popover open={toOpen} onOpenChange={setToOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-[140px] justify-start text-left font-normal border-purple-200 hover:border-purple-400"
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-purple-500" />
                    {dateTo ? format(dateTo, 'MMM dd, yyyy') : 'Today'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={(d) => { setDateTo(d); setToOpen(false) }}
                    disabled={(d) => d > new Date() || (dateFrom ? d < dateFrom : false)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="h-6 w-px bg-gray-200 hidden sm:block" />

            {/* Quick date presets */}
            <div className="flex gap-1">
              {[
                { label: '7d', days: 7 },
                { label: '30d', days: 30 },
                { label: '90d', days: 90 },
              ].map(preset => (
                <Button
                  key={preset.days}
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50"
                  onClick={() => {
                    setDateFrom(subDays(new Date(), preset.days))
                    setDateTo(new Date())
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <div className="h-6 w-px bg-gray-200 hidden sm:block" />

            {/* Toggle filters */}
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              className={`gap-1.5 ${showFilters ? 'bg-purple-600 hover:bg-purple-700' : 'border-purple-200 text-purple-600 hover:border-purple-400'}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 w-4 h-4 rounded-full bg-white/30 text-[10px] flex items-center justify-center">
                  !
                </span>
              )}
            </Button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-gray-400 hover:text-red-500 gap-1"
                onClick={resetFilters}
              >
                <X className="w-3 h-3" />
                Reset
              </Button>
            )}
          </div>

          {/* Expanded filter row */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-purple-100">
              {/* Affid filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Affiliate</span>
                <Select value={filterAffid} onValueChange={setFilterAffid}>
                  <SelectTrigger className="w-[180px] h-8 text-xs border-purple-200">
                    <SelectValue placeholder="All affiliates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All affiliates</SelectItem>
                    {availableAffids.map(a => (
                      <SelectItem key={a.affid} value={a.affid}>
                        {a.name} ({a.affid})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* UTM Source filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 whitespace-nowrap">UTM Source</span>
                <Select value={filterUtmSource} onValueChange={setFilterUtmSource}>
                  <SelectTrigger className="w-[150px] h-8 text-xs border-purple-200">
                    <SelectValue placeholder="All sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    {availableSources.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* UTM Medium filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 whitespace-nowrap">UTM Medium</span>
                <Select value={filterUtmMedium} onValueChange={setFilterUtmMedium}>
                  <SelectTrigger className="w-[150px] h-8 text-xs border-purple-200">
                    <SelectValue placeholder="All mediums" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All mediums</SelectItem>
                    {availableMediums.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* UTM Campaign filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 whitespace-nowrap">UTM Campaign</span>
                <Select value={filterUtmCampaign} onValueChange={setFilterUtmCampaign}>
                  <SelectTrigger className="w-[180px] h-8 text-xs border-purple-200">
                    <SelectValue placeholder="All campaigns" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All campaigns</SelectItem>
                    {availableCampaigns.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label} className="border-purple-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                </div>
                <div className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</div>
                <div className="text-xs text-gray-500">{kpi.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{kpi.sub}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Lead Form Funnel */}
      <Card className="border-purple-100">
        <CardHeader>
          <CardTitle className="text-base">Lead Form Funnel</CardTitle>
          <CardDescription>From CTA click to form submission</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {[
              { label: 'CTA Clicks', value: stats.leadFormCtaClicks, color: 'bg-indigo-500', pct: 100 },
              { label: 'Form Opens', value: stats.leadFormOpens, color: 'bg-cyan-500', pct: stats.leadFormCtaClicks > 0 ? Math.round((stats.leadFormOpens / stats.leadFormCtaClicks) * 100) : 0 },
              { label: 'Form Sent', value: stats.totalReferrals, color: 'bg-blue-500', pct: stats.leadFormCtaClicks > 0 ? Math.round((stats.totalReferrals / stats.leadFormCtaClicks) * 100) : 0 },
              { label: 'Booked Calls', value: stats.bookedCalls, color: 'bg-green-500', pct: stats.leadFormCtaClicks > 0 ? Math.round((stats.bookedCalls / stats.leadFormCtaClicks) * 100) : 0 },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-center gap-2 flex-1">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-3 h-3 rounded-full ${step.color}`} />
                    <span className="text-xs font-medium text-gray-700">{step.label}</span>
                  </div>
                  <div className="relative h-8 bg-gray-100 rounded-md overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 ${step.color} rounded-md transition-all duration-500`}
                      style={{ width: `${Math.max(step.pct, step.value > 0 ? 8 : 0)}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-800">{formatNumber(step.value)}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {step.pct > 0 ? `${step.pct}% of CTA clicks` : '—'}
                  </div>
                </div>
                {i < arr.length - 1 && (
                  <div className="text-gray-300 text-lg mt-[-1rem]">→</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Event Breakdown Bar Chart */}
        <Card className="border-purple-100">
          <CardHeader>
            <CardTitle className="text-base">Button Click Events</CardTitle>
            <CardDescription>Which CTAs are getting clicked</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {eventData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eventData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e9d5ff',
                        boxShadow: '0 2px 8px rgba(147, 51, 234, 0.1)',
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                      {eventData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <MousePointerClick className="w-10 h-10 mb-2 text-gray-300" />
                  <p className="text-sm font-medium">No button click events yet</p>
                  <p className="text-xs text-gray-300 mt-1">Events will appear here when visitors click CTAs on your site</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Traffic Sources Pie Chart */}
        <Card className="border-purple-100">
          <CardHeader>
            <CardTitle className="text-base">Traffic Sources</CardTitle>
            <CardDescription>Breakdown by UTM Source</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {sourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {sourceData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e9d5ff',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Eye className="w-10 h-10 mb-2 text-gray-300" />
                  <p className="text-sm font-medium">No traffic source data yet</p>
                  <p className="text-xs text-gray-300 mt-1">Sources will appear as traffic is tracked with UTM parameters</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Affid Traffic Distribution */}
      <Card className="border-purple-100">
        <CardHeader>
          <CardTitle className="text-base">Traffic by Affiliate</CardTitle>
          <CardDescription>Which affiliates are driving the most traffic</CardDescription>
        </CardHeader>
        <CardContent>
          {affidData.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {affidData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3 p-3 rounded-lg border border-purple-100 bg-purple-50/30">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  >
                    {item.name.split('-')[1]?.[0] || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.value} clicks</div>
                  </div>
                  <div className="text-sm font-bold text-purple-600">
                    {stats.totalTraffic > 0 ? Math.round((item.value / stats.totalTraffic) * 100) : 0}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-gray-400">
              <Users className="w-10 h-10 mb-2 text-gray-300" />
              <p className="text-sm font-medium">No affiliate traffic yet</p>
              <p className="text-xs text-gray-300 mt-1">Traffic distribution will appear as affiliates drive visitors</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
