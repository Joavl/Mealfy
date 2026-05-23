import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { familyService } from '../backend/services/familyService';
import type { Family } from '../backend/types';
import Button from '../components/ui/Button';
import { LocateFixed, Filter, MapPin } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import ImpactRegionSelector from '../components/modals/ImpactRegionSelector';
import './MapView.css';

// Fix missing leafet icon paths conceptually
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icons
const brokenHeartIcon = L.divIcon({
  html: "💔",
  className: "custom-marker broken",
  iconSize: [30, 30]
});

const fullHeartIcon = L.divIcon({
  html: "❤️",
  className: "custom-marker",
  iconSize: [30, 30]
});

// Helper component to recenter map
const RecenterControls = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

import { isBeneficiaryEligible } from '../backend/utils/timeUtils';
import { isPubliclyVisibleFamily } from '../backend/utils/familyUtils';

/** Evita que cliques no popup sejam engolidos pelo Leaflet */
const stopMapEvent = (e: React.SyntheticEvent) => {
  e.stopPropagation();
  L.DomEvent.stopPropagation(e.nativeEvent as Event);
  L.DomEvent.preventDefault(e.nativeEvent as Event);
};

const MapView: React.FC = () => {
  const navigate = useNavigate();
  const { selectedRegion } = useAppContext();
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [showOnlyNeedsHelp, setShowOnlyNeedsHelp] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-23.5505, -46.6333]);
  const [isRegionSelectorOpen, setIsRegionSelectorOpen] = useState(false);

  /* Impede zoom da página inteira no pinch (mobile); só o mapa faz zoom */
  useEffect(() => {
    const el = mapWrapperRef.current;
    if (!el) return;

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };

    const onGesture = (e: Event) => e.preventDefault();

    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('gesturestart', onGesture);
    el.addEventListener('gesturechange', onGesture);
    el.addEventListener('gestureend', onGesture);

    return () => {
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('gesturestart', onGesture);
      el.removeEventListener('gesturechange', onGesture);
      el.removeEventListener('gestureend', onGesture);
    };
  }, []);

  useEffect(() => {
    const filters = selectedRegion ? { region: selectedRegion } : undefined;
    familyService.getFamilies(filters).then(fams => {
      setFamilies(fams);
      
      if (fams.length > 0) {
        // Recenter to first family if region is selected
        const valid = fams.find(f => f.latitude && f.longitude);
        if (valid) {
          setMapCenter([valid.latitude, valid.longitude]);
        }
      }
    });
  }, [selectedRegion]);

  const displayedFamilies = families.filter(f => {
    if (!isPubliclyVisibleFamily(f)) return false;
    
    const eligible = isBeneficiaryEligible(f);
    if (showOnlyNeedsHelp) return eligible;
    return true; // Show all if filter is off
  });

  const validFamilies = displayedFamilies.filter(f => {
    const isValid = f.latitude !== undefined && f.latitude !== null && !isNaN(f.latitude) &&
                    f.longitude !== undefined && f.longitude !== null && !isNaN(f.longitude);
    if (!isValid) {
      console.warn(`Família inválida ignorada na renderização do mapa: ${f.id} - ${f.representativeName}`, f);
    }
    return isValid;
  });

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const goToFamilyDetails = (familyId: string) => {
    navigate(`/family/${familyId}`);
  };

  const goToDonateFamily = (family: Family) => {
    navigate('/donate', { state: { targetFamily: family } });
  };

  const handleRecenter = () => {
    // In a real app we'd get device coordinates. Here we recenter to SP Base.
    setMapCenter([-23.5505, -46.6333]);
  };

  return (
    <div className="map-view-page">
      <div className="map-container-wrapper" ref={mapWrapperRef}>
        <MapContainer
          center={mapCenter}
          zoom={11}
          scrollWheelZoom={false}
          touchZoom
          dragging
          doubleClickZoom
          zoomSnap={0.5}
          zoomDelta={0.5}
          zoomControl={false}
        >
          <RecenterControls center={mapCenter} />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          />

          {validFamilies.length === 0 && !showOnlyNeedsHelp && families.length > 0 && (
             <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000, background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                <h3 className="text-secondary font-bold mb-2">Nenhuma família plotada</h3>
                <p className="text-sm text-outline">As famílias desta região não possuem coordenadas disponíveis no momento.</p>
             </div>
          )}

          {validFamilies.map((fam) => {
            const isSelected = selectedIds.includes(fam.id);
            const isEligible = isBeneficiaryEligible(fam);
            
            return (
              <Marker 
                key={fam.id} 
                position={[fam.latitude, fam.longitude]}
                icon={isSelected ? fullHeartIcon : (isEligible ? brokenHeartIcon : fullHeartIcon)}
              >
                <Popup closeOnClick={false} autoClose={false}>
                  <div
                    className="map-popup-content"
                    onClick={stopMapEvent}
                    onMouseDown={stopMapEvent}
                    onTouchStart={stopMapEvent}
                  >
                  <div className="popup-header">
                    <h4 style={{ margin: 0, fontSize: '1rem' }}>{fam.representativeName}</h4>
                    <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>{fam.childrenCount} filhos</span>
                  </div>
                  <div className="popup-body">
                    {fam.photoUrl && (
                      <img
                        src={fam.photoUrl}
                        alt={fam.representativeName}
                        className="map-popup-photo"
                      />
                    )}
                    <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#666' }}>
                      <strong>{fam.neighborhood}</strong><br/>
                      {fam.description || 'Família cadastrada na rede Mealfy.'}
                    </p>
                    {isEligible ? (
                      <div style={{ color: 'var(--color-error)', fontWeight: 600, fontSize: '0.8rem', display: 'flex', gap: '4px', alignItems: 'center' }}>
                        💔 Precisa de apoio Nível {fam.priorityLevel || 3}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '0.8rem', display: 'flex', gap: '4px', alignItems: 'center' }}>
                        ❤️ Família Alimentada
                      </div>
                    )}
                    <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #eee', fontSize: '0.75rem', color: '#888' }}>
                      Fonte: {fam.sourceEntityName || fam.sourceLabel || 'Cadastro Mealfy'}
                    </div>
                  </div>
                  
                  <div className="popup-actions map-popup-actions">
                    <button
                      type="button"
                      className="map-popup-btn map-popup-btn-outline"
                      onClick={(e) => {
                        stopMapEvent(e);
                        goToFamilyDetails(fam.id);
                      }}
                    >
                      Detalhes
                    </button>
                    
                    {isEligible ? (
                      <>
                        <button
                          type="button"
                          className="map-popup-btn map-popup-btn-primary"
                          onClick={(e) => {
                            stopMapEvent(e);
                            goToDonateFamily(fam);
                          }}
                        >
                          Doar
                        </button>
                        <button
                          type="button"
                          className={`map-popup-btn ${isSelected ? 'map-popup-btn-outline' : 'map-popup-btn-secondary'}`}
                          onClick={(e) => {
                            stopMapEvent(e);
                            toggleSelection(fam.id);
                          }}
                        >
                          {isSelected ? 'Remover da seleção' : 'Selecionar'}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="map-popup-btn map-popup-btn-outline"
                        onClick={(e) => {
                          stopMapEvent(e);
                          goToFamilyDetails(fam.id);
                        }}
                      >
                        Ver histórico
                      </button>
                    )}
                  </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div className="map-overlays">
        <div className="map-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
           <div className="flex justify-between items-center bg-surface p-2 rounded-xl shadow-sm">
             <div className="flex items-center gap-2">
               <MapPin size={16} className="text-primary" />
               <span className="text-sm font-bold text-outline">
                 {selectedRegion ? `Região: ${selectedRegion}` : 'Todas as Regiões'}
               </span>
             </div>
             <Button variant="ghost" size="small" onClick={() => setIsRegionSelectorOpen(true)} className="text-primary px-2 py-1 h-auto text-xs">
               Alterar
             </Button>
           </div>
           
           <div className="flex justify-between items-center">
             <div className="legend-card" style={{ padding: '8px 12px', minWidth: 'auto' }}>
                <div className="legend-item"><span style={{fontSize: '1rem'}}>💔</span> Aguardando</div>
                <div className="legend-item"><span style={{fontSize: '1rem'}}>❤️</span> Seguro</div>
             </div>
             
             <div className="filter-card" style={{ padding: '8px 12px', minWidth: 'auto' }}>
              <button 
                className="flex items-center gap-2 font-semibold text-sm text-primary"
                onClick={() => setShowOnlyNeedsHelp(!showOnlyNeedsHelp)}
              >
                <Filter size={16} />
                {showOnlyNeedsHelp ? 'Urgências' : 'Todas'}
              </button>
             </div>
           </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="batch-donation-overlay" style={{
            position: 'absolute',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            width: '90%',
            maxWidth: '400px'
          }}>
            <Button 
              size="large" 
              fullWidth 
              className="shadow-glow bg-secondary border-secondary text-inverted"
              onClick={() => navigate('/donate', { state: { selectedFamilyIds: selectedIds } })}
            >
              Ajudar {selectedIds.length} {selectedIds.length === 1 ? 'família' : 'famílias'}
            </Button>
          </div>
        )}

        <div className="map-controls">
           <button 
             onClick={handleRecenter}
             className="bg-primary text-inverted p-3 rounded-full shadow-lg flex items-center justify-center cursor-pointer"
             aria-label="Centralizar na minha região"
           >
             <LocateFixed size={24} />
           </button>
        </div>
      </div>

      <ImpactRegionSelector 
        isOpen={isRegionSelectorOpen} 
        onClose={() => setIsRegionSelectorOpen(false)} 
      />
    </div>
  );
};

export default MapView;
