import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import Button from '../components/ui/Button';
import { useAppContext } from '../context/AppContext';
import { Search, MapPin, Users, AlertCircle } from 'lucide-react';
import './Explore.css';

const Explore: React.FC = () => {
  const navigate = useNavigate();
  const { communities, setSelectedCommunity } = useAppContext();

  const handleHelpRegion = (community: any) => {
    setSelectedCommunity(community);
    navigate(`/community/${community.id}`);
  };

  return (
    <div className="explore-page">
      <AppHeader title="Regiões" />
      
      <main className="content p-4">
        <div className="search-container mb-6">
          <Search size={20} className="search-icon" />
          <input 
            type="text" 
            placeholder="Buscar por bairro ou cidade" 
            className="search-input"
          />
        </div>

        <div className="explore-header mb-4">
          <h2 className="section-title text-primary">Próximas a você</h2>
          <p className="section-desc">Conheça as comunidades da sua região que precisam de apoio.</p>
        </div>

        <div className="community-list flex-col gap-4">
          {communities.map((item) => (
            <div key={item.id} className="community-card">
              <div className="community-header">
                <h3 className="community-title">{item.name}</h3>
                <div className={`status-badge status-${item.urgencyColor}`}>
                  <AlertCircle size={12} />
                  <span>{item.priority}</span>
                </div>
              </div>
              
              <div className="community-details flex-col gap-2 mt-3 mb-4">
                <div className="detail-item flex items-center gap-2 text-outline">
                  <MapPin size={16} />
                  <span className="detail-value">{item.distance} de você</span>
                </div>
                <div className="detail-item flex items-center gap-2 text-outline">
                  <Users size={16} />
                  <span className="detail-value">{item.familiesTotal} famílias assistidas</span>
                </div>
              </div>

              <Button 
                variant="outline" 
                fullWidth 
                onClick={() => handleHelpRegion(item)}
                className="help-btn"
              >
                Ajudar esta região
              </Button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Explore;
