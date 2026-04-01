import mongoose, { Document } from 'mongoose';
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
export declare const Booking: mongoose.Model<IBooking, {}, {}, {}, mongoose.Document<unknown, {}, IBooking, {}, {}> & IBooking & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Booking.d.ts.map