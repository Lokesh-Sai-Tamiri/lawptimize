"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { PageHeader } from "@/components/page-header"
import { Bell, Check, Clock, MessageSquare, Briefcase, FileText } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface Notification {
  _id: string
  type: string
  title: string
  message: string
  link?: string
  isRead: boolean
  createdAt: string
}

const iconMap: Record<string, any> = {
  task_comment: MessageSquare,
  task_update: Check,
  task_assignment: Briefcase,
  system: Bell,
}

const colorMap: Record<string, string> = {
  task_comment: "text-purple",
  task_update: "text-green",
  task_assignment: "text-cyan",
  system: "text-orange",
}

const bgMap: Record<string, string> = {
  task_comment: "bg-purple/10",
  task_update: "bg-green/10",
  task_assignment: "bg-cyan/10",
  system: "bg-orange/10",
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/notifications")
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "PATCH" })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (error) {
      console.error("Failed to mark all read", error)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      // Mark as read in background
      fetch(`/api/notifications/${notification._id}/read`, { method: "PATCH" })
      setNotifications(prev => 
        prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n)
      )
    }

    if (notification.link) {
      router.push(notification.link)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="ml-16 flex-1 p-8 pb-24">
        <PageHeader
          title="Notifications"
          description="Stay updated with your latest activity"
          action={
            <Button variant="outline" onClick={handleMarkAllRead}>
              <Check className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          }
        />

        <div className="space-y-4 max-w-4xl mx-auto">
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground flex flex-col items-center">
              <Bell className="h-12 w-12 mb-4 opacity-20" />
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = iconMap[notification.type] || Bell
              return (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`
                    relative p-4 rounded-xl border cursor-pointer transition-all duration-200
                    ${notification.isRead 
                      ? "bg-card border-border/50 opacity-80" 
                      : "bg-secondary/30 border-cyan/30 card-glow shadow-sm"
                    }
                    hover:scale-[1.01]
                  `}
                >
                  {!notification.isRead && (
                    <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-cyan animate-pulse" />
                  )}
                  
                  <div className="flex gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${bgMap[notification.type] || "bg-secondary"}`}>
                      <Icon className={`h-5 w-5 ${colorMap[notification.type] || "text-foreground"}`} />
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                        <h4 className={`font-medium ${notification.isRead ? "text-foreground" : "text-foreground font-semibold"}`}>
                          {notification.title}
                        </h4>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
