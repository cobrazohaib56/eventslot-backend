import mongoose, { Schema } from 'mongoose';
const timeSlotSchema = new Schema({
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
}, { timestamps: true });
timeSlotSchema.index({ eventId: 1, startTime: 1 }, { unique: true });
timeSlotSchema.index({ eventId: 1, isBooked: 1 });
timeSlotSchema.set('toJSON', {
    transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.eventId = ret.eventId.toString();
        if (ret.bookingId)
            ret.bookingId = ret.bookingId.toString();
        ret._id = undefined;
        ret.__v = undefined;
        return ret;
    },
});
export const TimeSlot = mongoose.model('TimeSlot', timeSlotSchema);
//# sourceMappingURL=TimeSlot.js.map