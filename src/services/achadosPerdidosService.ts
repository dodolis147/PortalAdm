import { createRepository } from '../lib/db-client';
import { AchadosPerdidos } from '../types';

export const achadosPerdidosRepository = createRepository<AchadosPerdidos>('achados_perdidos');
