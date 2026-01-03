import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Notification } from "@/lib/models";

/**
 * GET /api/notifications
 * Fetch user's notifications
 */
export async function GET(request: Request) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // Fetch notifications (limit 50 mostly recent)
    const notifications = await Notification.find({ recipientId: user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipientId: user.id,
      isRead: false,
    });

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * (Internal use for creating notifications manually if needed)
 */
export async function POST(request: Request) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        // Validation logic can go here

        const notification = await Notification.create(body);
        return NextResponse.json({ notification });

    } catch (error) {
        return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
    }
}
