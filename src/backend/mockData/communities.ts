import type { Community } from '../types';

export const mockCommunities: Community[] = [
  { 
    id: 'c1', 
    name: 'Heliópolis', 
    region: 'Zona Sul, SP',
    description: 'A maior favela de SP, com muitas famílias precisando de cestas básicas pós-crise.',
    distance: '1.2 km', 
    familiesTotal: 340, 
    familiesInNeed: 120,
    priority: 'Alta urgência', 
    urgencyColor: 'error' 
  },
  { 
    id: 'c2', 
    name: 'Paraisópolis', 
    region: 'Zona Sul, SP',
    description: 'Comunidade com forte articulação local, porém com bolsões de alta vulnerabilidade.',
    distance: '3.5 km', 
    familiesTotal: 210, 
    familiesInNeed: 85,
    priority: 'Alta urgência', 
    urgencyColor: 'error' 
  },
  { 
    id: 'c3', 
    name: 'Cidade Tiradentes', 
    region: 'Zona Leste, SP',
    description: 'Região com alto índice de crianças em idade escolar fora do período integral.',
    distance: '8.0 km', 
    familiesTotal: 156, 
    familiesInNeed: 40,
    priority: 'Atenção', 
    urgencyColor: 'warning' 
  },
  { 
    id: 'c4', 
    name: 'São Miguel Paulista', 
    region: 'Zona Leste, SP',
    description: 'Bairro periférico com redes de solidariedade ativas.',
    distance: '10.5 km', 
    familiesTotal: 98, 
    familiesInNeed: 12,
    priority: 'Estável', 
    urgencyColor: 'success' 
  },
];
