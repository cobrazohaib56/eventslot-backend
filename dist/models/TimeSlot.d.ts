import mongoose, { Document } from 'mongoose';
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
export declare const TimeSlot: mongoose.Model<ITimeSlot, {}, {}, {}, mongoose.Document<unknown, {}, ITimeSlot, {}, {}> & ITimeSlot & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=TimeSlot.d.ts.map