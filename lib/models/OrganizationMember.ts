
import mongoose, { Schema, Document, Model } from "mongoose"

export interface IOrganizationMember extends Document {
  organizationId: mongoose.Schema.Types.ObjectId
  userId: string
  role: "admin" | "member"
  joinedAt?: Date
  advocateCode?: string // Renamed from lawyerId
  highCourt?: string // Added field
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
    role: {
      type: String,
      enum: ["admin", "member"],
      default: "member",
    },
    joinedAt: {
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
  },
  {
    timestamps: true,
  },
)

// Prevent mongoose from recompiling model in hot reload
const OrganizationMember: Model<IOrganizationMember> =
  mongoose.models.OrganizationMember || mongoose.model<IOrganizationMember>("OrganizationMember", OrganizationMemberSchema)

export default OrganizationMember
