import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  description: string;
  duration: number;
  startDate: Date;
  endDate: Date;
  dailyStartTime: string;
  dailyEndTime: string;
  hostId: mongoose.Types.ObjectId;
  hostName: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 100,
    },
    description: {
      type: String,
      default: '',
    },
    duration: {
      type: Number,
      required: true,
      enum: [15, 30, 45, 60, 90, 120],
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    dailyStartTime: {
      type: String,
      required: true,
    },
    dailyEndTime: {
      type: String,
      required: true,
    },
    hostId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    hostName: {
      type: String,
      required: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

eventSchema.index({ hostId: 1 });
eventSchema.index({ isArchived: 1 });

eventSchema.set('toJSON', {
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id.toString();
    ret.hostId = ret.hostId.toString();
    ret._id = undefined;
    ret.__v = undefined;
    return ret;
  },
});

export const Event = mongoose.model<IEvent>('Event', eventSchema);
