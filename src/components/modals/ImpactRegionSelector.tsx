import React, { useEffect, useState } from 'react';
import BottomSheet from '../ui/BottomSheet';
import { useAppContext } from '../../context/AppContext';
import { regionsApi } from '../../api/regionsApi';
import type { Region } from '../../api/regionsApi';
import { MapPin, Users, AlertCircle, Check, Loader2, Globe } from 'lucide-react';
import './CommunitySelectorModal.css';

interface ImpactRegionSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const ImpactRegionSelector: React.FC<ImpactRegionSelectorProps> = ({ isOpen, onClose }) => {
  const { selectedRegion, setSelectedRegion, clearSelectedRegion } = useAppContext();
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      regionsApi.getRegions()
        .then(res => setRegions(res?.regions ?? []))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handleSelect = (region: string | null) => {
    if (region) setSelectedRegion(region);
    else clearSelectedRegion();
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Escolha onde quer ajudar">
      <p className="modal-subtitle mb-4 text-outline">
        Selecione uma região para concentrar o seu impacto ou apoie onde houver maior necessidade.
      </p>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : (
        <div className="community-options flex-col gap-3">
          <div 
            className={`community-option-card ${!selectedRegion ? 'active' : ''}`}
            onClick={() => handleSelect(null)}
          >
            <div className="option-header">
              <h3 className="option-title flex items-center gap-2"><Globe size={18}/> Todas as Regiões</h3>
              {!selectedRegion && <Check size={20} className="text-primary" />}
            </div>
            <p className="text-sm text-outline mt-1">Apoiar famílias em todas as comunidades disponíveis.</p>
          </div>

          {regions.map((region) => (
            <div 
              key={region.id} 
              className={`community-option-card ${selectedRegion === region.name ? 'active' : ''}`}
              onClick={() => handleSelect(region.name)}
            >
              <div className="option-header">
                <h3 className="option-title">{region.name}</h3>
                {selectedRegion === region.name && <Check size={20} className="text-primary" />}
              </div>
              
              <div className="option-details flex gap-4 mt-2">
                <span className="flex items-center gap-1 text-sm text-outline">
                  <MapPin size={14} /> {region.state}
                </span>
                <span className="flex items-center gap-1 text-sm text-outline">
                  <Users size={14} /> {region.familiesTotal} fam.
                </span>
              </div>

              {/* "Pedindo hoje" em vez de "urgências": a solicitação vale por um
                  ciclo, então este número é o que realmente precisa de apoio agora. */}
              {region.familiesInNeed > 0 && (
                <div className={`option-status mt-3 status-error`}>
                  <AlertCircle size={14} />
                  <span>{region.familiesInNeed} pedindo apoio hoje</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </BottomSheet>
  );
};

export default ImpactRegionSelector;
