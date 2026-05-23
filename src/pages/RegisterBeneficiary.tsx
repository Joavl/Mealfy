import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import { useToast } from '../context/ToastContext';
import { useAppContext } from '../context/AppContext';
import { authService } from '../backend/services/authService';
import { Camera, Users } from 'lucide-react';
import MaskedInput from '../components/ui/MaskedInput';
import './RegisterBeneficiary.css';

const REGIONS = ['Heliópolis', 'Paraisópolis', 'Cidade Tiradentes', 'Grajaú'];

const RegisterBeneficiary: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { fetchSession } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [childrenNames, setChildrenNames] = useState<string[]>(['']);
  const [form, setForm] = useState({
    familyName: '',
    responsibleName: '',
    responsibleCpf: '',
    childrenCount: 1,
    region: REGIONS[0],
    neighborhood: '',
    shortAddress: '',
  });
  const [photoUrl, setPhotoUrl] = useState<string>('');

  const updateChildrenCount = (count: number) => {
    const n = Math.max(1, Math.min(12, count));
    setForm((f) => ({ ...f, childrenCount: n }));
    setChildrenNames((prev) => {
      const next = [...prev];
      while (next.length < n) next.push('');
      return next.slice(0, n);
    });
  };

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2_500_000) {
      showToast('Foto muito grande. Use até 2,5 MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const names = childrenNames.map((n) => n.trim()).filter(Boolean);
    if (!form.familyName.trim() || !form.responsibleName.trim()) {
      showToast('Preencha o nome da família e do responsável.', 'error');
      return;
    }
    if (form.responsibleCpf.replace(/\D/g, '').length < 11) {
      showToast('CPF do responsável inválido.', 'error');
      return;
    }
    if (names.length < form.childrenCount) {
      showToast('Informe o nome de cada criança.', 'error');
      return;
    }
    if (!photoUrl) {
      showToast('Envie uma foto da família.', 'error');
      return;
    }

    setLoading(true);
    try {
      await authService.registerBeneficiary({
        familyName: form.familyName.trim(),
        responsibleName: form.responsibleName.trim(),
        responsibleCpf: form.responsibleCpf,
        childrenCount: form.childrenCount,
        childrenNames: names,
        photoUrl,
        region: form.region,
        neighborhood: form.neighborhood.trim() || form.region,
        shortAddress: form.shortAddress.trim() || form.region,
      });
      await fetchSession();
      showToast('Cadastro realizado! Sua família já aparece no mapa da região.', 'success');
      navigate('/beneficiary/dashboard', { replace: true });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao cadastrar.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-beneficiary-page">
      <AppHeader title="Cadastro da Família" showBack onBack={() => navigate('/auth')} />

      <main className="content p-4">
        <section className="rb-intro mb-4">
          <Users size={28} className="text-success mb-2" />
          <h2 className="text-lg font-bold text-primary">Cadastre sua família</h2>
          <p className="text-sm text-outline leading-relaxed">
            Após o cadastro, sua família aparece no mapa da região. Uma entidade parceira pode
            ajudar a organizar o acompanhamento se vocês ainda não tiverem estrutura de apoio.
          </p>
        </section>

        <form className="rb-form flex-col gap-4" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nome da família</label>
            <input
              className="form-input"
              value={form.familyName}
              onChange={(e) => setForm({ ...form, familyName: e.target.value })}
              placeholder="Ex: Família Silva"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nome do responsável</label>
            <input
              className="form-input"
              value={form.responsibleName}
              onChange={(e) => setForm({ ...form, responsibleName: e.target.value })}
              placeholder="Nome completo"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">CPF do responsável</label>
            <MaskedInput
              mask="cpf"
              className="form-input"
              value={form.responsibleCpf}
              onValueChange={(responsibleCpf) => setForm({ ...form, responsibleCpf })}
              placeholder="000.000.000-00"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Região onde moram</label>
            <select
              className="form-input"
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Bairro / referência</label>
            <input
              className="form-input"
              value={form.neighborhood}
              onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
              placeholder="Ex: Viela 3, Setor B"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Quantidade de crianças</label>
            <input
              type="number"
              min={1}
              max={12}
              className="form-input"
              value={form.childrenCount}
              onChange={(e) => updateChildrenCount(Number(e.target.value))}
            />
          </div>

          {childrenNames.map((name, i) => (
            <div className="form-group" key={i}>
              <label className="form-label">Nome da criança {i + 1}</label>
              <input
                className="form-input"
                value={name}
                onChange={(e) => {
                  const next = [...childrenNames];
                  next[i] = e.target.value;
                  setChildrenNames(next);
                }}
                required
              />
            </div>
          ))}

          <div className="form-group">
            <label className="form-label">Foto da família</label>
            <label className="rb-photo-upload">
              <Camera size={22} />
              <span>{photoUrl ? 'Trocar foto' : 'Selecionar foto'}</span>
              <input type="file" accept="image/*" capture="environment" onChange={onPhotoChange} hidden />
            </label>
            {photoUrl && <img src={photoUrl} alt="Prévia" className="rb-photo-preview" />}
          </div>

          <Button type="submit" size="large" fullWidth loading={loading} className="shadow-glow mt-2">
            Concluir cadastro
          </Button>
        </form>
      </main>
    </div>
  );
};

export default RegisterBeneficiary;
