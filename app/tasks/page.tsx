"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { Sidebar } from "@/components/sidebar"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import {
  Plus,
  MoreHorizontal,
  Calendar,
  GripVertical,
  User,
  Briefcase,
  Clock,
  AlertCircle,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Task {
  id: string
  title: string
  description?: string
  case: string
  caseId?: string | null
  assignee: string
  assigneeId?: string | null
  assigneeEmail?: string
  dueDate: string
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  status: "todo" | "inProgress" | "completed"
  createdAt: string
  comments?: {
    userId: string
    userName: string
    content: string
    createdAt: string
  }[]
}

interface Member {
  id: string
  userId: string
  email: string
  firstName?: string
  lastName?: string
  role: string
}

interface Case {
  id: string
  title: string
  caseNumber: string
  client: string
}

const priorityClasses: Record<string, string> = {
  LOW: "priority-low",
  MEDIUM: "priority-medium",
  HIGH: "priority-high",
  URGENT: "priority-urgent",
}

const columns = [
  { id: "todo", title: "To Do", dotColor: "bg-muted-foreground" },
  { id: "inProgress", title: "In Progress", dotColor: "bg-yellow shadow-[0_0_8px_oklch(0.85_0.16_85)]" },
  { id: "completed", title: "Completed", dotColor: "bg-green shadow-[0_0_8px_oklch(0.72_0.18_155)]" },
]

