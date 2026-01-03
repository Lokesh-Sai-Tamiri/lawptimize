import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Task, OrganizationMember } from "@/lib/models";
import mongoose from "mongoose";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/tasks/[id]
 * Get a single task by ID
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const user = await currentUser();
    const { id } = await params;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    await connectToDatabase();

    const membership = await OrganizationMember.findOne({ userId: user.id });

    if (!membership) {
      return NextResponse.json(
        { error: "User is not part of any organization" },
        { status: 403 }
      );
    }

    const task = await Task.findOne({
      _id: id,
      organizationId: membership.organizationId,
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      task: {
        id: task._id.toString(),
        title: task.title,
        description: task.description || "",
        case: task.caseName,
        caseId: task.caseId?.toString() || null,
        assignee: task.assigneeName,
        assigneeId: task.assigneeId || null,
        assigneeEmail: task.assigneeEmail || "",
        dueDate: task.dueDate ? formatDate(task.dueDate) : "",
        priority: task.priority,
        status: task.status,
        createdAt: formatDate(task.createdAt),

        updatedAt: task.updatedAt.toISOString(),
        comments: task.comments || [],
      },
    });
  } catch (error: any) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { error: "Failed to fetch task", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tasks/[id]
 * Update a task
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const user = await currentUser();
    const { id } = await params;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    await connectToDatabase();

    const membership = await OrganizationMember.findOne({ userId: user.id });

    if (!membership) {
      return NextResponse.json(
        { error: "User is not part of any organization" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      caseName,
      caseId,
      assigneeName,
      assigneeId,
      assigneeEmail,
      dueDate,
      priority,
      status,
    } = body;

    const updateData: Record<string, any> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (caseName !== undefined) updateData.caseName = caseName;
    if (caseId !== undefined) updateData.caseId = caseId || null;
    if (assigneeName !== undefined) updateData.assigneeName = assigneeName;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null;
    if (assigneeEmail !== undefined) updateData.assigneeEmail = assigneeEmail;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;

    const updatedTask = await Task.findOneAndUpdate(
      {
        _id: id,
        organizationId: membership.organizationId,
      },
      { $set: updateData },
      { new: true }
    );

    if (!updatedTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      task: {
        id: updatedTask._id.toString(),
        title: updatedTask.title,
        description: updatedTask.description || "",
        case: updatedTask.caseName,
        caseId: updatedTask.caseId?.toString() || null,
        assignee: updatedTask.assigneeName,
        assigneeId: updatedTask.assigneeId || null,
        assigneeEmail: updatedTask.assigneeEmail || "",
        dueDate: updatedTask.dueDate ? formatDate(updatedTask.dueDate) : "",
        priority: updatedTask.priority,
        status: updatedTask.status,
        createdAt: formatDate(updatedTask.createdAt),
        updatedAt: updatedTask.updatedAt.toISOString(),
        comments: updatedTask.comments || [],
      },
    });
  } catch (error: any) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Failed to update task", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/[id]
 * Delete a task
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await currentUser();
    const { id } = await params;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    await connectToDatabase();

    const membership = await OrganizationMember.findOne({ userId: user.id });

    if (!membership) {
      return NextResponse.json(
        { error: "User is not part of any organization" },
        { status: 403 }
      );
    }

    const deletedTask = await Task.findOneAndDelete({
      _id: id,
      organizationId: membership.organizationId,
    });

    if (!deletedTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Failed to delete task", message: error.message },
      { status: 500 }
    );
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}
