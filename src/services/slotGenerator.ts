import { IEvent } from '../models/Event.js';
import { TimeSlot } from '../models/TimeSlot.js';

export async function generateTimeSlots(event: IEvent): Promise<void> {
  // Delete existing non-booked slots for this event
  await TimeSlot.deleteMany({ eventId: event._id, isBooked: false });

  const slots: Array<{
    eventId: typeof event._id;
    startTime: Date;
    endTime: Date;
    isBooked: boolean;
  }> = [];

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const now = new Date();

  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    // Parse daily start and end times
    const [startHour, startMinute] = event.dailyStartTime.split(':').map(Number);
    const [endHour, endMinute] = event.dailyEndTime.split(':').map(Number);

    const slotStart = new Date(currentDate);
    slotStart.setHours(startHour, startMinute, 0, 0);

    const dayEnd = new Date(currentDate);
    dayEnd.setHours(endHour, endMinute, 0, 0);

    // Generate slots for this day
    const current = new Date(slotStart);
    while (current < dayEnd) {
      const slotEnd = new Date(current.getTime() + event.duration * 60000);

      // Only add slot if it fits within the day's end time and is in the future
      if (slotEnd <= dayEnd && slotEnd > now) {
        slots.push({
          eventId: event._id,
          startTime: new Date(current),
          endTime: new Date(slotEnd),
          isBooked: false,
        });
      }

      current.setTime(slotEnd.getTime());
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (slots.length > 0) {
    await TimeSlot.insertMany(slots, { ordered: false }).catch((err) => {
      // Ignore duplicate key errors (slots that already exist from preserved bookings)
      if (err.code !== 11000) throw err;
    });
  }
}
