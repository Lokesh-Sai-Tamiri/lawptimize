"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"

import { ThemeToggle } from "@/components/theme-toggle"
import { IntelligenceFeed } from "@/components/intelligence-feed"
import { FileText, Search, Sparkles, ArrowRight, AlertCircle } from "lucide-react"
import { useUserContext } from "@/lib/user-context"

const quickActions = [
  {
    icon: FileText,
    title: "Draft Document",
    description: "Click to start agent",
    iconBg: "bg-gradient-to-br from-cyan/20 to-teal/10",
    iconColor: "text-cyan",
    href: "/drafter",
  },
  {
    icon: Search,
    title: "Case Research",
    description: "Click to start agent",
    iconBg: "bg-gradient-to-br from-purple/20 to-pink/10",
    iconColor: "text-purple",
    href: "/cases",
  },
  {
    icon: Sparkles,
    title: "AI Analysis",
    description: "Click to start agent",
    iconBg: "bg-gradient-to-br from-pink/20 to-magenta/10",
    iconColor: "text-pink",
    href: "/drafter",
  },
]

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading } = useUserContext()

  useEffect(() => {
    if (!isLoading && !user?.organizationId) {
      router.push('/setup')
    }
  }, [user, isLoading, router])

  if (isLoading || !user?.organizationId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const userName = user.firstName || 'there'

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="ml-16 flex-1 p-8 pb-24">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">
              <span className="text-foreground">Good evening, </span>
              <span className="text-gradient-purple-cyan">{userName}</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Your AI agents are standing by. <span className="text-orange">3 urgent tasks require attention.</span>
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {quickActions.map((action) => (
            <a
              key={action.title}
              href={action.href}
              className="group flex flex-col p-6 rounded-xl bg-card border border-border/50 card-glow"
            >
              <div className={`h-12 w-12 rounded-xl ${action.iconBg} flex items-center justify-center mb-4`}>
                <action.icon className={`h-6 w-6 ${action.iconColor}`} />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{action.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{action.description}</p>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-cyan transition-colors mt-auto" />
            </a>
          ))}
        </div>

        {/* Intelligence Feed & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <IntelligenceFeed />

          {/* Critical Alerts */}
          <div className="p-6 rounded-xl bg-card border border-border/50 card-glow">
            <div className="flex items-center gap-2 mb-6">
              <AlertCircle className="h-4 w-4 text-red" />
              <h2 className="font-semibold text-foreground">Critical Alerts</h2>
            </div>
            <div className="p-4 rounded-lg alert-critical">
              <h3 className="font-semibold text-red mb-1">High Court Hearing Tomorrow</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Prepare arguments for Sharma vs State. AI has drafted a preliminary summary.
              </p>
              <button className="px-3 py-1.5 text-sm bg-secondary/80 text-foreground rounded-md hover:bg-secondary transition-colors border border-border/50">
                View Summary
              </button>
            </div>
          </div>
        </div>
      </main>

    </div>
  )
}
