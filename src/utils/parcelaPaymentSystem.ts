
import { Parcela, Pagamento, Promissoria } from '@/types';

/**
 * Sistema centralizado de pagamento de parcelas - Base para todo o sistema
 */
export class ParcelaPaymentSystem {
  /**
   * Método principal: pagar uma parcela específica
   * Todas as outras operações de pagamento derivam deste método
   */
  static pagarParcela(
    parcela: Parcela,
    valor: number,
    dadosPagamento: Omit<Pagamento, 'id' | 'valor' | 'promissoriaId' | 'parcelaId' | 'descricao' | 'created_at'>
  ): { parcelaAtualizada: Parcela; pagamentoCriado: Pagamento } {
    const valorAnterior = parcela.valorPago || 0;
    const valorRestante = parcela.valor - valorAnterior;
    const valorEfetivo = Math.min(valor, valorRestante);
    
    if (valorEfetivo <= 0) {
      throw new Error('Parcela já está totalmente paga');
    }

    // Criar o pagamento
    const novoPagamento: Pagamento = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      valor: valorEfetivo,
      ...dadosPagamento,
      parcelaId: parcela.id,
      descricao: `Parcela ${parcela.numero} | Anterior: R$ ${valorAnterior.toFixed(2)} → Atual: R$ ${(valorAnterior + valorEfetivo).toFixed(2)} | Restante: R$ ${(valorRestante - valorEfetivo).toFixed(2)}`,
      created_at: new Date().toISOString()
    };

    // Atualizar a parcela
    const parcelaAtualizada: Parcela = {
      ...parcela,
      valorPago: valorAnterior + valorEfetivo,
      pagamentos: [...(parcela.pagamentos || []), novoPagamento]
    };

    // Verificar se foi pago com atraso
    const hoje = new Date();
    const vencimento = new Date(parcela.dataVencimento);
    
    if (parcelaAtualizada.valorPago >= parcela.valor) {
      parcelaAtualizada.paga = true;
      parcelaAtualizada.pagoComAtraso = vencimento < hoje;
    }

    // Atualizar status
    parcelaAtualizada.status = this.calcularStatusParcela(parcelaAtualizada);

