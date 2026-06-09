import { createRepository } from '../lib/db-client';
import { CommonArea } from '../types';

export const commonAreasRepository = createRepository<CommonArea>('common_areas');
