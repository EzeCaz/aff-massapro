'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, Eye, Target, FileText, Phone, Users, TrendingUp, TrendingDown, MousePointerClick, FormInput, CalendarIcon, Filter, X, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { format, subDays, parseISO, isValid } from 'date-fns'
import type { DateRange } from 'react-day-picker'

interface AdminStats {
  totalTraffic: number
  uniqueVisitors: number
  totalReferrals: number
  bookedCalls: number  // Attendees + Won (moved past lead stage)
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
}

interface FilterState {
  dateFrom: Date | undefined
  dateTo: Date | undefined
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmTerm: string
  utmContent: string
  affid: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  withTests: boolean
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

const PIE_COLORS = ['#9333ea', '#a855f7', '#c084fc', '#7c3aed', '#d8b4fe', '#6b21a8', '#e879f9', '#6d28d9']

const QUICK_RANGES = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
]

export default function AnalyticsOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [availableUtmSources, setAvailableUtmSources] = useState<string[]>([])
  const [availableUtmMediums, setAvailableUtmMediums] = useState<string[]>([])
  const [availableUtmCampaigns, setAvailableUtmCampaigns] = useState<string[]>([])
  const [availableAffids, setAvailableAffids] = useState<string[]>([])

  const [filters, setFilters] = useState<FilterState>({
    dateFrom: subDays(new Date(), 30),
    dateTo: new Date(),
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    utmTerm: '',
    utmContent: '',
    affid: '',
    sortBy: 'date',
    sortOrder: 'desc',
    withTests: true,
  })

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams()
    params.set('mode', 'admin')
    if (filters.dateFrom) params.set('dateFrom', format(filters.dateFrom, 'yyyy-MM-dd'))
    if (filters.dateTo) params.set('dateTo', format(filters.dateTo, 'yyyy-MM-dd'))
    if (filters.utmSource) params.set('utmSource', filters.utmSource)
    if (filters.utmMedium) params.set('utmMedium', filters.utmMedium)
    if (filters.utmCampaign) params.set('utmCampaign', filters.utmCampaign)
    if (filters.utmTerm) params.set('utmTerm', filters.utmTerm)
    if (filters.utmContent) params.set('utmContent', filters.utmContent)
    if (filters.affid) params.set('affid', filters.affid)
    if (!filters.withTests) params.set('withTests', 'false')
    return params.toString()
  }, [filters])

  // Fetch filter options (available UTM values and affid values)
  useEffect(() => {
    fetch('/api/stats?mode=filters')
      .then(res => res.json())
      .then(data => {
        if (data.utmSources) setAvailableUtmSources(data.utmSources)
        if (data.utmMediums) setAvailableUtmMediums(data.utmMediums)
        if (data.utmCampaigns) setAvailableUtmCampaigns(data.utmCampaigns)
        if (data.affids) setAvailableAffids(data.affids)
      })
      .catch(() => {})
  }, [])

  // Fetch stats when filters change
  useEffect(() => {
    setLoading(true)
    const qs = buildQueryString()
    fetch(`/api/stats?${qs}`)
      .then(res => res.json())
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [buildQueryString])

  const formatNumber = (n: number) => n.toLocaleString('en-US')

  const resetFilters = () => {
    setFilters({
      dateFrom: subDays(new Date(), 30),
      dateTo: new Date(),
      utmSource: '',
      utmMedium: '',
      utmCampaign: '',
      utmTerm: '',
      utmContent: '',
      affid: '',
      sortBy: 'date',
      sortOrder: 'desc',
      withTests: true,
    })
  }

  const setQuickRange = (days: number) => {
    setFilters(prev => ({
      ...prev,
      dateFrom: subDays(new Date(), days - 1),
      dateTo: new Date(),
    }))
  }

  const activeFilterCount = [
    filters.utmSource,
    filters.utmMedium,
    filters.utmCampaign,
    filters.utmTerm,
    filters.utmContent,
    filters.affid,
  ].filter(Boolean).length

  const dateRange: DateRange = {
    from: filters.dateFrom,
    to: filters.dateTo,
  }

  const dateLabel = filters.dateFrom && filters.dateTo
    ? `${format(filters.dateFrom, 'MMM dd')} — ${format(filters.dateTo, 'MMM dd, yyyy')}`
    : 'Pick a date range'

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  const trendIcon = stats.trendData.change >= 0 ? TrendingUp : TrendingDown
  const TrendIcon = trendIcon

  // Event breakdown chart data with sort
  let eventData = Object.entries(stats.eventBreakdown).map(([id, count]) => ({
    name: EVENT_LABELS[id] || id,
    count,
    id,
  }))
  if (filters.sortBy === 'count') {
    eventData.sort((a, b) => filters.sortOrder === 'desc' ? b.count - a.count : a.count - b.count)
  }

  // Traffic sources pie data
  let sourceData = Object.entries(stats.trafficSources)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }))

  if (filters.sortBy === 'count') {
    sourceData.sort((a, b) => filters.sortOrder === 'desc' ? b.value - a.value : a.value - b.value)
  }

  // Affid pie data
  let affidData = Object.entries(stats.trafficByAffid)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }))

  if (filters.sortBy === 'count') {
    affidData.sort((a, b) => filters.sortOrder === 'desc' ? b.value - a.value : a.value - b.value)
  }

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
      sub: `${stats.bookedCalls} advanced`,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Command Center</h1>
          <p className="text-sm text-gray-500">Real-time overview of your affiliate program performance</p>
        </div>
        {/* With/Without Tests Toggle */}
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 h-9 px-4 font-medium transition-all ${
            filters.withTests
              ? 'bg-purple-100 border-purple-400 text-purple-700 hover:bg-purple-200'
              : 'bg-amber-50 border-amber-400 text-amber-700 hover:bg-amber-100'
          }`}
          onClick={() => setFilters(prev => ({ ...prev, withTests: !prev.withTests }))}
        >
          <span className={`w-2 h-2 rounded-full ${filters.withTests ? 'bg-purple-500' : 'bg-amber-500'}`} />
          {filters.withTests ? 'With Tests' : 'Without Tests'}
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="border-purple-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal min-w-[220px] border-purple-200 hover:border-purple-400"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-purple-500" />
                  <span className="text-sm">{dateLabel}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    setFilters(prev => ({
                      ...prev,
                      dateFrom: range?.from,
                      dateTo: range?.to,
                    }))
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {/* Quick Range Buttons */}
            <div className="flex gap-1">
              {QUICK_RANGES.map(qr => (
                <Button
                  key={qr.days}
                  variant="outline"
                  size="sm"
                  className={
                    filters.dateFrom && filters.dateTo &&
                    format(filters.dateFrom, 'yyyy-MM-dd') === format(subDays(new Date(), qr.days - 1), 'yyyy-MM-dd') &&
                    format(filters.dateTo, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                      ? 'bg-purple-100 border-purple-400 text-purple-700'
                      : 'border-gray-200 text-gray-600 hover:border-purple-300'
                  }
                  onClick={() => setQuickRange(qr.days)}
                >
                  {qr.label}
                </Button>
              ))}
            </div>

            {/* Toggle Filters Panel */}
            <Button
              variant="outline"
              size="sm"
              className={`gap-1.5 ${filtersOpen ? 'bg-purple-50 border-purple-300 text-purple-700' : 'border-gray-200 text-gray-600'}`}
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-1 h-5 w-5 p-0 text-[10px] bg-purple-600 text-white flex items-center justify-center rounded-full">
                  {activeFilterCount}
                </Badge>
              )}
              {filtersOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>

            {/* Sort */}
            <div className="flex items-center gap-2 ml-auto">
              <Label className="text-xs text-gray-500">Sort:</Label>
              <Select
                value={filters.sortBy}
                onValueChange={v => setFilters(prev => ({ ...prev, sortBy: v }))}
              >
                <SelectTrigger className="h-8 w-[110px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">By Date</SelectItem>
                  <SelectItem value="count">By Count</SelectItem>
                  <SelectItem value="name">By Name</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setFilters(prev => ({
                  ...prev,
                  sortOrder: prev.sortOrder === 'desc' ? 'asc' : 'desc',
                }))}
                title={filters.sortOrder === 'desc' ? 'Descending' : 'Ascending'}
              >
                {filters.sortOrder === 'desc' ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
              </Button>
            </div>

            {/* Reset */}
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-gray-600"
              onClick={resetFilters}
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Expanded Filter Panel */}
          {filtersOpen && (
            <div className="mt-4 pt-4 border-t border-purple-100 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* UTM Source */}
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">UTM Source</Label>
                {availableUtmSources.length > 0 ? (
                  <Select
                    value={filters.utmSource || '__all__'}
                    onValueChange={v => setFilters(prev => ({ ...prev, utmSource: v === '__all__' ? '' : v }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All sources</SelectItem>
                      {availableUtmSources.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="e.g. google"
                    className="h-8 text-xs"
                    value={filters.utmSource}
                    onChange={e => setFilters(prev => ({ ...prev, utmSource: e.target.value }))}
                  />
                )}
              </div>

              {/* UTM Medium */}
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">UTM Medium</Label>
                {availableUtmMediums.length > 0 ? (
                  <Select
                    value={filters.utmMedium || '__all__'}
                    onValueChange={v => setFilters(prev => ({ ...prev, utmMedium: v === '__all__' ? '' : v }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All mediums" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All mediums</SelectItem>
                      {availableUtmMediums.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="e.g. cpc"
                    className="h-8 text-xs"
                    value={filters.utmMedium}
                    onChange={e => setFilters(prev => ({ ...prev, utmMedium: e.target.value }))}
                  />
                )}
              </div>

              {/* UTM Campaign */}
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">UTM Campaign</Label>
                {availableUtmCampaigns.length > 0 ? (
                  <Select
                    value={filters.utmCampaign || '__all__'}
                    onValueChange={v => setFilters(prev => ({ ...prev, utmCampaign: v === '__all__' ? '' : v }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All campaigns" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All campaigns</SelectItem>
                      {availableUtmCampaigns.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="e.g. spring_sale"
                    className="h-8 text-xs"
                    value={filters.utmCampaign}
                    onChange={e => setFilters(prev => ({ ...prev, utmCampaign: e.target.value }))}
                  />
                )}
              </div>

              {/* UTM Term */}
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">UTM Term</Label>
                <Input
                  placeholder="e.g. ai+receptionist"
                  className="h-8 text-xs"
                  value={filters.utmTerm}
                  onChange={e => setFilters(prev => ({ ...prev, utmTerm: e.target.value }))}
                />
              </div>

              {/* UTM Content */}
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">UTM Content</Label>
                <Input
                  placeholder="e.g. header_v2"
                  className="h-8 text-xs"
                  value={filters.utmContent}
                  onChange={e => setFilters(prev => ({ ...prev, utmContent: e.target.value }))}
                />
              </div>

              {/* Affiliate ID */}
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">Affiliate ID</Label>
                {availableAffids.length > 0 ? (
                  <Select
                    value={filters.affid || '__all__'}
                    onValueChange={v => setFilters(prev => ({ ...prev, affid: v === '__all__' ? '' : v }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All affiliates" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All affiliates</SelectItem>
                      {availableAffids.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="e.g. MP-EITAN-001"
                    className="h-8 text-xs"
                    value={filters.affid}
                    onChange={e => setFilters(prev => ({ ...prev, affid: e.target.value }))}
                  />
                )}
              </div>
            </div>
          )}

          {/* Active Filter Tags */}
          {activeFilterCount > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {filters.utmSource && (
                <Badge variant="secondary" className="text-xs gap-1 bg-purple-50 text-purple-700 border border-purple-200">
                  Source: {filters.utmSource}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, utmSource: '' }))} />
                </Badge>
              )}
              {filters.utmMedium && (
                <Badge variant="secondary" className="text-xs gap-1 bg-purple-50 text-purple-700 border border-purple-200">
                  Medium: {filters.utmMedium}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, utmMedium: '' }))} />
                </Badge>
              )}
              {filters.utmCampaign && (
                <Badge variant="secondary" className="text-xs gap-1 bg-purple-50 text-purple-700 border border-purple-200">
                  Campaign: {filters.utmCampaign}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, utmCampaign: '' }))} />
                </Badge>
              )}
              {filters.utmTerm && (
                <Badge variant="secondary" className="text-xs gap-1 bg-purple-50 text-purple-700 border border-purple-200">
                  Term: {filters.utmTerm}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, utmTerm: '' }))} />
                </Badge>
              )}
              {filters.utmContent && (
                <Badge variant="secondary" className="text-xs gap-1 bg-purple-50 text-purple-700 border border-purple-200">
                  Content: {filters.utmContent}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, utmContent: '' }))} />
                </Badge>
              )}
              {filters.affid && (
                <Badge variant="secondary" className="text-xs gap-1 bg-purple-50 text-purple-700 border border-purple-200">
                  Aff: {filters.affid}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, affid: '' }))} />
                </Badge>
              )}
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
              { label: 'Won/Advanced', value: stats.bookedCalls, color: 'bg-green-500', pct: stats.leadFormCtaClicks > 0 ? Math.round((stats.bookedCalls / stats.leadFormCtaClicks) * 100) : 0 },
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
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
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
        </CardContent>
      </Card>
    </div>
  )
}
