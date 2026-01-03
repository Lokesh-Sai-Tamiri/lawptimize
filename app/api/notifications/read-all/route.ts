import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Notification } from "@/lib/models";

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for current user
 */
export async function PATCH(request: Request) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    await Notification.updateMany(
      { recipientId: user.id, isRead: false },
      { $set: { isRead: true } }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error marking all notifications read:", error);
    return NextResponse.json(
      { error: "Failed to mark notifications read" },
      { status: 500 }
    );
  }
}
