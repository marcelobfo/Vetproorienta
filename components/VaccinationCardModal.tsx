'use client';

import { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, Clock, 
  Send, Plus, Trash2, Edit2, Calendar, Phone, 
  Sparkles, Loader2, AlertCircle, X, ChevronRight,
  Info, ExternalLink, RefreshCw, FileText, Syringe, Check
} from 'lucide-react';
import { 
  PetRecord, PetVaccineRecord, VACCINE_PRESETS,
  getPetVaccines, savePetVaccine, deletePetVaccine, 
  sendVaccineReminderViaWhatsApp, markVaccineBoosterApplied 
} from '@/lib/petService';
import { getEvolutionConfig, cleanErrorMessage } from '@/lib/evolution';

interface VaccinationCardModalProps {
  pet: PetRecord;
  isOpen: boolean;
  onClose: () => void;
  onPetUpdated?: () => void;
}

export function VaccinationCardModal({
  pet,
  isOpen,
  onClose,
  onPetUpdated
}: VaccinationCardModalProps) {
  const [vaccines, setVaccines] = useState<PetVaccineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [editingVac, setEditingVac] = useState<PetVaccineRecord | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formAppDate, setFormAppDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDueDate, setFormDueDate] = useState('');
  const [formManufacturer, setFormManufacturer] = useState('');
  const [formBatch, setFormBatch] = useState('');
  const [formVetName, setFormVetName] = useState('Dra. Veterinária Responsável');
  const [formVetCrmv, setFormVetCrmv] = useState('CRMV-SP 45.890');
  const [formNotes, setFormNotes] = useState('');
  const [formPhone, setFormPhone] = useState(pet.tutor_phone || '');
  const [isSaving, setIsSaving] = useState(false);

  // WhatsApp Reminder State
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [reminderModalVac, setReminderModalVac] = useState<PetVaccineRecord | null>(null);
  const [customMsg, setCustomMsg] = useState('');
  const [targetPhone, setTargetPhone] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Reforço Manual State (Tutor marcar como aplicada)
  const [boosterModalVac, setBoosterModalVac] = useState<PetVaccineRecord | null>(null);
  const [boosterAppDate, setBoosterAppDate] = useState(new Date().toISOString().split('T')[0]);
  const [boosterNextDueDate, setBoosterNextDueDate] = useState('');
  const [boosterBatch, setBoosterBatch] = useState('');
  const [boosterManufacturer, setBoosterManufacturer] = useState('');
  const [boosterVetName, setBoosterVetName] = useState('Dra. Veterinária Responsável');
  const [boosterVetCrmv, setBoosterVetCrmv] = useState('CRMV-SP 45.890');
  const [boosterNotes, setBoosterNotes] = useState('');
  const [isBoosterSaving, setIsBoosterSaving] = useState(false);

  const loadVaccines = async (petId: string) => {
    try {
      const data = await getPetVaccines(petId);
      setVaccines(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && pet.id) {
      const currentPetId = pet.id;
      let isMounted = true;
      getPetVaccines(currentPetId).then(data => {
        if (isMounted) {
          setVaccines(data);
          setLoading(false);
        }
      }).catch(err => {
        console.error(err);
        if (isMounted) setLoading(false);
      });

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, pet.id]);

  if (!isOpen) return null;

  const presets = pet.species?.toLowerCase().includes('gato') || pet.species?.toLowerCase().includes('felin')
    ? VACCINE_PRESETS.cat
    : VACCINE_PRESETS.dog;

  const handleSelectPreset = (preset: typeof VACCINE_PRESETS.dog[0]) => {
    setFormName(preset.name);
    setFormManufacturer(preset.manufacturer);
    
    // Calcular data de reforço padrão
    const appDate = formAppDate ? new Date(formAppDate) : new Date();
    const nextDue = new Date(appDate);
    nextDue.setDate(nextDue.getDate() + preset.defaultIntervalDays);
    setFormDueDate(nextDue.toISOString().split('T')[0]);
  };

  const handleOpenAddForm = (vacToEdit?: PetVaccineRecord) => {
    if (vacToEdit) {
      setEditingVac(vacToEdit);
      setFormName(vacToEdit.vaccine_name);
      setFormAppDate(vacToEdit.application_date || new Date().toISOString().split('T')[0]);
      setFormDueDate(vacToEdit.next_due_date || '');
      setFormManufacturer(vacToEdit.manufacturer || '');
      setFormBatch(vacToEdit.batch_number || '');
      setFormVetName(vacToEdit.vet_name || 'Dra. Camila Santos');
      setFormVetCrmv(vacToEdit.vet_crmv || 'CRMV-SP 45.890');
      setFormNotes(vacToEdit.notes || '');
      setFormPhone(vacToEdit.reminder_phone || pet.tutor_phone || '');
    } else {
      setEditingVac(null);
      setFormName('');
      setFormAppDate(new Date().toISOString().split('T')[0]);
      
      const defaultDue = new Date();
      defaultDue.setFullYear(defaultDue.getFullYear() + 1);
      setFormDueDate(defaultDue.toISOString().split('T')[0]);
      
      setFormManufacturer('');
      setFormBatch('');
      setFormVetName('Dra. Camila Santos');
      setFormVetCrmv('CRMV-SP 45.890');
      setFormNotes('');
      setFormPhone(pet.tutor_phone || '');
    }
    setActiveTab('add');
  };

  const handleSaveVaccine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formDueDate) return;

    setIsSaving(true);
    try {
      const res = await savePetVaccine({
        id: editingVac?.id,
        pet_id: pet.id,
        vaccine_name: formName.trim(),
        application_date: formAppDate,
        next_due_date: formDueDate,
        manufacturer: formManufacturer.trim(),
        batch_number: formBatch.trim(),
        vet_name: formVetName.trim(),
        vet_crmv: formVetCrmv.trim(),
        notes: formNotes.trim(),
        reminder_phone: formPhone.trim()
      });

      if (res.success) {
        setFeedback({ type: 'success', message: editingVac ? 'Vacina atualizada com sucesso!' : 'Vacina registrada na caderneta digital!' });
        await loadVaccines(pet.id);
        setActiveTab('list');
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erro ao salvar vacina.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro inesperado.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleDeleteVac = async (id: string, name: string) => {
    if (confirm(`Deseja remover o registro da vacina ${name}?`)) {
      await deletePetVaccine(id);
      setFeedback({ type: 'success', message: 'Registro de vacina removido.' });
      await loadVaccines(pet.id);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleOpenReminderModal = (vac: PetVaccineRecord) => {
    setReminderModalVac(vac);
    const phone = vac.reminder_phone || pet.tutor_phone || '';
    setTargetPhone(phone);

    const isOverdue = vac.status === 'overdue';
    const dueDateFormatted = new Date(vac.next_due_date + 'T12:00:00').toLocaleDateString('pt-BR');

    const defaultMsg = isOverdue
      ? `🚨 *Lembrete Importante de Saúde Animal - VetPro Orienta*\n\nOlá, *${pet.tutor_name || 'Tutor'}*! 🐾\n\nIdentificamos que o reforço da vacina *${vac.vaccine_name}* do(a) seu pet *${pet.name}* (${pet.species}) venceu em *${dueDateFormatted}*.\n\nManter a imunização em dia é essencial para a longevidade e proteção dele contra vírus graves.\n\n📅 Entre em contato para agendar o reforço!`
      : `🐾 *Lembrete de Vacinação - VetPro Orienta*\n\nOlá, *${pet.tutor_name || 'Tutor'}*! Tudo bem?\n\nPassando para avisar que a próxima dose/reforço da vacina *${vac.vaccine_name}* do seu pet *${pet.name}* está prevista para *${dueDateFormatted}*.\n\n📍 Laboratório: ${vac.manufacturer || 'Vacina Ética'}\n\nGaranta a proteção do seu pet! Agende seu horário com antecedência na clínica.`;

    setCustomMsg(defaultMsg);
  };

  const handleOpenBoosterModal = (vac: PetVaccineRecord) => {
    setBoosterModalVac(vac);
    const todayStr = new Date().toISOString().split('T')[0];
    setBoosterAppDate(todayStr);

    // Calcular +1 ano padrão
    const nextDate = new Date();
    nextDate.setFullYear(nextDate.getFullYear() + 1);
    setBoosterNextDueDate(nextDate.toISOString().split('T')[0]);

    setBoosterBatch(vac.batch_number || '');
    setBoosterManufacturer(vac.manufacturer || '');
    setBoosterVetName(vac.vet_name || 'Dra. Veterinária Responsável');
    setBoosterVetCrmv(vac.vet_crmv || 'CRMV-SP 45.890');
    setBoosterNotes(vac.notes ? `${vac.notes} (Reforço anual aplicado)` : 'Reforço anual aplicado com sucesso');
  };

  const handleApplyBoosterPreset = (intervalDays: number) => {
    const baseDate = boosterAppDate ? new Date(boosterAppDate + 'T12:00:00') : new Date();
    baseDate.setDate(baseDate.getDate() + intervalDays);
    setBoosterNextDueDate(baseDate.toISOString().split('T')[0]);
  };

  const handleConfirmBoosterApplied = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!boosterModalVac || !boosterAppDate || !boosterNextDueDate) return;

    setIsBoosterSaving(true);
    try {
      const res = await markVaccineBoosterApplied(boosterModalVac.id, {
        petId: pet.id,
        applicationDate: boosterAppDate,
        nextDueDate: boosterNextDueDate,
        batchNumber: boosterBatch.trim(),
        manufacturer: boosterManufacturer.trim(),
        vetName: boosterVetName.trim(),
        vetCrmv: boosterVetCrmv.trim(),
        notes: boosterNotes.trim(),
      });

      if (res.success) {
        setFeedback({ 
          type: 'success', 
          message: `🎉 Reforço da vacina "${boosterModalVac.vaccine_name}" marcado como aplicado com sucesso! Status atualizado para Imunizado / Em Dia.` 
        });
        setBoosterModalVac(null);
        await loadVaccines(pet.id);
        if (onPetUpdated) onPetUpdated();
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erro ao registrar reforço.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro inesperado ao salvar reforço.' });
    } finally {
      setIsBoosterSaving(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleSendWhatsAppReminder = async () => {
    if (!reminderModalVac) return;
    if (!targetPhone.trim()) {
      alert('Por favor, informe o número de WhatsApp com DDD.');
      return;
    }

    setSendingReminderId(reminderModalVac.id);
    try {
      const res = await sendVaccineReminderViaWhatsApp({
        pet: { ...pet, tutor_phone: targetPhone },
        vaccine: { ...reminderModalVac, reminder_phone: targetPhone },
        customMessage: customMsg
      });

      if (res.success) {
        setFeedback({ 
          type: 'success', 
          message: `Lembrete enviado com sucesso via WhatsApp para ${targetPhone}!` 
        });
        setReminderModalVac(null);
        await loadVaccines(pet.id);
      } else {
        setFeedback({ 
          type: 'error', 
          message: cleanErrorMessage(res.error) || 'Falha ao enviar mensagem via Evolution API.' 
        });
      }
    } catch (e: any) {
      const errText = cleanErrorMessage(e);
      setFeedback({ type: 'error', message: errText });
    } finally {
      setSendingReminderId(null);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // Contadores
  const overdueCount = vaccines.filter(v => v.status === 'overdue').length;
  const appliedCount = vaccines.filter(v => v.status === 'applied').length;
  const scheduledCount = vaccines.filter(v => v.status === 'scheduled').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-brand-surface border border-brand-border-strong rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden">
        
        {/* Topo / Header da Caderneta */}
        <div className="px-6 py-5 border-b border-brand-border-strong bg-brand-surface-2/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-brand-teal/15 text-brand-teal flex items-center justify-center text-2xl border border-brand-teal/20 shadow-sm shrink-0">
              {pet.species === 'Gato' ? '🐱' : '🐶'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-xl font-bold text-brand-text">
                  Caderneta de Vacinação Digital
                </h2>
                <span className="bg-brand-teal/20 text-brand-teal text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {pet.name} ({pet.species})
                </span>
              </div>
              <p className="text-xs text-brand-text-muted mt-0.5 flex items-center gap-2">
                <span>Tutor: <strong className="text-brand-text">{pet.tutor_name || 'Tutor'}</strong></span>
                {pet.tutor_phone && <span>• Tel: {pet.tutor_phone}</span>}
                {pet.breed && <span>• Raça: {pet.breed}</span>}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-brand-text-muted hover:text-brand-text p-2 rounded-xl hover:bg-brand-surface-2 transition-colors"
            title="Fechar caderneta"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`px-6 py-3 text-xs font-semibold flex items-center gap-2 border-b shrink-0 ${
            feedback.type === 'success' 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Barra de Status & Abas */}
        <div className="px-6 py-3 bg-brand-bg/60 border-b border-brand-border-strong flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="bg-brand-surface px-2.5 py-1 rounded-lg border border-brand-border-strong text-brand-text">
              Total: <strong>{vaccines.length}</strong>
            </span>
            <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Em dia: <strong>{appliedCount}</strong>
            </span>
            {overdueCount > 0 && (
              <span className="bg-red-500/10 text-red-400 px-2.5 py-1 rounded-lg border border-red-500/20 flex items-center gap-1 font-bold animate-pulse">
                <AlertTriangle className="w-3 h-3" /> Vencidas: <strong>{overdueCount}</strong>
              </span>
            )}
            {scheduledCount > 0 && (
              <span className="bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-lg border border-amber-500/20 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Agendadas: <strong>{scheduledCount}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'list' 
                  ? 'bg-brand-teal text-brand-bg shadow-sm' 
                  : 'bg-brand-surface border border-brand-border-strong text-brand-text-muted hover:text-brand-text'
              }`}
            >
              Histórico & Lembretes
            </button>
            <button
              onClick={() => handleOpenAddForm()}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'add' 
                  ? 'bg-brand-teal text-brand-bg shadow-sm' 
                  : 'bg-brand-surface border border-brand-border-strong text-brand-text-muted hover:text-brand-text'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Vacina
            </button>
          </div>
        </div>

        {/* Conteúdo Principal com Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'list' ? (
            loading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-brand-text-muted">
                <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
                <p className="text-sm">Carregando caderneta do pet...</p>
              </div>
            ) : vaccines.length === 0 ? (
              <div className="bg-brand-surface-2/40 border border-dashed border-brand-border-strong rounded-2xl p-10 text-center max-w-md mx-auto">
                <ShieldCheck className="w-12 h-12 text-brand-teal mx-auto mb-3 opacity-60" />
                <h3 className="font-display font-bold text-base text-brand-text mb-1">
                  Nenhuma vacina registrada para {pet.name}
                </h3>
                <p className="text-xs text-brand-text-muted mb-5">
                  Registre as vacinas aplicadas ou agendadas para acompanhar o vencimento e disparar lembretes automáticos no WhatsApp do tutor.
                </p>
                <button
                  onClick={() => handleOpenAddForm()}
                  className="bg-brand-teal text-brand-bg font-bold px-4 py-2 rounded-xl text-xs hover:bg-brand-teal/90 shadow-md transition-all flex items-center gap-1.5 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Registrar Primeira Vacina
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vaccines.map((vac) => {
                  const isOverdue = vac.status === 'overdue';
                  const appDateFormatted = vac.application_date 
                    ? new Date(vac.application_date + 'T12:00:00').toLocaleDateString('pt-BR') 
                    : '-';
                  const dueDateFormatted = new Date(vac.next_due_date + 'T12:00:00').toLocaleDateString('pt-BR');

                  return (
                    <div 
                      key={vac.id}
                      className={`bg-brand-surface border rounded-2xl p-4 flex flex-col justify-between transition-all hover:shadow-md ${
                        isOverdue 
                          ? 'border-red-500/40 bg-red-500/[0.02]' 
                          : 'border-brand-border-strong hover:border-brand-teal/40'
                      }`}
                    >
                      <div>
                        {/* Topo da Vacina */}
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-display font-bold text-sm text-brand-text leading-tight">
                                {vac.vaccine_name}
                              </h4>
                            </div>
                            <p className="text-[11px] text-brand-text-muted mt-0.5">
                              {vac.manufacturer || 'Fabricante não informado'} {vac.batch_number ? `• Lote: ${vac.batch_number}` : ''}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isOverdue ? (
                              <span className="bg-red-500/15 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-red-500/20">
                                <AlertTriangle className="w-3 h-3" /> Reforço Vencido
                              </span>
                            ) : (
                              <span className="bg-emerald-500/15 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" /> Imunizado
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Detalhes de Datas e Veterinário */}
                        <div className="grid grid-cols-2 gap-2 text-xs bg-brand-surface-2/60 p-2.5 rounded-xl border border-brand-border-strong/50 mb-3">
                          <div>
                            <span className="text-brand-text-muted block text-[10px]">Data Aplicação:</span>
                            <span className="font-semibold text-brand-text">{appDateFormatted}</span>
                          </div>
                          <div>
                            <span className="text-brand-text-muted block text-[10px]">Próximo Reforço:</span>
                            <span className={`font-bold ${isOverdue ? 'text-red-400' : 'text-brand-teal'}`}>
                              {dueDateFormatted}
                            </span>
                          </div>
                          {vac.vet_name && (
                            <div className="col-span-2 pt-1 border-t border-brand-border-strong/30 flex items-center justify-between text-[11px] text-brand-text-muted">
                              <span>Resp: <strong className="text-brand-text">{vac.vet_name}</strong></span>
                              {vac.vet_crmv && <span>{vac.vet_crmv}</span>}
                            </div>
                          )}
                        </div>

                        {vac.notes && (
                          <p className="text-[11px] text-brand-text-muted italic bg-brand-bg/40 p-2 rounded-lg border border-brand-border-strong mb-3">
                            &ldquo;{vac.notes}&rdquo;
                          </p>
                        )}

                        {/* Banner de Ação Rápida para Vacina Vencida */}
                        {isOverdue && (
                          <div className="mb-3 bg-red-500/10 border border-red-500/25 p-2.5 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs text-red-300 font-medium">
                              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                              <span>Reforço pendente</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenBoosterModal(vac)}
                              className="bg-emerald-500 hover:bg-emerald-600 text-brand-bg text-xs font-bold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
                              title="Marcar reforço como aplicado e atualizar status da caderneta"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Marcar como Aplicada
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Ações e Lembrete WhatsApp */}
                      <div className="pt-2.5 border-t border-brand-border-strong flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenAddForm(vac)}
                            className="p-1.5 rounded-lg hover:bg-brand-surface-2 text-brand-text-muted hover:text-brand-text transition-colors cursor-pointer"
                            title="Editar dados da vacina"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteVac(vac.id, vac.vaccine_name)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-brand-text-muted hover:text-red-400 transition-colors cursor-pointer"
                            title="Excluir vacina"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Botão de Registrar/Renovar Reforço */}
                          <button
                            type="button"
                            onClick={() => handleOpenBoosterModal(vac)}
                            className={`text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                              isOverdue 
                                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300'
                                : 'bg-brand-surface-2 hover:bg-brand-surface border border-brand-border-strong text-brand-text-muted hover:text-emerald-400'
                            }`}
                            title="Registrar aplicação de reforço"
                          >
                            <Syringe className="w-3.5 h-3.5 text-emerald-400" />
                            {isOverdue ? 'Registrar Reforço' : 'Renovar Reforço'}
                          </button>

                          {vac.reminder_sent && (
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md flex items-center gap-1" title={vac.reminder_sent_at ? `Enviado em ${new Date(vac.reminder_sent_at).toLocaleString('pt-BR')}` : 'Enviado'}>
                              <CheckCircle2 className="w-3 h-3" /> Lembrete
                            </span>
                          )}

                          <button
                            onClick={() => handleOpenReminderModal(vac)}
                            className="bg-brand-teal text-brand-bg text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-brand-teal/90 shadow-sm transition-all cursor-pointer"
                            title="Enviar lembrete via WhatsApp da clínica"
                          >
                            <Send className="w-3 h-3" />
                            {vac.reminder_sent ? 'Reenviar' : 'Lembrar WhatsApp'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Aba de Formulário (Adicionar / Editar) */
            <form onSubmit={handleSaveVaccine} className="max-w-2xl mx-auto space-y-5">
              <div className="bg-brand-surface-2/30 border border-brand-border-strong rounded-2xl p-4">
                <label className="block text-xs font-bold text-brand-text mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-teal" />
                  Preenchimento Rápido com Vacinas Padrão para {pet.species === 'Gato' ? 'Gatos' : 'Cães'}:
                </label>
                <div className="flex flex-wrap gap-2">
                  {presets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className="bg-brand-surface border border-brand-border-strong hover:border-brand-teal text-brand-text-muted hover:text-brand-text text-xs px-2.5 py-1.5 rounded-xl transition-all text-left"
                    >
                      + {preset.name.split(' ')[0]} {preset.name.split(' ')[1]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-brand-text-muted mb-1">* Nome da Vacina *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: V10 Polivalente Canina, Antirrábica, V4 Felina..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-brand-teal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text-muted mb-1">Data da Aplicação</label>
                  <input
                    type="date"
                    value={formAppDate}
                    onChange={(e) => setFormAppDate(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-brand-teal text-brand-text"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text-muted mb-1">* Próximo Reforço (Vencimento) *</label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-teal/60 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-brand-teal text-brand-text font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text-muted mb-1">Laboratório / Fabricante</label>
                  <input
                    type="text"
                    placeholder="Ex: Zoetis, Boehringer Ingelheim, MSD, Virbac"
                    value={formManufacturer}
                    onChange={(e) => setFormManufacturer(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-brand-teal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text-muted mb-1">Número do Lote</label>
                  <input
                    type="text"
                    placeholder="Ex: ZOE-2026-088B"
                    value={formBatch}
                    onChange={(e) => setFormBatch(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-brand-teal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text-muted mb-1">Médico Veterinário Aplicador</label>
                  <input
                    type="text"
                    placeholder="Ex: Dra. Camila Santos"
                    value={formVetName}
                    onChange={(e) => setFormVetName(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-brand-teal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text-muted mb-1">CRMV do Veterinário</label>
                  <input
                    type="text"
                    placeholder="Ex: CRMV-SP 45.890"
                    value={formVetCrmv}
                    onChange={(e) => setFormVetCrmv(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-brand-teal"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-brand-text-muted mb-1">WhatsApp do Tutor para Lembretes</label>
                  <input
                    type="text"
                    placeholder="Ex: 5511999998888"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-brand-teal"
                  />
                  <p className="text-[11px] text-brand-text-muted mt-1">
                    O lembrete de reforço poderá ser disparado automaticamente ou manualmente para este número via Evolution API.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-brand-text-muted mb-1">Observações da Aplicação</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Animal tolerou bem, sem reações adversas imediatas..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-brand-teal"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-border-strong">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-brand-text-muted hover:text-brand-text"
                >
                  Voltar à Lista
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !formName.trim() || !formDueDate}
                  className="bg-brand-teal text-brand-bg font-bold px-5 py-2.5 rounded-xl text-xs hover:bg-brand-teal/90 disabled:opacity-50 flex items-center gap-2 shadow-md"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {editingVac ? 'Salvar Alterações' : 'Salvar na Caderneta Digital'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Secundário: Preview e Disparo de Lembrete WhatsApp */}
        {reminderModalVac && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-brand-surface border border-brand-teal/40 rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-brand-teal/15 text-brand-teal flex items-center justify-center">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base text-brand-text">
                      Disparar Lembrete WhatsApp
                    </h3>
                    <p className="text-xs text-brand-text-muted">Integração ativa via Evolution API</p>
                  </div>
                </div>

                <button 
                  onClick={() => setReminderModalVac(null)}
                  className="text-brand-text-muted hover:text-brand-text p-1.5 rounded-lg hover:bg-brand-surface-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-brand-text-muted mb-1">* Número do WhatsApp do Tutor (com DDD) *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
                    <input
                      type="text"
                      value={targetPhone}
                      onChange={(e) => setTargetPhone(e.target.value)}
                      placeholder="Ex: 5511999998888"
                      className="w-full bg-brand-bg border border-brand-border-strong rounded-xl pl-9 pr-3.5 py-2 text-sm focus:outline-none focus:border-brand-teal font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text-muted mb-1">Mensagem do Lembrete (Personalizável)</label>
                  <textarea
                    rows={6}
                    value={customMsg}
                    onChange={(e) => setCustomMsg(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border-strong rounded-xl p-3 text-xs leading-relaxed focus:outline-none focus:border-brand-teal font-sans"
                  />
                  <p className="text-[10px] text-brand-text-muted mt-1">
                    Dica: use <code>*texto*</code> para destacar palavras em negrito no WhatsApp.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setReminderModalVac(null)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-brand-text-muted hover:text-brand-text"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleSendWhatsAppReminder}
                    disabled={sendingReminderId === reminderModalVac.id || !targetPhone.trim()}
                    className="bg-brand-teal text-brand-bg font-bold px-5 py-2 rounded-xl text-xs hover:bg-brand-teal/90 disabled:opacity-50 flex items-center gap-2 shadow-md"
                  >
                    {sendingReminderId === reminderModalVac.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Disparando via WhatsApp...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Confirmar e Enviar Agora
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Secundário: Registrar Aplicação de Reforço Manualmente */}
        {boosterModalVac && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-brand-surface border border-emerald-500/40 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 my-auto">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Syringe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base text-brand-text">
                      Marcar Reforço como Aplicado
                    </h3>
                    <p className="text-xs text-brand-text-muted">
                      {boosterModalVac.vaccine_name} • Pet: <strong className="text-brand-text">{pet.name}</strong>
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setBoosterModalVac(null)}
                  className="text-brand-text-muted hover:text-brand-text p-1.5 rounded-lg hover:bg-brand-surface-2 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Banner Explicativo */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 mb-4 text-xs text-emerald-300 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-200">Atualização do Status no Sistema</p>
                  <p className="text-[11px] text-emerald-300/85 mt-0.5 leading-relaxed">
                    Ao registrar a aplicação, o status da vacina mudará automaticamente para <strong className="text-emerald-300">Imunizado / Em Dia</strong>, e a próxima data de reforço será agendada.
                  </p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleConfirmBoosterApplied} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-brand-text mb-1">
                      Data da Aplicação do Reforço *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted pointer-events-none" />
                      <input
                        type="date"
                        required
                        value={boosterAppDate}
                        onChange={(e) => {
                          setBoosterAppDate(e.target.value);
                          if (e.target.value) {
                            const next = new Date(e.target.value + 'T12:00:00');
                            next.setFullYear(next.getFullYear() + 1);
                            setBoosterNextDueDate(next.toISOString().split('T')[0]);
                          }
                        }}
                        className="w-full bg-brand-bg border border-brand-border-strong rounded-xl pl-9 pr-3 py-2 text-xs text-brand-text focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-brand-text mb-1">
                      Próximo Reforço Previsto *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 pointer-events-none" />
                      <input
                        type="date"
                        required
                        value={boosterNextDueDate}
                        onChange={(e) => setBoosterNextDueDate(e.target.value)}
                        className="w-full bg-brand-bg border border-brand-border-strong rounded-xl pl-9 pr-3 py-2 text-xs text-brand-text focus:outline-none focus:border-emerald-500 font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Atalhos de Intervalo */}
                <div>
                  <span className="block text-[11px] font-semibold text-brand-text-muted mb-1.5">
                    Calcular próximo reforço em:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyBoosterPreset(365)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-brand-surface-2 hover:bg-emerald-500/20 text-brand-text hover:text-emerald-300 border border-brand-border-strong transition-colors cursor-pointer"
                    >
                      +1 Ano (Anual Padrão)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyBoosterPreset(180)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-brand-surface-2 hover:bg-emerald-500/20 text-brand-text hover:text-emerald-300 border border-brand-border-strong transition-colors cursor-pointer"
                    >
                      +6 Meses
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyBoosterPreset(1095)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-brand-surface-2 hover:bg-emerald-500/20 text-brand-text hover:text-emerald-300 border border-brand-border-strong transition-colors cursor-pointer"
                    >
                      +3 Anos
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyBoosterPreset(28)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-brand-surface-2 hover:bg-emerald-500/20 text-brand-text hover:text-emerald-300 border border-brand-border-strong transition-colors cursor-pointer"
                    >
                      +28 Dias (Filhote)
                    </button>
                  </div>
                </div>

                {/* Dados Opcionais */}
                <div className="border-t border-brand-border-strong/60 pt-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-brand-text-muted mb-1">
                        Fabricante / Laboratório (Opcional)
                      </label>
                      <input
                        type="text"
                        value={boosterManufacturer}
                        onChange={(e) => setBoosterManufacturer(e.target.value)}
                        placeholder="Ex: Zoetis, MSD, Virbac"
                        className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-1.5 text-xs text-brand-text focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-brand-text-muted mb-1">
                        Lote da Vacina (Opcional)
                      </label>
                      <input
                        type="text"
                        value={boosterBatch}
                        onChange={(e) => setBoosterBatch(e.target.value)}
                        placeholder="Ex: LOTE-98321"
                        className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-1.5 text-xs text-brand-text focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-brand-text-muted mb-1">
                        Veterinário Responsável
                      </label>
                      <input
                        type="text"
                        value={boosterVetName}
                        onChange={(e) => setBoosterVetName(e.target.value)}
                        placeholder="Nome do veterinário"
                        className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-1.5 text-xs text-brand-text focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-brand-text-muted mb-1">
                        CRMV
                      </label>
                      <input
                        type="text"
                        value={boosterVetCrmv}
                        onChange={(e) => setBoosterVetCrmv(e.target.value)}
                        placeholder="Ex: CRMV-SP 45.890"
                        className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-1.5 text-xs text-brand-text focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-brand-text-muted mb-1">
                      Observações da Aplicação
                    </label>
                    <input
                      type="text"
                      value={boosterNotes}
                      onChange={(e) => setBoosterNotes(e.target.value)}
                      placeholder="Ex: Dose anual de reforço aplicada sem reações adversas"
                      className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-1.5 text-xs text-brand-text focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Rodapé / Botões */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-brand-border-strong">
                  <button
                    type="button"
                    onClick={() => setBoosterModalVac(null)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-2 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isBoosterSaving || !boosterAppDate || !boosterNextDueDate}
                    className="bg-emerald-500 hover:bg-emerald-600 text-brand-bg font-bold px-5 py-2.5 rounded-xl text-xs disabled:opacity-50 flex items-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    {isBoosterSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Atualizando Status...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Confirmar Reforço Aplicado
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
