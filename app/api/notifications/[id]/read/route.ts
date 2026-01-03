import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Notification } from "@/lib/models";

/**
 * PATCH /api/notifications/[id]/read
 * Mark a single notification as read
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    const { id } = await params;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientId: user.id },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, notification });
  } catch (error: any) {
    console.error("Error marking notification read:", error);
    return NextResponse.json(
      { error: "Failed to mark notification read" },
      { status: 500 }
    );
  }
}
