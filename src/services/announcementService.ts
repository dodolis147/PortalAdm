import { createRepository } from '../lib/db-client';
import { Announcement } from '../types';

export const announcementsRepository = createRepository<Announcement>('announcements');
