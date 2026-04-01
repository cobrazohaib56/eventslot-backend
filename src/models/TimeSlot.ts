import mongoose, { Schema, Document } from 'mongoose';

export interface ITimeSlot extends Document {
  eventId: mongoose.Types.ObjectId;
  startTime: Date;
  endTime: Date;
  isBooked: boolean;
  bookingId: mongoose.Types.ObjectId | null;
  bookedBy: string | null;
  bookedByName: string | null;
  createdAt: Date;
}

const timeSlotSchema = new Schema<ITimeSlot>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
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
    isBooked: {
      type: Boolean,
      default: false,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    bookedBy: {
      type: String,
      default: null,
    },
    bookedByName: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

timeSlotSchema.index({ eventId: 1, startTime: 1 }, { unique: true });
timeSlotSchema.index({ eventId: 1, isBooked: 1 });

timeSlotSchema.set('toJSON', {
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id.toString();
    ret.eventId = ret.eventId.toString();
    if (ret.bookingId) ret.bookingId = ret.bookingId.toString();
    ret._id = undefined;
    ret.__v = undefined;
    return ret;
  },
});

export const TimeSlot = mongoose.model<ITimeSlot>('TimeSlot', timeSlotSchema);
