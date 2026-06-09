-- Script para adicionar a coluna 'created_at' ausente na tabela 'bookings'
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
