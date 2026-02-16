
import { ArtAsset, InsuranceStatus } from './types';

export const MOCK_ASSETS: ArtAsset[] = [
  {
    id: '1',
    title: 'Metaesquema',
    artist: 'Hélio Oiticica',
    year: '1958',
    totalValue: 1250000,
    fractionPrice: 125,
    totalFractions: 10000,
    availableFractions: 4500,
    imageUrl: 'https://picsum.photos/seed/oiticica/600/800',
    gallery: [
      { id: 'g1', title: 'Metaesquema II', year: '1958', imageUrl: 'https://picsum.photos/seed/meta2/600/800' },
      { id: 'g2', title: 'Grupo Frente', year: '1955', imageUrl: 'https://picsum.photos/seed/frente/600/800' }
    ],
    insuranceStatus: InsuranceStatus.SECURED,
    insuranceCompany: 'Allianz Art & Heritage',
    policyNumber: 'ALZ-9921-X',
    insuranceExpiry: '2025-12-15',
    technicalReportUrl: '#',
    description: 'Obra emblemática do período neoconcreto, explorando a desintegração da moldura e do plano pictórico.'
  },
  {
    id: '2',
    title: 'Sem Título (Série Logogramas)',
    artist: 'Mira Schendel',
    year: '1965',
    totalValue: 850000,
    fractionPrice: 85,
    totalFractions: 10000,
    availableFractions: 1200,
    imageUrl: 'https://picsum.photos/seed/schendel/600/800',
    gallery: [
      { id: 'g4', title: 'Monotipia I', year: '1964', imageUrl: 'https://picsum.photos/seed/monotipia1/600/800' },
      { id: 'g5', title: 'Objeto Gráfico', year: '1966', imageUrl: 'https://picsum.photos/seed/objeto/600/800' }
    ],
    insuranceStatus: InsuranceStatus.SECURED,
    insuranceCompany: 'AXA Art',
    policyNumber: 'AXA-7732-B',
    insuranceExpiry: '2025-06-20',
    technicalReportUrl: '#',
    description: 'Trabalho em papel arroz que investiga a transparência e a escrita como gesto gráfico.'
  },
  {
    id: '3',
    title: 'Abstração Cromática',
    artist: 'Loio-Pérsio',
    year: '1972',
    totalValue: 420000,
    fractionPrice: 42,
    totalFractions: 10000,
    availableFractions: 8900,
    imageUrl: 'https://picsum.photos/seed/loiopersio/600/800',
    gallery: [
       { id: 'g6', title: 'Composição Azul', year: '1970', imageUrl: 'https://picsum.photos/seed/azul/600/800' }
    ],
    insuranceStatus: InsuranceStatus.WARNING,
    insuranceCompany: 'Liberty Art',
    policyNumber: 'LIB-4410-C',
    insuranceExpiry: '2024-05-10',
    technicalReportUrl: '#',
    description: 'Exploração de camadas de cor e profundidade, característica da fase madura do artista.'
  },
  {
    id: '4',
    title: 'Bicho',
    artist: 'Lygia Clark',
    year: '1960',
    totalValue: 3100000,
    fractionPrice: 310,
    totalFractions: 10000,
    availableFractions: 500,
    imageUrl: 'https://picsum.photos/seed/clark/600/800',
    gallery: [
       { id: 'g3', title: 'Bicho (Versão Metal)', year: '1960', imageUrl: 'https://picsum.photos/seed/bicho2/600/800' },
       { id: 'g7', title: 'Caminhando', year: '1963', imageUrl: 'https://picsum.photos/seed/caminhando/600/800' }
    ],
    insuranceStatus: InsuranceStatus.SECURED,
    insuranceCompany: 'Chubb Art',
    policyNumber: 'CHB-1122-D',
    insuranceExpiry: '2026-01-30',
    technicalReportUrl: '#',
    description: 'Escultura articulada em metal que convida à participação ativa do espectador.'
  },
  // Official Catalog items
  {
    id: 'cat-1',
    title: 'Espaço Modulado',
    artist: 'Lygia Pape',
    year: '1957',
    totalValue: 1800000,
    fractionPrice: 180,
    totalFractions: 10000,
    availableFractions: 0,
    imageUrl: 'https://picsum.photos/seed/pape/600/800',
    gallery: [],
    insuranceStatus: InsuranceStatus.SECURED,
    insuranceCompany: 'Itaú Arts',
    policyNumber: 'ITA-5566-P',
    insuranceExpiry: '2026-05-10',
    technicalReportUrl: '#',
    description: 'Uma exploração da geometria e do espaço vazio, parte fundamental do movimento Neoconcreto.',
    isCatalogOnly: true
  },
  {
    id: 'cat-2',
    title: 'Relevo Espacial',
    artist: 'Hélio Oiticica',
    year: '1960',
    totalValue: 2400000,
    fractionPrice: 240,
    totalFractions: 10000,
    availableFractions: 0,
    imageUrl: 'https://picsum.photos/seed/relevo/600/800',
    gallery: [],
    insuranceStatus: InsuranceStatus.SECURED,
    insuranceCompany: 'Allianz Art',
    policyNumber: 'ALZ-1122-R',
    insuranceExpiry: '2025-11-20',
    technicalReportUrl: '#',
    description: 'Escultura suspensa que desafia a bidimensionalidade da pintura tradicional.',
    isCatalogOnly: true
  },
  {
    id: 'cat-3',
    title: 'Pintura Concretista',
    artist: 'Willys de Castro',
    year: '1959',
    totalValue: 950000,
    fractionPrice: 95,
    totalFractions: 10000,
    availableFractions: 0,
    imageUrl: 'https://picsum.photos/seed/willys/600/800',
    gallery: [],
    insuranceStatus: InsuranceStatus.SECURED,
    insuranceCompany: 'AXA Art',
    policyNumber: 'AXA-9900-W',
    insuranceExpiry: '2025-08-15',
    technicalReportUrl: '#',
    description: 'Obra rigorosa que foca na unidade entre forma, cor e suporte.',
    isCatalogOnly: true
  }
];
    