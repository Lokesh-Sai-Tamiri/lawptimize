"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Plus,
  DollarSign,
  TrendingUp,
  CreditCard,
  MoreHorizontal,
  Receipt,
  FileText,
  Pencil,
  Trash2,
  Eye,
  Send,
  Download,
  IndianRupee,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"

type Client = {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  gstin?: string
}

type Case = {
  id: string
  title: string
  caseNumber: string
}

type Invoice = {
  id: string
  invoiceNumber: string
  clientId: string
  clientName: string
  clientEmail: string
  issueDate: string
  dueDate: string
  amount: number
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE"
  items: { description: string; amount: number }[]
  notes?: string
  pdfUrl?: string
}

type Expense = {
  id: string
  description: string
  category: string
  date: string
  amount: number
  caseId?: string
  caseName?: string
  clientId?: string
  clientName?: string
  billable: boolean
  invoiced: boolean
  invoiceId?: string
}

const expenseCategories = [
  "Court Fees",
  "Travel",
  "Legal Services",
  "Professional Services",
  "Subscriptions",
  "Office Supplies",
  "Communication",
  "Other",
]

const invoiceStatusStyles: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground border border-border",
  OVERDUE: "bg-red/15 text-red border border-red/30",
  SENT: "bg-yellow/15 text-yellow border border-yellow/30",
  PAID: "bg-green/15 text-green border border-green/30",
}

