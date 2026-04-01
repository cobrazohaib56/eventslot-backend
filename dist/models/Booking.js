import mongoose, { Schema } from 'mongoose';
const bookingSchema = new Schema({
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
}, { timestamps: true });
bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ eventId: 1, status: 1 });
bookingSchema.index({ slotId: 1 });
bookingSchema.set('toJSON', {
    transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.userId = ret.userId.toString();
        ret.eventId = ret.eventId.toString();
        ret.slotId = ret.slotId.toString();
        ret._id = undefined;
        ret.__v = undefined;
        return ret;
    },
});
export const Booking = mongoose.model('Booking', bookingSchema);
//# sourceMappingURL=Booking.js.map