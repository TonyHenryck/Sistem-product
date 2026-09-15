import { supabase } from './supabase'
import type { Database } from './database.types'

export type Anexo = Database['public']['Tables']['anexo']['Row']

const BUCKET = 'anexos'
const EXTENSOES_ACEITAS = ['.pdf', '.jpg', '.jpeg', '.png']
const TAMANHO_MAXIMO = 10 * 1024 * 1024

export function extensaoAceita(nomeArquivo: string): boolean {
  const nome = nomeArquivo.toLowerCase()
  return EXTENSOES_ACEITAS.some((ext) => nome.endsWith(ext))
}

export async function enviarAnexo(
  empresaId: string,
  entidade: string,
  entidadeId: string,
  arquivo: File,
  enviadoPor: string | null,
): Promise<Anexo> {
  if (!extensaoAceita(arquivo.name)) {
    throw new Error('Formato não aceito. Envie PDF, JPG ou PNG.')
  }
  if (arquivo.size > TAMANHO_MAXIMO) {
    throw new Error('Arquivo maior que 10 MB.')
  }

  const caminho = `${empresaId}/${entidade}/${entidadeId}/${Date.now()}_${arquivo.name}`

  const { error: erroUpload } = await supabase.storage.from(BUCKET).upload(caminho, arquivo)
  if (erroUpload) throw erroUpload

  const { data, error } = await supabase
    .from('anexo')
    .insert({
      empresa_id: empresaId,
      entidade,
      entidade_id: entidadeId,
      nome_arquivo: arquivo.name,
      storage_path: caminho,
      mime: arquivo.type || null,
      tamanho_bytes: arquivo.size,
      enviado_por: enviadoPor,
    })
    .select()
    .single()

  if (error) {
    await supabase.storage.from(BUCKET).remove([caminho])
    throw error
  }
  return data
}

export async function listarAnexos(entidade: string, entidadeId: string): Promise<Anexo[]> {
  const { data, error } = await supabase
    .from('anexo')
    .select('*')
    .eq('entidade', entidade)
    .eq('entidade_id', entidadeId)
    .order('criado_em', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function urlAnexo(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 600)
  if (error) throw error
  return data.signedUrl
}

export async function excluirAnexo(anexo: Anexo): Promise<void> {
  const { error: erroStorage } = await supabase.storage.from(BUCKET).remove([anexo.storage_path])
  if (erroStorage) throw erroStorage

  const { error } = await supabase.from('anexo').delete().eq('id', anexo.id)
  if (error) throw error
}
