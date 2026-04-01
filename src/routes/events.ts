import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { Event } from '../models/Event.js';
import { TimeSlot } from '../models/TimeSlot.js';
import { Booking } from '../models/Booking.js';
import { verifyToken, requireRole, AuthRequest } from '../middleware/auth.js';
import { generateTimeSlots } from '../services/slotGenerator.js';

const router = Router();

// All routes require authentication
router.use(verifyToken);

// GET /api/events/host/my-events - MUST be before /:id to avoid route conflict
router.get('/host/my-events', requireRole('host'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const events = await Event.find({ hostId: req.user!.id }).sort({ createdAt: -1 });

    const eventsWithCounts = await Promise.all(
      events.map(async (event) => {
        const bookingCount = await Booking.countDocuments({
          eventId: event._id,
          status: 'confirmed',
        });
        return { ...event.toJSON(), bookingCount };
      })
    );

    res.json(eventsWithCounts);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch events' });
  }
});

// GET /api/events - list active events
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const events = await Event.find({ isArchived: false }).sort({ createdAt: -1 });
    res.json(events.map((e) => e.toJSON()));
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch events' });
  }
});

// GET /api/events/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404).json({ success: false, error: 'Event not found' });
      return;
    }
    res.json(event.toJSON());
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch event' });
  }
});

// GET /api/events/:id/slots
router.get('/:id/slots', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const slots = await TimeSlot.find({ eventId: req.params.id }).sort({ startTime: 1 });
    res.json(slots.map((s) => s.toJSON()));
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch slots' });
  }
});

// GET /api/events/:id/slots/available
router.get('/:id/slots/available', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const slots = await TimeSlot.find({
      eventId: req.params.id,
      isBooked: false,
      startTime: { $gt: new Date() },
    }).sort({ startTime: 1 });
    res.json(slots.map((s) => s.toJSON()));
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch available slots' });
  }
});

// POST /api/events
router.post(
  '/',
  requireRole('host'),
  [
    body('title').trim().isLength({ min: 3, max: 100 }).withMessage('Title must be 3-100 characters'),
    body('duration').isIn([15, 30, 45, 60, 90, 120]).withMessage('Invalid duration'),
    body('startDate').isISO8601().withMessage('Valid start date required'),
    body('endDate').isISO8601().withMessage('Valid end date required'),
    body('dailyStartTime').matches(/^\d{2}:\d{2}$/).withMessage('Daily start time must be HH:mm'),
    body('dailyEndTime').matches(/^\d{2}:\d{2}$/).withMessage('Daily end time must be HH:mm'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, error: errors.array()[0].msg });
      return;
    }

    try {
      const { title, description, duration, startDate, endDate, dailyStartTime, dailyEndTime } = req.body;

      // Validate date range (max 90 days)
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      if (end <= start) {
        res.status(400).json({ success: false, error: 'End date must be after start date' });
        return;
      }
      if (diffDays > 90) {
        res.status(400).json({ success: false, error: 'Date range cannot exceed 90 days' });
        return;
      }

      // Validate daily time window
      if (dailyEndTime <= dailyStartTime) {
        res.status(400).json({ success: false, error: 'Daily end time must be after start time' });
        return;
      }

      const event = await Event.create({
        title,
        description: description || '',
        duration,
        startDate: start,
        endDate: end,
        dailyStartTime,
        dailyEndTime,
        hostId: req.user!.id,
        hostName: req.user!.name,
      });

      await generateTimeSlots(event);

      res.status(201).json(event.toJSON());
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to create event' });
    }
  }
);

// PUT /api/events/:id
router.put('/:id', requireRole('host'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404).json({ success: false, error: 'Event not found' });
      return;
    }

    if (event.hostId.toString() !== req.user!.id) {
      res.status(403).json({ success: false, error: 'Not authorized to edit this event' });
      return;
    }

    const { title, description, duration, startDate, endDate, dailyStartTime, dailyEndTime } = req.body;

    const scheduleChanged =
      (startDate && startDate !== event.startDate.toISOString()) ||
      (endDate && endDate !== event.endDate.toISOString()) ||
      (dailyStartTime && dailyStartTime !== event.dailyStartTime) ||
      (dailyEndTime && dailyEndTime !== event.dailyEndTime) ||
      (duration && duration !== event.duration);

    if (title) event.title = title;
    if (description !== undefined) event.description = description;
    if (duration) event.duration = duration;
    if (startDate) event.startDate = new Date(startDate);
    if (endDate) event.endDate = new Date(endDate);
    if (dailyStartTime) event.dailyStartTime = dailyStartTime;
    if (dailyEndTime) event.dailyEndTime = dailyEndTime;

    await event.save();

    if (scheduleChanged) {
      await generateTimeSlots(event);
    }

    res.json(event.toJSON());
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update event' });
  }
});

// DELETE /api/events/:id (soft delete)
router.delete('/:id', requireRole('host'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404).json({ success: false, error: 'Event not found' });
      return;
    }

    if (event.hostId.toString() !== req.user!.id) {
      res.status(403).json({ success: false, error: 'Not authorized to delete this event' });
      return;
    }

    // Soft delete
    event.isArchived = true;
    await event.save();

    // Cancel all future confirmed bookings
    const now = new Date();
    await Booking.updateMany(
      { eventId: event._id, status: 'confirmed', startTime: { $gt: now } },
      { status: 'cancelled', cancelledAt: now }
    );

    // Free the slots for cancelled bookings
    await TimeSlot.updateMany(
      { eventId: event._id, isBooked: true },
      { isBooked: false, bookingId: null, bookedBy: null, bookedByName: null }
    );

    // Delete all unbooked slots
    await TimeSlot.deleteMany({ eventId: event._id, isBooked: false });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete event' });
  }
});

export default router;
