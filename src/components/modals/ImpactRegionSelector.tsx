import React, { useEffect, useState } from 'react';
import BottomSheet from '../ui/BottomSheet';
import { useAppContext } from '../../context/AppContext';
import { regionsApi } from '../../api/regionsApi';
import type { Region } from '../../api/regionsApi';
import { familyService } from '../../backend/services/familyService';
import { isPubliclyVisibleFamily } from '../../backend/utils/familyUtils';
import type { Family } from '../../backend/types';
import { MapPin, Users, AlertCircle, Check, Loader2, Globe } from 'lucide-react';
import './CommunitySelectorModal.css';

function buildRegionsFromFamilies(families: Family[]): Region[] {
  const regionsMap = new Map<string, Region>();

  families.forEach((family) => {
    const regionName = family.region || family.neighborhood;
    if (!regionName) return;

    if (!regionsMap.has(regionName)) {
      regionsMap.set(regionName, {
        id: regionName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-'),
        name: regionName,
        city: family.city || 'São Paulo',
        state: family.state || 'SP',
        familiesCount: 0,
        urgentCount: 0,
      });
    }

    const region = regionsMap.get(regionName)!;
    region.familiesCount += 1;
    if (family.supportStatus === 'needs_help') {
      region.urgentCount += 1;
    }
  });

  return Array.from(regionsMap.values()).sort((a, b) => b.familiesCount - a.familiesCount);
}

interface ImpactRegionSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const ImpactRegionSelector: React.FC<ImpactRegionSelectorProps> = ({ isOpen, onClose }) => {
  const { selectedRegion, setSelectedRegion, clearSelectedRegion } = useAppContext();
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setLoading(true);

    const loadRegions = async () => {
      try {
        const apiRegions = await regionsApi.getRegions();
        if (!cancelled) setRegions(apiRegions || []);
      } catch {
        const families = await familyService.getFamilies();
        const visibleFamilies = families.filter(isPubliclyVisibleFamily);
        if (!cancelled) setRegions(buildRegionsFromFamilies(visibleFamilies));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadRegions();
    return () => { cancelled = true; };
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
        <div className="community-options">
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
                  <MapPin size={14} /> {region.city}/{region.state}
                </span>
                <span className="flex items-center gap-1 text-sm text-outline">
                  <Users size={14} /> {region.familiesCount} fam.
                </span>
              </div>
              
              {region.urgentCount > 0 && (
                <div className={`option-status mt-3 status-error`}>
                  <AlertCircle size={14} />
                  <span>{region.urgentCount} urgências</span>
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
