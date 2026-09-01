'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert, CheckCircle2, Loader2, Info } from 'lucide-react';

export interface SecurityDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  itemType: 'Tutor' | 'Pet' | 'Veterinário' | 'Parceiro' | 'Atendimento' | 'Usuário' | 'Registro';
  itemName: string;
  impactWarnings?: string[];
  requireTextMatch?: boolean; // Se true, o usuário deve digitar o nome do item para confirmar
  confirmTextOverride?: string; // Se fornecido, exige digitar essa palavra específica (ex: "EXCLUIR")
}

export function SecurityDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemType,
  itemName,
  impactWarnings = [],
  requireTextMatch = true,
  confirmTextOverride,
}: SecurityDeleteModalProps) {
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const targetText = confirmTextOverride || itemName;

  const handleClose = () => {
    setTypedConfirmation('');
    setIsDeleting(false);
    setErrorMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  const isMatch = !requireTextMatch || typedConfirmation.trim().toLowerCase() === targetText.trim().toLowerCase();

  const handleExecuteDelete = async () => {
    if (!isMatch || isDeleting) return;

    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await onConfirm();
      handleClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ocorreu um erro ao processar a exclusão.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-brand-surface border border-rose-500/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header com Alerta de Segurança */}
        <div className="bg-rose-500/10 border-b border-rose-500/20 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-rose-300">
                {title || `Excluir ${itemType}`}
              </h3>
              <p className="text-xs text-rose-400/80">Ação permanente e irreversível</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-2 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-4 text-sm">
          <div>
            <p className="text-brand-text">
              Você está prestes a excluir definitivamente o {itemType.toLowerCase()}:
            </p>
            <div className="mt-2 p-3 rounded-xl bg-brand-surface-2 border border-brand-border-strong font-semibold text-brand-text flex items-center justify-between">
              <span>{itemName}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono">
                {itemType}
              </span>
            </div>
          </div>

          {/* Avisos de Impacto e Dependências */}
          {impactWarnings.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 text-xs text-amber-300">
              <div className="flex items-center gap-1.5 font-bold text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Atenção aos dados vinculados:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-amber-300/90 leading-relaxed">
                {impactWarnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Campo de Confirmação com Digitação para Proteção contra Erros */}
          {requireTextMatch && (
            <div className="space-y-2 pt-1">
              <label className="block text-xs text-brand-text-muted">
                Para confirmar a exclusão com segurança, digite exatamente{' '}
                <strong className="text-rose-300 font-mono select-all font-bold">
                  {targetText}
                </strong>{' '}
                no campo abaixo:
              </label>
              <input
                type="text"
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                placeholder={`Digite "${targetText}"`}
                disabled={isDeleting}
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl bg-brand-surface-2 border border-brand-border-strong focus:border-rose-500 text-brand-text text-sm focus:outline-none transition-colors placeholder:text-brand-text-muted/40 font-medium"
              />
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer com Botões */}
        <div className="px-6 py-4 bg-brand-surface-2/60 border-t border-brand-border-strong flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-brand-text-muted hover:text-brand-text hover:bg-brand-surface transition-colors"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={handleExecuteDelete}
            disabled={!isMatch || isDeleting}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Excluindo registro...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Exclusão Definitiva</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
