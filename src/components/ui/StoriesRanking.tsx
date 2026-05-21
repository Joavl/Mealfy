import React from 'react';
import { User } from 'lucide-react';
import './StoriesRanking.css';

interface Donor {
  id: string;
  name: string;
  avatar: string;
  totalDonated: number;
  instagram?: string;
  facebook?: string;
  isAnonymous?: boolean;
  privacySettings?: {
    showOnRanking: boolean;
    showInstagram: boolean;
    anonymousMode: boolean;
  };
}

interface StoriesRankingProps {
  donors: Donor[];
  onSelectDonor?: (donor: Donor) => void;
}

const StoriesRanking: React.FC<StoriesRankingProps> = ({ donors, onSelectDonor }) => {
  return (
    <div className="stories-ranking-container">
      <div className="stories-scroll">
        {donors.map((donor) => {
          const isAnon = donor.isAnonymous || donor.privacySettings?.anonymousMode;
          const displayName = isAnon ? 'Anônimo' : donor.name;
          const hasSocial = !isAnon && (donor.facebook || donor.instagram);

          return (
            <div
              key={donor.id}
              className="story-item"
              onClick={() => onSelectDonor?.(donor)}
              role="button"
              tabIndex={0}
            >
              <div className={`story-avatar-ring ${donor.totalDonated > 5000 ? 'top-tier' : ''}`}>
                <div className="story-avatar">
                  {isAnon ? <User size={28} className="text-outline/40" /> : (donor.avatar || donor.name[0])}
                </div>
                {hasSocial && <span className="story-social-dot" title="Ver no Facebook" />}
              </div>
              <span className="story-name">{displayName}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StoriesRanking;
