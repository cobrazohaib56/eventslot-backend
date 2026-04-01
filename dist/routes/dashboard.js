import { Router } from 'express';
import { Event } from '../models/Event.js';
import { Booking } from '../models/Booking.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
const router = Router();
router.use(verifyToken);
router.use(requireRole('host'));
// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
    try {
        const hostEvents = await Event.find({ hostId: req.user.id, isArchived: false });
        const eventIds = hostEvents.map((e) => e._id);
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const totalBookings = await Booking.countDocuments({
            eventId: { $in: eventIds },
            status: 'confirmed',
        });
        const upcomingBookings = await Booking.countDocuments({
            eventId: { $in: eventIds },
            status: 'confirmed',
            startTime: { $gt: now, $lte: thirtyDaysFromNow },
        });
        const recentBookings = await Booking.find({
            eventId: { $in: eventIds },
            status: 'confirmed',
            startTime: { $gt: now },
        })
            .sort({ startTime: 1 })
            .limit(5);
        res.json({
            totalEvents: hostEvents.length,
            totalBookings,
            upcomingBookings,
            recentBookings: recentBookings.map((b) => b.toJSON()),
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
    }
});
export default router;
//# sourceMappingURL=dashboard.js.map