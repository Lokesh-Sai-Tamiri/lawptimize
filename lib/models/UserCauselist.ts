
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserCauselist extends Document {
  userId: string;
  advocateCode: string;
  highCourt: string;
  lastSyncedAt: Date;
  data: any[]; // Store the exact JSON array we scrape
  createdAt: Date;
  updatedAt: Date;
}

const UserCauselistSchema = new Schema<IUserCauselist>(
  {
    userId: { type: String, required: true, index: true },
    advocateCode: { type: String, required: true },
    highCourt: { type: String, required: true },
    lastSyncedAt: { type: Date, default: Date.now },
    data: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

// Prevent overwrite during hot reload
const UserCauselist: Model<IUserCauselist> =
  mongoose.models.UserCauselist || mongoose.model<IUserCauselist>('UserCauselist', UserCauselistSchema);

export default UserCauselist;
