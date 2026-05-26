'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Code2,
  Copy,
  Check,
  Webhook,
  MousePointerClick,
  UserPlus,
  RefreshCw,
  Cookie,
  ExternalLink,
  ChevronRight,
  Zap,
  Shield,
  Clock,
} from 'lucide-react'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-7 px-2 text-xs"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 mr-1" />
          Copied
        </>
      ) : (
        <>
          <Copy className="w-3 h-3 mr-1" />
          Copy
        </>
      )}
    </Button>
  )
}

function CodeBlock({ code, language = 'json' }: { code: string; language?: string }) {
  return (
    <div className="relative group">
      <div className="bg-gray-950 rounded-lg border border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
          <span className="text-xs text-gray-400 font-mono">{language}</span>
          <CopyButton text={code} />
        </div>
        <pre className="p-4 overflow-x-auto text-sm">
          <code className="text-gray-100 font-mono whitespace-pre">{code}</code>
        </pre>
      </div>
    </div>
  )
}

// Test endpoint forms
function TestClickTracker({ dashboardUrl }: { dashboardUrl: string }) {
  const [affid, setAffid] = useState('')
  const [utmSource, setUtmSource] = useState('')
  const [utmMedium, setUtmMedium] = useState('')
  const [utmCampaign, setUtmCampaign] = useState('')
  const [utmContent, setUtmContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!affid) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affid,
          utm_source: utmSource || undefined,
          utm_medium: utmMedium || undefined,
          utm_campaign: utmCampaign || undefined,
          utm_content: utmContent || undefined,
          page_url: dashboardUrl,
        }),
      })
      const data = await res.json()
      setResult(JSON.stringify(data, null, 2))
    } catch (err) {
      setResult(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }, null, 2))
    }
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="test-affid" className="text-xs">Affiliate ID *</Label>
          <Input id="test-affid" placeholder="MP-JOHN-001" value={affid} onChange={e => setAffid(e.target.value)} className="h-9" />
        </div>
        <div>
          <Label htmlFor="test-utm-source" className="text-xs">UTM Source</Label>
          <Input id="test-utm-source" placeholder="affiliate" value={utmSource} onChange={e => setUtmSource(e.target.value)} className="h-9" />
        </div>
        <div>
          <Label htmlFor="test-utm-medium" className="text-xs">UTM Medium</Label>
          <Input id="test-utm-medium" placeholder="cpc" value={utmMedium} onChange={e => setUtmMedium(e.target.value)} className="h-9" />
        </div>
        <div>
          <Label htmlFor="test-utm-campaign" className="text-xs">UTM Campaign</Label>
          <Input id="test-utm-campaign" placeholder="spring-launch" value={utmCampaign} onChange={e => setUtmCampaign(e.target.value)} className="h-9" />
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={!affid || loading} size="sm" className="w-full sm:w-auto">
        {loading ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <MousePointerClick className="w-3 h-3 mr-1" />}
        Test Click Tracking
      </Button>
      {result && (
        <div className="bg-gray-950 rounded-lg p-3 text-xs font-mono text-green-400 overflow-x-auto max-h-40 overflow-y-auto">
          <pre>{result}</pre>
        </div>
      )}
    </div>
  )
}

