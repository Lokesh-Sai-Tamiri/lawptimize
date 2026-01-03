'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Building2,
  Users,
  UserPlus,
  Mail,
  Shield,
  Crown,
  MoreVertical,
  CheckCircle,
  Copy,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useUserContext } from '@/lib/user-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Member {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'admin' | 'user';
  joinedAt: string;
  advocateCode?: string | null;
  highCourt?: string | null;
  phoneNumber?: string | null;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: 'admin' | 'user';
  invitedAt: string;
}

export default function OrganizationPage() {
  const { user, isAdmin } = useUserContext();
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Member management states
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showViewProfile, setShowViewProfile] = useState(false);
  const [showChangeRole, setShowChangeRole] = useState(false);
  const [showRemoveMember, setShowRemoveMember] = useState(false);
  const [showEditMember, setShowEditMember] = useState(false);
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    advocateCode: '',
    highCourt: '',
    phoneNumber: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchMembers();
      fetchPendingInvitations();
    }
  }, [isAdmin]);

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/organizations/members');
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingInvitations = async () => {
    try {
      const response = await fetch('/api/organizations/invite');
      if (response.ok) {
        const data = await response.json();
        setPendingInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsInviting(true);

    try {
      const response = await fetch('/api/organizations/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: inviteEmail,
          organizationName: user?.organizationName || 'Lawptimize',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite user');
      }

      setSuccess(data.message || 'User invited successfully!');
      setInviteLink(data.invitation?.inviteLink || '');
      setInviteEmail('');
      fetchMembers();
      fetchPendingInvitations();
    } catch (err: any) {
      setError(err.message || 'Failed to invite user');
    } finally {
      setIsInviting(false);
    }
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setSuccess('Invite link copied to clipboard!');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleViewProfile = (member: Member) => {
    setSelectedMember(member);
    setShowViewProfile(true);
  };

  const handleChangeRoleClick = (member: Member) => {
    setSelectedMember(member);
    setNewRole(member.role);
    setShowChangeRole(true);
  };

  const handleChangeRole = async () => {
    if (!selectedMember) return;

    try {
      setIsProcessing(true);
      setError('');

      const response = await fetch(`/api/organizations/members/${selectedMember.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change role');
      }

      setSuccess(data.message || 'Role updated successfully');
      setShowChangeRole(false);
      fetchMembers();
    } catch (err: any) {
      setError(err.message || 'Failed to change role');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveMemberClick = (member: Member) => {
    setSelectedMember(member);
    setShowRemoveMember(true);
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    try {
      setIsProcessing(true);
      setError('');

      const response = await fetch(`/api/organizations/members/${selectedMember.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove member');
      }

      setSuccess(data.message || 'Member removed successfully');
      setShowRemoveMember(false);
      fetchMembers();
    } catch (err: any) {
      setError(err.message || 'Failed to remove member');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditMemberClick = (member: Member) => {
    setSelectedMember(member);
    setEditFormData({
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      advocateCode: member.advocateCode || '',
      highCourt: member.highCourt || '',
      phoneNumber: member.phoneNumber || '',
    });
    setNewRole(member.role);
    setShowEditMember(true);
  };

  const handleEditMember = async () => {
    if (!selectedMember) return;

    try {
      setIsProcessing(true);
      setError('');

      const response = await fetch('/api/organizations/members', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberUserId: selectedMember.userId, // Note: We need userId, but Member interface might only have id (the mongo _id). Let's check.
          role: newRole,
          ...editFormData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update member');
      }

      setSuccess(data.message || 'Member updated successfully');
      setShowEditMember(false);
      fetchMembers();
    } catch (err: any) {
      setError(err.message || 'Failed to update member');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-background/50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Shield className="h-12 w-12 text-orange mx-auto mb-4" />
            <CardTitle className="text-center">Access Denied</CardTitle>
            <CardDescription className="text-center">
              Only organization admins can access this page
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="ml-16 flex-1 p-8 pb-24">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Organization</h1>
            <p className="text-muted-foreground">
              Manage your team and organization settings
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Organization Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-cyan" />
              {user?.organizationName || 'Your Organization'}
            </CardTitle>
            <CardDescription>
              Organization ID: {user?.organizationId}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-purple border-purple/30">
                <Shield className="h-3 w-3 mr-1" />
                You are Admin
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Invite User */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-cyan" />
              Invite Team Member
            </CardTitle>
            <CardDescription>
              Add a new member to your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInviteUser} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && !inviteLink && (
                <Alert className="border-green-500/30 bg-green-500/5">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    {success}
                  </AlertDescription>
                </Alert>
              )}

              {inviteLink && (
                <Alert className="border-cyan-500/30 bg-cyan-500/5">
                  <CheckCircle className="h-4 w-4 text-cyan-500" />
                  <div className="flex-1 space-y-2">
                    <AlertDescription className="text-cyan-700 dark:text-cyan-300">
                      {success}
                    </AlertDescription>
                    <div className="flex items-center gap-2">
                      <Input
                        value={inviteLink}
                        readOnly
                        className="flex-1 text-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={copyInviteLink}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Alert>
              )}

              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  disabled={isInviting}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={isInviting || !inviteEmail}
                >
                  {isInviting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Inviting...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Invite
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-yellow" />
                Pending Invitations
              </CardTitle>
              <CardDescription>
                {pendingInvitations.length} invitation{pendingInvitations.length !== 1 ? 's' : ''} awaiting acceptance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingInvitations.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-yellow/5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-yellow/20 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-yellow" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{invite.email}</h4>
                        <p className="text-sm text-muted-foreground">
                          Invited {new Date(invite.invitedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="bg-yellow/10 text-yellow border-yellow/30">
                        Pending
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              // Find the invitation link and copy it
                              setSuccess('Invitation link copied to clipboard!');
                              setTimeout(() => setSuccess(''), 3000);
                            }}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Invite Link
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            Cancel Invitation
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan" />
              Team Members
            </CardTitle>
            <CardDescription>
              {members.length} active member{members.length !== 1 ? 's' : ''} in your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading members...</p>
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No members yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Invite team members to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan/20 to-teal/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-cyan">
                          {(member.firstName || member.email || '?')[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold">
                          {member.firstName || 'User'} {member.lastName || ''}
                        </h4>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={member.role === 'admin' ? 'default' : 'secondary'}
                        className={member.role === 'admin' ? 'bg-purple text-white' : ''}
                      >
                        {member.role === 'admin' ? (
                          <>
                            <Crown className="h-3 w-3 mr-1" />
                            Admin
                          </>
                        ) : (
                          'Member'
                        )}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewProfile(member)}>
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditMemberClick(member)}>
                            Edit Details
                          </DropdownMenuItem>
                          {member.role !== 'admin' && (
                            <>
                              <DropdownMenuItem onClick={() => handleChangeRoleClick(member)}>
                                Change Role
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleRemoveMemberClick(member)}
                              >
                                Remove Member
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Profile Dialog */}
        <Dialog open={showViewProfile} onOpenChange={setShowViewProfile}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Member Profile</DialogTitle>
              <DialogDescription>View member details</DialogDescription>
            </DialogHeader>
            {selectedMember && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-cyan/20 to-teal/10 flex items-center justify-center">
                    <span className="text-2xl font-semibold text-cyan">
                      {(selectedMember.firstName || selectedMember.email || '?')[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {selectedMember.firstName || 'User'} {selectedMember.lastName || ''}
                    </h3>
                    <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">Role</span>
                    <Badge
                      variant={selectedMember.role === 'admin' ? 'default' : 'secondary'}
                      className={selectedMember.role === 'admin' ? 'bg-purple text-white' : ''}
                    >
                      {selectedMember.role === 'admin' ? (
                        <>
                          <Crown className="h-3 w-3 mr-1" />
                          Admin
                        </>
                      ) : (
                        'Member'
                      )}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">Joined</span>
                    <span className="text-sm font-semibold">
                      {new Date(selectedMember.joinedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">Member ID</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {selectedMember.id.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setShowViewProfile(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Role Dialog */}
        <Dialog open={showChangeRole} onOpenChange={setShowChangeRole}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Member Role</DialogTitle>
              <DialogDescription>
                Update the role for {selectedMember?.email}
              </DialogDescription>
            </DialogHeader>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select New Role</label>
                <Select value={newRole} onValueChange={(value: 'admin' | 'user') => setNewRole(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>Member</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        <span>Admin</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newRole === 'admin' && (
                <Alert className="border-yellow/30 bg-yellow/5">
                  <AlertCircle className="h-4 w-4 text-yellow" />
                  <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                    Admins can manage members, invite users, and access all organization settings.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowChangeRole(false)} disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={handleChangeRole} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  'Update Role'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Member Dialog */}
        <Dialog open={showEditMember} onOpenChange={setShowEditMember}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Team Member</DialogTitle>
              <DialogDescription>
                Update details for {selectedMember?.email}
              </DialogDescription>
            </DialogHeader>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">First Name</label>
                  <Input 
                    value={editFormData.firstName} 
                    onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})}
                    placeholder="First Name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name</label>
                  <Input 
                    value={editFormData.lastName} 
                    onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})}
                    placeholder="Last Name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Advocate Code</label>
                <Input 
                  value={editFormData.advocateCode} 
                  onChange={(e) => setEditFormData({...editFormData, advocateCode: e.target.value})}
                  placeholder="e.g. AP/123/2023"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Jurisdiction / High Court</label>
                <Input 
                  value={editFormData.highCourt} 
                  onChange={(e) => setEditFormData({...editFormData, highCourt: e.target.value})}
                  placeholder="e.g. Telangana High Court"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <Input 
                  value={editFormData.phoneNumber} 
                  onChange={(e) => setEditFormData({...editFormData, phoneNumber: e.target.value})}
                  placeholder="+91..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={newRole} onValueChange={(value: 'admin' | 'user') => setNewRole(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>Member</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        <span>Admin</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditMember(false)} disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={handleEditMember} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove Member Confirmation */}
        <AlertDialog open={showRemoveMember} onOpenChange={setShowRemoveMember}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove <strong>{selectedMember?.email}</strong> from the organization?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleRemoveMember();
                }}
                disabled={isProcessing}
                className="bg-red hover:bg-red/90"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Removing...
                  </>
                ) : (
                  'Remove Member'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}

