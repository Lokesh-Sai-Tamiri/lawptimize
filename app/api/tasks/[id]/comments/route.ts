import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Task from '@/lib/models/Task';

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

    return NextResponse.json({ success: true, comment: newComment });

  } catch (error: any) {
    console.error('Error adding comment:', error);
    return NextResponse.json(
      { error: 'Failed to add comment', message: error.message },
      { status: 500 }
    );
  }
}