function TestLeadCapture({ dashboardUrl }: { dashboardUrl: string }) {
  const [affid, setAffid] = useState('')
  const [leadName, setLeadName] = useState('')
  const [leadEmail, setLeadEmail] = useState('')
  const [planType, setPlanType] = useState('Basic')
  const [utmCampaign, setUtmCampaign] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!affid || !leadName) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/track/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affid,
          lead_name: leadName,
          lead_email: leadEmail || undefined,
          plan_type: planType,
          utm_campaign: utmCampaign || undefined,
        }),
      })
      const data = await res.json()
      setResult(JSON.stringify(data, null, 2))
    } catch (err) {
      setResult(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }, null, 2))
    }
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="lead-affid" className="text-xs">Affiliate ID *</Label>
          <Input id="lead-affid" placeholder="MP-JOHN-001" value={affid} onChange={e => setAffid(e.target.value)} className="h-9" />
        </div>
        <div>
          <Label htmlFor="lead-name" className="text-xs">Lead Name *</Label>
          <Input id="lead-name" placeholder="John Smith" value={leadName} onChange={e => setLeadName(e.target.value)} className="h-9" />
        </div>
        <div>
          <Label htmlFor="lead-email" className="text-xs">Lead Email</Label>
          <Input id="lead-email" placeholder="john@example.com" value={leadEmail} onChange={e => setLeadEmail(e.target.value)} className="h-9" />
        </div>
        <div>
          <Label htmlFor="lead-plan" className="text-xs">Plan Type</Label>
          <Select value={planType} onValueChange={setPlanType}>
            <SelectTrigger id="lead-plan" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Basic">Basic ($10/mo)</SelectItem>
              <SelectItem value="Professional">Professional ($50/mo)</SelectItem>
              <SelectItem value="Enterprise">Enterprise ($100/mo)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="lead-utm" className="text-xs">UTM Campaign</Label>
          <Input id="lead-utm" placeholder="spring-launch" value={utmCampaign} onChange={e => setUtmCampaign(e.target.value)} className="h-9" />
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={!affid || !leadName || loading} size="sm" className="w-full sm:w-auto">
        {loading ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <UserPlus className="w-3 h-3 mr-1" />}
        Test Lead Capture
      </Button>
      {result && (
        <div className="bg-gray-950 rounded-lg p-3 text-xs font-mono text-green-400 overflow-x-auto max-h-40 overflow-y-auto">
          <pre>{result}</pre>
        </div>
      )}
    </div>
  )
}

