import mongoose, { Schema, Document } from 'mongoose';

export interface IBooking extends Document {
  userId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  eventTitle: string;
  hostName: string;
  slotId: mongoose.Types.ObjectId;
  userName: string;
  startTime: Date;
  endTime: Date;
  status: 'confirmed' | 'cancelled';
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    eventTitle: {
      type: String,
      required: true,
    },
    hostName: {
      type: String,
      required: true,
    },
    slotId: {
      type: Schema.Types.ObjectId,
      ref: 'TimeSlot',
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed',
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ eventId: 1, status: 1 });
bookingSchema.index({ slotId: 1 });

bookingSchema.set('toJSON', {
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id.toString();
    ret.userId = ret.userId.toString();
    ret.eventId = ret.eventId.toString();
    ret.slotId = ret.slotId.toString();
    ret._id = undefined;
    ret.__v = undefined;
    return ret;
  },
});

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema);
