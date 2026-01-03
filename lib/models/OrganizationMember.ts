
import mongoose, { Schema, Document, Model } from "mongoose"

export interface IOrganizationMember extends Document {
  organizationId: mongoose.Types.ObjectId
  userId: string
  email?: string
  role: "admin" | "member"
  status: "active" | "invited"
  joinedAt?: Date
  invitedBy?: string
  invitedAt?: Date
  advocateCode?: string // Renamed from lawyerId
  highCourt?: string // Added field
  firstName?: string
  lastName?: string
  phoneNumber?: string
  createdAt: Date
  updatedAt: Date
}

const OrganizationMemberSchema = new Schema<IOrganizationMember>(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      enum: ["admin", "member"],
      default: "member",
    },
    status: {
      type: String, // 'active', 'invited'
      enum: ["active", "invited"],
      default: "active",
    },
    joinedAt: {
      type: Date,
    },
    invitedBy: {
      type: String, // User ID of the inviter
    },
    invitedAt: {
      type: Date,
    },
    advocateCode: {
      type: String,
      trim: true,
    },
    highCourt: {
      type: String,
      trim: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
)

// Prevent mongoose from recompiling model in hot reload
const OrganizationMember: Model<IOrganizationMember> =
  mongoose.models.OrganizationMember || mongoose.model<IOrganizationMember>("OrganizationMember", OrganizationMemberSchema)

export default OrganizationMember
