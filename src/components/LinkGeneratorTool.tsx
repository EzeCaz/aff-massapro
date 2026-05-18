'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Copy, Link2, ExternalLink, Loader2, History } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Affiliate {
  id: string
  affid: string
  name: string
  isActive: boolean
}

interface GeneratedLink {
  url: string
  affid: string
  affiliateName: string
  timestamp: Date
}

export default function LinkGeneratorTool() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [loading, setLoading] = useState(true)
  const [baseUrl, setBaseUrl] = useState('https://massapro.com/')
  const [selectedAffid, setSelectedAffid] = useState('')
  const [utmContent, setUtmContent] = useState('')
  const [generatedLink, setGeneratedLink] = useState('')
  const [generating, setGenerating] = useState(false)
  const [linkHistory, setLinkHistory] = useState<GeneratedLink[]>([])
  const { toast } = useToast()

  useEffect(() => {
    fetch('/api/affiliates')
      .then(res => res.json())
      .then(data => {
        setAffiliates(data.filter((a: Affiliate) => a.isActive))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const selectedAffiliate = affiliates.find(a => a.affid === selectedAffid)

  const handleGenerate = useCallback(async () => {
    if (!baseUrl || !selectedAffid) return
    setGenerating(true)
    try {
      const res = await fetch('/api/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl,
          affid: selectedAffid,
          affiliateName: selectedAffiliate?.name || '',
          utmContent: utmContent || undefined,
        }),
      })
      const data = await res.json()
      setGeneratedLink(data.trackingLink)
      setLinkHistory(prev => [
        {
          url: data.trackingLink,
          affid: selectedAffid,
          affiliateName: selectedAffiliate?.name || '',
          timestamp: new Date(),
        },
        ...prev.slice(0, 9),
      ])
      toast({ title: 'Link Generated', description: 'Tracking link ready to copy' })
    } catch {
      toast({ title: 'Error', description: 'Failed to generate link', variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }, [baseUrl, selectedAffid, selectedAffiliate, utmContent, toast])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: 'Copied!', description: 'Link copied to clipboard' })
    } catch {
      toast({ title: 'Error', description: 'Failed to copy', variant: 'destructive' })
    }
  }

  // Auto-generate preview link
  const previewLink = selectedAffid
    ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}affid=${selectedAffid}&utm_source=affiliate&utm_medium=cpc&utm_campaign=${selectedAffiliate?.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'affiliate'}${utmContent ? `&utm_content=${utmContent}` : ''}`
    : ''

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Link Generator</h1>
        <p className="text-sm text-gray-500">Generate tracking links for affiliates with UTM parameters</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Generator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-emerald-600" />
              Generate Tracking Link
            </CardTitle>
            <CardDescription>Configure your affiliate tracking link parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                placeholder="https://massapro.com/"
              />
            </div>

            <div className="space-y-2">
              <Label>Select Affiliate</Label>
              <Select value={selectedAffid} onValueChange={setSelectedAffid}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an affiliate..." />
                </SelectTrigger>
                <SelectContent>
                  {affiliates.map(a => (
                    <SelectItem key={a.id} value={a.affid}>
                      {a.name} ({a.affid})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>UTM Content (optional)</Label>
              <Input
                value={utmContent}
                onChange={e => setUtmContent(e.target.value)}
                placeholder="e.g. banner-ad-top, email-signature"
              />
              <p className="text-xs text-gray-500">Used to differentiate between placements or creatives</p>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!baseUrl || !selectedAffid || generating}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
              Generate Link
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Link Preview</CardTitle>
              <CardDescription>Auto-generated preview as you configure</CardDescription>
            </CardHeader>
            <CardContent>
              {previewLink ? (
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg border break-all text-sm font-mono">
                    {previewLink}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(previewLink)}
                      className="flex-1"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(previewLink, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Link2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select an affiliate to preview the link</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generated Result */}
          {generatedLink && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-emerald-800 text-base">✓ Generated Link</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-white rounded-lg border break-all text-sm font-mono mb-3">
                  {generatedLink}
                </div>
                <Button
                  onClick={() => copyToClipboard(generatedLink)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy to Clipboard
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* History */}
      {linkHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-gray-400" />
              Recent Generated Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {linkHistory.map((link, i) => (
                <div key={i} className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{link.affiliateName} ({link.affid})</div>
                    <div className="text-xs text-gray-500 truncate font-mono">{link.url}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(link.url)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
