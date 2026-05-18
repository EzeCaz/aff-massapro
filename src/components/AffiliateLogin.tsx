'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sparkles, ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

interface AffiliateOption {
  id: string
  affid: string
  name: string
  email: string
}

export default function AffiliateLogin() {
  const { setView, setAuthenticatedAffiliateId } = useAppStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [affiliates, setAffiliates] = useState<AffiliateOption[]>([])

  useEffect(() => {
    fetch('/api/affiliates')
      .then(res => res.json())
      .then(data => {
        setAffiliates(data.filter((a: AffiliateOption) => a.email))
      })
      .catch(() => {})
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (res.ok) {
        setAuthenticatedAffiliateId(data.id)
        setView('affiliate')
      } else if (data.needsApproval) {
        setError('Your account is pending approval. We\'ll notify you once it\'s approved.')
      } else if (data.inactive) {
        setError('Your account has been deactivated. Please contact support.')
      } else {
        setError(data.error || 'Invalid credentials')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = (affiliateId: string) => {
    setAuthenticatedAffiliateId(affiliateId)
    setView('affiliate')
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
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">MassaPro</h1>
              <p className="text-xs text-purple-500">Affiliate Portal</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <Card className="border-purple-200 shadow-lg shadow-purple-100/50">
            <CardHeader className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-7 h-7 text-purple-600" />
              </div>
              <CardTitle className="text-2xl">Affiliate Login</CardTitle>
              <CardDescription>
                Access your referral dashboard and track your earnings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={loading || !email || !password}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>

              {/* Demo Login */}
              <div className="mt-6 pt-6 border-t border-purple-100">
                <div className="text-center text-sm text-gray-500 mb-3">Demo Mode</div>
                <Select onValueChange={handleDemoLogin}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a demo affiliate..." />
                  </SelectTrigger>
                  <SelectContent>
                    {affiliates.filter(a => a.affid !== 'MP-LISA-005').map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.affid})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-4 text-center text-sm text-gray-500">
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => setView('register')}
                  className="text-purple-600 hover:underline font-medium"
                >
                  Register here
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  )
}
