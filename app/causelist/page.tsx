"use client"

import type React from "react"
import { useState, useMemo, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { useUserContext } from "@/lib/user-context"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Search,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  MapPin,
  Users,
  Gavel,
  FileText,
  ArrowUpDown,
  Zap,
  ExternalLink,
  ShieldCheck,
  Building2,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface CauselistItem {
  id: string
  sNo: number
  caseNumber: string
  caseType: string
  party: {
    petitioner: string
    respondent: string
  }
  petitionerAdvocate: string
  respondentAdvocate: string
  district: string
  remarks?: string
  courtNo: number
  judges: string[]
  hearingType:
    | "FOR ORDERS"
    | "INTERLOCUTORY"
    | "FOR HEARING"
    | "FOR ADMISSION"
    | "FINAL HEARING"
    | "OLD MATTERS"
    | "SPECIALLY MENTIONED"
  iaDetails?: string[]
}

interface CourtSection {
  courtNo: number
  judges: string[]
  date: string
  time: string
  mode: string
  notes?: string[]
  items: CauselistItem[]
}



type SortField = "sNo" | "caseNumber" | "petitioner" | "district" | "hearingType"
type SortDirection = "asc" | "desc"

const hearingTypeBadgeColor: Record<CauselistItem["hearingType"], string> = {
  "FOR ORDERS": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  INTERLOCUTORY: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "FOR HEARING": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "FOR ADMISSION": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "FINAL HEARING": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "OLD MATTERS": "bg-gray-500/20 text-gray-400 border-gray-500/30",
  "SPECIALLY MENTIONED": "bg-rose-500/20 text-rose-400 border-rose-500/30",
}

export default function CauselistPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedCourts, setExpandedCourts] = useState<number[]>([])
  const [selectedItem, setSelectedItem] = useState<CauselistItem | null>(null)
  const [sortField, setSortField] = useState<SortField>("sNo")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [showOnlyMyCases, setShowOnlyMyCases] = useState(false)
  
  // Connect State
  const [selectedState, setSelectedState] = useState<string>("")
  const [modalLawyerId, setModalLawyerId] = useState("")
  const [isSubmittingConnect, setIsSubmittingConnect] = useState(false)
  const [syncedCases, setSyncedCases] = useState<CourtSection[]>([])

  const { user, refreshUser, isLoading } = useUserContext()

  // Redirect to setup if no organization (client-side check)
  if (!isLoading && user && !user.organizationId) {
     if (typeof window !== 'undefined') window.location.href = '/setup';
  }

  // Load persisted synced data
  useEffect(() => {
      const fetchSyncedData = async () => {
          if (!user?.advocateCode) return;
          
          try {
              const response = await fetch('/api/sync/aphc');
              if (response.ok) {
                  const result = await response.json();
                  if (result.success && result.count > 0) {
                      console.log("Loaded persisted causelist data:", result.count);
                      
                       // Map synced data to UI Logic (Reused logic)
                        const mappedItems: CauselistItem[] = result.data.map((item: any, index: number) => ({
                             id: `persisted-${index}`,
                             sNo: parseInt(item.sNo) || index + 1,
                             caseNumber: item.caseDet ? item.caseDet.split(' ')[0] : "Unknown",
                             caseType: "Synced Case", 
                             party: {
                                 petitioner: item.party ? item.party.split('Vs')[0]?.trim() : "Unknown",
                                 respondent: item.party ? item.party.split('Vs')[1]?.trim() : "Unknown"
                             },
                             petitionerAdvocate: item.petAdv,
                             respondentAdvocate: item.resAdv,
                             district: item.district,
                             courtNo: 1, 
                             judges: ["Andhra Pradesh High Court"],
                             hearingType: "FOR HEARING",
                             iaDetails: [item.caseDet],
                             remarks: ""
                        }));
            
                        const syncedSection: CourtSection = {
                            courtNo: 1,
                            judges: ["Andhra Pradesh High Court"],
                            date: new Date().toLocaleDateString(),
                            time: "10:30 AM",
                            mode: "Physical/Hybrid",
                            items: mappedItems
                        };
            
                        setSyncedCases([syncedSection]);
                        setExpandedCourts([1]); // Auto-expand the synced court
                  } else {
                      console.log("No synced data found or count is 0");
                  }
              }
          } catch (error) {
              console.error("Failed to load synced data", error);
          }
      };
      
      console.log("Checking for user sync:", { code: user?.advocateCode, isLoading });
      if (user?.advocateCode && !isLoading) {
          fetchSyncedData();
      }
  }, [user?.advocateCode, isLoading]);

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowFormatted = tomorrow.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const toggleCourt = (courtNo: number) => {
    setExpandedCourts((prev) => (prev.includes(courtNo) ? prev.filter((c) => c !== courtNo) : [...prev, courtNo]))
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleConnectSubmit = async () => {
    if (!selectedState || !modalLawyerId) {
      toast.error("Please fill in all fields")
      return
    }

    setIsSubmittingConnect(true)
    try {
      // Logic: Only run full automation sync if state is Andhra Pradesh
      // Otherwise, just update the profile and show success.
      
      const isAndhraPradesh = selectedState === "Andhra Pradesh" || selectedState === "Andhrapradesh";
      
      if (isAndhraPradesh) {
         // 1. Trigger Automation Sync AND Profile Update (handled by sync api for simplicity or separately)
         // Actually sync api expects advocateCode. It will store data in UserCauselist.
         // We should ALSO update the profile so the user has the code permanently.
         
          const syncResponse = await fetch('/api/sync/aphc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ advocateCode: modalLawyerId, highCourt: selectedState }),
          });

          const syncResult = await syncResponse.json();
          
          if (syncResult.success) {
            console.log("Fetched Cause List JSON:", syncResult.data);
            toast.success(syncResult.message || "Synced with High Court successfully");

            // Map synced data to UI Logic
            const mappedItems: CauselistItem[] = syncResult.data.map((item: any, index: number) => ({
                 id: `synced-${index}`,
                 sNo: parseInt(item.sNo) || index + 1,
                 caseNumber: item.caseDet ? item.caseDet.split(' ')[0] : "Unknown",
                 caseType: "Synced Case", 
                 party: {
                     petitioner: item.party ? item.party.split('Vs')[0]?.trim() : "Unknown",
                     respondent: item.party ? item.party.split('Vs')[1]?.trim() : "Unknown"
                 },
                 petitionerAdvocate: item.petAdv,
                 respondentAdvocate: item.resAdv,
                 district: item.district,
                 courtNo: 1, 
                 judges: ["Andhra Pradesh High Court"],
                 hearingType: "FOR HEARING",
                 iaDetails: [item.caseDet],
                 remarks: ""
            }));

            const syncedSection: CourtSection = {
                courtNo: 1,
                judges: ["Andhra Pradesh High Court"],
                date: new Date().toLocaleDateString(),
                time: "10:30 AM",
                mode: "Physical/Hybrid",
                items: mappedItems
            };

            setSyncedCases([syncedSection]);
          } else {
             // If automation fails, we might still want to proceed with just profile update?
             // Or throw error. Let's throw error to be safe.
             throw new Error(syncResult.error || "Failed to sync with High Court");
          }
      }

      // 2. Always Update Profile with ID and High Court
      const profileResponse = await fetch('/api/users/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ advocateCode: modalLawyerId, highCourt: selectedState }),
      });

      if (profileResponse.ok) {
           await refreshUser();
           if (!isAndhraPradesh) {
               toast.success(`Connected to ${selectedState} successfully. (Automation pending for this region)`);
           }
      } else {
           const err = await profileResponse.json();
           throw new Error(err.error || "Failed to update profile");
      }

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Error connecting to portal')
    } finally {
      setIsSubmittingConnect(false)
    }
  }

  const displayData = syncedCases;

  const filteredData = useMemo(() => {
    return displayData
      .map((court) => ({
        ...court,
        items: court.items
          .filter((item) => {
            const query = searchQuery.toLowerCase()
            const matchesSearch = (
              item.caseNumber.toLowerCase().includes(query) ||
              item.party.petitioner.toLowerCase().includes(query) ||
              item.party.respondent.toLowerCase().includes(query) ||
              item.petitionerAdvocate.toLowerCase().includes(query) ||
              item.respondentAdvocate.toLowerCase().includes(query) ||
              item.district.toLowerCase().includes(query)
            )

            if (!matchesSearch) return false

            if (showOnlyMyCases && user?.advocateCode) {
              const advocateCodeKey = user.advocateCode.toLowerCase()
              return (
                item.petitionerAdvocate.toLowerCase().includes(advocateCodeKey) ||
                item.respondentAdvocate.toLowerCase().includes(advocateCodeKey)
              )
            }

            return true
          })
          .sort((a, b) => {
            let comparison = 0
            switch (sortField) {
              case "sNo":
                comparison = a.sNo - b.sNo
                break
              case "caseNumber":
                comparison = a.caseNumber.localeCompare(b.caseNumber)
                break
              case "petitioner":
                comparison = a.party.petitioner.localeCompare(b.party.petitioner)
                break
              case "district":
                comparison = a.district.localeCompare(b.district)
                break
              case "hearingType":
                comparison = a.hearingType.localeCompare(b.hearingType)
                break
            }
            return sortDirection === "asc" ? comparison : -comparison
          }),
      }))
      .filter((court) => court.items.length > 0)
  }, [searchQuery, sortField, sortDirection, showOnlyMyCases, user?.advocateCode])

  const totalCases = filteredData.reduce((sum, court) => sum + court.items.length, 0)

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:bg-card-hover transition-colors text-foreground"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={`h-3 w-3 ${sortField === field ? "text-cyan" : "text-muted-foreground"}`} />
        {sortField === field &&
          (sortDirection === "asc" ? (
            <ChevronUp className="h-3 w-3 text-cyan" />
          ) : (
            <ChevronDown className="h-3 w-3 text-cyan" />
          ))}
      </div>
    </TableHead>
  )

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Sidebar />
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan"></div>
      </div>
    )
  }

  // If no advocateCode, show centered connection card instead of tables
  if (!user?.advocateCode) {
    return (
        <div className="flex min-h-screen flex-col bg-background">
          <Sidebar />
          <div className="flex-1 ml-16 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan/5 via-transparent to-transparent">
            <Card className="w-full max-w-[550px] border-card-border bg-card/40 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in-95 duration-700">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-cyan/20 to-teal/10 flex items-center justify-center mb-8 relative group">
                   <div className="absolute inset-0 bg-cyan/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                   <Building2 className="h-10 w-10 text-cyan relative z-10" />
                </div>
                <CardTitle className="text-4xl font-black text-white tracking-tight uppercase">Litigation Sync</CardTitle>
                <CardDescription className="text-muted-foreground text-lg mt-3 max-w-[400px] mx-auto leading-relaxed">
                  Connect your professional profile to the High Court portals for unified case intelligence.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-8 px-10">
                <div className="grid gap-8">
                  <div className="grid gap-3">
                    <label className="text-xs font-bold text-cyan uppercase tracking-widest px-1 flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" /> High Court Jurisdiction
                    </label>
                    <Select onValueChange={setSelectedState} value={selectedState}>
                      <SelectTrigger className="h-14 bg-white/5 border-white/10 focus:ring-cyan/20 text-foreground text-base rounded-xl transition-all hover:bg-white/10">
                        <SelectValue placeholder="Select Court Location" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-card-border">
                        <SelectItem value="Telangana">Telangana High Court</SelectItem>
                        <SelectItem value="Andhrapradesh">Andhra Pradesh High Court</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-3">
                    <label className="text-xs font-bold text-cyan uppercase tracking-widest px-1 flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" /> Advocate Identification
                    </label>
                    <Input
                      placeholder="Enter Name or registration ID (e.g. T V S PRABHAKARA RAO)"
                      value={modalLawyerId}
                      onChange={(e) => setModalLawyerId(e.target.value)}
                      className="h-14 bg-white/5 border-white/10 focus:ring-cyan/20 text-base rounded-xl transition-all hover:bg-white/10 placeholder:text-muted-foreground/50"
                    />
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1 uppercase font-semibold">
                        <ShieldCheck className="h-3 w-3" /> Secure Port Connection
                      </p>
                      <p className="text-[10px] text-muted-foreground/40 italic">Match court records exactly</p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleConnectSubmit} 
                    className="w-full bg-cyan hover:bg-cyan/90 text-white font-black h-14 text-xl tracking-wide shadow-2xl shadow-cyan/30 transition-all hover:scale-[1.02] active:scale-[0.98] rounded-xl group overflow-hidden relative"
                    disabled={isSubmittingConnect || !selectedState || !modalLawyerId}
                  >
                    <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
                    {isSubmittingConnect ? (
                      <div className="flex items-center gap-3">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        <span>Initializing Sync...</span>
                      </div>
                    ) : (
                      <span className="flex items-center gap-2">
                        Initialize Practice Sync <ExternalLink className="h-5 w-5 opacity-50" />
                      </span>
                    )}
                  </Button>
                </div>
              </CardContent>
              <div className="mt-4 pb-8 text-center px-10">
                 <p className="text-[10px] text-muted-foreground/30 leading-normal">
                    By initializing sync, you grant Lawptimize permission to retrieve and index your publicly available court filings and schedule data from official High Court servers.
                 </p>
              </div>
            </Card>
          </div>
        </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Sidebar />
      <div className="flex-1 ml-16 flex flex-col">
        <div className="p-6 pb-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-foreground">Causelist</h1>
                <Badge variant="outline" className="bg-cyan/10 text-cyan border-cyan/30">
                  {totalCases} Cases Tomorrow
                </Badge>
                {user?.advocateCode && (
                   <Badge 
                    variant="outline" 
                    className={`cursor-pointer transition-all ${showOnlyMyCases ? 'bg-cyan text-white border-cyan' : 'bg-muted/50 text-muted-foreground border-card-border hover:border-cyan/50'}`}
                    onClick={() => setShowOnlyMyCases(!showOnlyMyCases)}
                   >
                     My Cases: {user.advocateCode}
                   </Badge>
                )}
              </div>
              <p className="text-muted-foreground">Cases scheduled for {tomorrowFormatted}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search cases, parties, advocates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80 bg-input border-input-border"
                />
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(hearingTypeBadgeColor).map(([type, className]) => (
              <Badge key={type} variant="outline" className={`${className} text-xs`}>
                {type}
              </Badge>
            ))}
          </div>
        </div>

        {/* Court Sections */}
        <div className="flex-1 overflow-auto px-6 pb-24 custom-scrollbar">
          <div className="space-y-4">
            {filteredData.map((court) => (
              <div key={court.courtNo} className="rounded-lg border border-card-border bg-card overflow-hidden">
                {/* Court Header */}
                <button
                  onClick={() => toggleCourt(court.courtNo)}
                  className="w-full flex items-center justify-between p-4 bg-card-hover hover:bg-sidebar-accent transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-cyan/20 text-cyan font-bold">
                      {court.courtNo}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">Court No. {court.courtNo}</h3>
                        <Badge variant="outline" className="bg-card text-muted-foreground border-card-border text-xs">
                          {court.items.length} {court.items.length === 1 ? "case" : "cases"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {court.judges.map((j) => j.replace("THE HONOURABLE SRI JUSTICE ", "Justice ")).join(", ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {court.time}
                      </span>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                        {court.mode}
                      </Badge>
                    </div>
                    {expandedCourts.includes(court.courtNo) ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Court Notes */}
                {expandedCourts.includes(court.courtNo) && court.notes && (
                  <div className="px-4 py-2 bg-amber-500/5 border-b border-card-border">
                    <ul className="text-xs text-amber-400 space-y-1">
                      {court.notes.map((note, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-500">•</span>
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Cases Table */}
                {expandedCourts.includes(court.courtNo) && (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-card-border hover:bg-transparent">
                        <SortHeader field="sNo">S.No</SortHeader>
                        <SortHeader field="caseNumber">Case Number</SortHeader>
                        <SortHeader field="petitioner">Parties</SortHeader>
                        <TableHead className="text-foreground">Petitioner Advocate</TableHead>
                        <TableHead className="text-foreground">Respondent Advocate</TableHead>
                        <SortHeader field="district">District</SortHeader>
                        <SortHeader field="hearingType">Type</SortHeader>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {court.items.map((item) => (
                        <TableRow
                          key={item.id}
                          className="border-card-border cursor-pointer hover:bg-card-hover transition-colors"
                          onClick={() => setSelectedItem(item)}
                        >
                          <TableCell className="font-medium text-foreground">{item.sNo}</TableCell>
                          <TableCell>
                            <div>
                                <span className="font-medium text-cyan">{item.caseNumber}</span>
                                {item.iaDetails && item.iaDetails.length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.iaDetails[0]}</p>
                                )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px]">
                              <p className="font-medium text-foreground truncate">{item.party.petitioner}</p>
                              <p className="text-xs text-muted-foreground">vs</p>
                              <p className="text-sm text-muted-foreground truncate">{item.party.respondent}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-foreground max-w-[150px] truncate">
                            {item.petitionerAdvocate}
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[150px] truncate">
                            {item.respondentAdvocate}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-card border-card-border text-foreground">
                              {item.district}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={hearingTypeBadgeColor[item.hearingType]}>
                              {item.hearingType}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            ))}

            {filteredData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No cases found</p>
                <p className="text-sm">Try adjusting your search query</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Case Detail Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-card-border text-foreground">
          {selectedItem && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-cyan/20">
                    <Gavel className="h-5 w-5 text-cyan" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl text-foreground">{selectedItem.caseNumber}</DialogTitle>
                    <p className="text-sm text-muted-foreground">{selectedItem.caseType}</p>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Hearing Info */}
                <div className="flex items-center gap-4 p-3 rounded-lg bg-card-hover">
                  <Badge variant="outline" className={hearingTypeBadgeColor[selectedItem.hearingType]}>
                    {selectedItem.hearingType}
                  </Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Court No. {selectedItem.courtNo}
                  </span>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {selectedItem.district}
                  </span>
                </div>

                {/* Parties */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-cyan" />
                    Parties
                  </h4>
                  <div className="grid gap-3 p-4 rounded-lg bg-card-hover">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Petitioner</p>
                      <p className="font-medium text-foreground">{selectedItem.party.petitioner}</p>
                    </div>
                    <div className="text-center text-muted-foreground text-sm">vs</div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Respondent</p>
                      <p className="font-medium text-foreground">{selectedItem.party.respondent}</p>
                    </div>
                  </div>
                </div>

                {/* Advocates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-card-hover">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Petitioner Advocate</p>
                    <p className="font-medium text-foreground">{selectedItem.petitionerAdvocate}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-card-hover">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Respondent Advocate</p>
                    <p className="font-medium text-foreground">{selectedItem.respondentAdvocate}</p>
                  </div>
                </div>

                {/* IA Details */}
                {selectedItem.iaDetails && selectedItem.iaDetails.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4 text-cyan" />
                      Interlocutory Applications / Related Cases
                    </h4>
                    <div className="space-y-2">
                      {selectedItem.iaDetails.map((ia, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 rounded bg-card-hover text-sm">
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
                          <span className="text-foreground">{ia}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remarks */}
                {selectedItem.remarks && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-400 uppercase tracking-wide mb-1">Remarks</p>
                    <p className="text-sm text-amber-300">{selectedItem.remarks}</p>
                  </div>
                )}

                {/* Judges */}
                <div className="p-4 rounded-lg bg-card-hover">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Bench</p>
                  <div className="space-y-1">
                    {selectedItem.judges.map((judge, idx) => (
                      <p key={idx} className="font-medium text-foreground">
                        Justice {judge}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
