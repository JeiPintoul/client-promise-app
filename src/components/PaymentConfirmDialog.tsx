
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PaymentConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  valorInformado: number;
  valorDevido: number;
  onConfirm: (action: 'continue' | 'adjust' | 'cancel', novoValor?: number) => void;
  showAdjustOption?: boolean;
}

/**
 * Dialog customizado para confirmação de pagamentos
 * Substitui os alerts nativos do navegador
 */
export function PaymentConfirmDialog({
  isOpen,
  onClose,
  title,
  description,
  valorInformado,
  valorDevido,
  onConfirm,
  showAdjustOption = true
}: PaymentConfirmDialogProps) {
  const [novoValor, setNovoValor] = useState(valorDevido.toString());

  const handleAction = (action: 'continue' | 'adjust' | 'cancel') => {
    if (action === 'adjust') {
      const valor = parseFloat(novoValor);
      if (valor > 0 && valor <= valorDevido) {
        onConfirm(action, valor);
      }
    } else {
      onConfirm(action);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="space-y-2">
            <div>{description}</div>
            <div className="text-sm space-y-1">
              <div><strong>Valor informado:</strong> R$ {valorInformado.toFixed(2)}</div>
              <div><strong>Valor devido:</strong> R$ {valorDevido.toFixed(2)}</div>
              <div><strong>Excedente:</strong> R$ {(valorInformado - valorDevido).toFixed(2)}</div>
            </div>
          </DialogDescription>
        </DialogHeader>

        {showAdjustOption && (
          <div className="space-y-2">
            <Label htmlFor="novoValor">Ajustar para valor devido:</Label>
            <Input
              id="novoValor"
              type="number"
              step="0.01"
              value={novoValor}
              onChange={(e) => setNovoValor(e.target.value)}
              max={valorDevido}
            />
          </div>
        )}

        <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <Button
            variant="default"
            onClick={() => handleAction('continue')}
            className="w-full sm:w-auto"
          >
            Continuar com Excedente
          </Button>
          
          {showAdjustOption && (
            <Button
              variant="outline"
              onClick={() => handleAction('adjust')}
              className="w-full sm:w-auto"
            >
              Ajustar Valor
            </Button>
          )}
          
          <Button
            variant="destructive"
            onClick={() => handleAction('cancel')}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
