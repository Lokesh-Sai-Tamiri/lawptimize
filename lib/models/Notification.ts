import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  recipientId: string;
  senderId?: string;
  type: 'task_comment' | 'task_update' | 'task_assignment' | 'system';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  recipientId: { type: String, required: true, index: true },
  senderId: { type: String },
  type: { 
    type: String, 
    enum: ['task_comment', 'task_update', 'task_assignment', 'system'],
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true },
});

// Use flexible collection naming if configured
const collectionName = process.env.DATABASE_SCHEMA 
  ? `${process.env.DATABASE_SCHEMA}_notifications` 
  : "notifications";

const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema, collectionName);

export default Notification;
