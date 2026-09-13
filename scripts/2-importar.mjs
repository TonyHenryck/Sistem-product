/**
 * Importa backup-rhdp.json para o Supabase.
 * Uso:  node scripts/2-importar.mjs ./backup-rhdp.json
 * Precisa de SUPABASE_URL e SUPABASE_SERVICE_ROLE no .env (service role ignora RLS).
 *
 * Estrategia:
 *  1. deriva os catalogos (funcao, beneficio, motivo) dos valores distintos do JSON
 *  2. importa colaboradores e monta um mapa nome -> uuid
 *  3. importa o resto resolvendo os nomes pelo mapa
 *  4. o que nao casar por nome fica gravado no campo *_nome e sai no relatorio final
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import 'dotenv/config';

const EMPRESA = '00000000-0000-0000-0000-000000000001';
const UNIDADE = '00000000-0000-0000-0000-000000000010';

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false }
});

const D = JSON.parse(readFileSync(process.argv[2] || './backup-rhdp.json', 'utf8'));
const naoResolvidos = [];
const norm = s => (s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const dia = v => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const num = v => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v));
const sim = v => v === 'Sim' || v === true;

async function inserir(tabela, linhas, colunaId = 'id') {
  if (!linhas.length) return [];
  const out = [];
  for (let i = 0; i < linhas.length; i += 200) {
    const { data, error } = await db.from(tabela).insert(linhas.slice(i, i + 200)).select(colunaId);
    if (error) { console.error(`${tabela}:`, error.message); return out; }
    out.push(...data);
  }
  console.log(`${tabela}: ${out.length}`);
  return out;
}

// ---------- 1. catalogos derivados ----------
async function catalogo(tabela, valores, extra = {}) {
  const unicos = [...new Set(valores.filter(Boolean).map(v => String(v).trim()))];
  if (unicos.length) {
    await db.from(tabela).upsert(
      unicos.map(nome => ({ empresa_id: EMPRESA, nome, ...extra })),
      { onConflict: 'empresa_id,nome' }
    );
  }
  const { data } = await db.from(tabela).select('id,nome').eq('empresa_id', EMPRESA);
  return new Map((data || []).map(r => [norm(r.nome), r.id]));
}

// ---------- 2. locais e horarios ----------
async function mapa(tabela, campo, filtro = {}) {
  let q = db.from(tabela).select(`id,${campo}`);
  for (const [k, v] of Object.entries(filtro)) q = q.eq(k, v);
  const { data } = await q;
  return new Map((data || []).map(r => [norm(r[campo]), r.id]));
}

async function main() {
  const funcoes  = await catalogo('cat_funcao',          (D.colab || []).map(c => c.funcao));
  const benefs   = await catalogo('cat_beneficio',       (D.colab || []).map(c => c.beneficio));
  const motivos  = await catalogo('cat_motivo_ausencia', (D.diarias || []).map(d => d.motivo));
  const escalas  = await mapa('cat_escala',   'nome',      { empresa_id: EMPRESA });
  const horarios = await mapa('cat_horario',  'descricao', { empresa_id: EMPRESA });
  const locais   = await mapa('local_operacional', 'nome', { unidade_id: UNIDADE });

  // ---------- 3. colaboradores ----------
  const colabs = D.colab || [];
  const linhas = colabs.map(c => ({
    empresa_id: EMPRESA,
    unidade_id: UNIDADE,
    local_id: locais.get(norm(c.unidade)) || null,
    atende_multiplos: norm(c.unidade) === 'multiplas',
    nome: c.nome,
    matricula: c.matricula || null,
    funcao_id: funcoes.get(norm(c.funcao)) || null,
    faixa: c.faixa || null,
    area: c.area || null,
    registro_conselho: c.registro || null,
    escala_id: escalas.get(norm(c.escala)) || null,
    turno: c.turno || null,
    horario_id: horarios.get(norm(c.horario)) || null,
    vinculo: c.vinculo || 'CLT',
    nascimento: dia(c.nascimento),
    parental: c.parental || null,
    filhos: num(c.filhos) ?? 0,
    admissao: dia(c.admissao),
    aval_35_em: dia(c.aval35),
    aval_35_res: c.aval35res || null,
    aval_80_em: dia(c.aval80),
    aval_80_res: c.aval80res || null,
    decisao_exp: c.decisaoExp || null,
    aso_ultimo: dia(c.aso),
    aso_arquivo: c.arquivoASO || null,
    fim_contrato: dia(c.fimContrato),
    beneficio_id: benefs.get(norm(c.beneficio)) || null,
    termo_assinado: c.termo || null,
    salario_base: num(c.salario),
    dependentes: num(c.dependentes) ?? 0,
    insalubridade: c.insalubridade || null,
    telefone: c.telefone || null,
    cep: c.cep || null,
    endereco: c.endereco || null,
    bairro: c.bairro || null,
    cidade: c.cidade || 'Imperatriz',
    uf: c.uf || 'MA',
    ativo: c.ativo !== false,
    desligamento: dia(c.desligamento),
    motivo_saida: c.motivoSaida || null,
    aviso_previo: c.avisoPrevio || null,
    rescisao_em: dia(c.rescisaoEm)
  }));

  const { data: inseridos, error } = await db.from('colaborador').insert(linhas).select('id,nome');
  if (error) throw error;
  console.log(`colaborador: ${inseridos.length}`);
  const P = new Map(inseridos.map(r => [norm(r.nome), r.id]));

  const quem = (nome, contexto) => {
    if (!nome) return null;
    const id = P.get(norm(nome));
    if (!id) naoResolvidos.push(`${contexto}: ${nome}`);
    return id || null;
  };

  // dados sensiveis em tabela separada
  await inserir('colaborador_dado_sensivel', colabs
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
    .filter(r => r.colaborador_id), 'colaborador_id');

  // ---------- 4. movimento ----------
  await inserir('diaria', (D.diarias || []).map(d => ({
    empresa_id: EMPRESA, unidade_id: UNIDADE,
    local_id: locais.get(norm(d.unidade)) || null,
    data: dia(d.data), turno: d.turno || null,
    faltante_id: quem(d.quemFaltou, 'diaria/faltou'), faltante_nome: d.quemFaltou || null,
    motivo_id: motivos.get(norm(d.motivo)) || null,
    atestado: d.atestado || null,
    cobriu_id: quem(d.quemCobriu, 'diaria/cobriu'), cobriu_nome: d.quemCobriu || null,
    vinculo_cobriu: d.vinculo || null,
    funcao_exercida: d.funcao || null,
    valor: num(d.valor), autorizado_por: d.autorizadoPor || null,
    status: d.status || 'Registrado',
    forma_pagamento: d.formaPagamento || null,
    recibo_assinado: sim(d.recibo),
    obs: d.obs || null
  })).filter(r => r.data));

  await inserir('pendencia_pagamento', (D.pend || []).map(p => ({
    empresa_id: EMPRESA, unidade_id: UNIDADE,
    competencia: p.competencia || null,
    colaborador_id: quem(p.colaborador, 'pendencia'), colaborador_nome: p.colaborador || null,
    vinculo: p.vinculo || null, motivo: p.motivo || null, referencia: p.referencia || null,
    qtd: num(p.qtd) ?? 1, valor_unit: num(p.valorUnit),
    status: p.status || 'Em aberto', dados_pagamento: p.dados || null, obs: p.obs || null
  })).filter(r => r.competencia));

  await inserir('ocorrencia', (D.ocor || []).map(o => ({
    empresa_id: EMPRESA, unidade_id: UNIDADE, data: dia(o.data),
    colaborador_id: quem(o.colaborador, 'ocorrencia'),
    tipo: o.tipo || null, resolvido: o.resolvido === true || o.resolvido === 'Resolvido',
    descricao: o.descricao || null, providencia: o.providencia || null,
    arquivo_local: o.arquivo || null
  })).filter(r => r.data));

  await inserir('falta', (D.faltas || []).map(f => ({
    empresa_id: EMPRESA, unidade_id: UNIDADE, data: dia(f.data),
    colaborador_id: quem(f.colaborador, 'falta'),
    tipo: f.tipo, dias: num(f.dias) ?? 1,
    tempo_perdido: f.horas && f.horas.includes(':') ? f.horas : null,
    atestado: f.atestado || null,
    descontar: f.descontar !== 'Não', perde_dsr: sim(f.dsr), notificado: sim(f.notificado),
    obs: f.obs || null, arquivo_local: f.arquivo || null
  })).filter(r => r.data && r.colaborador_id && r.tipo));

  await inserir('troca_turno', (D.trocas || []).map(t => ({
    empresa_id: EMPRESA, unidade_id: UNIDADE, data_trocada: dia(t.data),
    folgou_id: quem(t.quemFolgou, 'troca/folgou'),
    assumiu_id: quem(t.quemAssumiu, 'troca/assumiu'),
    motivo: t.motivo || null, data_devolucao: dia(t.dataDevolucao),
    status: t.status || 'Devolução pendente', formalizada: sim(t.formalizado),
    autorizado_por: t.autorizadoPor || null, obs: t.obs || null, arquivo_local: t.arquivo || null
  })).filter(r => r.data_trocada && r.folgou_id && r.assumiu_id));

  await inserir('ferias_afastamento', (D.ferias || []).map(f => ({
    empresa_id: EMPRESA, unidade_id: UNIDADE,
    colaborador_id: quem(f.colaborador, 'ferias'),
    tipo: f.tipo, inicio: dia(f.inicio), fim: dia(f.fim),
    aquisitivo_de: dia(f.aquisitivoDe), aquisitivo_ate: dia(f.aquisitivoAte),
    status: f.status || 'Programada', aviso_em: dia(f.avisoEm),
    obs: f.obs || null, arquivo_local: f.arquivo || null
  })).filter(r => r.colaborador_id && r.inicio && r.tipo));

  await inserir('ponto_competencia', (D.ponto || []).map(p => ({
    empresa_id: EMPRESA, unidade_id: UNIDADE,
    colaborador_id: quem(p.colaborador, 'ponto'),
    competencia: p.competencia, regime: p.regime || null,
    horas_trabalhadas: p.horasTrabalhadas || null,
    saldo_sistema: p.saldoSistema || null, saldo_conferido: p.saldoConferido || null,
    obs: p.obs || null
  })).filter(r => r.colaborador_id && r.competencia));

  await inserir('envio_fopag', (D.envios || []).map(e => ({
    empresa_id: EMPRESA, unidade_id: UNIDADE, competencia: e.competencia,
    status: e.status || 'Em preparação', data_envio: dia(e.dataEnvio),
    enviado_por: e.enviadoPor || null, destinatario: e.destinatario || null, obs: e.obs || null
  })).filter(r => r.competencia));

  await inserir('info_pendente', (D.info || []).map(i => ({
    empresa_id: EMPRESA, unidade_id: UNIDADE,
    prioridade: i.prioridade || null, area: i.area || null, responsavel: i.responsavel || null,
    status: i.status || 'Em aberto', prazo: dia(i.prazo), item: i.item
  })).filter(r => r.item));

  await inserir('diario_bordo', (D.diario || []).map(d => ({
    empresa_id: EMPRESA, unidade_id: UNIDADE, data: dia(d.data), tipo: d.tipo || null,
    titulo: d.titulo, para_quem: d.paraQuem || null, descricao: d.descricao || null,
    evidencia: d.evidencia || null, resultado: d.resultado || null
  })).filter(r => r.data && r.titulo));

  await inserir('custo_lancamento', (D.custos || []).map(c => ({
    empresa_id: EMPRESA, unidade_id: UNIDADE, competencia: c.competencia,
    tipo: c.tipo || null, descricao: c.descricao, valor: num(c.valor) ?? 0,
    recorrente: sim(c.recorrente), obs: c.obs || null
  })).filter(r => r.competencia && r.descricao));

  await inserir('item_estoque', (D.estoque || []).map(e => ({
    empresa_id: EMPRESA, unidade_id: UNIDADE, nome: e.item, categoria: e.categoria || null,
    unidade_medida: e.unidade || null, qtd_atual: num(e.qtd) ?? 0, minimo: num(e.minimo) ?? 1,
    local: e.local || null, obs: e.obs || null
  })).filter(r => r.nome));

  await inserir('compra', (D.compras || []).map(c => ({
    empresa_id: EMPRESA, unidade_id: UNIDADE, data: dia(c.data), item_nome: c.item,
    categoria: c.categoria || null, origem: c.origem || null,
    qtd: num(c.qtd) ?? 1, valor_unit: num(c.valorUnit), fornecedor: c.fornecedor || null,
    nota_fiscal: c.nf || null, solicitante: c.solicitante || null,
    status: c.status || 'Solicitada', obs: c.obs || null
  })).filter(r => r.data && r.item_nome));

  // treinamentos e participacoes
  const trs = await inserir('treinamento', (D.treino || []).map(t => ({
    empresa_id: EMPRESA, unidade_id: UNIDADE, codigo: t.codigo || null, tema: t.tema,
    publico_alvo: t.publico || null, carga_horaria: num(t.cargaHoraria),
    prioridade: t.prioridade || null, fundamento: t.fundamento || null,
    status: t.status || 'Planejado',
    data_prevista: dia(t.dataPrevista), data_realizada: dia(t.dataRealizada)
  })).filter(r => r.tema));

  if (trs.length) {
    const { data: tlist } = await db.from('treinamento').select('id,codigo,tema').eq('empresa_id', EMPRESA);
    const T = new Map((tlist || []).map(t => [norm(`${t.codigo} — ${t.tema}`), t.id]));
    await inserir('participacao', (D.particip || []).map(p => ({
      empresa_id: EMPRESA,
      treinamento_id: T.get(norm(p.modulo)) || null,
      colaborador_id: quem(p.colaborador, 'participacao'),
      data: dia(p.data), certificado: sim(p.certificado), arquivo_local: p.arquivo || null
    })).filter(r => r.treinamento_id && r.colaborador_id && r.data));
  }

  if (naoResolvidos.length) {
    console.log('\nNomes que nao casaram com nenhum colaborador (revisar):');
    [...new Set(naoResolvidos)].forEach(n => console.log('  - ' + n));
  }
  console.log('\nImportacao concluida.');
}

main().catch(e => { console.error(e); process.exit(1); });
