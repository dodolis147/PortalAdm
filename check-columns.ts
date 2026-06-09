import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { loadAndValidateEnvironment } from './src/config/env-server';

const env = loadAndValidateEnvironment();
const url = env.supabaseUrl;
const key = env.supabaseServiceRoleKey;

if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(url, key);

async function checkColumns() {
  console.log("Analyzing columns of 'achados_perdidos' using SQL select empty mapping:");
  
  // Realiza um select limitado de colunas para testar sua existência individualmente
  const testColumns = [
    'id', 'nome', 'categoria', 'descricao', 'local_encontrado', 'data_encontrado',
    'status', 'criado_por', 'created_by', 'created_at', 'updated_at', 'active',
    'proprietario_nome', 'proprietario_unidade', 'data_retirada', 'responsavel_entrega',
    'assinatura_digital', 'foto_entrega'
  ];
  
  console.log("\nTesting individual columns presence on 'achados_perdidos':");
  for (const col of testColumns) {
    const { error } = await supabase.from('achados_perdidos').select(col).limit(1);
    if (error) {
      console.log(`❌ Column '${col}': MISSING or UNREADABLE (${error.message})`);
    } else {
      console.log(`🟢 Column '${col}': EXISTS`);
    }
  }

  console.log("\nTesting 'achados_perdidos_fotos' columns:");
  const testFotosCols = ['id', 'objeto_id', 'url_foto', 'created_at', 'created_by'];
  for (const col of testFotosCols) {
    const { error } = await supabase.from('achados_perdidos_fotos').select(col).limit(1);
    if (error) {
      console.log(`❌ Column '${col}': MISSING (${error.message})`);
    } else {
      console.log(`🟢 Column '${col}': EXISTS`);
    }
  }

  console.log("\nTesting 'achados_perdidos_historico' columns:");
  const testHistCols = ['id', 'objeto_id', 'usuario_id', 'usuario_nome', 'acao', 'observacao', 'created_at', 'created_by'];
  for (const col of testHistCols) {
    const { error } = await supabase.from('achados_perdidos_historico').select(col).limit(1);
    if (error) {
      console.log(`❌ Column '${col}': MISSING (${error.message})`);
    } else {
      console.log(`🟢 Column '${col}': EXISTS`);
    }
  }
}

checkColumns();

