import { createRepository } from '../lib/db-client';
import { Resident } from '../types';

export const residentsRepository = createRepository<Resident>('residents');
