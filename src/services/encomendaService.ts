import { createRepository } from '../lib/db-client';
import { Encomenda } from '../types';

export const encomendasRepository = createRepository<Encomenda>('encomendas');
