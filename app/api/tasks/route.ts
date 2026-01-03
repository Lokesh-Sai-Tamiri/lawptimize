import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Task, OrganizationMember } from "@/lib/models";

/**
 * GET /api/tasks
 * Fetch all tasks for the user's organization
 */
export async function GET(request: Request) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // Get user's organization membership
    const membership = await OrganizationMember.findOne({ userId: user.id });

    if (!membership) {
      return NextResponse.json(
        { error: "User is not part of any organization" },
        { status: 403 }
      );
    }

    // Parse query params for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const assigneeId = searchParams.get("assigneeId");

    // Build query
    const query: Record<string, any> = {
      organizationId: membership.organizationId,
    };

    if (status) {
      query.status = status;
    }

    if (assigneeId) {
      query.assigneeId = assigneeId;
    }

    // Fetch tasks for this organization
    const tasks = await Task.find(query).sort({ createdAt: -1 });

    // Transform for frontend
    const transformedTasks = tasks.map((t) => ({
      id: t._id.toString(),
      title: t.title,
      description: t.description || "",
      case: t.caseName,
      caseId: t.caseId?.toString() || null,
      assignee: t.assigneeName,
      assigneeId: t.assigneeId || null,
      assigneeEmail: t.assigneeEmail || "",
      dueDate: t.dueDate ? formatDate(t.dueDate) : "",
      priority: t.priority,
      status: t.status,
      createdAt: formatDate(t.createdAt),
      updatedAt: t.updatedAt.toISOString(),
      comments: t.comments || [],
    }));

    return NextResponse.json({
      success: true,
      tasks: transformedTasks,
    });
  } catch (error: any) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks
 * Create a new task
 */
export async function POST(request: Request) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // Get user's organization membership
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

    // Validate required fields
    if (!title || !caseName || !assigneeName) {
      return NextResponse.json(
        { error: "Missing required fields: title, caseName, assigneeName" },
        { status: 400 }
      );
    }

    // Create the task
    const newTask = await Task.create({
      organizationId: membership.organizationId,
      title,
      description: description || "",
      caseName,
      caseId: caseId || undefined,
      assigneeName,
      assigneeId: assigneeId || undefined,
      assigneeEmail: assigneeEmail || "",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      priority: priority || "MEDIUM",
      status: status || "todo",
      createdBy: user.id,
    });

    return NextResponse.json({
      success: true,
      task: {
        id: newTask._id.toString(),
        title: newTask.title,
        description: newTask.description || "",
        case: newTask.caseName,
        caseId: newTask.caseId?.toString() || null,
        assignee: newTask.assigneeName,
        assigneeId: newTask.assigneeId || null,
        assigneeEmail: newTask.assigneeEmail || "",
        dueDate: newTask.dueDate ? formatDate(newTask.dueDate) : "",
        priority: newTask.priority,
        status: newTask.status,
        createdAt: formatDate(newTask.createdAt),
        updatedAt: newTask.updatedAt.toISOString(),
        comments: [],
      },
    });
  } catch (error: any) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task", message: error.message },
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
