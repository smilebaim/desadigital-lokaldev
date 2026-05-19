
export type Province = {
  id: string;
  name: string;
  island: string;
  capital: string;
  description: string;
  population: string;
  area: string;
  highlights: string[];
};

export const PROVINCES: Province[] = [
  {
    id: 'aceh',
    name: 'Aceh',
    island: 'Sumatra',
    capital: 'Banda Aceh',
    description: 'Known as the "Porch of Mecca," Aceh has a deep Islamic history and stunning coastal landscapes.',
    population: '5.4 Million',
    area: '57,956 km²',
    highlights: ['Baiturrahman Grand Mosque', 'Sabang Island', 'Gunung Leuser National Park']
  },
  {
    id: 'bali',
    name: 'Bali',
    island: 'Bali & Nusa Tenggara',
    capital: 'Denpasar',
    description: 'The world-famous Island of the Gods, known for its iconic temples, rice terraces, and vibrant culture.',
    population: '4.4 Million',
    area: '5,780 km²',
    highlights: ['Uluwatu Temple', 'Ubud Monkey Forest', 'Mount Agung']
  },
  {
    id: 'dki-jakarta',
    name: 'DKI Jakarta',
    island: 'Java',
    capital: 'Jakarta',
    description: 'The bustling capital of Indonesia, a melting pot of cultures and the economic heart of the nation.',
    population: '10.6 Million',
    area: '661 km²',
    highlights: ['National Monument (Monas)', 'Old Town (Kota Tua)', 'Istiqlal Mosque']
  },
  {
    id: 'jawa-barat',
    name: 'Jawa Barat',
    island: 'Java',
    capital: 'Bandung',
    description: 'A province of highland beauty and the cradle of Sundanese culture.',
    population: '49.9 Million',
    area: '35,378 km²',
    highlights: ['Tangkuban Perahu', 'Kawah Putih', 'Gedung Sate']
  },
  {
    id: 'jawa-tengah',
    name: 'Jawa Tengah',
    island: 'Java',
    capital: 'Semarang',
    description: 'The historical heart of Java, home to ancient empires and grand monuments.',
    population: '37 Million',
    area: '32,800 km²',
    highlights: ['Borobudur Temple', 'Prambanan Temple', 'Dieng Plateau']
  },
  {
    id: 'papua-barat',
    name: 'Papua Barat',
    island: 'Papua',
    capital: 'Manokwari',
    description: 'Home to the most biodiverse marine environments on Earth.',
    population: '1.1 Million',
    area: '102,955 km²',
    highlights: ['Raja Ampat', 'Arfak Mountains', 'Cendrawasih Bay']
  },
  {
    id: 'sulawesi-selatan',
    name: 'Sulawesi Selatan',
    island: 'Sulawesi',
    capital: 'Makassar',
    description: 'A land of legendary seafarers and the unique Toraja highlands.',
    population: '9.1 Million',
    area: '46,717 km²',
    highlights: ['Tana Toraja', 'Losari Beach', 'Ramang-Ramang']
  }
  // Simplified list for the demonstration, can be expanded to all 38.
];

export const ISLAND_GROUPS = [
  { name: 'Sumatra', color: '#2F61FF' },
  { name: 'Java', color: '#00D1FF' },
  { name: 'Kalimantan', color: '#10B981' },
  { name: 'Sulawesi', color: '#F59E0B' },
  { name: 'Bali & Nusa Tenggara', color: '#EC4899' },
  { name: 'Maluku', color: '#8B5CF6' },
  { name: 'Papua', color: '#F43F5E' }
];
