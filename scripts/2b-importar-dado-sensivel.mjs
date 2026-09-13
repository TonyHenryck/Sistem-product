/**
 * Backfill de colaborador_dado_sensivel para quem ja foi importado por
 * scripts/2-importar.mjs (usar so se o passo de dado sensivel falhou na
 * primeira rodada). Nao reinsere colaborador.
 * Uso: node scripts/2b-importar-dado-sensivel.mjs ./backup-rhdp.json
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import 'dotenv/config';

const EMPRESA = '00000000-0000-0000-0000-000000000001';

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false }
});

const D = JSON.parse(readFileSync(process.argv[2] || './backup-rhdp.json', 'utf8'));
const norm = s => (s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

async function main() {
  const { data: colaboradores, error: erroColab } = await db
    .from('colaborador')
    .select('id,nome')
    .eq('empresa_id', EMPRESA);
  if (erroColab) throw erroColab;

  const P = new Map(colaboradores.map(c => [norm(c.nome), c.id]));

  const linhas = (D.colab || [])
    .filter(c => c.cpf || c.pix || c.conta)
    .map(c => ({
      colaborador_id: P.get(norm(c.nome)),
      empresa_id: EMPRESA,
      cpf: c.cpf || null,
      tipo_chave_pix: c.tipoChave || null,
      chave_pix: c.pix || null,
      banco: c.banco || null,
      agencia: c.agencia || null,
      conta: c.conta || null,
      titular: c.titular || null
    }))
    .filter(r => r.colaborador_id);

  const naoResolvidos = (D.colab || [])
    .filter(c => (c.cpf || c.pix || c.conta) && !P.get(norm(c.nome)))
    .map(c => c.nome);

  if (!linhas.length) {
    console.log('Nada para importar.');
    return;
  }

  const { data, error } = await db
    .from('colaborador_dado_sensivel')
    .upsert(linhas, { onConflict: 'colaborador_id' })
    .select('colaborador_id');
  if (error) throw error;

  console.log(`colaborador_dado_sensivel: ${data.length}`);
  if (naoResolvidos.length) {
    console.log('\nNao encontrados (revisar nome):');
    naoResolvidos.forEach(n => console.log('  - ' + n));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
