
import { Promissoria, Parcela, Pagamento, Cliente, EstatisticasCliente } from '@/types';

/**
 * Calcula o status de uma parcela baseado na data de vencimento e se foi paga
 */
export const calcularStatusParcela = (parcela: Parcela): Parcela['status'] => {
  const hoje = new Date();
  const vencimento = new Date(parcela.dataVencimento);
  
  if (parcela.paga) {
    return parcela.pagoComAtraso ? 'pago_com_atraso' : 'pago';
  }
  
  return vencimento < hoje ? 'atrasado' : 'pendente';
};

/**
 * Calcula o status de uma promissória baseado em suas parcelas ou data limite
 */
export const calcularStatusPromissoria = (promissoria: Promissoria): Promissoria['status'] => {
  const hoje = new Date();
  
  if (promissoria.parcelado && promissoria.parcelas) {
    const todasPagas = promissoria.parcelas.every(p => p.paga);
    const algumaPagaComAtraso = promissoria.parcelas.some(p => p.pagoComAtraso);
    const algumaAtrasada = promissoria.parcelas.some(p => {
      const vencimento = new Date(p.dataVencimento);
      return !p.paga && vencimento < hoje;
    });
    
    if (todasPagas) {
      return algumaPagaComAtraso ? 'pago_com_atraso' : 'pago';
    }
    
    return algumaAtrasada ? 'atrasado' : 'pendente';
  } else {
    const limite = new Date(promissoria.dataLimite);
    const valorTotalPago = promissoria.valorPago || 0;
    
    if (valorTotalPago >= promissoria.valor) {
      return limite < hoje ? 'pago_com_atraso' : 'pago';
    }
    
    return limite < hoje ? 'atrasado' : 'pendente';
  }
};

/**
 * Distribui um pagamento entre as promissórias de um cliente de forma inteligente
 */
export const distribuirPagamentoAutomatico = (
  valor: number,
  promissorias: Promissoria[],
  pagamento: Omit<Pagamento, 'id' | 'promissoriaId' | 'parcelaId' | 'created_at'>
): { promissoriasAtualizadas: Promissoria[]; pagamentosGerados: Pagamento[] } => {
  let valorRestante = valor;
  const promissoriasAtualizadas: Promissoria[] = [];
  const pagamentosGerados: Pagamento[] = [];
  
  // Ordenar promissórias por prioridade (atrasadas primeiro, depois por data de vencimento)
  const promissoriasOrdenadas = [...promissorias].sort((a, b) => {
    const statusA = calcularStatusPromissoria(a);
    const statusB = calcularStatusPromissoria(b);
    
    // Priorizar atrasadas
    if (statusA === 'atrasado' && statusB !== 'atrasado') return -1;
    if (statusB === 'atrasado' && statusA !== 'atrasado') return 1;
    
    // Depois por data limite/vencimento mais próximo
    const dataA = new Date(a.dataLimite);
    const dataB = new Date(b.dataLimite);
    return dataA.getTime() - dataB.getTime();
  });
  
  for (const promissoria of promissoriasOrdenadas) {
    if (valorRestante <= 0) break;
    
    const valorDevido = promissoria.valor - (promissoria.valorPago || 0);
    if (valorDevido <= 0) continue;
    
    const valorAPagar = Math.min(valorRestante, valorDevido);
    
    // Criar pagamento para esta promissória
    const novoPagamento: Pagamento = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...pagamento,
      valor: valorAPagar,
      promissoriaId: promissoria.id,
      created_at: new Date().toISOString()
    };
    
    pagamentosGerados.push(novoPagamento);
    
    // Atualizar promissória
    const promissoriaAtualizada = {
      ...promissoria,
      valorPago: (promissoria.valorPago || 0) + valorAPagar,
      pagamentos: [...(promissoria.pagamentos || []), novoPagamento],
      updated_at: new Date().toISOString()
    };
    
    // Atualizar status
    promissoriaAtualizada.status = calcularStatusPromissoria(promissoriaAtualizada);
    
    promissoriasAtualizadas.push(promissoriaAtualizada);
    valorRestante -= valorAPagar;
  }
  
  return { promissoriasAtualizadas, pagamentosGerados };
};

/**
 * Calcula estatísticas financeiras de um cliente
 */
export const calcularEstatisticasCliente = (promissorias: Promissoria[]): EstatisticasCliente => {
  let valorTotal = 0;
  let valorPago = 0;
  let valorPendente = 0;
  let valorAtrasado = 0;
  let pagamentosNoTempo = 0;
  let pagamentosAtrasados = 0;
  let pagamentosPendentes = 0;
  
  const hoje = new Date();
  
  promissorias.forEach(promissoria => {
    valorTotal += promissoria.valor;
    valorPago += promissoria.valorPago || 0;
    
    if (promissoria.parcelado && promissoria.parcelas) {
      promissoria.parcelas.forEach(parcela => {
        const vencimento = new Date(parcela.dataVencimento);
        
        if (parcela.paga) {
          if (parcela.pagoComAtraso) {
            pagamentosAtrasados++;
          } else {
            pagamentosNoTempo++;
          }
        } else {
          pagamentosPendentes++;
          if (vencimento < hoje) {
            valorAtrasado += parcela.valor - (parcela.valorPago || 0);
          } else {
            valorPendente += parcela.valor - (parcela.valorPago || 0);
          }
        }
      });
    } else {
      const limite = new Date(promissoria.dataLimite);
      const valorDevido = promissoria.valor - (promissoria.valorPago || 0);
      
      if (promissoria.status === 'pago' || promissoria.status === 'pago_com_atraso') {
        if (promissoria.status === 'pago_com_atraso') {
          pagamentosAtrasados++;
        } else {
          pagamentosNoTempo++;
        }
      } else {
        pagamentosPendentes++;
        if (limite < hoje) {
          valorAtrasado += valorDevido;
        } else {
          valorPendente += valorDevido;
        }
      }
    }
  });
  
  return {
    valorTotal,
    valorPago,
    valorPendente,
    valorAtrasado,
    pagamentosNoTempo,
    pagamentosAtrasados,
    pagamentosPendentes
  };
};

/**
 * Formata tipo de pagamento para exibição
 */
export const formatarTipoPagamento = (tipo: Pagamento['tipo']): string => {
  const tipos = {
    pix: 'PIX',
    cartao: 'Cartão',
    dinheiro: 'Dinheiro',
    cheque: 'Cheque'
  };
  return tipos[tipo];
};

/**
 * Formata status para exibição
 */
export const formatarStatus = (status: string): string => {
  const statusMap = {
    pendente: 'Pendente',
    pago: 'Pago',
    atrasado: 'Atrasado',
    pago_com_atraso: 'Pago com Atraso'
  };
  return statusMap[status as keyof typeof statusMap] || status;
};
