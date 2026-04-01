import mongoose, { Document } from 'mongoose';
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
export declare const Event: mongoose.Model<IEvent, {}, {}, {}, mongoose.Document<unknown, {}, IEvent, {}, {}> & IEvent & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Event.d.ts.map