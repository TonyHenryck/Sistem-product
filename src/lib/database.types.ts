// Tipagem manual das tabelas usadas na Tarefa 1.
// Regerar com o projeto Supabase linkado:
//   supabase gen types typescript --project-id <ref> > src/lib/database.types.ts

export interface Database {
  public: {
    Tables: {
      usuario: {
        Row: {
          id: string
          nome: string
          email: string | null
          ativo: boolean
          criado_em: string
        }
        Insert: {
          id: string
          nome: string
          email?: string | null
          ativo?: boolean
          criado_em?: string
        }
        Update: {
          id?: string
          nome?: string
          email?: string | null
          ativo?: boolean
          criado_em?: string
        }
      }
      unidade: {
        Row: {
          id: string
          empresa_id: string
          nome: string
          cidade: string | null
          uf: string | null
          ativo: boolean
          criado_em: string
        }
        Insert: {
          id?: string
          empresa_id: string
          nome: string
          cidade?: string | null
          uf?: string | null
          ativo?: boolean
          criado_em?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          nome?: string
          cidade?: string | null
          uf?: string | null
          ativo?: boolean
          criado_em?: string
        }
      }
      usuario_unidade: {
        Row: {
          usuario_id: string
          unidade_id: string
          papel: 'operador' | 'gestor' | 'admin' | 'leitura'
        }
        Insert: {
          usuario_id: string
          unidade_id: string
          papel?: 'operador' | 'gestor' | 'admin' | 'leitura'
        }
        Update: {
          usuario_id?: string
          unidade_id?: string
          papel?: 'operador' | 'gestor' | 'admin' | 'leitura'
        }
      }
      local_operacional: {
        Row: {
          id: string
          unidade_id: string
          nome: string
          ativo: boolean
        }
        Insert: {
          id?: string
          unidade_id: string
          nome: string
          ativo?: boolean
        }
        Update: {
          id?: string
          unidade_id?: string
          nome?: string
          ativo?: boolean
        }
      }
      cat_beneficio: {
        Row: {
          id: string
          empresa_id: string
          nome: string
          ativo: boolean
        }
        Insert: {
          id?: string
          empresa_id: string
          nome: string
          ativo?: boolean
        }
        Update: {
          id?: string
          empresa_id?: string
          nome?: string
          ativo?: boolean
        }
      }
      cat_funcao: {
        Row: {
          id: string
          empresa_id: string
          nome: string
          area: string | null
          ativo: boolean
        }
        Insert: {
          id?: string
          empresa_id: string
          nome: string
          area?: string | null
          ativo?: boolean
        }
        Update: {
          id?: string
          empresa_id?: string
          nome?: string
          area?: string | null
          ativo?: boolean
        }
      }
      cat_escala: {
        Row: {
          id: string
          empresa_id: string
          nome: string
          cor: string | null
          trabalha_dia_par: boolean | null
          ativo: boolean
        }
        Insert: {
          id?: string
          empresa_id: string
          nome: string
          cor?: string | null
          trabalha_dia_par?: boolean | null
          ativo?: boolean
        }
        Update: {
          id?: string
          empresa_id?: string
          nome?: string
          cor?: string | null
          trabalha_dia_par?: boolean | null
          ativo?: boolean
        }
      }
      colaborador: {
        Row: {
          id: string
          empresa_id: string
          unidade_id: string
          local_id: string | null
          atende_multiplos: boolean
          nome: string
          matricula: string | null
          funcao_id: string | null
          faixa: 'I' | 'II' | 'III' | 'Único' | null
          area: string | null
          registro_conselho: string | null
          escala_id: string | null
          turno: 'Diurno' | 'Noturno' | null
          horario_id: string | null
          vinculo: 'CLT' | 'Prestador'
          nascimento: string | null
          parental: 'Mãe' | 'Pai' | 'Não informado' | null
          filhos: number | null
          admissao: string | null
          aval_35_em: string | null
          aval_35_res: 'Satisfatório' | 'Com ressalvas' | 'Insatisfatório' | null
          aval_80_em: string | null
          aval_80_res: 'Satisfatório' | 'Com ressalvas' | 'Insatisfatório' | null
          decisao_exp: 'Efetivado' | 'Desligado no prazo' | 'Prorrogado' | null
          aso_ultimo: string | null
          aso_arquivo: string | null
          fim_contrato: string | null
          beneficio_id: string | null
          termo_assinado: string | null
          salario_base: number | null
          dependentes: number | null
          insalubridade: '10%' | '20%' | '40%' | null
          telefone: string | null
          cep: string | null
          endereco: string | null
          bairro: string | null
          cidade: string | null
          uf: string | null
          ativo: boolean
          desligamento: string | null
          motivo_saida: string | null
          aviso_previo: 'Cumprido' | 'Indenizado' | 'Dispensado' | null
          rescisao_em: string | null
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          empresa_id: string
          unidade_id: string
          local_id?: string | null
          atende_multiplos?: boolean
          nome: string
          matricula?: string | null
          funcao_id?: string | null
          faixa?: 'I' | 'II' | 'III' | 'Único' | null
          area?: string | null
          registro_conselho?: string | null
          escala_id?: string | null
          turno?: 'Diurno' | 'Noturno' | null
          horario_id?: string | null
          vinculo?: 'CLT' | 'Prestador'
          nascimento?: string | null
          parental?: 'Mãe' | 'Pai' | 'Não informado' | null
          filhos?: number | null
          admissao?: string | null
          aval_35_em?: string | null
          aval_35_res?: 'Satisfatório' | 'Com ressalvas' | 'Insatisfatório' | null
          aval_80_em?: string | null
          aval_80_res?: 'Satisfatório' | 'Com ressalvas' | 'Insatisfatório' | null
          decisao_exp?: 'Efetivado' | 'Desligado no prazo' | 'Prorrogado' | null
          aso_ultimo?: string | null
          aso_arquivo?: string | null
          fim_contrato?: string | null
          beneficio_id?: string | null
          termo_assinado?: string | null
          salario_base?: number | null
          dependentes?: number | null
          insalubridade?: '10%' | '20%' | '40%' | null
          telefone?: string | null
          cep?: string | null
          endereco?: string | null
          bairro?: string | null
          cidade?: string | null
          uf?: string | null
          ativo?: boolean
          desligamento?: string | null
          motivo_saida?: string | null
          aviso_previo?: 'Cumprido' | 'Indenizado' | 'Dispensado' | null
          rescisao_em?: string | null
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          unidade_id?: string
          local_id?: string | null
          atende_multiplos?: boolean
          nome?: string
          matricula?: string | null
          funcao_id?: string | null
          faixa?: 'I' | 'II' | 'III' | 'Único' | null
          area?: string | null
          registro_conselho?: string | null
          escala_id?: string | null
          turno?: 'Diurno' | 'Noturno' | null
          horario_id?: string | null
          vinculo?: 'CLT' | 'Prestador'
          nascimento?: string | null
          parental?: 'Mãe' | 'Pai' | 'Não informado' | null
          filhos?: number | null
          admissao?: string | null
          aval_35_em?: string | null
          aval_35_res?: 'Satisfatório' | 'Com ressalvas' | 'Insatisfatório' | null
          aval_80_em?: string | null
          aval_80_res?: 'Satisfatório' | 'Com ressalvas' | 'Insatisfatório' | null
          decisao_exp?: 'Efetivado' | 'Desligado no prazo' | 'Prorrogado' | null
          aso_ultimo?: string | null
          aso_arquivo?: string | null
          fim_contrato?: string | null
          beneficio_id?: string | null
          termo_assinado?: string | null
          salario_base?: number | null
          dependentes?: number | null
          insalubridade?: '10%' | '20%' | '40%' | null
          telefone?: string | null
          cep?: string | null
          endereco?: string | null
          bairro?: string | null
          cidade?: string | null
          uf?: string | null
          ativo?: boolean
          desligamento?: string | null
          motivo_saida?: string | null
          aviso_previo?: 'Cumprido' | 'Indenizado' | 'Dispensado' | null
          rescisao_em?: string | null
          criado_em?: string
          atualizado_em?: string
        }
      }
      colaborador_dado_sensivel: {
        Row: {
          colaborador_id: string
          empresa_id: string
          cpf: string | null
          tipo_chave_pix: 'CPF' | 'Celular' | 'E-mail' | 'Aleatória' | null
          chave_pix: string | null
          banco: string | null
          agencia: string | null
          conta: string | null
          titular: string | null
          atualizado_em: string
        }
        Insert: {
          colaborador_id: string
          empresa_id: string
          cpf?: string | null
          tipo_chave_pix?: 'CPF' | 'Celular' | 'E-mail' | 'Aleatória' | null
          chave_pix?: string | null
          banco?: string | null
          agencia?: string | null
          conta?: string | null
          titular?: string | null
          atualizado_em?: string
        }
        Update: {
          colaborador_id?: string
          empresa_id?: string
          cpf?: string | null
          tipo_chave_pix?: 'CPF' | 'Celular' | 'E-mail' | 'Aleatória' | null
          chave_pix?: string | null
          banco?: string | null
          agencia?: string | null
          conta?: string | null
          titular?: string | null
          atualizado_em?: string
        }
      }
      falta: {
        Row: {
          id: string
          empresa_id: string
          unidade_id: string
          data: string
          colaborador_id: string
          tipo:
            | 'Falta injustificada'
            | 'Atestado médico'
            | 'Falta abonada'
            | 'Atraso'
            | 'Saída antecipada'
            | 'Suspensão'
          dias: number | null
          tempo_perdido: string | null
          atestado: 'Não se aplica' | 'Sim' | 'Não' | null
          descontar: boolean
          perde_dsr: boolean
          notificado: boolean
          obs: string | null
          arquivo_local: string | null
          criado_em: string
        }
        Insert: {
          id?: string
          empresa_id: string
          unidade_id: string
          data: string
          colaborador_id: string
          tipo:
            | 'Falta injustificada'
            | 'Atestado médico'
            | 'Falta abonada'
            | 'Atraso'
            | 'Saída antecipada'
            | 'Suspensão'
          dias?: number | null
          tempo_perdido?: string | null
          atestado?: 'Não se aplica' | 'Sim' | 'Não' | null
          descontar?: boolean
          perde_dsr?: boolean
          notificado?: boolean
          obs?: string | null
          arquivo_local?: string | null
          criado_em?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          unidade_id?: string
          data?: string
          colaborador_id?: string
          tipo?:
            | 'Falta injustificada'
            | 'Atestado médico'
            | 'Falta abonada'
            | 'Atraso'
            | 'Saída antecipada'
            | 'Suspensão'
          dias?: number | null
          tempo_perdido?: string | null
          atestado?: 'Não se aplica' | 'Sim' | 'Não' | null
          descontar?: boolean
          perde_dsr?: boolean
          notificado?: boolean
          obs?: string | null
          arquivo_local?: string | null
          criado_em?: string
        }
      }
      troca_turno: {
        Row: {
          id: string
          empresa_id: string
          unidade_id: string
          data_trocada: string
          folgou_id: string
          assumiu_id: string
          motivo: string | null
          data_devolucao: string | null
          status: 'Devolução pendente' | 'Concluída' | 'Cancelada'
          formalizada: boolean
          autorizado_por: string | null
          obs: string | null
          arquivo_local: string | null
          criado_em: string
        }
        Insert: {
          id?: string
          empresa_id: string
          unidade_id: string
          data_trocada: string
          folgou_id: string
          assumiu_id: string
          motivo?: string | null
          data_devolucao?: string | null
          status?: 'Devolução pendente' | 'Concluída' | 'Cancelada'
          formalizada?: boolean
          autorizado_por?: string | null
          obs?: string | null
          arquivo_local?: string | null
          criado_em?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          unidade_id?: string
          data_trocada?: string
          folgou_id?: string
          assumiu_id?: string
          motivo?: string | null
          data_devolucao?: string | null
          status?: 'Devolução pendente' | 'Concluída' | 'Cancelada'
          formalizada?: boolean
          autorizado_por?: string | null
          obs?: string | null
          arquivo_local?: string | null
          criado_em?: string
        }
      }
      ferias_afastamento: {
        Row: {
          id: string
          empresa_id: string
          unidade_id: string
          colaborador_id: string
          tipo:
            | 'Férias'
            | 'Abono pecuniário'
            | 'Licença médica'
            | 'Licença maternidade'
            | 'Licença não remunerada'
            | 'Suspensão de contrato'
          inicio: string
          fim: string | null
          aquisitivo_de: string | null
          aquisitivo_ate: string | null
          status: 'Programada' | 'Em curso' | 'Concluída' | 'Cancelada'
          aviso_em: string | null
          obs: string | null
          arquivo_local: string | null
          criado_em: string
        }
        Insert: {
          id?: string
          empresa_id: string
          unidade_id: string
          colaborador_id: string
          tipo:
            | 'Férias'
            | 'Abono pecuniário'
            | 'Licença médica'
            | 'Licença maternidade'
            | 'Licença não remunerada'
            | 'Suspensão de contrato'
          inicio: string
          fim?: string | null
          aquisitivo_de?: string | null
          aquisitivo_ate?: string | null
          status?: 'Programada' | 'Em curso' | 'Concluída' | 'Cancelada'
          aviso_em?: string | null
          obs?: string | null
          arquivo_local?: string | null
          criado_em?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          unidade_id?: string
          colaborador_id?: string
          tipo?:
            | 'Férias'
            | 'Abono pecuniário'
            | 'Licença médica'
            | 'Licença maternidade'
            | 'Licença não remunerada'
            | 'Suspensão de contrato'
          inicio?: string
          fim?: string | null
          aquisitivo_de?: string | null
          aquisitivo_ate?: string | null
          status?: 'Programada' | 'Em curso' | 'Concluída' | 'Cancelada'
          aviso_em?: string | null
          obs?: string | null
          arquivo_local?: string | null
          criado_em?: string
        }
      }
      config_regra: {
        Row: {
          id: string
          empresa_id: string
          unidade_id: string | null
          chave: string
          valor: string
          descricao: string | null
          atualizado_em: string
        }
        Insert: {
          id?: string
          empresa_id: string
          unidade_id?: string | null
          chave: string
          valor: string
          descricao?: string | null
          atualizado_em?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          unidade_id?: string | null
          chave?: string
          valor?: string
          descricao?: string | null
          atualizado_em?: string
        }
      }
      cat_motivo_ausencia: {
        Row: {
          id: string
          empresa_id: string
          nome: string
          ativo: boolean
        }
        Insert: {
          id?: string
          empresa_id: string
          nome: string
          ativo?: boolean
        }
        Update: {
          id?: string
          empresa_id?: string
          nome?: string
          ativo?: boolean
        }
      }
      diaria: {
        Row: {
          id: string
          empresa_id: string
          unidade_id: string
          local_id: string | null
          data: string
          turno: 'Diurno' | 'Noturno' | null
          faltante_id: string | null
          faltante_nome: string | null
          motivo_id: string | null
          atestado: 'Sim' | 'Não' | 'Não se aplica' | null
          cobriu_id: string | null
          cobriu_nome: string | null
          vinculo_cobriu: 'CLT' | 'Prestador' | null
          funcao_exercida: string | null
          valor: number | null
          autorizado_por: string | null
          status: 'Registrado' | 'Enviado à matriz' | 'Pago' | 'Cancelado'
          forma_pagamento: 'PIX' | 'Transferência' | 'Espécie' | null
          recibo_assinado: boolean
          obs: string | null
          criado_por: string | null
          criado_em: string
        }
        Insert: {
          id?: string
          empresa_id: string
          unidade_id: string
          local_id?: string | null
          data: string
          turno?: 'Diurno' | 'Noturno' | null
          faltante_id?: string | null
          faltante_nome?: string | null
          motivo_id?: string | null
          atestado?: 'Sim' | 'Não' | 'Não se aplica' | null
          cobriu_id?: string | null
          cobriu_nome?: string | null
          vinculo_cobriu?: 'CLT' | 'Prestador' | null
          funcao_exercida?: string | null
          valor?: number | null
          autorizado_por?: string | null
          status?: 'Registrado' | 'Enviado à matriz' | 'Pago' | 'Cancelado'
          forma_pagamento?: 'PIX' | 'Transferência' | 'Espécie' | null
          recibo_assinado?: boolean
          obs?: string | null
          criado_por?: string | null
          criado_em?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          unidade_id?: string
          local_id?: string | null
          data?: string
          turno?: 'Diurno' | 'Noturno' | null
          faltante_id?: string | null
          faltante_nome?: string | null
          motivo_id?: string | null
          atestado?: 'Sim' | 'Não' | 'Não se aplica' | null
          cobriu_id?: string | null
          cobriu_nome?: string | null
          vinculo_cobriu?: 'CLT' | 'Prestador' | null
          funcao_exercida?: string | null
          valor?: number | null
          autorizado_por?: string | null
          status?: 'Registrado' | 'Enviado à matriz' | 'Pago' | 'Cancelado'
          forma_pagamento?: 'PIX' | 'Transferência' | 'Espécie' | null
          recibo_assinado?: boolean
          obs?: string | null
          criado_por?: string | null
          criado_em?: string
        }
      }
      diaria_beneficiario: {
        Row: {
          diaria_id: string
          empresa_id: string
          nome: string | null
          telefone: string | null
          cpf: string | null
          tipo_chave: string | null
          chave_pix: string | null
          banco: string | null
          agencia: string | null
          conta: string | null
        }
        Insert: {
          diaria_id: string
          empresa_id: string
          nome?: string | null
          telefone?: string | null
          cpf?: string | null
          tipo_chave?: string | null
          chave_pix?: string | null
          banco?: string | null
          agencia?: string | null
          conta?: string | null
        }
        Update: {
          diaria_id?: string
          empresa_id?: string
          nome?: string | null
          telefone?: string | null
          cpf?: string | null
          tipo_chave?: string | null
          chave_pix?: string | null
          banco?: string | null
          agencia?: string | null
          conta?: string | null
        }
      }
      advertencia: {
        Row: {
          id: string
          empresa_id: string
          unidade_id: string
          data: string
          colaborador_id: string
          tipo: 'Verbal' | 'Escrita' | 'Suspensão' | null
          motivo: string | null
          descricao: string | null
          testemunha: string | null
          assinada: boolean
          arquivo_local: string | null
          criado_em: string
        }
        Insert: {
          id?: string
          empresa_id: string
          unidade_id: string
          data: string
          colaborador_id: string
          tipo?: 'Verbal' | 'Escrita' | 'Suspensão' | null
          motivo?: string | null
          descricao?: string | null
          testemunha?: string | null
          assinada?: boolean
          arquivo_local?: string | null
          criado_em?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          unidade_id?: string
          data?: string
          colaborador_id?: string
          tipo?: 'Verbal' | 'Escrita' | 'Suspensão' | null
          motivo?: string | null
          descricao?: string | null
          testemunha?: string | null
          assinada?: boolean
          arquivo_local?: string | null
          criado_em?: string
        }
      }
      v_vencimento: {
        Row: {
          colaborador_id: string
          empresa_id: string
          unidade_id: string
          nome: string
          item: string
          vence_em: string | null
        }
        Insert: {
          colaborador_id: string
          empresa_id: string
          unidade_id: string
          nome: string
          item: string
          vence_em?: string | null
        }
        Update: {
          colaborador_id?: string
          empresa_id?: string
          unidade_id?: string
          nome?: string
          item?: string
          vence_em?: string | null
        }
      }
      ponto_competencia: {
        Row: {
          id: string
          empresa_id: string
          unidade_id: string
          colaborador_id: string
          competencia: string
          regime: 'Plantão' | 'Comercial' | 'Misto' | null
          horas_trabalhadas: string | null
          saldo_sistema: string | null
          saldo_conferido: string | null
          divergencia: string | null
          obs: string | null
          criado_em: string
        }
        Insert: {
          id?: string
          empresa_id: string
          unidade_id: string
          colaborador_id: string
          competencia: string
          regime?: 'Plantão' | 'Comercial' | 'Misto' | null
          horas_trabalhadas?: string | null
          saldo_sistema?: string | null
          saldo_conferido?: string | null
          obs?: string | null
          criado_em?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          unidade_id?: string
          colaborador_id?: string
          competencia?: string
          regime?: 'Plantão' | 'Comercial' | 'Misto' | null
          horas_trabalhadas?: string | null
          saldo_sistema?: string | null
          saldo_conferido?: string | null
          obs?: string | null
          criado_em?: string
        }
      }
      envio_fopag: {
        Row: {
          id: string
          empresa_id: string
          unidade_id: string
          competencia: string
          status: 'Em preparação' | 'Enviado' | 'Confirmado pela matriz' | 'Devolvido para ajuste'
          data_envio: string | null
          enviado_por: string | null
          destinatario: string | null
          obs: string | null
          criado_em: string
        }
        Insert: {
          id?: string
          empresa_id: string
          unidade_id: string
          competencia: string
          status?: 'Em preparação' | 'Enviado' | 'Confirmado pela matriz' | 'Devolvido para ajuste'
          data_envio?: string | null
          enviado_por?: string | null
          destinatario?: string | null
          obs?: string | null
          criado_em?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          unidade_id?: string
          competencia?: string
          status?: 'Em preparação' | 'Enviado' | 'Confirmado pela matriz' | 'Devolvido para ajuste'
          data_envio?: string | null
          enviado_por?: string | null
          destinatario?: string | null
          obs?: string | null
          criado_em?: string
        }
      }
      pendencia_pagamento: {
        Row: {
          id: string
          empresa_id: string
          unidade_id: string
          competencia: string
          colaborador_id: string | null
          colaborador_nome: string | null
          vinculo: 'CLT' | 'Prestador' | null
          motivo: string | null
          referencia: string | null
          qtd: number | null
          valor_unit: number | null
          valor_total: number | null
          status: 'Em aberto' | 'Aguardando valor' | 'Enviado à matriz' | 'Pago'
          dados_pagamento: string | null
          obs: string | null
          criado_em: string
        }
        Insert: {
          id?: string
          empresa_id: string
          unidade_id: string
          competencia: string
          colaborador_id?: string | null
          colaborador_nome?: string | null
          vinculo?: 'CLT' | 'Prestador' | null
          motivo?: string | null
          referencia?: string | null
          qtd?: number | null
          valor_unit?: number | null
          status?: 'Em aberto' | 'Aguardando valor' | 'Enviado à matriz' | 'Pago'
          dados_pagamento?: string | null
          obs?: string | null
          criado_em?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          unidade_id?: string
          competencia?: string
          colaborador_id?: string | null
          colaborador_nome?: string | null
          vinculo?: 'CLT' | 'Prestador' | null
          motivo?: string | null
          referencia?: string | null
          qtd?: number | null
          valor_unit?: number | null
          status?: 'Em aberto' | 'Aguardando valor' | 'Enviado à matriz' | 'Pago'
          dados_pagamento?: string | null
          obs?: string | null
          criado_em?: string
        }
      }
    }
  }
}
