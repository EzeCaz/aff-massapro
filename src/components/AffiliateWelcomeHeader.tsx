'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'

interface Affiliate {
  affid: string
  name: string
}

export default function AffiliateWelcomeHeader({ affiliate }: { affiliate: Affiliate }) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const slug = affiliate.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const trackingLink = `https://massapro.com/?affid=${affiliate.affid}&utm_source=affiliate&utm_medium=cpc&utm_campaign=${slug}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(trackingLink)
      setCopied(true)
      toast({ title: 'Link Copied!', description: 'Your referral link is ready to share' })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: 'Error', description: 'Failed to copy link', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome back, {affiliate.name}
        </h2>
        <p className="text-sm text-gray-500">
          Your Tracking ID: <code className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-mono">{affiliate.affid}</code>
        </p>
      </div>

      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-white">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-emerald-800 mb-1">Your Personalized Referral Link</p>
              <div className="p-2 bg-white rounded-lg border break-all text-sm font-mono text-gray-700">
                {trackingLink}
              </div>
            </div>
            <Button
              onClick={handleCopy}
              className="bg-emerald-600 hover:bg-emerald-700 flex-shrink-0"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
