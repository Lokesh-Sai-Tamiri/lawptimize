import { NextResponse } from 'next/server';
import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Organization, OrganizationMember } from '@/lib/models';
import { sendInvitationEmail } from '@/lib/email/send-invitation';
import { sendAddedNotificationEmail } from '@/lib/email/send-added-notification';

/**
 * POST /api/organizations/invite
 * Invite a user to an organization (admin only)
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to MongoDB
    await connectToDatabase();

    // Get user's membership and check if admin
    const currentMembership = await OrganizationMember.findOne({ userId });

    if (!currentMembership) {
      return NextResponse.json(
        { error: 'User does not belong to an organization' },
        { status: 404 }
      );
    }

    if (currentMembership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only organization admins can invite users' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userEmail, role = 'user' } = body;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    if (!['admin', 'user'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "admin" or "user"' },
        { status: 400 }
      );
    }

    // Get organization
    const organization = await Organization.findById(currentMembership.organizationId);
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if user already has a pending invite or is a member
    const existingMember = await OrganizationMember.findOne({
      organizationId: currentMembership.organizationId,
      email: userEmail.toLowerCase(),
    });

    if (existingMember) {
      if (existingMember.status === 'active') {
        return NextResponse.json(
          { error: 'User is already a member of this organization' },
          { status: 400 }
        );
      }
      if (existingMember.status === 'invited') {
        return NextResponse.json(
          { error: 'User already has a pending invitation' },
          { status: 400 }
        );
      }
    }

    // Check if user already exists in Clerk
    let targetUser;
    try {
      const client = await clerkClient();
      const clerkUsers = await client.users.getUserList({ emailAddress: [userEmail] });
      targetUser = clerkUsers.data[0];
    } catch (error) {
      // User doesn't exist in Clerk
    }

    // Get current user info for email inviter name
    const currentUserReq = await currentUser();
    const inviterName = currentUserReq?.firstName
      ? `${currentUserReq.firstName} ${currentUserReq.lastName || ''}`.trim()
      : currentUserReq?.emailAddresses[0]?.emailAddress || 'A team member';

    // If user exists in Clerk, check if they already belong to an organization
    if (targetUser) {
      const existingOrgMembership = await OrganizationMember.findOne({ userId: targetUser.id });

      if (existingOrgMembership) {
        return NextResponse.json(
          { error: 'User already belongs to another organization' },
          { status: 400 }
        );
      }

      // Ensure role is valid
      const validRole = role === 'admin' ? 'admin' : 'member';

      // User exists and doesn't have an organization - invite them
      const member = await OrganizationMember.create({
        organizationId: currentMembership.organizationId,
        userId: targetUser.id,
        email: userEmail.toLowerCase(),
        firstName: targetUser.firstName || undefined,
        lastName: targetUser.lastName || undefined,
        role: validRole,
        status: 'invited',
        invitedBy: userId,
        invitedAt: new Date(),
      });

      // Generate invitation token
      const inviteToken = Buffer.from(
        JSON.stringify({
          memberId: member._id.toString(),
          organizationId: currentMembership.organizationId.toString(),
          organizationName: organization.name,
          email: userEmail,
          role: validRole,
          timestamp: Date.now(),
        })
      ).toString('base64');

      const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation?token=${inviteToken}`;

      console.log(`Sending invitation email to ${userEmail} with link: ${inviteLink}`);

      // Send invitation email
      try {
        await sendInvitationEmail({
          invitedEmail: userEmail,
          organizationName: organization.name,
          inviterName,
          inviteLink,
        });
        console.log('Invitation email sent successfully');
      } catch (emailError: any) {
        console.error('Failed to send invitation email:', emailError);
      }

      return NextResponse.json({
        success: true,
        message: 'Invitation sent successfully! An email has been sent to the user.',
        invitation: {
          id: member._id.toString(),
          email: userEmail,
          role: role,
          status: 'invited',
          inviteLink,
        },
        organizationId: currentMembership.organizationId.toString(),
        organizationName: organization.name,
      });
    }

    // User doesn't exist in Clerk - create an invite record
    const member = await OrganizationMember.create({
      organizationId: currentMembership.organizationId,
      userId: `pending_${Date.now()}`,
      email: userEmail.toLowerCase(),
      role: role === 'user' ? 'member' : role,
      status: 'invited',
      invitedBy: userId,
      invitedAt: new Date(),
    });

    // Generate invitation token
    const inviteToken = Buffer.from(
      JSON.stringify({
        memberId: member._id.toString(),
        organizationId: currentMembership.organizationId.toString(),
        organizationName: organization.name,
        email: userEmail,
        role: role,
        timestamp: Date.now(),
      })
    ).toString('base64');

    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation?token=${inviteToken}`;

    // Send invitation email
    try {
      await sendInvitationEmail({
        invitedEmail: userEmail,
        organizationName: organization.name,
        inviterName,
        inviteLink,
      });
    } catch (emailError: any) {
      console.error('Failed to send invitation email:', emailError);
      // Don't fail the invitation creation if email fails
      // The user can still use the invite link manually
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully! An email has been sent to the user.',
      invitation: {
        id: member._id.toString(),
        email: userEmail,
        role: role,
        status: 'invited',
        inviteLink,
      },
      organizationId: currentMembership.organizationId.toString(),
      organizationName: organization.name,
    });
  } catch (error: any) {
    console.error('Error inviting user:', error);
    return NextResponse.json(
      { error: 'Failed to invite user', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/organizations/invite
 * Get all pending invitations (admin only)
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to MongoDB
    await connectToDatabase();

    // Get user's membership and check if admin
    const currentMembership = await OrganizationMember.findOne({ userId });

    if (!currentMembership) {
      return NextResponse.json(
        { error: 'User does not belong to an organization' },
        { status: 404 }
      );
    }

    if (currentMembership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can view invitations' },
        { status: 403 }
      );
    }

    // Get all pending invitations
    const invitations = await OrganizationMember.find({
      organizationId: currentMembership.organizationId,
      status: 'invited',
    }).sort({ invitedAt: -1 });

    return NextResponse.json({
      success: true,
      invitations: invitations.map((inv) => ({
        id: inv._id.toString(),
        email: inv.email,
        role: inv.role,
        invitedAt: inv.invitedAt,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizations/invite
 * Cancel a pending invitation (admin only)
 */
export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to MongoDB
    await connectToDatabase();

    // Get user's membership and check if admin
    const currentMembership = await OrganizationMember.findOne({ userId });

    if (!currentMembership) {
      return NextResponse.json(
        { error: 'User does not belong to an organization' },
        { status: 404 }
      );
    }

    if (currentMembership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can cancel invitations' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get('id');

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      );
    }

    // Delete the invitation
    const invitation = await OrganizationMember.findOneAndDelete({
      _id: invitationId,
      organizationId: currentMembership.organizationId,
      status: 'invited',
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled',
    });
  } catch (error: any) {
    console.error('Error cancelling invitation:', error);
    return NextResponse.json(
      { error: 'Failed to cancel invitation', message: error.message },
      { status: 500 }
    );
  }
}
