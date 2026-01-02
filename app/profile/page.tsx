'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { User, Shield, Building2, Mail, Calendar, CheckSquare, Briefcase, DollarSign, Save, Loader2, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUserContext } from '@/lib/user-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, isAdmin, refreshUser } = useUserContext();
  const [isSaving, setIsSaving] = useState(false);
  const [dashboardData, setDashboardData] = useState<{
    tasks: any[];
    cases: any[];
    invoices: any[];
  }>({
    tasks: [],
    cases: [],
    invoices: [],
  });
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);

  useEffect(() => {
    if (user) {
      if (!user.organizationId && !user.role) {
         window.location.href = '/setup';
      }
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setIsLoadingDashboard(true);
    try {
      const [tasksRes, casesRes, invoicesRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/cases'),
        fetch('/api/invoices')
      ]);

      const [tasksData, casesData, invoicesData] = await Promise.all([
        tasksRes.json(),
        casesRes.json(),
        invoicesRes.json()
      ]);

      setDashboardData({
        tasks: tasksData.tasks || [],
        cases: casesData.cases || [],
        invoices: invoicesData.invoices || [],
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoadingDashboard(false);
    }
  };



  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect? This will clear your advocate code and high court settings.")) return;
    
    setIsSaving(true);
    try {
      // Send empty strings to clear the values
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ advocateCode: "", highCourt: "" }),
      });

        if (response.ok) {
        toast.success('Profile disconnected successfully');
        await refreshUser();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disconnect profile');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error disconnecting profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="ml-16 flex-1 p-8 pb-24">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 tracking-tight">Professional Profile</h1>
            <p className="text-muted-foreground">Manage your credentials and view your practice overview</p>
          </div>
          <ThemeToggle />
        </div>

        <div className="grid gap-8">
          {/* Top Profile Card */}
          <Card className="border-card-border bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <User className="h-24 w-24" />
            </div>
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="relative group">
                  {user.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt={user.firstName || 'User'}
                      className="h-24 w-24 rounded-2xl object-cover border-2 border-cyan/20 ring-4 ring-cyan/5 ring-offset-background"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-cyan/20 to-teal/10 flex items-center justify-center border-2 border-cyan/20">
                      <User className="h-10 w-10 text-cyan" />
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-2">
                    <Badge variant="default" className="bg-cyan text-white border-0">
                      {isAdmin ? 'Admin' : 'Member'}
                    </Badge>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h2 className="text-3xl font-bold text-foreground">
                        {user.firstName} {user.lastName}
                      </h2>
                      <div className="flex items-center gap-4 mt-1 text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-4 w-4" />
                          {user.email}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-4 w-4" />
                          {user.organizationName || 'No Organization'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-4 min-w-[300px]">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Advocate Code
                          </label>
                          <div className="flex h-10 w-full items-center rounded-md border border-card-border bg-background/50 px-3 py-2 text-sm text-foreground">
                            {user.advocateCode || 'Not Set'}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                           <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Jurisdiction
                          </label>
                          <div className="flex h-10 w-full items-center rounded-md border border-card-border bg-background/50 px-3 py-2 text-sm text-foreground">
                             {user.highCourt ? (user.highCourt === 'Andhrapradesh' ? 'Andhra Pradesh' : user.highCourt) : 'Not Set'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        
                        {(user.advocateCode || user.highCourt) && (
                           <Button 
                             variant="outline"
                             onClick={handleDisconnect}
                             disabled={isSaving}
                             className="w-full border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-600"
                           >
                             {isSaving ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Disconnecting...
                                </>
                             ) : (
                                "Disconnect Profile"
                             )}
                           </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Dashboard Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                Practice Dashboard
                <button 
                  onClick={fetchDashboardData}
                  className="p-1 hover:bg-card-hover rounded-md transition-colors"
                >
                  <RefreshCw className={`h-4 w-4 text-muted-foreground ${isLoadingDashboard ? 'animate-spin' : ''}`} />
                </button>
              </h3>
            </div>

            <Tabs defaultValue="tasks" className="w-full">
              <TabsList className="bg-card border border-card-border p-1">
                <TabsTrigger value="tasks" className="flex items-center gap-2 px-6 py-2.5">
                  <CheckSquare className="h-4 w-4" />
                  Tasks
                  <Badge variant="secondary" className="ml-1 bg-muted/60 text-[10px] px-1.5 h-4 min-w-[20px] rounded-full">
                    {dashboardData.tasks.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="cases" className="flex items-center gap-2 px-6 py-2.5">
                  <Briefcase className="h-4 w-4" />
                  Cases
                  <Badge variant="secondary" className="ml-1 bg-muted/60 text-[10px] px-1.5 h-4 min-w-[20px] rounded-full">
                    {dashboardData.cases.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="invoices" className="flex items-center gap-2 px-6 py-2.5">
                  <DollarSign className="h-4 w-4" />
                  Invoices
                  <Badge variant="secondary" className="ml-1 bg-muted/60 text-[10px] px-1.5 h-4 min-w-[20px] rounded-full">
                    {dashboardData.invoices.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="tasks" className="m-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoadingDashboard ? (
                      Array(3).fill(0).map((_, i) => (
                        <Card key={i} className="animate-pulse bg-card/50 h-32" />
                      ))
                    ) : dashboardData.tasks.length > 0 ? (
                      dashboardData.tasks.slice(0, 6).map((task) => (
                        <Card key={task.id} className="bg-card/50 border-card-border hover:border-cyan/50 transition-all cursor-default group">
                          <CardHeader className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <Badge 
                                variant="outline" 
                                className={
                                  task.priority === 'URGENT' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                  task.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                  'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
                                }
                              >
                                {task.priority}
                              </Badge>
                              <span className="text-[10px] font-mono text-muted-foreground">{task.dueDate || 'No date'}</span>
                            </div>
                            <CardTitle className="text-sm font-semibold line-clamp-1 group-hover:text-cyan transition-colors">
                              {task.title}
                            </CardTitle>
                            <CardDescription className="text-xs mt-1 line-clamp-1">
                              {task.case}
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      ))
                    ) : (
                      <div className="col-span-full py-12 text-center bg-card/20 rounded-xl border border-dashed border-card-border">
                        <CheckSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-muted-foreground">No tasks assigned to you</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="cases" className="m-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoadingDashboard ? (
                      Array(3).fill(0).map((_, i) => (
                        <Card key={i} className="animate-pulse bg-card/50 h-32" />
                      ))
                    ) : dashboardData.cases.length > 0 ? (
                      dashboardData.cases.slice(0, 6).map((item) => (
                        <Card key={item.id} className="bg-card/50 border-card-border hover:border-cyan/50 transition-all cursor-default group">
                          <CardHeader className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-mono text-cyan">{item.caseNumber}</span>
                              <Badge variant="outline" className="text-[10px] py-0">{item.stage}</Badge>
                            </div>
                            <CardTitle className="text-sm font-semibold line-clamp-1 group-hover:text-cyan transition-colors">
                              {item.title}
                            </CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {item.court}
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      ))
                    ) : (
                      <div className="col-span-full py-12 text-center bg-card/20 rounded-xl border border-dashed border-card-border">
                        <Briefcase className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-muted-foreground">No cases found in your practice</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="invoices" className="m-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoadingDashboard ? (
                      Array(3).fill(0).map((_, i) => (
                        <Card key={i} className="animate-pulse bg-card/50 h-32" />
                      ))
                    ) : dashboardData.invoices.length > 0 ? (
                      dashboardData.invoices.slice(0, 6).map((inv) => (
                        <Card key={inv.id} className="bg-card/50 border-card-border hover:border-cyan/50 transition-all cursor-default group">
                          <CardHeader className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-mono text-muted-foreground">{inv.invoiceNumber}</span>
                              <Badge 
                                variant="outline" 
                                className={
                                  inv.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                  inv.status === 'OVERDUE' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                  'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
                                }
                              >
                                {inv.status}
                              </Badge>
                            </div>
                            <CardTitle className="text-sm font-semibold group-hover:text-cyan transition-colors">
                              ₹{inv.amount.toLocaleString('en-IN')}
                            </CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {inv.clientName}
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      ))
                    ) : (
                      <div className="col-span-full py-12 text-center bg-card/20 rounded-xl border border-dashed border-card-border">
                        <DollarSign className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-muted-foreground">No invoices generated yet</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}

