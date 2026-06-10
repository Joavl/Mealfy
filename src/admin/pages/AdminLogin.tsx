import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Lock } from 'lucide-react';
import '../styles/admin.css';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isPreview = import.meta.env.VITE_ADMIN_PREVIEW === 'true';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Atraso simulado para feedback visual
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (isPreview) {
      if (email === 'admin@mealfy.com' && password === 'mealfy123') {
        sessionStorage.setItem('admin_token', 'preview_token_123');
        sessionStorage.setItem('admin_user', 'Admin Geral (Preview)');
        setLoading(false);
        navigate('/admin');
      } else {
        setError('E-mail ou senha incorretos para o modo Preview.');
        setLoading(false);
      }
    } else {
      // Integração real
      try {
        // Exemplo:
        // const response = await authApi.loginAdmin(email, password);
        // sessionStorage.setItem('admin_token', response.token);
        // navigate('/admin');
        setError('Integração com API de produção pendente. Ative o modo VITE_ADMIN_PREVIEW=true.');
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha na autenticação.');
        setLoading(false);
      }
    }
  };

  return (
    <div className="admin-body">
      <div className="admin-login-container">
        <div className="admin-login-card">
          <div className="admin-login-logo">
            <Heart size={48} fill="#0d6e6e" color="#0d6e6e" />
          </div>

          <h2 className="admin-login-title">Mealfy Admin</h2>
          <p className="admin-login-subtitle">Gestão e Moderação da Rede</p>

          {isPreview && (
            <div className="admin-login-warning">
              <strong>Modo Preview Ativo</strong><br />
              Utilize as credenciais:<br />
              Email: <code>admin@mealfy.com</code><br />
              Senha: <code>mealfy123</code>
            </div>
          )}

          {!isPreview && (
            <div className="admin-login-warning" style={{ backgroundColor: '#fee2e2', borderColor: '#ef4444', color: '#991b1b' }}>
              <strong>Acesso Restrito</strong><br />
              Este painel é exclusivo para administradores autorizados. Ações não autorizadas serão auditadas.
            </div>
          )}

          {error && <div className="admin-login-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="admin-form-group">
              <label className="admin-form-label" htmlFor="email-input">E-mail corporativo</label>
              <input
                id="email-input"
                type="email"
                className="admin-form-input"
                placeholder="nome@mealfy.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label" htmlFor="password-input">Senha de acesso</label>
              <input
                id="password-input"
                type="password"
                className="admin-form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="admin-login-btn" disabled={loading}>
              <Lock size={16} />
              {loading ? 'Acessando...' : 'Entrar no painel'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
