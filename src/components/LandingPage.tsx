'use client'

import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, Users, ArrowRight, Sparkles, LogIn, UserPlus } from 'lucide-react'
import { motion } from 'framer-motion'

export default function LandingPage() {
  const { setView } = useAppStore()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-purple-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">MassaPro</h1>
              <p className="text-xs text-purple-500">AI Agentic Receptionist — Affiliate Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              onClick={() => setView('login')}
            >
              <LogIn className="w-4 h-4 mr-1" />
              Login
            </Button>
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => setView('register')}
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Register
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-4xl w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 text-sm font-medium px-4 py-2 rounded-full mb-6">
              <Sparkles className="w-4 h-4" />
              Affiliate Management System
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Welcome to MassaPro
              <span className="text-purple-600"> Affiliates</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Drive traffic to the MassaPro AI Secretary landing page and earn commissions. Track your referrals, monitor conversions, and grow your revenue.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card
                className="cursor-pointer hover:shadow-xl hover:shadow-purple-100/50 transition-all duration-300 border-2 hover:border-purple-400 h-full group bg-gradient-to-b from-white to-purple-50/30"
                onClick={() => setView('admin-login')}
              >
                <CardHeader className="pb-4">
                  <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
                    <Shield className="w-7 h-7 text-purple-600" />
                  </div>
                  <CardTitle className="text-xl">Manager Dashboard</CardTitle>
                  <CardDescription>
                    Full administrative control over affiliates, analytics, payouts, and link generation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 group-hover:bg-purple-700">
                    Admin Sign In
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="hover:shadow-xl hover:shadow-purple-100/50 transition-all duration-300 border-2 hover:border-purple-400 h-full bg-gradient-to-b from-white to-purple-50/30">
                <CardHeader className="pb-4">
                  <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mb-3">
                    <Users className="w-7 h-7 text-purple-600" />
                  </div>
                  <CardTitle className="text-xl">Affiliate Portal</CardTitle>
                  <CardDescription>
                    View your performance, track referrals, and access your unique links
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={() => setView('login')}
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Log In to Portal
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-purple-300 text-purple-600 hover:bg-purple-50"
                    onClick={() => setView('register')}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Register as Affiliate
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Commission highlights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { label: 'Signup Commission', value: '$100', desc: 'Per paying customer' },
              { label: 'Enterprise Plan', value: '$100/mo', desc: 'Monthly recurring' },
              { label: 'Professional Plan', value: '$50/mo', desc: 'Monthly recurring' },
              { label: 'Basic Plan', value: '$10/mo', desc: 'Monthly recurring' },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-4 rounded-xl bg-white/60 border border-purple-100">
                <div className="text-xl font-bold text-purple-600">{stat.value}</div>
                <div className="text-sm font-medium text-gray-700">{stat.label}</div>
                <div className="text-xs text-gray-400">{stat.desc}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-100 bg-white/80 backdrop-blur-sm mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-purple-400">
          © 2025 MassaPro — AI Agentic Receptionist & Secretary Services. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
