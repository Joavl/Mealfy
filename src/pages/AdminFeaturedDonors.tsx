import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { featuredDonorsService } from '../backend/services/featuredDonorsService';
import { FEATURED_DONORS_MAX, type CarouselDonor } from '../backend/types/featuredDonors';
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Users,
} from 'lucide-react';
import './AdminFeaturedDonors.css';

const AdminFeaturedDonors: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppContext();
  const { showToast } = useToast();

  const [featuredIds, setFeaturedIds] = useState<string[]>([]);
  const [pool, setPool] = useState<CarouselDonor[]>([]);
  const [search, setSearch] = useState('');
  const [pickId, setPickId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [config, donors] = await Promise.all([
      featuredDonorsService.getConfig(),
      featuredDonorsService.getDonorPool(),
    ]);
    setFeaturedIds(config.donorIds);
    setPool(donors);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byId = useMemo(() => new Map(pool.map((d) => [d.id, d])), [pool]);

  const featuredList = useMemo(
    () =>
      featuredIds
        .map((id) => byId.get(id))
        .filter((d): d is CarouselDonor => Boolean(d)),
    [featuredIds, byId],
  );

  const availableToAdd = useMemo(() => {
    const used = new Set(featuredIds);
    const q = search.trim().toLowerCase();
    return pool.filter((d) => {
      if (used.has(d.id)) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q) ||
        (d.instagram?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [pool, featuredIds, search]);

  const move = (index: number, dir: -1 | 1) => {
    const next = [...featuredIds];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setFeaturedIds(next);
  };

  const remove = (id: string) => {
    setFeaturedIds((prev) => prev.filter((x) => x !== id));
  };

  const addDonor = (id?: string) => {
    const donorId = id ?? pickId;
    if (!donorId) return;
    if (featuredIds.includes(donorId)) {
      showToast('Este doador já está no destaque.', 'info');
      return;
    }
    if (featuredIds.length >= FEATURED_DONORS_MAX) {
      showToast(`Máximo de ${FEATURED_DONORS_MAX} doadores em destaque.`, 'error');
      return;
    }
    setFeaturedIds((prev) => [...prev, donorId]);
    setPickId('');
    setSearch('');
  };

  const save = async () => {
    setSaving(true);
    try {
      await featuredDonorsService.saveConfig(featuredIds, user?.id);
      window.dispatchEvent(new CustomEvent('mealfy:featured-donors-updated'));
      showToast('Carrossel atualizado! A home já reflete a nova ordem.', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro ao salvar.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetAutomatic = async () => {
    setFeaturedIds([]);
    setSaving(true);
    try {
      await featuredDonorsService.saveConfig([], user?.id);
      window.dispatchEvent(new CustomEvent('mealfy:featured-donors-updated'));
      showToast('Destaque manual removido. Ordem automática por valor doado.', 'success');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-featured-page">
      <AppHeader
        title="Destaque do carrossel"
        showBack
        onBack={() => navigate('/admin/dashboard')}
      />

      <main className="content p-4">
        <section className="featured-intro mb-4">
          <div className="flex items-center gap-3 mb-2">
            <Users size={24} className="text-secondary" />
            <h2 className="text-lg font-bold text-primary">20 primeiros doadores</h2>
          </div>
          <p className="text-sm text-outline leading-relaxed">
            Defina quem aparece primeiro no carrossel da home (estilo stories / redes).
            Posições vazias são preenchidas automaticamente pelo ranking de doações.
          </p>
          <p className="text-xs text-outline mt-2">
            {featuredIds.length}/{FEATURED_DONORS_MAX} em destaque manual
          </p>
        </section>

        {loading ? (
          <p className="text-center text-outline py-8">Carregando…</p>
        ) : (
          <>
            <section className="featured-list mb-6">
              <h3 className="section-label">Ordem no carrossel</h3>
              {featuredList.length === 0 ? (
                <div className="empty-featured p-6 text-center rounded-xl border border-dashed border-outline/20">
                  <p className="text-sm text-outline">
                    Nenhum destaque manual. O sistema usa só o ranking automático.
                  </p>
                </div>
              ) : (
                <ul className="featured-slots">
                  {featuredList.map((donor, index) => (
                    <li key={donor.id} className="featured-slot">
                      <span className="slot-pos">{index + 1}</span>
                      <GripVertical size={16} className="text-outline/40" />
                      <div className="slot-info">
                        <strong>{donor.name}</strong>
                        <span className="slot-meta">
                          R$ {donor.totalDonated.toLocaleString('pt-BR')}
                          {donor.instagram ? ` · ${donor.instagram}` : ''}
                        </span>
                      </div>
                      <div className="slot-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => move(index, -1)}
                          disabled={index === 0}
                          aria-label="Subir"
                        >
                          <ArrowUp size={18} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => move(index, 1)}
                          disabled={index === featuredList.length - 1}
                          aria-label="Descer"
                        >
                          <ArrowDown size={18} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          onClick={() => remove(donor.id)}
                          aria-label="Remover"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="add-donor mb-6">
              <h3 className="section-label">Adicionar doador</h3>
              <input
                type="search"
                className="search-input"
                placeholder="Buscar por nome, @instagram ou id…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="pick-select"
                value={pickId}
                onChange={(e) => setPickId(e.target.value)}
              >
                <option value="">Selecione um doador…</option>
                {availableToAdd.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — R$ {d.totalDonated} {d.instagram ? `(${d.instagram})` : ''}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                fullWidth
                icon={<Plus size={18} />}
                onClick={() => addDonor()}
                disabled={!pickId || featuredIds.length >= FEATURED_DONORS_MAX}
              >
                Incluir no destaque
              </Button>
            </section>

            <section className="featured-actions flex-col gap-3">
              <Button
                fullWidth
                icon={<Save size={18} />}
                onClick={save}
                loading={saving}
                className="shadow-glow"
              >
                Salvar ordem do carrossel
              </Button>
              <Button
                variant="outline"
                fullWidth
                icon={<RotateCcw size={18} />}
                onClick={resetAutomatic}
                loading={saving}
              >
                Voltar ao ranking automático
              </Button>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminFeaturedDonors;
