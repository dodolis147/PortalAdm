import { createRepository } from '../lib/db-client';
import { Visitor } from '../types';

export const visitorsRepository = createRepository<Visitor>('visitors');
