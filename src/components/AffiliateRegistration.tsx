'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AffiliateRegistration() {
  const { setView } = useAppStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [website, setWebsite] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email) return

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, company, website, message }),
      })

      const data = await res.json()

      if (res.ok) {
        setSubmitted(true)
      } else {
        setError(data.error || 'Failed to submit application')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex flex-col">
        <header className="border-b border-purple-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
            <img src="/android-chrome-192x192.png" alt="MassaPro" className="w-10 h-10 rounded-xl" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">MassaPro</h1>
              <p className="text-xs text-purple-500">AI Agentic Receptionist</p>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full text-center"
          >
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
            <p className="text-gray-600 mb-8">
              We&apos;ll review your application and get back to you soon. You&apos;ll receive an email once your account is approved.
            </p>
            <Button
              onClick={() => setView('login')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Go to Login
            </Button>
          </motion.div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex flex-col">
      <header className="border-b border-purple-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('landing')}
              className="text-gray-500 hover:text-purple-600"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <img src="/android-chrome-192x192.png" alt="MassaPro" className="w-10 h-10 rounded-xl" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">MassaPro</h1>
              <p className="text-xs text-purple-500">Affiliate Program</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full"
        >
          <Card className="border-purple-200 shadow-lg shadow-purple-100/50">
            <CardHeader className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-3 p-2">
                <img src="/android-chrome-192x192.png" alt="MassaPro" className="w-10 h-10 rounded-xl" />
              </div>
              <CardTitle className="text-2xl">Join Our Affiliate Program</CardTitle>
              <CardDescription>
                Promote MassaPro AI Secretary and earn commissions on every referral
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Full Name *</Label>
                    <Input
                      id="reg-name"
                      placeholder="John Smith"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email *</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-phone">Phone</Label>
                    <Input
                      id="reg-phone"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-company">Company</Label>
                    <Input
                      id="reg-company"
                      placeholder="Your Company"
                      value={company}
                      onChange={e => setCompany(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-website">Website</Label>
                  <Input
                    id="reg-website"
                    placeholder="https://your-website.com"
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-message">Why do you want to join?</Label>
                  <Textarea
                    id="reg-message"
                    placeholder="Tell us about your audience and how you plan to promote MassaPro..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={3}
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={submitting || !name || !email}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </Button>
              </form>

              <div className="mt-4 text-center text-sm text-gray-500">
                Already have an account?{' '}
                <button
                  onClick={() => setView('login')}
                  className="text-purple-600 hover:underline font-medium"
                >
                  Log in here
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  )
}
