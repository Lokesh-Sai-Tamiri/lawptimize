import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Task from '@/lib/models/Task';
import OrganizationMember from '@/lib/models/OrganizationMember';
import Notification from '@/lib/models/Notification';
import { sendTaskNotificationEmail } from '@/lib/email/send-task-notification';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content } = await request.json();
    if (!content) {
       return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    await connectToDatabase();
    
    // params is a Promise in Next.js 15+ (or recent 14 changes depending on config), 
    // but safe to await it if the project rules imply it.
    // The user's metadata says they are on mac.
    // I will await params just to be safe if it's the newer version pattern.
    const { id } = await params;

    const task = await Task.findById(id);
    if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Determine user name
    const userName = user.firstName
      ? `${user.firstName} ${user.lastName || ''}`.trim()
      : user.emailAddresses[0]?.emailAddress || 'User';

    const newComment = {
        userId,
        userName,
        content,
        createdAt: new Date()
    };

    task.comments = task.comments || [];
    task.comments.push(newComment);

    await task.save();

    // Notify Admin
    // Find the organization admin
    const adminMember = await OrganizationMember.findOne({
      organizationId: task.organizationId,
      role: 'admin'
    });

    if (adminMember && adminMember.email && userId !== adminMember.userId) {
       // Only notify if the commenter is not the admin themselves (or at least checking userId vs admin's userId)
       // We should also check if the user is an admin themselves to avoid admin-to-admin spam? 
       // Requirement says "If any MEMBER... admin should receive". 
       // Usually safe to notify admin unless admin is the one performing the action.
       
       const adminName = (adminMember.firstName && adminMember.lastName) 
          ? `${adminMember.firstName} ${adminMember.lastName}` 
          : 'Admin';

       await sendTaskNotificationEmail({
          adminEmail: adminMember.email,
          adminName: adminName,
          memberName: userName,
          taskTitle: task.title,
          action: 'comment',
          commentContent: content,
          taskLink: `${process.env.NEXT_PUBLIC_APP_URL}/tasks`
       });

       // Create in-app notification
       await Notification.create({
         recipientId: adminMember.userId,
         senderId: userId,
         type: 'task_comment',
         title: `New Comment on ${task.title}`,
         message: `${userName} commented: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
         link: `/tasks?taskId=${task._id}`
       });
    }

    return NextResponse.json({ success: true, comment: newComment });

  } catch (error: any) {
    console.error('Error adding comment:', error);
    return NextResponse.json(
      { error: 'Failed to add comment', message: error.message },
      { status: 500 }
    );
  }
}
