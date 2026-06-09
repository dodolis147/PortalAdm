-- Script para corrigir o tipo da coluna 'id' na tabela 'bookings'
-- Altera de 'uuid' para 'text' para suportar o formato de ID gerado pelo aplicativo (ex: 'book-1780381287184')

ALTER TABLE bookings ALTER COLUMN id TYPE text;
