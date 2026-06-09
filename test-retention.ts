
import { supabase } from './src/lib/supabase';

async function runRetentionTest() {
  // const supabase = getSupabase(); // Use imported supabase client above
  console.log('--- Iniciando Teste de Retenção de Encomendas ---');

  // 1. Inserir dados de teste
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 35); // 35 dias atrás (deve ser deletado)
  
  const newDate = new Date();
  newDate.setDate(newDate.getDate() - 5); // 5 dias atrás (deve ser mantido)

  const { data: inserted, error: insertError } = await supabase.from('encomendas').insert([
    { morador_nome: 'Teste Antigo', data_recebimento: oldDate.toISOString(), codigo_rastreio: 'TEST-OLD' },
    { morador_nome: 'Teste Novo', data_recebimento: newDate.toISOString(), codigo_rastreio: 'TEST-NEW' }
  ]).select();

  if (insertError) {
    console.error('Erro ao inserir:', insertError);
    return;
  }
  console.log('Dados de teste inseridos.');

  // 2. Executar a função de cleanup
  const { error: rpcError } = await supabase.rpc('cleanup_encomendas');
  if (rpcError) {
    console.error('Erro na função de cleanup:', rpcError);
    return;
  }
  console.log('Função de cleanup executada.');

  // 3. Verificar resultados
  const { data: remaining, error: fetchError } = await supabase.from('encomendas').select('codigo_rastreio');
  if (fetchError) {
    console.error('Erro ao listar:', fetchError);
    return;
  }
  
  const existsOld = remaining?.some(r => r.codigo_rastreio === 'TEST-OLD');
  const existsNew = remaining?.some(r => r.codigo_rastreio === 'TEST-NEW');

  console.log('--- Resultados do Teste ---');
  console.log('Registro antigo ainda existe?', existsOld ? 'SIM (FALHA)' : 'NÃO (SUCESSO)');
  console.log('Registro novo ainda existe?', existsNew ? 'SIM (SUCESSO)' : 'NÃO (FALHA)');
  
  // Cleanup dados de teste
  await supabase.from('encomendas').delete().in('codigo_rastreio', ['TEST-NEW']);
  console.log('Dados de teste limpos.');
}

runRetentionTest();
