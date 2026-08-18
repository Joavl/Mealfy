import React from 'react';
import BottomSheet from '../ui/BottomSheet';
import { useAppContext } from '../../context/AppContext';
import { MapPin, Users, AlertCircle, Check } from 'lucide-react';
import './CommunitySelectorModal.css';

interface CommunitySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CommunitySelectorModal: React.FC<CommunitySelectorModalProps> = ({ isOpen, onClose }) => {
  const { communities, selectedCommunity, setSelectedCommunity } = useAppContext();

  const handleSelect = (community: any) => {
    setSelectedCommunity(community);
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Explorar Regiões">
      <p className="modal-subtitle mb-4 text-outline">
        Escolha a comunidade para qual deseja direcionar o seu apoio ou conhecer o impacto.
      </p>

      <div className="community-options flex-col gap-3">
        {communities.map((community) => (
          <div 
            key={community.id} 
            className={`community-option-card ${selectedCommunity?.id === community.id ? 'active' : ''}`}
            onClick={() => handleSelect(community)}
          >
            <div className="option-header">
              <h3 className="option-title">{community.name}</h3>
              {selectedCommunity?.id === community.id && (
                <Check size={20} className="text-primary" />
              )}
            </div>
            
            <div className="option-details flex gap-4 mt-2">
              <span className="flex items-center gap-1 text-sm text-outline">
                <MapPin size={14} /> {community.distance}
              </span>
              <span className="flex items-center gap-1 text-sm text-outline">
                <Users size={14} /> {community.familiesTotal} fam.
              </span>
            </div>
            
            <div className={`option-status mt-3 status-${community.urgencyColor}`}>
              <AlertCircle size={14} />
              <span>{community.priority}</span>
            </div>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
};

export default CommunitySelectorModal;
