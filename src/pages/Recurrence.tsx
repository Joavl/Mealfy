import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import BottomSheet from '../components/ui/BottomSheet';
import { useToast } from '../context/ToastContext';
import { MapPin, Calendar, PauseCircle, PlayCircle, Edit3, Trash2, ShieldAlert } from 'lucide-react';
import './DonationChoice.css'; // Reuse form styles

interface MockRecurrence {
  id: string;
  communityName: string;
  amount: number;
  periodicity: 'semanal' | 'mensal';
  status: 'active' | 'paused';
  nextBillingDate: string;
}

const periodLabel = (periodicity: 'semanal' | 'mensal') => periodicity === 'mensal' ? 'mês' : 'semana';

const INITIAL_RECURRENCES: MockRecurrence[] = [
  { id: 'rec-1', communityName: 'Heliópolis', amount: 80, periodicity: 'mensal', status: 'active', nextBillingDate: '10/07/2026' },
  { id: 'rec-2', communityName: 'Cidade Tiradentes', amount: 40, periodicity: 'semanal', status: 'active', nextBillingDate: '20/06/2026' },
  { id: 'rec-3', communityName: 'Paraisópolis', amount: 150, periodicity: 'mensal', status: 'paused', nextBillingDate: '01/07/2026' },
];

const RecurrenceManager: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [recurrences, setRecurrences] = useState<MockRecurrence[]>(INITIAL_RECURRENCES);
  
  // Dialog Actions State
  const [activeBottomSheet, setActiveBottomSheet] = useState<'pause' | 'edit' | 'cancel' | null>(null);
  const [selectedRec, setSelectedRec] = useState<MockRecurrence | null>(null);
  
  // Editing Temp State
  const [editAmount, setEditAmount] = useState<number>(40);
  const [editPeriod, setEditPeriod] = useState<'semanal' | 'mensal'>('mensal');
  const [isProcessing, setIsProcessing] = useState(false);

  const openAction = (action: 'pause' | 'edit' | 'cancel', rec: MockRecurrence) => {
    setSelectedRec(rec);
    if (action === 'edit') {
      setEditAmount(rec.amount);
      setEditPeriod(rec.periodicity);
    }
    setActiveBottomSheet(action);
  };

  const closeAction = () => {
    setActiveBottomSheet(null);
    setSelectedRec(null);
  };

  const handleTogglePause = () => {
    if (!selectedRec) return;
    setIsProcessing(true);
    setTimeout(() => {
      const isPausing = selectedRec.status === 'active';
      setRecurrences(prev => prev.map(item => 
        item.id === selectedRec.id 
          ? { ...item, status: isPausing ? 'paused' : 'active' }
          : item
      ));
      showToast(
        isPausing 
          ? `Apoio para ${selectedRec.communityName} pausado com sucesso.`
          : `Apoio para ${selectedRec.communityName} reativado com sucesso.`,
        'success'
      );
      setIsProcessing(false);
      closeAction();
    }, 1000);
  };

  const handleEditSave = () => {
    if (!selectedRec) return;
    setIsProcessing(true);
    setTimeout(() => {
      setRecurrences(prev => prev.map(item => 
        item.id === selectedRec.id 
          ? { ...item, amount: editAmount, periodicity: editPeriod }
          : item
      ));
      showToast(`Apoio para ${selectedRec.communityName} atualizado para R$ ${editAmount} / ${editPeriod}.`, 'success');
      setIsProcessing(false);
      closeAction();
    }, 1000);
  };

  const handleCancelConfirm = () => {
    if (!selectedRec) return;
    setIsProcessing(true);
    setTimeout(() => {
      setRecurrences(prev => prev.filter(item => item.id !== selectedRec.id));
      showToast(`Apoio recorrente para ${selectedRec.communityName} foi cancelado.`, 'success');
      setIsProcessing(false);
      closeAction();
    }, 1000);
  };

  return (
    <div className="donation-choice-page">
      <AppHeader title="Apoio Recorrente" showBack onBack={() => navigate(-1)} />
      
      <main className="content p-4">
        <h1 className="page-title text-primary mb-2">Seus Apoios Ativos</h1>
        <p className="page-subtitle text-xs text-outline mb-6">
          Gerencie suas assinaturas de alimentação programadas para manter a mesa cheia daquelas crianças.
        </p>

        <div className="recurrences-list flex flex-col gap-4">
          {recurrences.length === 0 ? (
            <div className="text-center p-8 bg-surface rounded-md border border-outline/10 my-4">
              <p className="text-sm text-outline italic">Você não possui assinaturas de apoio ativo no momento.</p>
              <Button variant="primary" className="mt-4" onClick={() => navigate('/donate')}>Começar um Apoio</Button>
            </div>
          ) : (
            recurrences.map(rec => (
              <div 
                key={rec.id} 
                className={`p-4 rounded-md border transition-all ${
                  rec.status === 'active' 
                    ? 'border-primary bg-white shadow-sm' 
                    : 'border-outline/10 bg-surface-highest/40 opacity-80'
                }`}
              >
                {/* Header Row */}
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-primary" />
                    <span className="font-extrabold text-primary text-sm">{rec.communityName}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                    rec.status === 'active' ? 'bg-success/10 text-success' : 'bg-warning/20 text-warning'
                  }`}>
                    {rec.status === 'active' ? 'Ativo' : 'Pausado'}
                  </span>
                </div>

                {/* Sub details */}
                <div className="flex justify-between items-end border-b border-outline/5 pb-3 mb-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-outline">Próxima renovação</span>
                    <span className="text-xs text-text-main font-semibold flex items-center gap-1">
                      <Calendar size={12} /> {rec.nextBillingDate}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-outline block">Valor Programado</span>
                    <span className="text-lg font-black text-secondary">
                      R$ {rec.amount} <span className="text-xs font-normal text-outline">/{periodLabel(rec.periodicity)}</span>
                    </span>
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex gap-2 justify-end">
                  <button
                    className="px-3 border border-outline/10 hover:border-primary rounded text-primary flex items-center gap-1 text-xs font-bold bg-white"
                    style={{ minHeight: '44px', minWidth: '44px' }}
                    onClick={() => openAction('edit', rec)}
                  >
                    <Edit3 size={14} /> Editar
                  </button>

                  <button
                    className="px-3 border border-outline/10 hover:border-warning rounded text-outline flex items-center gap-1 text-xs font-bold bg-white"
                    style={{ minHeight: '44px', minWidth: '44px' }}
                    onClick={() => openAction('pause', rec)}
                  >
                    {rec.status === 'active' ? (
                      <><PauseCircle size={14} /> Pausar</>
                    ) : (
                      <><PlayCircle size={14} className="text-success" /> Reativar</>
                    )}
                  </button>

                  <button
                    className="px-3 border border-outline/10 hover:border-error rounded text-error flex items-center gap-1 text-xs font-bold bg-white"
                    style={{ minHeight: '44px', minWidth: '44px' }}
                    onClick={() => openAction('cancel', rec)}
                  >
                    <Trash2 size={14} /> Cancelar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* ── Confirm Pause/Reactivate BottomSheet ── */}
      <BottomSheet 
        isOpen={activeBottomSheet === 'pause'} 
        onClose={closeAction}
        title={selectedRec?.status === 'active' ? 'Pausar Apoio Programado' : 'Reativar Apoio Programado'}
      >
        {selectedRec && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-outline leading-relaxed">
              {selectedRec.status === 'active' 
                ? `Ao pausar seu apoio recorrente a ${selectedRec.communityName}, os apoios automáticos serão suspensos até que você decida reativá-lo.`
                : `Você deseja reativar o seu apoio recorrente de R$ ${selectedRec.amount} por ${periodLabel(selectedRec.periodicity)} para a comunidade de ${selectedRec.communityName}?`}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" fullWidth onClick={closeAction} disabled={isProcessing}>Cancelar</Button>
              <Button 
                variant="primary" 
                fullWidth 
                loading={isProcessing} 
                onClick={handleTogglePause}
                className={selectedRec.status === 'active' ? 'bg-warning border-warning' : 'bg-success border-success'}
              >
                {selectedRec.status === 'active' ? 'Pausar Apoio' : 'Reativar Apoio'}
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* ── Edit Support Value & Cycle BottomSheet ── */}
      <BottomSheet 
        isOpen={activeBottomSheet === 'edit'} 
        onClose={closeAction}
        title="Editar Ajustes do Apoio"
      >
        {selectedRec && (
          <div className="flex flex-col gap-4">
            <div className="form-group">
              <h3 className="section-subtitle mb-2 text-xs font-bold uppercase tracking-wider text-outline">Intervalo</h3>
              <div className="recurrence-toggle flex bg-surface-highest p-1 rounded-md">
                <button 
                  className={`toggle-btn ${editPeriod === 'semanal' ? 'active' : ''}`}
                  onClick={() => setEditPeriod('semanal')}
                >
                  Semanal
                </button>
                <button 
                  className={`toggle-btn ${editPeriod === 'mensal' ? 'active' : ''}`}
                  onClick={() => setEditPeriod('mensal')}
                >
                  Mensal
                </button>
              </div>
            </div>

            <div className="form-group">
              <h3 className="section-subtitle mb-2 text-xs font-bold uppercase tracking-wider text-outline">Valor do Apoio</h3>
              <div className="amount-cards-grid grid grid-cols-3 gap-2">
                {[40, 80, 150].map((val) => (
                  <button 
                    key={val} 
                    type="button"
                    className={`amount-card p-3 rounded-md border text-center font-bold ${
                      editAmount === val ? 'border-primary bg-primary/5 text-primary' : 'border-outline/10 bg-white'
                    }`} 
                    onClick={() => setEditAmount(val)}
                  >
                    R$ {val}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" fullWidth onClick={closeAction} disabled={isProcessing}>Cancelar</Button>
              <Button 
                variant="primary" 
                fullWidth 
                loading={isProcessing} 
                onClick={handleEditSave}
              >
                Salvar Alterações
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* ── Confirm Cancel BottomSheet ── */}
      <BottomSheet 
        isOpen={activeBottomSheet === 'cancel'} 
        onClose={closeAction}
        title="Cancelar Apoio Definitivamente"
      >
        {selectedRec && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 p-3 bg-error/5 border border-error/20 rounded-md">
              <ShieldAlert size={24} className="text-error" />
              <p className="text-xs text-error font-semibold">Atenção: A ausência de apoio programado pode deixar crianças da região desamparadas.</p>
            </div>
            <p className="text-sm text-outline leading-relaxed">
              Tem certeza absoluta de que deseja cancelar o apoio de R$ {selectedRec.amount}/{periodLabel(selectedRec.periodicity)} para {selectedRec.communityName}? Essa ação não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" fullWidth onClick={closeAction} disabled={isProcessing}>Manter Apoio</Button>
              <Button 
                variant="primary" 
                fullWidth 
                loading={isProcessing} 
                onClick={handleCancelConfirm}
                className="bg-error border-error text-inverted"
              >
                Sim, Cancelar Apoio
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};

export default RecurrenceManager;
