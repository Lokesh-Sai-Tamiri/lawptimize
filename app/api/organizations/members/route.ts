import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { OrganizationMember } from '@/lib/models';

/**
 * GET /api/organizations/members
 * Get all members of the current user's organization
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

    // Get user's membership
    const currentMembership = await OrganizationMember.findOne({ userId });

    if (!currentMembership) {
      return NextResponse.json(
        { error: 'User does not belong to an organization' },
        { status: 404 }
      );
    }

    // Get all members of the organization
    const members = await OrganizationMember.find({
      organizationId: currentMembership.organizationId,
    }).sort({ joinedAt: -1 });

    // Fetch user details from Clerk
    const userIds = members.map(m => m.userId);
    const client = await clerkClient();
    
    // getUserList accepts userId as explicit string[] if needed, but signature varies by version
    // Usually passing userId array works as an OR filter
    const usersResponse = await client.users.getUserList({ 
        userId: userIds,
        limit: 100 
    });
    
    // Handle pagination wrapper if present (usersResponse.data vs usersResponse)
    const users = usersResponse.data || usersResponse; 
    
    const usersMap = new Map(users.map((u: any) => [u.id, u]));

    return NextResponse.json({
      success: true,
      members: members.map((member) => {
        const user = usersMap.get(member.userId);
        const email = user?.emailAddresses?.[0]?.emailAddress;
        
        return {
          id: member._id.toString(),
          userId: member.userId,
          email: email || member.userId,
          // Prioritize local overrides, fallback to Clerk
          firstName: member.firstName || user?.firstName || null,
          lastName: member.lastName || user?.lastName || null,
          role: member.role,
          status: 'active',
          joinedAt: member.joinedAt || member.createdAt,
          invitedAt: member.createdAt,
          // Extra details
          advocateCode: member.advocateCode || null,
          highCourt: member.highCourt || null,
          phoneNumber: member.phoneNumber || null,
        };
      }),
    });
  } catch (error: any) {
    console.error('Error fetching organization members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization members', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizations/members
 * Remove a member from the organization (admin only)
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
        { error: 'Only admins can remove members' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const memberUserId = searchParams.get('userId');

    if (!memberUserId) {
      return NextResponse.json(
        { error: 'Member user ID is required' },
        { status: 400 }
      );
    }

    // Prevent admin from removing themselves
    if (memberUserId === userId) {
      return NextResponse.json(
        { error: 'You cannot remove yourself from the organization' },
        { status: 400 }
      );
    }

    // Remove member from database
    const member = await OrganizationMember.findOneAndDelete({
      organizationId: currentMembership.organizationId,
      userId: memberUserId,
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Remove user from Clerk
    try {
      const client = await clerkClient();
      await client.users.deleteUser(memberUserId);
    } catch (clerkError: any) {
      console.error('Error removing user from Clerk:', clerkError);
      // We don't fail the request if Clerk deletion fails, as the member is already removed from our DB
      // But we might want to inform the admin or log it
    }

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error: any) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/organizations/members
 * Update a member's role (admin only)
 */
export async function PATCH(request: Request) {
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
        { error: 'Only admins can update member roles' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { memberUserId, role, firstName, lastName, advocateCode, highCourt, phoneNumber } = body;

    if (!memberUserId) {
      return NextResponse.json(
        { error: 'Member user ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (role) {
      if (!['admin', 'user'].includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role. Must be "admin" or "user"' },
          { status: 400 }
        );
      }
      updateData.role = role;
    }

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (advocateCode !== undefined) updateData.advocateCode = advocateCode;
    if (highCourt !== undefined) updateData.highCourt = highCourt;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;

    // Update member role in database
    const member = await OrganizationMember.findOneAndUpdate(
      {
        organizationId: currentMembership.organizationId,
        userId: memberUserId,
      },
      { $set: updateData },
      { new: true }
    );

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      member: {
        id: member._id.toString(),
        userId: member.userId,
        role: member.role,
      },
    });
  } catch (error: any) {
    console.error('Error updating member role:', error);
    return NextResponse.json(
      { error: 'Failed to update member role', message: error.message },
      { status: 500 }
    );
  }
}
