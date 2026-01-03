"use client"

import { useState, useEffect } from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, Briefcase, CheckSquare, FileText, DollarSign, User, Settings, Zap, CalendarClock, Users, LogOut, Shield, Bell } from "lucide-react"
import { useClerk, SignInButton, SignedIn, SignedOut } from "@clerk/nextjs"
import { useUserContext } from "@/lib/user-context"

const navItems = [
  { href: "/", icon: Home, label: "Dashboard" },
  { href: "/causelist", icon: CalendarClock, label: "Causelist" },
  { href: "/cases", icon: Briefcase, label: "Case Files" },
  { href: "/tasks", icon: CheckSquare, label: "Task Board" },
  { href: "/drafter", icon: FileText, label: "AI Drafter" },
  { href: "/financials", icon: DollarSign, label: "Financials" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/profile", icon: User, label: "Profile" },
]

const adminNavItems = [
  { href: "/organization", icon: Users, label: "Organization", adminOnly: true },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, isAdmin } = useUserContext()
  const { signOut } = useClerk()
  
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Poll for notifications every minute or on mount
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/notifications')
        if (res.ok) {
          const data = await res.json()
          setUnreadCount(data.unreadCount || 0)
        }
      } catch (e) {
        console.error(e)
      }
    }

    if (user) {
      fetchCount()
      const interval = setInterval(fetchCount, 60000)
      return () => clearInterval(interval)
    }
  }, [user])

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-16 flex-col items-center bg-sidebar border-r border-sidebar-border py-4">
      <Link href="/" className="mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan to-teal logo-glow">
          <Zap className="h-5 w-5 text-white" />
        </div>
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300 relative",
                isActive
                  ? "sidebar-active text-cyan"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label === "Notifications" && unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red ring-2 ring-sidebar" />
              )}
              <span className="sr-only">{item.label}</span>
            </Link>
          )
        })}

        {/* Admin-only navigation */}
        {isAdmin && adminNavItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300",
                isActive
                  ? "sidebar-active text-purple"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="sr-only">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="flex flex-col items-center gap-2">
        <SignedIn>
          <Link
            href="/profile"
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300",
              pathname === "/profile"
                ? "sidebar-active text-cyan"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
            )}
          >
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.firstName || 'User'}
                className="h-5 w-5 rounded-full"
              />
            ) : (
              <User className="h-5 w-5" />
            )}
            <span className="sr-only">Profile</span>
          </Link>

          <button
            onClick={() => signOut({ redirectUrl: '/sign-in' })}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-red-500 transition-all duration-300"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Sign out</span>
          </button>
        </SignedIn>

        <SignedOut>
          <SignInButton mode="modal">
            <button className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-300">
              <User className="h-5 w-5" />
              <span className="sr-only">Sign in</span>
            </button>
          </SignInButton>
        </SignedOut>

        <button className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-300">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </button>
      </div>
    </aside>
  )
}