    return { parcelaAtualizada, pagamentoCriado: novoPagamento };
  }

  /**
   * Pagar uma promissória inteira distribuindo entre suas parcelas
   */
  static pagarPromissoria(
    promissoria: Promissoria,
    valor: number,
    dadosPagamento: Omit<Pagamento, 'id' | 'valor' | 'promissoriaId' | 'parcelaId' | 'descricao' | 'created_at'>
  ): { promissoriaAtualizada: Promissoria; pagamentosGerados: Pagamento[] } {
    if (!promissoria.parcelado || !promissoria.parcelas) {
      throw new Error('Promissória deve ser parcelada para usar este método');
    }

    let valorRestante = valor;
    const pagamentosGerados: Pagamento[] = [];
    const parcelasAtualizadas = [...promissoria.parcelas];

    // Ordenar parcelas por vencimento (mais próximas primeiro)
    const parcelasOrdenadas = parcelasAtualizadas
      .map((parcela, index) => ({ parcela, index }))
      .sort((a, b) => new Date(a.parcela.dataVencimento).getTime() - new Date(b.parcela.dataVencimento).getTime());

    // Distribuir valor entre as parcelas
    for (const { parcela, index } of parcelasOrdenadas) {
      if (valorRestante <= 0) break;

      const valorDevidoParcela = parcela.valor - (parcela.valorPago || 0);
      if (valorDevidoParcela <= 0) continue;

      const valorParaParcela = Math.min(valorRestante, valorDevidoParcela);

      try {
        const resultado = this.pagarParcela(parcela, valorParaParcela, {
          ...dadosPagamento,
          promissoriaId: promissoria.id
        });

        parcelasAtualizadas[index] = resultado.parcelaAtualizada;
        pagamentosGerados.push(resultado.pagamentoCriado);
        valorRestante -= valorParaParcela;
      } catch (error) {
        // Parcela já paga, continuar para a próxima
        continue;
      }
    }

    // Criar pagamento principal da promissória (para referência)
    const valorPagoTotal = valor - valorRestante;
    const valorAnteriorPromissoria = promissoria.valorPago || 0;
    
    const pagamentoPrincipal: Pagamento = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9) + '-principal',
      valor: valorPagoTotal,
      ...dadosPagamento,
      promissoriaId: promissoria.id,
      descricao: `Pagamento distribuído entre ${pagamentosGerados.length} parcela(s) | Anterior: R$ ${valorAnteriorPromissoria.toFixed(2)} → Atual: R$ ${(valorAnteriorPromissoria + valorPagoTotal).toFixed(2)} | Restante: R$ ${(promissoria.valor - valorAnteriorPromissoria - valorPagoTotal).toFixed(2)}`,
      created_at: new Date().toISOString()
    };

    const promissoriaAtualizada: Promissoria = {
      ...promissoria,
      parcelas: parcelasAtualizadas,
      valorPago: parcelasAtualizadas.reduce((acc, p) => acc + (p.valorPago || 0), 0),
      pagamentos: [...(promissoria.pagamentos || []), pagamentoPrincipal],
      updated_at: new Date().toISOString()
    };

    // Atualizar status da promissória
    promissoriaAtualizada.status = this.calcularStatusPromissoria(promissoriaAtualizada);

    return { 
      promissoriaAtualizada, 
      pagamentosGerados: [pagamentoPrincipal, ...pagamentosGerados] 
    };
  }

  /**
   * Distribuir pagamento automático entre múltiplas promissórias
   */
  static distribuirPagamentoAutomatico(
    valor: number,
    promissorias: Promissoria[],
    dadosPagamento: Omit<Pagamento, 'id' | 'valor' | 'promissoriaId' | 'parcelaId' | 'descricao' | 'created_at'>
  ): { promissoriasAtualizadas: Promissoria[]; pagamentosGerados: Pagamento[] } {
    let valorRestante = valor;
    const promissoriasAtualizadas: Promissoria[] = [];
    const pagamentosGerados: Pagamento[] = [];

    // Coletar todas as parcelas de todas as promissórias com seus devidos
    const parcelasComInfo = promissorias.flatMap(promissoria => 
      (promissoria.parcelas || []).map(parcela => ({
        parcela,
        promissoria,
        valorDevido: parcela.valor - (parcela.valorPago || 0)
      }))
    ).filter(item => item.valorDevido > 0);

    // Ordenar por prioridade: atrasadas primeiro, depois por vencimento
    parcelasComInfo.sort((a, b) => {
      const hoje = new Date();
      const vencimentoA = new Date(a.parcela.dataVencimento);
      const vencimentoB = new Date(b.parcela.dataVencimento);
      
      const atrasadaA = vencimentoA < hoje;
      const atrasadaB = vencimentoB < hoje;
      
      if (atrasadaA && !atrasadaB) return -1;
      if (!atrasadaA && atrasadaB) return 1;
      
      return vencimentoA.getTime() - vencimentoB.getTime();
    });

    // Agrupar por promissória para rastrear atualizações
    const promissoriaMap = new Map<string, Promissoria>();
    promissorias.forEach(p => promissoriaMap.set(p.id, { ...p }));

    // Distribuir valor entre as parcelas
    for (const { parcela, promissoria } of parcelasComInfo) {
      if (valorRestante <= 0) break;

      const promissoriaAtual = promissoriaMap.get(promissoria.id)!;
      const parcelaAtual = promissoriaAtual.parcelas?.find(p => p.id === parcela.id);
      
      if (!parcelaAtual) continue;

      const valorDevido = parcelaAtual.valor - (parcelaAtual.valorPago || 0);
      if (valorDevido <= 0) continue;

      const valorParaParcela = Math.min(valorRestante, valorDevido);

      try {
        const resultado = this.pagarParcela(parcelaAtual, valorParaParcela, {
          ...dadosPagamento,
          promissoriaId: promissoria.id
        });

        // Atualizar a parcela na promissória
        const parcelaIndex = promissoriaAtual.parcelas!.findIndex(p => p.id === parcela.id);
        promissoriaAtual.parcelas![parcelaIndex] = resultado.parcelaAtualizada;
        
        // Recalcular valor pago da promissória
        promissoriaAtual.valorPago = promissoriaAtual.parcelas!.reduce((acc, p) => acc + (p.valorPago || 0), 0);
        promissoriaAtual.updated_at = new Date().toISOString();
        promissoriaAtual.status = this.calcularStatusPromissoria(promissoriaAtual);

        pagamentosGerados.push(resultado.pagamentoCriado);
        valorRestante -= valorParaParcela;
      } catch (error) {
        continue;
      }
    }

    // Coletar promissórias que foram atualizadas
    promissoriaMap.forEach(promissoria => {
      const original = promissorias.find(p => p.id === promissoria.id);
      if (original && promissoria.valorPago !== original.valorPago) {
        promissoriasAtualizadas.push(promissoria);
      }
    });

    return { promissoriasAtualizadas, pagamentosGerados };
  }

  /**
   * Calcular status de uma parcela
   */
  private static calcularStatusParcela(parcela: Parcela): Parcela['status'] {
    const hoje = new Date();
    const vencimento = new Date(parcela.dataVencimento);
    
    if (parcela.paga) {
      return parcela.pagoComAtraso ? 'pago_com_atraso' : 'pago';
    }
    
    return vencimento < hoje ? 'atrasado' : 'pendente';
  }

  /**
   * Calcular status de uma promissória baseado em suas parcelas
   */
  private static calcularStatusPromissoria(promissoria: Promissoria): Promissoria['status'] {
    if (!promissoria.parcelado || !promissoria.parcelas) {
      const hoje = new Date();
      const limite = new Date(promissoria.dataLimite);
      const valorTotalPago = promissoria.valorPago || 0;
      
      if (valorTotalPago >= promissoria.valor) {
        return limite < hoje ? 'pago_com_atraso' : 'pago';
      }
      
      return limite < hoje ? 'atrasado' : 'pendente';
    }

    const todasPagas = promissoria.parcelas.every(p => p.paga);
    const algumaPagaComAtraso = promissoria.parcelas.some(p => p.pagoComAtraso);
    const algumaAtrasada = promissoria.parcelas.some(p => {
      const vencimento = new Date(p.dataVencimento);
      return !p.paga && vencimento < new Date();
    });
    
    if (todasPagas) {
      return algumaPagaComAtraso ? 'pago_com_atraso' : 'pago';
    }
    
    return algumaAtrasada ? 'atrasado' : 'pendente';
  }
}
