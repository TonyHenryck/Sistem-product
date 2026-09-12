/** Carrega seed/produtos.csv (146 generos do almoxarifado) na tabela produto. */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import 'dotenv/config';

const EMPRESA = '00000000-0000-0000-0000-000000000001';
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE,
  { auth: { persistSession: false } });

const linhas = readFileSync('./seed/produtos.csv', 'utf8').trim().split('\n').slice(1);
const produtos = linhas.map(l => {
  const [codigo, resto] = l.split(',"');
  const [nome, unidade] = resto.split('",');
  return { empresa_id: EMPRESA, codigo, nome, unidade_medida: unidade };
});

const { error } = await db.from('produto').upsert(produtos, { onConflict: 'empresa_id,codigo' });
console.log(error ? error.message : `produto: ${produtos.length}`);
