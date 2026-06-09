import { createRepository } from '../lib/db-client';
import { Booking } from '../types';

export const bookingsRepository = createRepository<Booking>('bookings');
