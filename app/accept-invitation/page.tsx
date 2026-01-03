'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, useSignIn } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  AlertCircle,
  Building2,
  Mail,
  Shield,
  Loader2,
  UserPlus,
  Eye,
  EyeOff,
} from 'lucide-react';

interface InvitationData {
  organizationName: string;
  email: string;
  role: string;
  invitedAt: string;
}

export default function AcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded, isSignedIn } = useUser();
  const { signIn, isLoaded: isSignInLoaded } = useSignIn();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Registration form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided');
      setIsVerifying(false);
      return;
    }

    verifyInvitation();
  }, [token]);

  const verifyInvitation = async () => {
    try {
      setIsVerifying(true);
      const response = await fetch(`/api/organizations/accept-invitation?token=${token}`);
      const data = await response.json();

      if (!response.ok || !data.valid) {
        throw new Error(data.error || 'Invalid invitation');
      }

      setInvitation(data.invitation);
    } catch (err: any) {
      setError(err.message || 'Failed to verify invitation');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAcceptInvitation = async () => {
    // Regular accept for signed-in users
    if (!isSignedIn) return;

    try {
      setIsAccepting(true);
      setError('');

      const response = await fetch('/api/organizations/accept-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      setSuccess(data.message);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRegisterAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!firstName || !lastName) {
      setError('Please provide your first and last name');
      return;
    }

    try {
      setIsAccepting(true);
      setError('');

      // Call API to create user and accept invitation
      const response = await fetch('/api/organizations/accept-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token,
          firstName,
          lastName,
          password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account and accept invitation');
      }

      // If successful, sign in the user immediately
      if (isSignInLoaded && signIn) {
        const signInAttempt = await signIn.create({
          identifier: invitation?.email || '',
          password: password,
        });

        if (signInAttempt.status === 'complete') {
          setSuccess(data.message);
          // Redirect to dashboard after 1 second
          setTimeout(() => {
            router.push('/');
          }, 1000);
        } else {
          // If sign in is not complete for some reason (e.g. MFA?), redirect to login
          window.location.href = '/sign-in';
        }
      } else {
        // Fallback
        window.location.href = '/sign-in';
      }

    } catch (err: any) {
      setError(err.message || 'Failed to process request');
      setIsAccepting(false);
    }
  };

  // Loading state while checking auth
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-background/50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verifying invitation
  if (isVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-background/50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Verifying invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-background/50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-green/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green" />
              </div>
            </div>
            <CardTitle className="text-center text-2xl">Welcome to the Team!</CardTitle>
            <CardDescription className="text-center">
              {success}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Redirecting you to the dashboard...
              </p>
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error && !isAccepting && !invitation) { // Only show full error page if we don't have invitation data yet or if it's critical
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-background/50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-red/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red" />
              </div>
            </div>
            <CardTitle className="text-center text-2xl">Invalid Invitation</CardTitle>
            <CardDescription className="text-center">
              {error || 'This invitation link is no longer valid'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push('/')}
              className="w-full"
              variant="outline"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main invitation acceptance UI
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-background/50 p-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-cyan/20 to-teal/10 flex items-center justify-center">
              <UserPlus className="h-8 w-8 text-cyan" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">You're Invited!</CardTitle>
          <CardDescription className="text-center">
            Join your team on Lawptimize
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
              <Building2 className="h-5 w-5 text-cyan mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Organization</p>
                <p className="font-semibold">{invitation?.organizationName}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
              <Mail className="h-5 w-5 text-cyan mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="font-semibold">{invitation?.email}</p>
              </div>
            </div>
            
             {/* General Error Message */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* User authentication check */}
            {!isSignedIn ? (
              <form onSubmit={handleRegisterAndAccept} className="space-y-4 mt-4 border-t pt-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Create your account</h3>
                  <p className="text-sm text-muted-foreground">
                    Set up your details to join the organization.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      value={firstName} 
                      onChange={(e) => setFirstName(e.target.value)} 
                      required 
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      value={lastName} 
                      onChange={(e) => setLastName(e.target.value)} 
                      required 
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    required 
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isAccepting}
                  className="w-full mt-2"
                  size="lg"
                >
                  {isAccepting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Create Account & Join
                    </>
                  )}
                </Button>
                
                <div className="text-center text-sm pt-2">
                   <span className="text-muted-foreground">Already have an account? </span>
                   <button 
                     type="button" 
                     className="text-primary hover:underline font-medium"
                     onClick={() => router.push(`/sign-in?redirect_url=/accept-invitation?token=${token}`)}
                   >
                     Sign in
                   </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {user?.emailAddresses[0]?.emailAddress !== invitation?.email && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This invitation was sent to {invitation?.email}, but you're signed in as{' '}
                      {user?.emailAddresses[0]?.emailAddress}. Please sign out and sign in with the correct email.
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleAcceptInvitation}
                  disabled={isAccepting || (isSignedIn && user?.emailAddresses[0]?.emailAddress !== invitation?.email)}
                  className="w-full"
                  size="lg"
                >
                  {isAccepting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Accepting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Accept Invitation
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => router.push('/')}
                  variant="outline"
                  className="w-full"
                >
                  Decline
                </Button>
              </div>
            )}
          </div>

          {/* Additional info */}
          <p className="text-xs text-center text-muted-foreground">
            By accepting, you'll join {invitation?.organizationName} and gain access to their workspace
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
