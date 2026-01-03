import { NextResponse } from 'next/server';
import { currentUser, clerkClient } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { OrganizationMember } from '@/lib/models';
import mongoose from 'mongoose';

/**
 * POST /api/organizations/accept-invitation
 * Accept an organization invitation
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password, firstName, lastName } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      );
    }

    // Decode invitation token
    let inviteData;
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      inviteData = JSON.parse(decoded);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 400 }
      );
    }

    const { memberId, organizationId, organizationName, email, role } = inviteData;
    let userId = '';
    let userFirstName = firstName;
    let userLastName = lastName;

    // Handle Registration flow
    if (password) {
      if (!firstName || !lastName) {
        return NextResponse.json(
          { error: 'First name and last name are required for registration' },
          { status: 400 }
        );
      }

      // Check if user already exists in Clerk
      try {
        const client = await clerkClient();
        const existingUsers = await client.users.getUserList({ emailAddress: [email] });
        if (existingUsers.data.length > 0) {
           return NextResponse.json(
            { error: 'An account with this email already exists. Please sign in to accept the invitation.' },
            { status: 400 }
          );
        }

        // Create new user in Clerk
        const newUser = await client.users.createUser({
          emailAddress: [email],
          password,
          firstName,
          lastName,
          skipPasswordChecks: false, // Enforce password policy
        });

        userId = newUser.id;
      } catch (clerkError: any) {
        console.error('Clerk user creation error:', clerkError);
        const errorMessage = clerkError.errors?.[0]?.message || 'Failed to create account';
        return NextResponse.json(
          { error: errorMessage, details: clerkError },
          { status: 400 }
        );
      }
    } else {
      // Existing User Flow
      const user = await currentUser();
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized. Please sign in first or provide registration details.' },
          { status: 401 }
        );
      }

      // Verify email matches current user
      const userEmail = user.emailAddresses[0]?.emailAddress;
      if (userEmail?.toLowerCase() !== email?.toLowerCase()) {
        return NextResponse.json(
          { error: 'This invitation was sent to a different email address' },
          { status: 403 }
        );
      }

      userId = user.id;
      userFirstName = user.firstName || undefined;
      userLastName = user.lastName || undefined;
    }

    await connectToDatabase();

    // Check if user already belongs to an organization
    const existingMembership = await OrganizationMember.findOne({ userId });
    if (existingMembership) {
      // If invited but already active elsewhere? Or maybe invite link was for this org but they joined another?
      // Logic: If they are already a member of *this* org, handle gracefully. If *another* org, error.
      if (existingMembership.organizationId.toString() === organizationId) {
          // Already member of this org
           if(existingMembership.status === 'active') {
               return NextResponse.json({
                  success: true,
                  message: `You are already a member of ${organizationName}`,
                  organization: { id: organizationId, name: organizationName, role },
                  alreadyMember: true,
                  email
               });
           }
      } else {
           return NextResponse.json(
            { error: 'You already belong to another organization' },
            { status: 400 }
          );
      }
    }

    // Find the invitation
    const invitation = await OrganizationMember.findOne({
      _id: memberId, // Mongoose usually casts string to ObjectId automatically
      organizationId: organizationId,
      email: email.toLowerCase(),
      status: 'invited',
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or already accepted' },
        { status: 404 }
      );
    }

    // Update the invitation to active membership
    invitation.userId = userId;
    invitation.status = 'active';
    invitation.firstName = userFirstName;
    invitation.lastName = userLastName;
    invitation.joinedAt = new Date();
    await invitation.save();

    return NextResponse.json({
      success: true,
      message: `Welcome to ${organizationName}!`,
      organization: {
        id: organizationId,
        name: organizationName,
        role,
      },
      email, // Return email for client-side use
    });

  } catch (error: any) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/organizations/accept-invitation
 * Verify invitation token and get details
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      );
    }

    // Decode invitation token
    let inviteData;
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      inviteData = JSON.parse(decoded);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 400 }
      );
    }

    const { memberId, organizationId, organizationName, email, role } = inviteData;

    await connectToDatabase();

    console.log('Verifying invitation with data:', { memberId, organizationId, email });

    // Verify invitation still exists and is pending
    const invitation = await OrganizationMember.findOne({
      _id: new mongoose.Types.ObjectId(memberId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
      email: email.toLowerCase(),
      status: 'invited',
    });

    if (!invitation) {
      console.log('Invitation not found in DB or status is not invited.');
      // Debug: Checking if it exists with different status
      const debugInv = await OrganizationMember.findOne({
          _id: new mongoose.Types.ObjectId(memberId)
      });
      console.log('Debug fetch by ID only:', debugInv);

      return NextResponse.json(
        { error: 'Invitation not found or already accepted', valid: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        organizationName,
        email,
        role,
        invitedAt: invitation.invitedAt,
      },
    });
  } catch (error: any) {
    console.error('Error verifying invitation:', error);
    return NextResponse.json(
      { error: 'Failed to verify invitation', message: error.message },
      { status: 500 }
    );
  }
}