export default function FinancialsPage() {
  const [activeTab, setActiveTab] = useState<"invoices" | "expenses">("invoices")
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [cases, setCases] = useState<Case[]>([])
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([])

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Summary stats
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [pendingPayments, setPendingPayments] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [billableExpenses, setBillableExpenses] = useState(0)

  // Invoice dialogs
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false)
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null)

  // Expense dialogs
  const [showExpenseDialog, setShowExpenseDialog] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null)

  // Create invoice from expenses dialog
  const [showCreateInvoiceFromExpenses, setShowCreateInvoiceFromExpenses] = useState(false)

  // Client dialog
  const [showClientDialog, setShowClientDialog] = useState(false)
  const [clientForm, setClientForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    gstin: "",
  })

  // Form state for new/edit expense
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    category: "",
    date: new Date().toISOString().split("T")[0],
    amount: "",
    caseId: "",
    clientId: "",
    billable: true,
  })

  // Form state for new/edit invoice
  const [invoiceForm, setInvoiceForm] = useState({
    clientId: "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    notes: "",
    items: [{ description: "", amount: "" }],
  })

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setIsLoading(true)
      const [invoicesRes, expensesRes, clientsRes, casesRes] = await Promise.all([
        fetch('/api/invoices'),
        fetch('/api/expenses'),
        fetch('/api/clients'),
        fetch('/api/cases')
      ])

      if (!invoicesRes.ok || !expensesRes.ok || !clientsRes.ok || !casesRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const invoicesData = await invoicesRes.json()
      const expensesData = await expensesRes.json()
      const clientsData = await clientsRes.json()
      const casesData = await casesRes.json()

      setInvoices(invoicesData.invoices || [])
      setExpenses(expensesData.expenses || [])
      setClients(clientsData.clients || [])
      setCases(casesData.cases || [])

      // Update summary stats
      if (invoicesData.summary) {
        setTotalRevenue(invoicesData.summary.totalRevenue || 0)
        setPendingPayments(invoicesData.summary.pendingAmount || 0)
      }
      if (expensesData.summary) {
        setTotalExpenses(expensesData.summary.total || 0)
        setBillableExpenses(expensesData.summary.billableUninvoiced || 0)
      }
    } catch (error: any) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load financials data')
    } finally {
      setIsLoading(false)
    }
  }

  // Client CRUD
  const handleAddClient = () => {
    setClientForm({
      name: "",
      email: "",
      phone: "",
      address: "",
      gstin: "",
    })
    setShowClientDialog(true)
  }

  const handleSaveClient = async () => {
    if (!clientForm.name || !clientForm.email) {
      toast.error('Name and email are required')
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientForm),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create client')
      }

      setClients([...clients, data.client])
      setShowClientDialog(false)
      toast.success('Client created successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create client')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Expense CRUD
  const handleAddExpense = () => {
    setEditingExpense(null)
    setExpenseForm({
      description: "",
      category: "",
      date: new Date().toISOString().split("T")[0],
      amount: "",
      caseId: "",
      clientId: "",
      billable: true,
    })
    setShowExpenseDialog(true)
  }

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setExpenseForm({
      description: expense.description,
      category: expense.category,
      date: expense.date.split("/").reverse().join("-"),
      amount: expense.amount.toString(),
      caseId: expense.caseId || "",
      clientId: expense.clientId || "",
      billable: expense.billable,
    })
    setShowExpenseDialog(true)
  }

  const handleSaveExpense = async () => {
    if (!expenseForm.description || !expenseForm.category || !expenseForm.amount) {
      toast.error('Description, category, and amount are required')
      return
    }

    try {
      setIsSubmitting(true)

      if (editingExpense) {
        // Update expense
        const response = await fetch(`/api/expenses/${editingExpense.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: expenseForm.description,
            category: expenseForm.category,
            date: expenseForm.date,
            amount: parseFloat(expenseForm.amount),
            caseId: expenseForm.caseId || undefined,
            clientId: expenseForm.clientId || undefined,
            billable: expenseForm.billable,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update expense')
        }

        setExpenses(expenses.map(exp => exp.id === editingExpense.id ? data.expense : exp))
        toast.success('Expense updated successfully')
      } else {
        // Create expense
        const response = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: expenseForm.description,
            category: expenseForm.category,
            date: expenseForm.date,
            amount: parseFloat(expenseForm.amount),
            caseId: expenseForm.caseId || undefined,
            clientId: expenseForm.clientId || undefined,
            billable: expenseForm.billable,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create expense')
        }

        setExpenses([data.expense, ...expenses])
        toast.success('Expense created successfully')
      }

      setShowExpenseDialog(false)
      await fetchAllData() // Refresh to update summary stats
    } catch (error: any) {
      toast.error(error.message || 'Failed to save expense')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteExpense = async (id: string) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete expense')
      }

      setExpenses(expenses.filter(exp => exp.id !== id))
      setDeleteExpenseId(null)
      toast.success('Expense deleted successfully')
      await fetchAllData() // Refresh to update summary stats
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete expense')
    }
  }

  // Invoice CRUD
  const handleAddInvoice = () => {
    setEditingInvoice(null)
    setInvoiceForm({
      clientId: "",
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      notes: "",
      items: [{ description: "", amount: "" }],
    })
    setShowInvoiceDialog(true)
  }

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setInvoiceForm({
      clientId: invoice.clientId,
      issueDate: invoice.issueDate.split("/").reverse().join("-"),
      dueDate: invoice.dueDate.split("/").reverse().join("-"),
      notes: invoice.notes || "",
      items: invoice.items.map(item => ({
        description: item.description,
        amount: item.amount.toString(),
      })),
    })
    setShowInvoiceDialog(true)
  }

  const handleSaveInvoice = async () => {
    if (!invoiceForm.clientId || !invoiceForm.issueDate || !invoiceForm.dueDate || invoiceForm.items.length === 0) {
      toast.error('Client, issue date, due date, and at least one item are required')
      return
    }

    const hasEmptyItems = invoiceForm.items.some(item => !item.description || !item.amount)
    if (hasEmptyItems) {
      toast.error('All items must have a description and amount')
      return
    }

    try {
      setIsSubmitting(true)

      const requestBody = {
        clientId: invoiceForm.clientId,
        issueDate: invoiceForm.issueDate,
        dueDate: invoiceForm.dueDate,
        items: invoiceForm.items.map(item => ({
          description: item.description,
          amount: parseFloat(item.amount),
        })),
        notes: invoiceForm.notes || undefined,
      }

      if (editingInvoice) {
        // Update invoice
        const response = await fetch(`/api/invoices/${editingInvoice.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update invoice')
        }

        setInvoices(invoices.map(inv => inv.id === editingInvoice.id ? data.invoice : inv))
        toast.success('Invoice updated successfully')
      } else {
        // Create invoice
        const response = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create invoice')
        }

        setInvoices([data.invoice, ...invoices])
        toast.success('Invoice created successfully')
      }

      setShowInvoiceDialog(false)
      await fetchAllData() // Refresh to update summary stats
    } catch (error: any) {
      toast.error(error.message || 'Failed to save invoice')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteInvoice = async (id: string) => {
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete invoice')
      }

      setInvoices(invoices.filter(inv => inv.id !== id))
      setDeleteInvoiceId(null)
      toast.success(data.message || 'Invoice deleted successfully')
      await fetchAllData() // Refresh to update expenses and summary stats
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete invoice')
    }
  }

  const handleSendInvoice = async (id: string) => {
    try {
      toast.loading('Sending invoice...', { id: 'send-invoice' })

      const response = await fetch(`/api/invoices/${id}/send-email`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invoice')
      }

      // Update invoice status in state
      setInvoices(invoices.map(inv =>
        inv.id === id ? { ...inv, status: 'SENT' as const } : inv
      ))

      toast.success(data.message || 'Invoice sent successfully', { id: 'send-invoice' })
      await fetchAllData() // Refresh to get updated invoice
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invoice', { id: 'send-invoice' })
    }
  }

  const handleMarkAsPaid = async (id: string) => {
    try {
      const response = await fetch(`/api/invoices/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update invoice status')
      }

      setInvoices(invoices.map(inv =>
        inv.id === id ? data.invoice : inv
      ))

      toast.success('Invoice marked as paid')
      await fetchAllData() // Refresh to update summary stats
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark invoice as paid')
    }
  }

  const handleDownloadPDF = async (id: string, invoiceNumber: string) => {
    try {
      toast.loading('Generating PDF...', { id: 'download-pdf' })

      const response = await fetch(`/api/invoices/${id}/pdf`)

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoiceNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('PDF downloaded successfully', { id: 'download-pdf' })
    } catch (error: any) {
      toast.error(error.message || 'Failed to download PDF', { id: 'download-pdf' })
    }
  }

  // Convert expenses to invoice
  const handleCreateInvoiceFromExpenses = () => {
    if (selectedExpenses.length === 0) {
      toast.error('Please select at least one expense')
      return
    }

    // Get selected expense details
    const selectedExpenseDetails = expenses.filter(exp => selectedExpenses.includes(exp.id))

    // Pre-fill invoice form with expense items
    setInvoiceForm({
      clientId: selectedExpenseDetails[0]?.clientId || "",
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      notes: "",
      items: selectedExpenseDetails.map(exp => ({
        description: exp.description,
        amount: exp.amount.toString(),
      })),
    })

    setShowCreateInvoiceFromExpenses(true)
  }

  const handleConfirmCreateInvoiceFromExpenses = async () => {
    if (!invoiceForm.clientId || !invoiceForm.issueDate || !invoiceForm.dueDate) {
      toast.error('Client, issue date, and due date are required')
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch('/api/expenses/convert-to-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseIds: selectedExpenses,
          clientId: invoiceForm.clientId,
          issueDate: invoiceForm.issueDate,
          dueDate: invoiceForm.dueDate,
          notes: invoiceForm.notes || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to convert expenses to invoice')
      }

      // Refresh all data
      await fetchAllData()

      setShowCreateInvoiceFromExpenses(false)
      setSelectedExpenses([])
      setActiveTab('invoices')
      toast.success(data.message || 'Invoice created successfully from expenses')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create invoice from expenses')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Add/Remove invoice items
  const addInvoiceItem = () => {
    setInvoiceForm({
      ...invoiceForm,
      items: [...invoiceForm.items, { description: "", amount: "" }],
    })
  }

  const removeInvoiceItem = (index: number) => {
    setInvoiceForm({
      ...invoiceForm,
      items: invoiceForm.items.filter((_, i) => i !== index),
    })
  }

  const updateInvoiceItem = (index: number, field: "description" | "amount", value: string) => {
    const newItems = [...invoiceForm.items]
    newItems[index][field] = value
    setInvoiceForm({ ...invoiceForm, items: newItems })
  }

  // Toggle expense selection
  const toggleExpenseSelection = (id: string) => {
    setSelectedExpenses((prev) =>
      prev.includes(id) ? prev.filter((expId) => expId !== id) : [...prev, id]
    )
  }

  // View invoice details
  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setShowInvoiceDetail(true)
  }

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar />
        <main className="ml-16 flex-1 flex flex-col p-8 pb-24 overflow-hidden">
          <PageHeader
            title="Financials"
            description="Manage invoices, expenses, and billing"
            icon={<DollarSign className="h-8 w-8 text-primary" />}
          />
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>

      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="ml-16 flex-1 flex flex-col p-8 pb-24 overflow-hidden">
        <PageHeader
          title="Financials"
          description="Manage invoices, expenses, and billing"
          icon={<DollarSign className="h-8 w-8 text-primary" />}
        />
        <div className="flex-1 overflow-y-auto -mx-8 px-8">
          <div className="mx-auto max-w-[1600px]">
            {/* Summary Cards */}
            <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="mt-2 text-3xl font-bold">₹{totalRevenue.toLocaleString("en-IN")}</p>
                    <p className="mt-1 text-xs text-green">
                      <TrendingUp className="mr-1 inline h-3 w-3" />
                      From paid invoices
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green/10">
                    <DollarSign className="h-6 w-6 text-green" />
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Payments</p>
                    <p className="mt-2 text-3xl font-bold">₹{pendingPayments.toLocaleString("en-IN")}</p>
                    <p className="mt-1 text-xs text-yellow">
                      {invoices.filter(inv => inv.status === 'SENT' || inv.status === 'OVERDUE').length} pending invoices
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow/10">
                    <CreditCard className="h-6 w-6 text-yellow" />
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                    <p className="mt-2 text-3xl font-bold">₹{totalExpenses.toLocaleString("en-IN")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{expenses.length} total expenses</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Receipt className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Billable (Uninvoiced)</p>
                    <p className="mt-2 text-3xl font-bold">₹{billableExpenses.toLocaleString("en-IN")}</p>
                    <p className="mt-1 text-xs text-primary">
                      {expenses.filter(exp => exp.billable && !exp.invoiced).length} ready to invoice
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan/10">
                    <FileText className="h-6 w-6 text-cyan" />
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="card">
              <div className="border-b border-border px-6">
                <div className="flex items-center justify-between">
                  <div className="flex gap-8">
                    <button
                      onClick={() => setActiveTab("invoices")}
                      className={`pb-4 pt-6 text-sm font-medium transition-colors ${
                        activeTab === "invoices"
                          ? "border-b-2 border-primary text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Invoices ({invoices.length})
                    </button>
                    <button
                      onClick={() => setActiveTab("expenses")}
                      className={`pb-4 pt-6 text-sm font-medium transition-colors ${
                        activeTab === "expenses"
                          ? "border-b-2 border-primary text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Expenses ({expenses.length})
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {activeTab === "invoices" && (
                      <Button onClick={handleAddInvoice} size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        New Invoice
                      </Button>
                    )}
                    {activeTab === "expenses" && (
                      <>
                        {selectedExpenses.length > 0 && (
                          <Button onClick={handleCreateInvoiceFromExpenses} size="sm" variant="secondary">
                            <FileText className="mr-2 h-4 w-4" />
                            Create Invoice ({selectedExpenses.length})
                          </Button>
                        )}
                        <Button onClick={handleAddExpense} size="sm">
                          <Plus className="mr-2 h-4 w-4" />
                          New Expense
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6">
                {activeTab === "invoices" && (
                  <div className="space-y-4">
                    {invoices.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground">
                        <FileText className="mx-auto h-12 w-12 mb-4 opacity-20" />
                        <p>No invoices yet</p>
                        <p className="text-sm mt-2">Create your first invoice to get started</p>
                      </div>
                    ) : (
                      invoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{invoice.invoiceNumber}</p>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                    invoiceStatusStyles[invoice.status]
                                  }`}
                                >
                                  {invoice.status}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{invoice.clientName}</p>
                              <p className="text-xs text-muted-foreground">
                                Issued: {invoice.issueDate} • Due: {invoice.dueDate}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-semibold">₹{invoice.amount.toLocaleString("en-IN")}</p>
                              <p className="text-xs text-muted-foreground">{invoice.items.length} items</p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewInvoice(invoice)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                {invoice.status === 'DRAFT' && (
                                  <DropdownMenuItem onClick={() => handleEditInvoice(invoice)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                )}
                                {(invoice.status === 'DRAFT' || invoice.status === 'SENT') && (
                                  <DropdownMenuItem onClick={() => handleSendInvoice(invoice.id)}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Send Invoice
                                  </DropdownMenuItem>
                                )}
                                {(invoice.status === 'SENT' || invoice.status === 'OVERDUE') && (
                                  <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice.id)}>
                                    <DollarSign className="mr-2 h-4 w-4" />
                                    Mark as Paid
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleDownloadPDF(invoice.id, invoice.invoiceNumber)}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Download PDF
                                </DropdownMenuItem>
                                {invoice.status === 'DRAFT' && (
                                  <DropdownMenuItem
                                    onClick={() => setDeleteInvoiceId(invoice.id)}
                                    className="text-red"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === "expenses" && (
                  <div className="space-y-4">
                    {expenses.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground">
                        <Receipt className="mx-auto h-12 w-12 mb-4 opacity-20" />
                        <p>No expenses yet</p>
                        <p className="text-sm mt-2">Track your first expense to get started</p>
                      </div>
                    ) : (
                      expenses.map((expense) => (
                        <div
                          key={expense.id}
                          className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            {expense.billable && !expense.invoiced && (
                              <Checkbox
                                checked={selectedExpenses.includes(expense.id)}
                                onCheckedChange={() => toggleExpenseSelection(expense.id)}
                              />
                            )}
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                              <Receipt className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{expense.description}</p>
                                {expense.invoiced ? (
                                  <span className="rounded-full bg-green/15 px-2 py-0.5 text-xs font-medium text-green">
                                    INVOICED
                                  </span>
                                ) : expense.billable ? (
                                  <span className="rounded-full bg-cyan/15 px-2 py-0.5 text-xs font-medium text-cyan">
                                    BILLABLE
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                    NON-BILLABLE
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {expense.category} • {expense.date}
                              </p>
                              {(expense.caseName || expense.clientName) && (
                                <p className="text-xs text-muted-foreground">
                                  {expense.caseName && `Case: ${expense.caseName}`}
                                  {expense.caseName && expense.clientName && " • "}
                                  {expense.clientName && `Client: ${expense.clientName}`}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-semibold">₹{expense.amount.toLocaleString("en-IN")}</p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" disabled={expense.invoiced}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditExpense(expense)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteExpenseId(expense.id)}
                                  className="text-red"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>


      {/* Client Dialog */}
      <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>Create a new client for invoicing</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="client-name">Name *</Label>
              <Input
                id="client-name"
                value={clientForm.name}
                onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                placeholder="Client name"
              />
            </div>
            <div>
              <Label htmlFor="client-email">Email *</Label>
              <Input
                id="client-email"
                type="email"
                value={clientForm.email}
                onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                placeholder="client@example.com"
              />
            </div>
            <div>
              <Label htmlFor="client-phone">Phone</Label>
              <Input
                id="client-phone"
                value={clientForm.phone}
                onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                placeholder="+91 9876543210"
              />
            </div>
            <div>
              <Label htmlFor="client-address">Address</Label>
              <Textarea
                id="client-address"
                value={clientForm.address}
                onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                placeholder="Full address"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="client-gstin">GSTIN</Label>
              <Input
                id="client-gstin"
                value={clientForm.gstin}
                onChange={(e) => setClientForm({ ...clientForm, gstin: e.target.value })}
                placeholder="GST Identification Number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClientDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveClient} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Edit Expense" : "Add New Expense"}</DialogTitle>
            <DialogDescription>
              {editingExpense ? "Update expense details" : "Track a new expense"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="expense-description">Description *</Label>
              <Input
                id="expense-description"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                placeholder="What was this expense for?"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expense-category">Category *</Label>
                <Select value={expenseForm.category} onValueChange={(value) => setExpenseForm({ ...expenseForm, category: value })}>
                  <SelectTrigger id="expense-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="expense-date">Date *</Label>
                <Input
                  id="expense-date"
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="expense-amount">Amount (₹) *</Label>
              <Input
                id="expense-amount"
                type="number"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <Label htmlFor="expense-case">Case (Optional)</Label>
              <Select value={expenseForm.caseId || "NONE"} onValueChange={(value) => setExpenseForm({ ...expenseForm, caseId: value === "NONE" ? "" : value })}>
                <SelectTrigger id="expense-case">
                  <SelectValue placeholder="Select case" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No case</SelectItem>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.caseNumber} - {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="expense-client">Client (Optional)</Label>
              <Select value={expenseForm.clientId || "NONE"} onValueChange={(value) => setExpenseForm({ ...expenseForm, clientId: value === "NONE" ? "" : value })}>
                <SelectTrigger id="expense-client">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No client</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="expense-billable"
                checked={expenseForm.billable}
                onCheckedChange={(checked) => setExpenseForm({ ...expenseForm, billable: checked as boolean })}
              />
              <Label htmlFor="expense-billable" className="cursor-pointer">
                Billable to client
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExpenseDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveExpense} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingExpense ? "Update" : "Add"} Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInvoice ? "Edit Invoice" : "Create New Invoice"}</DialogTitle>
            <DialogDescription>
              {editingInvoice ? "Update invoice details" : "Generate a new invoice for your client"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="invoice-client">Client *</Label>
                <Select value={invoiceForm.clientId} onValueChange={(value) => setInvoiceForm({ ...invoiceForm, clientId: value })}>
                  <SelectTrigger id="invoice-client">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddClient}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice-issue-date">Issue Date *</Label>
                <Input
                  id="invoice-issue-date"
                  type="date"
                  value={invoiceForm.issueDate}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, issueDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="invoice-due-date">Due Date *</Label>
                <Input
                  id="invoice-due-date"
                  type="date"
                  value={invoiceForm.dueDate}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Line Items *</Label>
              <div className="space-y-2">
                {invoiceForm.items.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateInvoiceItem(index, "description", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={item.amount}
                      onChange={(e) => updateInvoiceItem(index, "amount", e.target.value)}
                      className="w-32"
                      min="0"
                      step="0.01"
                    />
                    {invoiceForm.items.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeInvoiceItem(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addInvoiceItem} className="mt-2">
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
            <div>
              <Label htmlFor="invoice-notes">Notes (Optional)</Label>
              <Textarea
                id="invoice-notes"
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                placeholder="Additional notes or payment terms"
                rows={3}
              />
            </div>
            <div className="rounded-lg bg-muted p-4">
              <div className="flex justify-between text-sm">
                <span>Total:</span>
                <span className="font-bold text-lg">
                  ₹
                  {invoiceForm.items
                    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
                    .toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoiceDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveInvoice} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingInvoice ? "Update" : "Create"} Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Invoice from Expenses Dialog */}
      <Dialog open={showCreateInvoiceFromExpenses} onOpenChange={setShowCreateInvoiceFromExpenses}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Invoice from Expenses</DialogTitle>
            <DialogDescription>
              Convert {selectedExpenses.length} selected expense(s) into an invoice
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="convert-client">Client *</Label>
                <Select value={invoiceForm.clientId} onValueChange={(value) => setInvoiceForm({ ...invoiceForm, clientId: value })}>
                  <SelectTrigger id="convert-client">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddClient}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="convert-issue-date">Issue Date *</Label>
                <Input
                  id="convert-issue-date"
                  type="date"
                  value={invoiceForm.issueDate}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, issueDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="convert-due-date">Due Date *</Label>
                <Input
                  id="convert-due-date"
                  type="date"
                  value={invoiceForm.dueDate}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Expense Items</Label>
              <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                {expenses
                  .filter(exp => selectedExpenses.includes(exp.id))
                  .map((expense) => (
                    <div key={expense.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{expense.description}</p>
                        <p className="text-xs text-muted-foreground">{expense.category}</p>
                      </div>
                      <p className="font-semibold">₹{expense.amount.toLocaleString("en-IN")}</p>
                    </div>
                  ))}
              </div>
            </div>
            <div>
              <Label htmlFor="convert-notes">Notes (Optional)</Label>
              <Textarea
                id="convert-notes"
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                placeholder="Additional notes or payment terms"
                rows={3}
              />
            </div>
            <div className="rounded-lg bg-primary/10 p-4">
              <div className="flex justify-between text-sm">
                <span>Total Amount:</span>
                <span className="font-bold text-lg text-primary">
                  ₹
                  {expenses
                    .filter(exp => selectedExpenses.includes(exp.id))
                    .reduce((sum, exp) => sum + exp.amount, 0)
                    .toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateInvoiceFromExpenses(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleConfirmCreateInvoiceFromExpenses} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Detail Dialog */}
      <Dialog open={showInvoiceDetail} onOpenChange={setShowInvoiceDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>{selectedInvoice?.invoiceNumber}</DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Client</Label>
                  <p className="font-medium">{selectedInvoice.clientName}</p>
                  <p className="text-sm text-muted-foreground">{selectedInvoice.clientEmail}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                      invoiceStatusStyles[selectedInvoice.status]
                    }`}
                  >
                    {selectedInvoice.status}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Issue Date</Label>
                  <p className="font-medium">{selectedInvoice.issueDate}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Due Date</Label>
                  <p className="font-medium">{selectedInvoice.dueDate}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Line Items</Label>
                <div className="space-y-2">
                  {selectedInvoice.items.map((item, index) => (
                    <div key={index} className="flex justify-between p-3 bg-muted rounded-lg">
                      <span>{item.description}</span>
                      <span className="font-semibold">₹{item.amount.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              </div>
              {selectedInvoice.notes && (
                <div>
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <p className="mt-1 text-sm">{selectedInvoice.notes}</p>
                </div>
              )}
              <div className="rounded-lg bg-primary/10 p-4">
                <div className="flex justify-between">
                  <span className="font-semibold">Total Amount:</span>
                  <span className="font-bold text-xl text-primary">
                    ₹{selectedInvoice.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoiceDetail(false)}>
              Close
            </Button>
            {selectedInvoice && (
              <Button onClick={() => handleDownloadPDF(selectedInvoice.id, selectedInvoice.invoiceNumber)}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Expense Confirmation */}
      <AlertDialog open={deleteExpenseId !== null} onOpenChange={(open) => !open && setDeleteExpenseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteExpenseId && handleDeleteExpense(deleteExpenseId)} className="bg-red hover:bg-red/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Invoice Confirmation */}
      <AlertDialog open={deleteInvoiceId !== null} onOpenChange={(open) => !open && setDeleteInvoiceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice? Associated expenses will be unlinked and marked as uninvoiced. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteInvoiceId && handleDeleteInvoice(deleteInvoiceId)} className="bg-red hover:bg-red/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
