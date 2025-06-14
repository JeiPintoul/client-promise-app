
import { Parcela, Pagamento, Promissoria, TipoPagamento } from '../types';

export class ParcelaPaymentSystem {
  static pagarParcela(
    parcela: Parcela,
    valor: number,
    dadosPagamento: {
      tipo: Pagamento['tipo'];
      dataHora: string;
      observacoes?: string;
      promissoriaId?: string;
    }
  ): { parcelaAtualizada: Parcela; pagamento: Pagamento } {
    const valorPago = Math.min(valor, parcela.valor - parcela.valorPago);
    const novoValorPago = parcela.valorPago + valorPago;
    const agora = new Date().toISOString();
    const hoje = new Date().toISOString().split('T')[0];
    const vencimento = new Date(parcela.dataVencimento).toISOString().split('T')[0];
    const pagoComAtraso = hoje > vencimento;

    const parcelaAtualizada: Parcela = {
      ...parcela,
      valorPago: novoValorPago,
      paga: novoValorPago >= parcela.valor,
      pagoComAtraso: pagoComAtraso && !parcela.paga,
      status: novoValorPago >= parcela.valor 
        ? (pagoComAtraso ? 'pago_com_atraso' : 'pago')
        : (hoje > vencimento ? 'atrasado' : 'pendente')
    };

    const pagamento: Pagamento = {
      id: crypto.randomUUID(),
      valor: valorPago,
      tipo: dadosPagamento.tipo,
      dataHora: dadosPagamento.dataHora,
      parcelaId: parcela.id,
      promissoriaId: dadosPagamento.promissoriaId,
      observacoes: dadosPagamento.observacoes,
      descricao: `Pagamento de parcela ${parcela.numero} - R$ ${valorPago.toFixed(2)} (${dadosPagamento.tipo})`,
      created_at: agora
    };

    parcelaAtualizada.pagamentos = [...(parcelaAtualizada.pagamentos || []), pagamento];

    return { parcelaAtualizada, pagamento };
  }

  static pagarPromissoria(
    promissoria: Promissoria,
    valor: number,
    dadosPagamento: {
      tipo: Pagamento['tipo'];
      dataHora: string;
      observacoes?: string;
    }
  ): { promissoriaAtualizada: Promissoria; pagamentosRealizados: Pagamento[] } {
    if (!promissoria.parcelas || promissoria.parcelas.length === 0) {
      throw new Error('Promissória não possui parcelas para pagamento');
    }

    let valorRestante = valor;
    const parcelasAtualizadas = [...promissoria.parcelas];
    const pagamentosRealizados: Pagamento[] = [];

    // Ordena parcelas por data de vencimento (mais antigas primeiro)
    const parcelasOrdenadas = parcelasAtualizadas
      .map((parcela, index) => ({ parcela, index }))
      .filter(({ parcela }) => parcela.valorPago < parcela.valor)
      .sort((a, b) => new Date(a.parcela.dataVencimento).getTime() - new Date(b.parcela.dataVencimento).getTime());

    for (const { parcela, index } of parcelasOrdenadas) {
      if (valorRestante <= 0) break;

      const valorParaParcela = Math.min(valorRestante, parcela.valor - parcela.valorPago);
      if (valorParaParcela > 0) {
        const resultado = this.pagarParcela(parcela, valorParaParcela, {
          ...dadosPagamento,
          promissoriaId: promissoria.id
        });
        parcelasAtualizadas[index] = resultado.parcelaAtualizada;
        
        // Atualizar a descrição do pagamento para incluir informações da promissória
        const pagamentoAtualizado = {
          ...resultado.pagamento,
          descricao: `Pagamento da promissória - Parcela ${parcela.numero} - R$ ${valorParaParcela.toFixed(2)} (${dadosPagamento.tipo})`
        };
        
        pagamentosRealizados.push(pagamentoAtualizado);
        valorRestante -= valorParaParcela;
      }
    }

    const valorTotalPago = promissoria.valorPago + (valor - valorRestante);
    const promissoriaAtualizada: Promissoria = {
      ...promissoria,
      parcelas: parcelasAtualizadas,
      valorPago: valorTotalPago,
      status: valorTotalPago >= promissoria.valor ? 'pago' : 'pendente'
    };

    return { promissoriaAtualizada, pagamentosRealizados };
  }