function TestStatusUpdate() {
  const [lookupMethod, setLookupMethod] = useState<'id' | 'email'>('id')
  const [referralId, setReferralId] = useState('')
  const [leadEmail, setLeadEmail] = useState('')
  const [affid, setAffid] = useState('')
  const [newStatus, setNewStatus] = useState('Won')
  const [planType, setPlanType] = useState('')
  const [monthsActive, setMonthsActive] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (lookupMethod === 'id' && !referralId) return
    if (lookupMethod === 'email' && (!leadEmail || !affid)) return
    if (!newStatus) return
    setLoading(true)
    setResult(null)
    try {
      const payload: Record<string, unknown> = { new_status: newStatus }
      if (lookupMethod === 'id') {
        payload.referral_id = referralId
      } else {
        payload.lead_email = leadEmail
        payload.affid = affid
      }
      if (planType) payload.plan_type = planType
      if (monthsActive) payload.months_active = parseInt(monthsActive)

      const res = await fetch('/api/track/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      setResult(JSON.stringify(data, null, 2))
    } catch (err) {
      setResult(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }, null, 2))
    }
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 mb-2">
        <Button
          variant={lookupMethod === 'id' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setLookupMethod('id')}
          className="text-xs"
        >
          By Referral ID
        </Button>
        <Button
          variant={lookupMethod === 'email' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setLookupMethod('email')}
          className="text-xs"
        >
          By Email + AffID
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {lookupMethod === 'id' ? (
          <div className="sm:col-span-2">
            <Label htmlFor="status-ref-id" className="text-xs">Referral ID *</Label>
            <Input id="status-ref-id" placeholder="clxabc123..." value={referralId} onChange={e => setReferralId(e.target.value)} className="h-9" />
          </div>
        ) : (
          <>
            <div>
              <Label htmlFor="status-email" className="text-xs">Lead Email *</Label>
              <Input id="status-email" placeholder="john@example.com" value={leadEmail} onChange={e => setLeadEmail(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label htmlFor="status-affid" className="text-xs">Affiliate ID *</Label>
              <Input id="status-affid" placeholder="MP-JOHN-001" value={affid} onChange={e => setAffid(e.target.value)} className="h-9" />
            </div>
          </>
        )}
        <div>
          <Label htmlFor="status-new" className="text-xs">New Status *</Label>
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger id="status-new" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Lead">Lead</SelectItem>
              <SelectItem value="Attendee">Attendee</SelectItem>
              <SelectItem value="Test">Test</SelectItem>
              <SelectItem value="Won">Won</SelectItem>
              <SelectItem value="Lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="status-plan" className="text-xs">Plan Type (optional)</Label>
          <Select value={planType} onValueChange={setPlanType}>
            <SelectTrigger id="status-plan" className="h-9">
              <SelectValue placeholder="Don't change" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Don&apos;t change</SelectItem>
              <SelectItem value="Basic">Basic ($10/mo)</SelectItem>
              <SelectItem value="Professional">Professional ($50/mo)</SelectItem>
              <SelectItem value="Enterprise">Enterprise ($100/mo)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="status-months" className="text-xs">Months Active (optional)</Label>
          <Input id="status-months" type="number" placeholder="3" value={monthsActive} onChange={e => setMonthsActive(e.target.value)} className="h-9" />
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={loading} size="sm" className="w-full sm:w-auto">
        {loading ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
        Test Status Update
      </Button>
      {result && (
        <div className="bg-gray-950 rounded-lg p-3 text-xs font-mono text-green-400 overflow-x-auto max-h-40 overflow-y-auto">
          <pre>{result}</pre>
        </div>
      )}
    </div>
  )
}

export default function IntegrationGuide() {
  const [dashboardUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.origin
    }
    return 'https://your-dashboard-url.com'
  })

  const trackerScriptUrl = `${dashboardUrl}/massapro-affiliate-tracker.js`

  const trackerSnippet = `<!-- MassaPro Affiliate Tracker -->
<script src="${trackerScriptUrl}"></script>
<script>
  MassaProAffiliate.config({ dashboardUrl: '${dashboardUrl}' });
</script>`

  const leadFormSnippet = `// Call this when a visitor submits a form
MassaProAffiliate.trackLead({
  lead_name: document.getElementById('name').value,
  lead_email: document.getElementById('email').value,
  plan_type: 'Professional'  // or 'Basic', 'Enterprise'
});`

  const leadWebhookExample = JSON.stringify({
    affid: 'MP-JOHN-001',
    lead_name: 'John Smith',
    lead_email: 'john@example.com',
    plan_type: 'Professional',
    utm_campaign: 'spring-launch',
    utm_content: 'banner-top',
    initial_status: 'Lead',
  }, null, 2)

  const statusWebhookExample = JSON.stringify({
    referral_id: 'clxabc123...',
    new_status: 'Won',
    plan_type: 'Enterprise',
    months_active: 3,
  }, null, 2)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integration Guide</h1>
        <p className="text-gray-500 mt-1">Connect your landing page to the MassaPro Affiliate system in 3 steps</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
              <MousePointerClick className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">1. Track Clicks</h3>
              <p className="text-xs text-gray-500 mt-1">Auto-track affiliate visitors with UTM attribution</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">2. Capture Leads</h3>
              <p className="text-xs text-gray-500 mt-1">Send form submissions as referral leads</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <RefreshCw className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">3. Update Status</h3>
              <p className="text-xs text-gray-500 mt-1">Sync lead status changes from your CRM</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Steps */}
      <Tabs defaultValue="step1" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="step1" className="text-xs sm:text-sm">Step 1: Tracking Script</TabsTrigger>
          <TabsTrigger value="step2" className="text-xs sm:text-sm">Step 2: Lead Capture</TabsTrigger>
          <TabsTrigger value="step3" className="text-xs sm:text-sm">Step 3: Status Updates</TabsTrigger>
        </TabsList>

        {/* Step 1: Tracking Script */}
        <TabsContent value="step1" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Code2 className="w-5 h-5 text-purple-600" />
                Embed the Tracking Script
              </CardTitle>
              <CardDescription>
                Add this snippet to the <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">&lt;head&gt;</code> section of receptionist.massapro.com. It will automatically parse UTM parameters, save a 30-day attribution cookie, and fire a click tracking pixel for every affiliate visitor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CodeBlock code={trackerSnippet} language="html" />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  How it works
                </h4>
                <ul className="mt-2 space-y-1.5 text-xs text-blue-700">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    When a visitor lands with <code className="bg-blue-100 px-1 rounded">?affid=MP-JOHN-001&amp;utm_source=affiliate</code>, the script automatically fires a click tracking pixel
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    The affiliate ID and UTM parameters are stored in a 30-day first-party cookie named <code className="bg-blue-100 px-1 rounded">massapro_affiliate</code>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    On return visits, the cookie persists so the affiliate still gets credit for any form submissions
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Lead Form Integration</h4>
                <p className="text-xs text-gray-500 mb-3">Call <code className="bg-gray-100 px-1 py-0.5 rounded">MassaProAffiliate.trackLead()</code> when a visitor submits a form:</p>
                <CodeBlock code={leadFormSnippet} language="javascript" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 2: Lead Capture Webhook */}
        <TabsContent value="step2" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Webhook className="w-5 h-5 text-emerald-600" />
                Lead Capture Webhook
              </CardTitle>
              <CardDescription>
                Send a POST request when a visitor fills out a form on receptionist.massapro.com. Creates a Referral record and credits the affiliate.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">POST</Badge>
                <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded flex-1 truncate">
                  {dashboardUrl}/api/track/lead
                </code>
                <CopyButton text={`${dashboardUrl}/api/track/lead`} />
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Request Body</h4>
                <CodeBlock code={leadWebhookExample} language="json" />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Commission Rules
                </h4>
                <ul className="mt-2 space-y-1 text-xs text-emerald-700">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <strong>Signup Commission:</strong> $100 if initial_status is &quot;Won&quot;, otherwise $0
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <strong>Monthly Commission:</strong> Enterprise = $100/mo, Professional = $50/mo, Basic = $10/mo
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    Affiliate&apos;s totalEarnings and approvedBalance are updated immediately
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Response (201 Created)</h4>
                <CodeBlock
                  code={JSON.stringify({
                    success: true,
                    referral: {
                      id: 'clxabc123',
                      affid: 'MP-JOHN-001',
                      leadName: 'John Smith',
                      leadEmail: 'john@example.com',
                      planType: 'Professional',
                      leadStatus: 'Lead',
                      signupCommission: 0,
                      monthlyCommission: 50,
                      totalCommission: 0,
                      createdAt: '2024-01-15T10:30:00Z',
                    },
                  }, null, 2)}
                  language="json"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 3: Status Updates */}
        <TabsContent value="step3" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-amber-600" />
                Lead Status Update Webhook
              </CardTitle>
              <CardDescription>
                Send a PUT request when a lead&apos;s status changes in your CRM (e.g., they book a call, become a subscriber, or churn).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-amber-100 text-amber-700">PUT</Badge>
                <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded flex-1 truncate">
                  {dashboardUrl}/api/track/status
                </code>
                <CopyButton text={`${dashboardUrl}/api/track/status`} />
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Request Body</h4>
                <CodeBlock code={statusWebhookExample} language="json" />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Status Transition Logic
                </h4>
                <ul className="mt-2 space-y-1 text-xs text-amber-700">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <strong>→ Won:</strong> Awards $100 signup commission, increments affiliate conversions
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <strong>→ Lost:</strong> Updates status — deal is lost
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <strong>Plan change:</strong> Updates monthly commission rate and recalculates total
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    Total commission = signupCommission + (monthlyCommission × monthsActive)
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Lookup Options</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="border rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-700">Option A: By Referral ID</p>
                    <CodeBlock code={JSON.stringify({ referral_id: 'clxabc123', new_status: 'Won' }, null, 2)} language="json" />
                  </div>
                  <div className="border rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-700">Option B: By Email + AffID</p>
                    <CodeBlock code={JSON.stringify({ lead_email: 'john@example.com', affid: 'MP-JOHN-001', new_status: 'Won' }, null, 2)} language="json" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* API Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            API Reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-semibold text-xs text-gray-500 uppercase">Endpoint</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs text-gray-500 uppercase">Method</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs text-gray-500 uppercase">Parameters</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs text-gray-500 uppercase">Description</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                <tr className="border-b hover:bg-gray-50">
                  <td className="py-2.5 px-3 font-mono text-purple-600">/api/track/click</td>
                  <td className="py-2.5 px-3"><Badge variant="secondary" className="bg-purple-100 text-purple-700">POST</Badge></td>
                  <td className="py-2.5 px-3">affid*, utm_source, utm_medium, utm_campaign, utm_content, page_url, ip_address, user_agent</td>
                  <td className="py-2.5 px-3 text-gray-600">Track affiliate click with UTM data</td>
                </tr>
                <tr className="border-b hover:bg-gray-50">
                  <td className="py-2.5 px-3 font-mono text-purple-600">/api/track/click</td>
                  <td className="py-2.5 px-3"><Badge variant="secondary" className="bg-purple-100 text-purple-700">GET</Badge></td>
                  <td className="py-2.5 px-3">affid*, utm_source, utm_medium, utm_campaign, utm_content, page_url (as query params)</td>
                  <td className="py-2.5 px-3 text-gray-600">Pixel tracking — returns 1×1 transparent GIF</td>
                </tr>
                <tr className="border-b hover:bg-gray-50">
                  <td className="py-2.5 px-3 font-mono text-emerald-600">/api/track/lead</td>
                  <td className="py-2.5 px-3"><Badge variant="secondary" className="bg-emerald-100 text-emerald-700">POST</Badge></td>
                  <td className="py-2.5 px-3">affid*, lead_name*, lead_email, plan_type, utm_campaign, utm_content, initial_status</td>
                  <td className="py-2.5 px-3 text-gray-600">Capture a new lead from a form submission</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-2.5 px-3 font-mono text-amber-600">/api/track/status</td>
                  <td className="py-2.5 px-3"><Badge variant="secondary" className="bg-amber-100 text-amber-700">PUT</Badge></td>
                  <td className="py-2.5 px-3">referral_id | (lead_email + affid), new_status*, plan_type, months_active</td>
                  <td className="py-2.5 px-3 text-gray-600">Update a lead&apos;s status and trigger commission events</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Cookie Attribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cookie className="w-5 h-5 text-orange-500" />
            Cookie Attribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">30-Day Attribution Window</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    When a visitor clicks an affiliate link, a first-party cookie named <code className="bg-gray-100 px-1 rounded">massapro_affiliate</code> is set with a 30-day expiry. If they return and submit a form within 30 days, the affiliate still gets credit.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">First-Party Cookie</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    The cookie is set on the landing page domain (receptionist.massapro.com), making it resilient to third-party cookie blocking. Uses SameSite=Lax for security.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <MousePointerClick className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Last-Click Attribution</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    If a visitor clicks multiple affiliate links, the most recent affiliate gets the attribution. The cookie is overwritten with the new affiliate&apos;s data.
                  </p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">Cookie Data Structure</h4>
              <CodeBlock
                code={JSON.stringify({
                  affid: 'MP-JOHN-001',
                  utm_source: 'affiliate',
                  utm_medium: 'cpc',
                  utm_campaign: 'spring-launch',
                  utm_content: 'banner-top',
                  landing_page: 'https://receptionist.massapro.com/',
                  timestamp: '2024-01-15T10:30:00.000Z',
                }, null, 2)}
                language="json"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Testing Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Testing Tools
          </CardTitle>
          <CardDescription>
            Test each endpoint directly from this dashboard. These calls go to the real API — make sure you have test affiliates in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="test-click" className="space-y-4">
            <TabsList>
              <TabsTrigger value="test-click" className="text-xs">
                <MousePointerClick className="w-3 h-3 mr-1" />
                Click
              </TabsTrigger>
              <TabsTrigger value="test-lead" className="text-xs">
                <UserPlus className="w-3 h-3 mr-1" />
                Lead
              </TabsTrigger>
              <TabsTrigger value="test-status" className="text-xs">
                <RefreshCw className="w-3 h-3 mr-1" />
                Status
              </TabsTrigger>
            </TabsList>
            <TabsContent value="test-click">
              <TestClickTracker dashboardUrl={dashboardUrl} />
            </TabsContent>
            <TabsContent value="test-lead">
              <TestLeadCapture dashboardUrl={dashboardUrl} />
            </TabsContent>
            <TabsContent value="test-status">
              <TestStatusUpdate />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
