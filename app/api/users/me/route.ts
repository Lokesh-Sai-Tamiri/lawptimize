
import { NextResponse } from 'next/server';
import { auth, currentUser } from "@clerk/nextjs/server"
import { connectToDatabase } from "@/lib/mongodb" // Database connection
import { OrganizationMember, Organization } from "@/lib/models"

export async function GET() {
  try {
    const { userId } = await auth()
    const user = await currentUser()

    if (!userId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectToDatabase()

    // Fetch organization membership
    const membership = await OrganizationMember.findOne({ userId: user.id })
    
    let organizationData = null
    if (membership) {
      organizationData = await Organization.findById(membership.organizationId)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress || "",
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        role: membership?.role || null,
        organizationId: membership?.organizationId?.toString() || null,
        organizationName: organizationData?.name || null, // Restored field
        joinedAt: membership?.joinedAt?.toISOString() || null,
        advocateCode: membership?.advocateCode || null, // Updated field
        highCourt: membership?.highCourt || null, // Added field
      },
    })
  } catch (error) {
    console.error("Error fetching user data:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
