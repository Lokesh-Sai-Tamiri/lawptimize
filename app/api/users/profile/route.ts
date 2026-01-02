
import { NextResponse } from 'next/server';
import { auth, currentUser } from "@clerk/nextjs/server"
import { connectToDatabase } from "@/lib/mongodb"
import { OrganizationMember } from "@/lib/models"

export async function PATCH(request: Request) {
  try {
    const { userId } = await auth()
    const user = await currentUser()

    if (!userId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectToDatabase()

    const { advocateCode, highCourt } = await request.json()

    // Find the membership for this user (assuming single organization for now or just updating the first found)
    // In a multi-org setup, we might need organizationId in the request
    // But since this is a user profile setting, it makes sense to attach to their primary identity or membership
    
    // We update all memberships for this user effectively updating their "profile" across the platform
    // OR just find one. Let's stick to finding one for now as per previous logic.
    
    // Check if membership exists
    let membership = await OrganizationMember.findOne({ userId: user.id })

    if (!membership) {
        return NextResponse.json({ error: "Organization membership not found" }, { status: 404 })
    }

    // Update fields
    if (advocateCode !== undefined) membership.advocateCode = advocateCode
    if (highCourt !== undefined) membership.highCourt = highCourt

    await membership.save()

    // IF disconnecting (clearing advocate code), also clear their synced data
    if (advocateCode === "") {
        const { UserCauselist } = await import("@/lib/models");
        await UserCauselist.deleteMany({ userId: user.id });
        console.log(`Cleared UserCauselist for user ${user.id}`);
    }

    console.log(`Updated profile for user ${user.id}: advocateCode=${advocateCode}, highCourt=${highCourt}`)

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        advocateCode: membership.advocateCode,
        highCourt: membership.highCourt
      }
    })
  } catch (error: any) {
    console.error("Profile update error:", error)
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 })
  }
}
