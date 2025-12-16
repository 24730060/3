
export enum CharacterStage {
  SEED = '새싹',
  SPROUT = '새싹', // Assuming reference maps SEED to '새싹' visually or logic
  FLOWER = '꽃',
  FRUIT = '열매',
  TREE = '나무'
}

export interface User {
  name: string;
  points: number; // Current spendable points
  lifetimePoints: number; // Total accumulated points for leveling
  totalMissionsCompleted: number;
  stage: string;
  inventory: string[]; // List of purchased item IDs
}

export interface Mission {
  id: string | number;
  title: string;
  description: string;
  estimatedTimeSeconds: number; // Duration
  points: number;
  type: 'indoor' | 'outdoor' | 'recycling' | 'saving' | 'habit';
  iconName?: string;
  isCompleted?: boolean;
}

export interface MissionLog {
  id: string;
  missionId: string | number;
  title: string;
  points: number;
  completedAt: string; // ISO Date string
  day?: string; // For weekly log display
  type?: string; // Type for statistics (indoor, outdoor, etc.)
}

export interface WeatherData {
  temp: number;
  condition: string; // Description like '맑음'
  main: string; // 'Sunny', 'Rain' etc. for icons
}

export interface LocationInfo {
  latitude: number;
  longitude: number;
  address: string;
}

export interface SavedPlace {
  id: number;
  name: string;
  type: 'indoor' | 'outdoor';
  address: string;
  lat: number;
  lon: number;
}

export enum Tab {
  HOME = 'home',
  FOREST = 'forest',
  RANK = 'rank',
  INFO = 'info'
}

export enum MissionState {
  IDLE = 'idle',
  VIEWING = 'viewing',
  IN_PROGRESS = 'in_progress',
  COMPLETED_ANIMATION = 'completed_animation'
}
