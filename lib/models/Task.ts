import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITask extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  caseId?: mongoose.Types.ObjectId; // Optional reference to a case
  caseName: string; // Display name for the case
  assigneeId?: string; // Clerk user ID of assignee
  assigneeName: string;
  assigneeEmail?: string;
  dueDate?: Date;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'todo' | 'inProgress' | 'completed';
  createdBy: string; // Clerk user ID
  createdAt: Date;
  updatedAt: Date;
  comments?: Array<{
    userId: string;
    userName: string;
    content: string;
    createdAt: Date;
  }>;
}

const TaskSchema = new Schema<ITask>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Task title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    caseId: {
      type: Schema.Types.ObjectId,
      ref: 'Case',
      index: true,
    },
    caseName: {
      type: String,
      required: [true, 'Case name is required'],
      trim: true,
    },
    assigneeId: {
      type: String,
      index: true,
    },
    assigneeName: {
      type: String,
      required: [true, 'Assignee name is required'],
      trim: true,
    },
    assigneeEmail: {
      type: String,
      trim: true,
    },
    dueDate: {
      type: Date,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },
    status: {
      type: String,
      enum: ['todo', 'inProgress', 'completed'],
      default: 'todo',
    },
    createdBy: {
      type: String,
      required: [true, 'Creator user ID is required'],
    },
    comments: [{
      userId: String,
      userName: String,
      content: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
  },
  {
    timestamps: true,
    collection: process.env.DATABASE_SCHEMA ? `${process.env.DATABASE_SCHEMA}_tasks` : 'tasks',
  }
);

// Compound indexes for common queries
TaskSchema.index({ organizationId: 1, status: 1 });
TaskSchema.index({ organizationId: 1, assigneeId: 1 });
TaskSchema.index({ organizationId: 1, dueDate: 1 });
TaskSchema.index({ createdAt: -1 });

// Prevent model recompilation in development
const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);

export default Task;
