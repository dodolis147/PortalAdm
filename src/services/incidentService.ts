import { createRepository } from '../lib/db-client';
import { Incident } from '../types';

export const incidentsRepository = createRepository<Incident>('incidents');