export default function TasksPage() {
  // Data state
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [cases, setCases] = useState<Case[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [hideCompleted, setHideCompleted] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Comments state
  const [newComment, setNewComment] = useState("")
  const [isPostingComment, setIsPostingComment] = useState(false)

  const { user } = useUser()
  
  const currentUserRole = members.find(m => m.userId === user?.id)?.role || 'member'

  // New task form state
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    case: "",
    assignee: "",
    assigneeEmail: "",
    dueDate: "",
    priority: "MEDIUM" as Task["priority"],
  })

  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    case: "",
    assignee: "",
    assigneeEmail: "",
    dueDate: "",
    priority: "MEDIUM" as Task["priority"],
    status: "todo" as Task["status"],
  })

  // Fetch tasks, members, and cases on mount
  useEffect(() => {
    fetchTasks()
    fetchMembers()
    fetchCases()
  }, [])

  const fetchTasks = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/tasks")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch tasks")
      }

      setTasks(data.tasks || [])
    } catch (err: any) {
      setError(err.message)
      setTasks([])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMembers = async () => {
    try {
      const response = await fetch("/api/organizations/members")
      const data = await response.json()

      if (response.ok && data.members) {
        setMembers(data.members.filter((m: Member) => m.userId)) // Only active members
      }
    } catch (err) {
      console.error("Failed to fetch members:", err)
    }
  }

  const fetchCases = async () => {
    try {
      const response = await fetch("/api/cases")
      const data = await response.json()

      if (response.ok && data.cases) {
        setCases(data.cases)
      }
    } catch (err) {
      console.error("Failed to fetch cases:", err)
    }
  }

  const getTasksByStatus = (status: string) => {
    if (hideCompleted && status === "completed") return []
    return tasks.filter((task) => task.status === status)
  }

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = "move"
    const target = e.target as HTMLElement
    setTimeout(() => {
      target.style.opacity = "0.5"
    }, 0)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement
    target.style.opacity = "1"
    setDraggedTask(null)
    setDragOverColumn(null)
  }

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverColumn(columnId)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    if (!draggedTask) return

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === draggedTask.id ? { ...t, status: columnId as Task["status"] } : t))
    )
    setDraggedTask(null)
    setDragOverColumn(null)

    // API update
    try {
      const response = await fetch(`/api/tasks/${draggedTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: columnId }),
      })

      if (!response.ok) {
        // Revert on error
        fetchTasks()
      }
    } catch (err) {
      fetchTasks()
    }
  }

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.case || !newTask.assignee || !newTask.dueDate) return

    try {
      setIsSubmitting(true)
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description,
          caseName: newTask.case,
          assigneeName: newTask.assignee,
          assigneeEmail: newTask.assigneeEmail,
          dueDate: newTask.dueDate,
          priority: newTask.priority,
          status: "todo",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create task")
      }

      setTasks((prev) => [data.task, ...prev])
      setNewTask({
        title: "",
        description: "",
        case: "",
        assignee: "",
        assigneeEmail: "",
        dueDate: "",
        priority: "MEDIUM",
      })
      setShowNewTaskDialog(false)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditTask = (task: Task) => {
    // Convert dueDate from display format (M/D/YYYY) to input format (YYYY-MM-DD)
    let dueDateForInput = ""
    if (task.dueDate) {
      try {
        const date = new Date(task.dueDate)
        if (!isNaN(date.getTime())) {
          dueDateForInput = date.toISOString().split("T")[0]
        }
      } catch {
        dueDateForInput = ""
      }
    }

    setEditForm({
      title: task.title,
      description: task.description || "",
      case: task.case,
      assignee: task.assignee,
      assigneeEmail: task.assigneeEmail || "",
      dueDate: dueDateForInput,
      priority: task.priority,
      status: task.status,
    })
    setEditingTask(task)
    setSelectedTask(null)
  }

  const handleSaveEdit = async () => {
    if (!editingTask || !editForm.title || !editForm.case || !editForm.assignee) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          caseName: editForm.case,
          assigneeName: editForm.assignee,
          assigneeEmail: editForm.assigneeEmail,
          dueDate: editForm.dueDate,
          priority: editForm.priority,
          status: editForm.status,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update task")
      }

      setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? data.task : t)))
      setEditingTask(null)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!taskToDelete) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/tasks/${taskToDelete.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete task")
      }

      setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id))
      setTaskToDelete(null)
      setSelectedTask(null)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddComment = async () => {
    if (!selectedTask || !newComment.trim()) return

    try {
      setIsPostingComment(true)
      const response = await fetch(`/api/tasks/${selectedTask.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      // Update local state
      const updatedTask = {
        ...selectedTask,
        comments: [...(selectedTask.comments || []), data.comment]
      } // data.comment has createdAt as Date string from JSON? No, Date object? standard fetch returns JSON string.

      setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t))
      setSelectedTask(updatedTask)
      setNewComment("")
    } catch (err) {
      console.error(err)
    } finally {
      setIsPostingComment(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const getMemberDisplayName = (member: Member) => {
    if (member.firstName || member.lastName) {
      return `${member.firstName || ""} ${member.lastName || ""}`.trim()
    }
    return member.email
  }

  const filteredColumns = hideCompleted ? columns.filter((col) => col.id !== "completed") : columns

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="ml-16 flex-1 p-8 pb-24 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan" />
        </main>

      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="ml-16 flex-1 p-8 pb-24 flex flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchTasks} variant="outline">
            Retry
          </Button>
        </main>

      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="ml-16 flex-1 p-8 pb-24">
        <PageHeader
          title="Task Board"
          description="Manage assignments and deadlines"
          action={
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch id="hide-completed" checked={hideCompleted} onCheckedChange={setHideCompleted} />
                <Label htmlFor="hide-completed" className="text-sm text-muted-foreground cursor-pointer">
                  Hide Completed
                </Label>
              </div>
              <Button
                onClick={() => setShowNewTaskDialog(true)}
                className="bg-cyan text-primary-foreground hover:bg-cyan/90 shadow-[0_0_20px_oklch(0.72_0.17_195_/_0.3)]"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </div>
          }
        />

        <div className={`grid grid-cols-1 gap-6 ${filteredColumns.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          {filteredColumns.map((column) => {
            const columnTasks = getTasksByStatus(column.id)
            const isDropTarget = dragOverColumn === column.id
            return (
              <div
                key={column.id}
                className="flex flex-col"
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${column.dotColor}`} />
                    <span className="font-medium text-foreground">{column.title}</span>
                    <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-secondary text-muted-foreground">
                      {columnTasks.length}
                    </span>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </div>

                <div
                  className={`flex-1 space-y-3 min-h-[200px] rounded-xl p-2 -m-2 transition-all duration-200 ${
                    isDropTarget ? "bg-cyan/10 border-2 border-dashed border-cyan/50" : "border-2 border-transparent"
                  }`}
                >
                  {columnTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedTask(task)}
                      className={`p-4 rounded-xl bg-card border border-border/50 card-glow cursor-grab active:cursor-grabbing transition-all duration-200 ${
                        draggedTask?.id === task.id ? "opacity-50 scale-95" : "hover:scale-[1.02] hover:border-cyan/30"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                          <span className={`px-2.5 py-1 text-xs font-medium rounded ${priorityClasses[task.priority]}`}>
                            {task.priority}
                          </span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button className="text-muted-foreground hover:text-foreground transition-colors">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border-border/50">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditTask(task)
                              }}
                              className="cursor-pointer"
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit Task
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setTaskToDelete(task)
                              }}
                              className="cursor-pointer text-red focus:text-red"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Task
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <h3 className={`font-medium mb-1 ${column.id === "completed" ? "text-cyan" : "text-foreground"}`}>
                        {task.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">{task.case}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple to-pink flex items-center justify-center text-xs font-medium text-white">
                            {getInitials(task.assignee)}
                          </div>
                          <span className="text-xs text-muted-foreground">{task.assignee}</span>
                        </div>
                        <div
                          className={`flex items-center gap-1 text-xs ${
                            task.priority === "URGENT" ? "text-red" : "text-muted-foreground"
                          }`}
                        >
                          <Calendar className="h-3 w-3" />
                          <span>{task.dueDate}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {columnTasks.length === 0 && (
                    <div
                      className={`h-32 rounded-xl border-2 border-dashed flex items-center justify-center transition-colors ${
                        isDropTarget ? "border-cyan/50 bg-cyan/5" : "border-border/30"
                      }`}
                    >
                      <p className="text-sm text-muted-foreground">{isDropTarget ? "Drop here" : "No tasks"}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Task Detail Modal */}
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="bg-card border-border/50 max-w-lg">
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-xl text-foreground mb-2">{selectedTask?.title}</DialogTitle>
                  <DialogDescription className="text-muted-foreground">{selectedTask?.case}</DialogDescription>
                </div>
                <span
                  className={`px-3 py-1 text-xs font-medium rounded ${
                    priorityClasses[selectedTask?.priority || "LOW"]
                  }`}
                >
                  {selectedTask?.priority}
                </span>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {selectedTask?.description && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-cyan" />
                    Description
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{selectedTask.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-secondary/50 border border-border/30">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    Assigned To
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple to-pink flex items-center justify-center text-xs font-medium text-white">
                      {selectedTask && getInitials(selectedTask.assignee)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{selectedTask?.assignee}</p>
                      <p className="text-xs text-muted-foreground">{selectedTask?.assigneeEmail}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-secondary/50 border border-border/30">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    Due Date
                  </h4>
                  <p className="text-sm font-medium text-foreground">{selectedTask?.dueDate}</p>
                  <p className="text-xs text-muted-foreground">Created: {selectedTask?.createdAt}</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-secondary/50 border border-border/30">
                <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5" />
                  Related Case
                </h4>
                <p className="text-sm font-medium text-foreground">{selectedTask?.case}</p>
              </div>

              <div className="p-4 rounded-lg bg-secondary/50 border border-border/30">
                <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  Status
                </h4>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      columns.find((c) => c.id === selectedTask?.status)?.dotColor
                    }`}
                  />
                  <span className="text-sm font-medium text-foreground capitalize">
                    {selectedTask?.status === "inProgress" ? "In Progress" : selectedTask?.status}
                  </span>
                </div>
              </div>
              </div>

              {/* Comments Section */}
              <div className="space-y-4 pt-4 border-t border-border/30">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <User className="h-4 w-4 text-cyan" />
                  Activity & Comments
                </h4>
                
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {selectedTask?.comments?.map((comment, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-medium">
                        {getInitials(comment.userName)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm font-medium text-foreground">{comment.userName}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleDateString()} {new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground bg-secondary/30 p-2 rounded-lg">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!selectedTask?.comments || selectedTask.comments.length === 0) && (
                     <p className="text-xs text-muted-foreground text-center py-4">No comments yet</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input 
                    placeholder="Write a comment..." 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleAddComment()
                      }
                    }}
                    className="bg-secondary/50 border-border/50"
                  />
                  <Button 
                    size="sm" 
                    onClick={handleAddComment} 
                    disabled={isPostingComment || !newComment.trim()}
                    className="bg-cyan text-primary-foreground hover:bg-cyan/90"
                  >
                    {isPostingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
                  </Button>
                </div>
              </div>


            <DialogFooter className="flex gap-2 sm:gap-2">
              {currentUserRole === 'admin' && (
                <Button
                  variant="outline"
                  onClick={() => selectedTask && setTaskToDelete(selectedTask)}
                  className="text-red border-red/30 hover:bg-red/10 hover:text-red"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
              <div className="flex-1" />
              <Button variant="outline" onClick={() => setSelectedTask(null)}>
                Close
              </Button>
              {currentUserRole === 'admin' && (
                <Button
                  onClick={() => selectedTask && handleEditTask(selectedTask)}
                  className="bg-cyan text-primary-foreground hover:bg-cyan/90"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Task
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
          <DialogContent className="bg-card border-border/50 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl text-foreground">Edit Task</DialogTitle>
              <DialogDescription className="text-muted-foreground">Update the task details below</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Task Title *</Label>
                <Input
                  id="edit-title"
                  placeholder="Enter task title"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="bg-secondary/50 border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Enter task description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="bg-secondary/50 border-border/50 min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-case">Related Case *</Label>
                {cases.length > 0 ? (
                  <Select
                    value={editForm.case}
                    onValueChange={(value) => setEditForm({ ...editForm, case: value })}
                  >
                    <SelectTrigger className="bg-secondary/50 border-border/50 w-full">
                      <SelectValue placeholder="Select a case" />
                    </SelectTrigger>
                    <SelectContent>
                      {cases.map((c) => (
                        <SelectItem key={c.id} value={c.title}>
                          {c.title} ({c.caseNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="edit-case"
                    placeholder="Enter case name"
                    value={editForm.case}
                    onChange={(e) => setEditForm({ ...editForm, case: e.target.value })}
                    className="bg-secondary/50 border-border/50"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-assignee">Assignee *</Label>
                  {members.length > 0 ? (
                    <Select
                      value={editForm.assignee}
                      onValueChange={(value) => {
                        const member = members.find((m) => getMemberDisplayName(m) === value)
                        setEditForm({
                          ...editForm,
                          assignee: value,
                          assigneeEmail: member?.email || "",
                        })
                      }}
                    >
                      <SelectTrigger className="bg-secondary/50 border-border/50 w-full">
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((member) => (
                          <SelectItem key={member.userId} value={getMemberDisplayName(member)}>
                            {getMemberDisplayName(member)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="edit-assignee"
                      placeholder="Enter assignee name"
                      value={editForm.assignee}
                      onChange={(e) => setEditForm({ ...editForm, assignee: e.target.value })}
                      className="bg-secondary/50 border-border/50"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-priority">Priority</Label>
                  <Select
                    value={editForm.priority}
                    onValueChange={(value: Task["priority"]) => setEditForm({ ...editForm, priority: value })}
                  >
                    <SelectTrigger className="bg-secondary/50 border-border/50 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(value: Task["status"]) => setEditForm({ ...editForm, status: value })}
                  >
                    <SelectTrigger className="bg-secondary/50 border-border/50 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="inProgress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-dueDate">Due Date</Label>
                  <Input
                    id="edit-dueDate"
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                    className="bg-secondary/50 border-border/50"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTask(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={!editForm.title || !editForm.case || !editForm.assignee || isSubmitting}
                className="bg-cyan text-primary-foreground hover:bg-cyan/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!taskToDelete} onOpenChange={() => setTaskToDelete(null)}>
          <AlertDialogContent className="bg-card border-border/50">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Delete Task</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Are you sure you want to delete "{taskToDelete?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border/50">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTask}
                disabled={isSubmitting}
                className="bg-red text-white hover:bg-red/90"
              >
                {isSubmitting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* New Task Dialog */}
        <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
          <DialogContent className="bg-card border-border/50 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl text-foreground">Create New Task</DialogTitle>
              <DialogDescription className="text-muted-foreground">Add a new task to your board</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter task title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="bg-secondary/50 border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter task description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="bg-secondary/50 border-border/50 min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="case">Related Case *</Label>
                {cases.length > 0 ? (
                  <Select
                    value={newTask.case}
                    onValueChange={(value) => setNewTask({ ...newTask, case: value })}
                  >
                    <SelectTrigger className="bg-secondary/50 border-border/50 w-full">
                      <SelectValue placeholder="Select a case" />
                    </SelectTrigger>
                    <SelectContent>
                      {cases.map((c) => (
                        <SelectItem key={c.id} value={c.title}>
                          {c.title} ({c.caseNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="case"
                    placeholder="Enter case name"
                    value={newTask.case}
                    onChange={(e) => setNewTask({ ...newTask, case: e.target.value })}
                    className="bg-secondary/50 border-border/50"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assignee">Assignee *</Label>
                  {members.length > 0 ? (
                    <Select
                      value={newTask.assignee}
                      onValueChange={(value) => {
                        const member = members.find((m) => getMemberDisplayName(m) === value)
                        setNewTask({
                          ...newTask,
                          assignee: value,
                          assigneeEmail: member?.email || "",
                        })
                      }}
                    >
                      <SelectTrigger className="bg-secondary/50 border-border/50 w-full">
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((member) => (
                          <SelectItem key={member.userId} value={getMemberDisplayName(member)}>
                            {getMemberDisplayName(member)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="assignee"
                      placeholder="Enter assignee name"
                      value={newTask.assignee}
                      onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                      className="bg-secondary/50 border-border/50"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value: Task["priority"]) => setNewTask({ ...newTask, priority: value })}
                  >
                    <SelectTrigger className="bg-secondary/50 border-border/50 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="bg-secondary/50 border-border/50"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewTaskDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateTask}
                disabled={!newTask.title || !newTask.case || !newTask.assignee || !newTask.dueDate || isSubmitting}
                className="bg-cyan text-primary-foreground hover:bg-cyan/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Task"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>

    </div>
  )
}
