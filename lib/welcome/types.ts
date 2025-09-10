export interface WelcomeProgress {
  joinedRing: boolean;
  readFirstPost: boolean;
  leftFirstComment: boolean;
  visitedProfile: boolean;
  browseRings: boolean;
  completedWelcome: boolean;
  startedAt?: string;
  completedAt?: string;
}

export interface WelcomeStep {
  id: keyof Omit<WelcomeProgress, 'completedWelcome' | 'startedAt' | 'completedAt'>;
  title: string;
  description: string;
  target?: string;
  completed: boolean;
}

export interface CelebrationMessage {
  joinedRing: string;
  firstPost: string;
  firstComment: string;
  visitedProfile: string;
  browseRings: string;
  completedWelcome: string;
}