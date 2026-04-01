import { Router } from 'express';
import mongoose from 'mongoose';
import { Booking } from '../models/Booking.js';
import { TimeSlot } from '../models/TimeSlot.js';
import { Event } from '../models/Event.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
const router = Router();
// All routes require authentication
router.use(verifyToken);
// Check if MongoDB supports transactions (replica set)
async function supportsTransactions() {
    try {
        const admin = mongoose.connection.db.admin();
        const info = await admin.replSetGetStatus();
        return !!info;
    }
    catch {
        return false;
    }
}
// Atomic booking without transactions (standalone MongoDB)
async function bookSlotAtomic(req, res) {
    const { slotId } = req.body;
    if (!slotId) {
        res.status(400).json({ success: false, error: 'Slot ID is required' });
        return;
    }
    // Atomically find and mark slot as booked (only if currently not booked)
    const slot = await TimeSlot.findOneAndUpdate({ _id: slotId, isBooked: false }, { $set: { isBooked: true, bookedBy: req.user.id, bookedByName: req.user.name } }, { new: false } // return the original doc to check it existed
    );
    if (!slot) {
        // Either slot doesn't exist or was already booked
        const exists = await TimeSlot.findById(slotId);
        if (!exists) {
            res.status(404).json({ success: false, error: 'Slot not found' });
        }
        else {
            res.status(409).json({ success: false, error: 'Slot already booked' });
        }
        return;
    }
    // Check event is active
    const event = await Event.findById(slot.eventId);
    if (!event || event.isArchived) {
        // Revert the slot
        await TimeSlot.findByIdAndUpdate(slotId, { isBooked: false, bookedBy: null, bookedByName: null });
        res.status(400).json({ success: false, error: 'Event is no longer available' });
        return;
    }
    // Check slot is in the future
    if (slot.startTime <= new Date()) {
        await TimeSlot.findByIdAndUpdate(slotId, { isBooked: false, bookedBy: null, bookedByName: null });
        res.status(400).json({ success: false, error: 'Cannot book a past time slot' });
        return;
    }
    // Check user doesn't already have a confirmed booking for this event
    const existingBooking = await Booking.findOne({
        userId: req.user.id,
        eventId: slot.eventId,
        status: 'confirmed',
    });
    if (existingBooking) {
        await TimeSlot.findByIdAndUpdate(slotId, { isBooked: false, bookedBy: null, bookedByName: null });
        res.status(409).json({ success: false, error: 'You already have a booking for this event' });
        return;
    }
    // Create booking
    const booking = await Booking.create({
        userId: req.user.id,
        eventId: slot.eventId,
        eventTitle: event.title,
        hostName: event.hostName,
        slotId: slot._id,
        userName: req.user.name,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: 'confirmed',
    });
    // Update slot with booking reference
    await TimeSlot.findByIdAndUpdate(slotId, { bookingId: booking._id });
    res.status(201).json({ success: true, booking: booking.toJSON() });
}
// Transaction-based booking (replica set MongoDB)
async function bookSlotWithTransaction(req, res) {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const { slotId } = req.body;
        if (!slotId) {
            await session.abortTransaction();
            session.endSession();
            res.status(400).json({ success: false, error: 'Slot ID is required' });
            return;
        }
        const slot = await TimeSlot.findById(slotId).session(session);
        if (!slot) {
            await session.abortTransaction();
            session.endSession();
            res.status(404).json({ success: false, error: 'Slot not found' });
            return;
        }
        if (slot.isBooked) {
            await session.abortTransaction();
            session.endSession();
            res.status(409).json({ success: false, error: 'Slot already booked' });
            return;
        }
        const event = await Event.findById(slot.eventId).session(session);
        if (!event || event.isArchived) {
            await session.abortTransaction();
            session.endSession();
            res.status(400).json({ success: false, error: 'Event is no longer available' });
            return;
        }
        if (slot.startTime <= new Date()) {
            await session.abortTransaction();
            session.endSession();
            res.status(400).json({ success: false, error: 'Cannot book a past time slot' });
            return;
        }
        const existingBooking = await Booking.findOne({
            userId: req.user.id,
            eventId: slot.eventId,
            status: 'confirmed',
        }).session(session);
        if (existingBooking) {
            await session.abortTransaction();
            session.endSession();
            res.status(409).json({ success: false, error: 'You already have a booking for this event' });
            return;
        }
        const [booking] = await Booking.create([
            {
                userId: req.user.id,
                eventId: slot.eventId,
                eventTitle: event.title,
                hostName: event.hostName,
                slotId: slot._id,
                userName: req.user.name,
                startTime: slot.startTime,
                endTime: slot.endTime,
                status: 'confirmed',
            },
        ], { session });
        slot.isBooked = true;
        slot.bookingId = booking._id;
        slot.bookedBy = req.user.id;
        slot.bookedByName = req.user.name;
        await slot.save({ session });
        await session.commitTransaction();
        session.endSession();
        res.status(201).json({ success: true, booking: booking.toJSON() });
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Booking transaction error:', error);
        res.status(500).json({ success: false, error: 'Booking failed' });
    }
}
// POST /api/bookings - Book a slot
router.post('/', requireRole('user'), async (req, res) => {
    try {
        const hasReplicaSet = await supportsTransactions();
        if (hasReplicaSet) {
            await bookSlotWithTransaction(req, res);
        }
        else {
            await bookSlotAtomic(req, res);
        }
    }
    catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ success: false, error: 'Booking failed' });
    }
});
// GET /api/bookings/my - User's bookings
router.get('/my', async (req, res) => {
    try {
        const bookings = await Booking.find({
            userId: req.user.id,
            status: 'confirmed',
        }).sort({ startTime: 1 });
        res.json(bookings.map((b) => b.toJSON()));
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch bookings' });
    }
});
// GET /api/bookings/event/:eventId - Bookings for a specific event (host only)
router.get('/event/:eventId', requireRole('host'), async (req, res) => {
    try {
        const event = await Event.findById(req.params.eventId);
        if (!event || event.hostId.toString() !== req.user.id) {
            res.status(403).json({ success: false, error: 'Not authorized' });
            return;
        }
        const bookings = await Booking.find({
            eventId: req.params.eventId,
            status: 'confirmed',
        }).sort({ startTime: 1 });
        res.json(bookings.map((b) => b.toJSON()));
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch bookings' });
    }
});
// DELETE /api/bookings/:id - Cancel a booking
router.delete('/:id', async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            res.status(404).json({ success: false, error: 'Booking not found' });
            return;
        }
        if (booking.userId.toString() !== req.user.id) {
            res.status(403).json({ success: false, error: 'Not authorized to cancel this booking' });
            return;
        }
        if (booking.startTime <= new Date()) {
            res.status(400).json({ success: false, error: 'Cannot cancel a past booking' });
            return;
        }
        booking.status = 'cancelled';
        booking.cancelledAt = new Date();
        await booking.save();
        await TimeSlot.findByIdAndUpdate(booking.slotId, {
            isBooked: false,
            bookingId: null,
            bookedBy: null,
            bookedByName: null,
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to cancel booking' });
    }
});
export default router;
//# sourceMappingURL=bookings.js.map