  static distribuirPagamentoAutomatico(
    valor: number,
    promissorias: Promissoria[],
    dadosPagamento: {
      tipo: Pagamento['tipo'];
      dataHora: string;
      observacoes?: string;
    }
  ): { promissoriasAtualizadas: Promissoria[]; pagamentosRealizados: Pagamento[] } {
    let valorRestante = valor;
    const promissoriasAtualizadas = [...promissorias];
    const pagamentosRealizados: Pagamento[] = [];

    // Coleta todas as parcelas em atraso de todas as promissórias
    const parcelasEmAtraso: Array<{ parcela: Parcela; promissoriaIndex: number; parcelaIndex: number }> = [];
    const parcelasNormais: Array<{ parcela: Parcela; promissoriaIndex: number; parcelaIndex: number }> = [];

    promissoriasAtualizadas.forEach((promissoria, promIndex) => {
      if (promissoria.parcelas) {
        promissoria.parcelas.forEach((parcela, parcIndex) => {
          if (parcela.valorPago < parcela.valor) {
            const hoje = new Date().toISOString().split('T')[0];
            const vencimento = new Date(parcela.dataVencimento).toISOString().split('T')[0];
            
            if (hoje > vencimento) {
              parcelasEmAtraso.push({ parcela, promissoriaIndex: promIndex, parcelaIndex: parcIndex });
            } else {
              parcelasNormais.push({ parcela, promissoriaIndex: promIndex, parcelaIndex: parcIndex });
            }
          }
        });
      }
    });

    // Ordena parcelas em atraso por data de vencimento (mais antigas primeiro)
    parcelasEmAtraso.sort((a, b) => 
      new Date(a.parcela.dataVencimento).getTime() - new Date(b.parcela.dataVencimento).getTime()
    );

    // Ordena parcelas normais por data de vencimento
    parcelasNormais.sort((a, b) => 
      new Date(a.parcela.dataVencimento).getTime() - new Date(b.parcela.dataVencimento).getTime()
    );

    // Processa primeiro as parcelas em atraso, depois as normais
    const todasParcelas = [...parcelasEmAtraso, ...parcelasNormais];

    for (const { parcela, promissoriaIndex, parcelaIndex } of todasParcelas) {
      if (valorRestante <= 0) break;

      const valorParaParcela = Math.min(valorRestante, parcela.valor - parcela.valorPago);
      if (valorParaParcela > 0) {
        const resultado = this.pagarParcela(parcela, valorParaParcela, {
          ...dadosPagamento,
          promissoriaId: promissoriasAtualizadas[promissoriaIndex].id
        });
        promissoriasAtualizadas[promissoriaIndex].parcelas![parcelaIndex] = resultado.parcelaAtualizada;
        
        // Atualizar a descrição do pagamento para incluir informações do cliente
        const pagamentoAtualizado = {
          ...resultado.pagamento,
          descricao: `Pagamento geral - Parcela ${parcela.numero} - R$ ${valorParaParcela.toFixed(2)} (${dadosPagamento.tipo})`
        };
        
        pagamentosRealizados.push(pagamentoAtualizado);
        valorRestante -= valorParaParcela;

        // Atualizar o valor pago da promissória
        const promissoria = promissoriasAtualizadas[promissoriaIndex];
        const novoValorPago = promissoria.valorPago + valorParaParcela;
        promissoriasAtualizadas[promissoriaIndex] = {
          ...promissoria,
          valorPago: novoValorPago,
          status: novoValorPago >= promissoria.valor ? 'pago' : 'pendente'
        };
      }
    }

    return { promissoriasAtualizadas, pagamentosRealizados };
  }

  static editarPagamento(
    parcela: Parcela,
    pagamentoId: string,
    novoValor: number,
    novoTipo: Pagamento['tipo'],
    novasObservacoes?: string
  ): { parcelaAtualizada: Parcela; historicoEdicao: any } {
    const pagamentoIndex = parcela.pagamentos.findIndex(p => p.id === pagamentoId);
    if (pagamentoIndex === -1) {
      throw new Error('Pagamento não encontrado');
    }

    const pagamentoAntigo = parcela.pagamentos[pagamentoIndex];
    const diferenca = novoValor - pagamentoAntigo.valor;
    
    const novoValorPagoParcela = parcela.valorPago + diferenca;
    const agora = new Date().toISOString();
    const hoje = new Date().toISOString().split('T')[0];
    const vencimento = new Date(parcela.dataVencimento).toISOString().split('T')[0];
    const pagoComAtraso = hoje > vencimento;

    const historicoEdicao = {
      data: agora,
      alteracao: `Valor alterado de R$ ${pagamentoAntigo.valor.toFixed(2)} para R$ ${novoValor.toFixed(2)}`,
      valorAnterior: pagamentoAntigo.valor,
      valorNovo: novoValor,
      usuario: 'Sistema'
    };

    const pagamentoAtualizado: Pagamento = {
      ...pagamentoAntigo,
      valor: novoValor,
      tipo: novoTipo,
      observacoes: novasObservacoes,
      editado: true,
      historicoEdicoes: [...(pagamentoAntigo.historicoEdicoes || []), historicoEdicao]
    };

    const pagamentosAtualizados = [...parcela.pagamentos];
    pagamentosAtualizados[pagamentoIndex] = pagamentoAtualizado;

    const parcelaAtualizada: Parcela = {
      ...parcela,
      valorPago: Math.max(0, novoValorPagoParcela),
      paga: novoValorPagoParcela >= parcela.valor,
      pagoComAtraso: pagoComAtraso && !parcela.paga,
      status: novoValorPagoParcela >= parcela.valor 
        ? (pagoComAtraso ? 'pago_com_atraso' : 'pago')
        : (hoje > vencimento ? 'atrasado' : 'pendente'),
      pagamentos: pagamentosAtualizados
    };

    return { parcelaAtualizada, historicoEdicao };
  }

  static excluirPagamento(parcela: Parcela, pagamentoId: string): Parcela {
    const pagamentoIndex = parcela.pagamentos.findIndex(p => p.id === pagamentoId);
    if (pagamentoIndex === -1) {
      throw new Error('Pagamento não encontrado');
    }

    const pagamento = parcela.pagamentos[pagamentoIndex];
    const novoValorPago = Math.max(0, parcela.valorPago - pagamento.valor);
    const hoje = new Date().toISOString().split('T')[0];
    const vencimento = new Date(parcela.dataVencimento).toISOString().split('T')[0];
    const pagoComAtraso = hoje > vencimento;

    const pagamentosAtualizados = parcela.pagamentos.filter(p => p.id !== pagamentoId);

    return {
      ...parcela,
      valorPago: novoValorPago,
      paga: novoValorPago >= parcela.valor,
      pagoComAtraso: pagoComAtraso && novoValorPago < parcela.valor,
      status: novoValorPago >= parcela.valor 
        ? (pagoComAtraso ? 'pago_com_atraso' : 'pago')
        : (hoje > vencimento ? 'atrasado' : 'pendente'),
      pagamentos: pagamentosAtualizados
    };
  }
}
