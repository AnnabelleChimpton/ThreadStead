import { WelcomeProgress } from './types';

const WELCOME_PROGRESS_KEY = 'threadstead_welcome_progress';

export function getWelcomeProgress(): WelcomeProgress {
  if (typeof window === 'undefined') {
    return getDefaultProgress();
  }

  const stored = localStorage.getItem(WELCOME_PROGRESS_KEY);
  if (!stored) {
    return getDefaultProgress();
  }

  try {
    const parsed = JSON.parse(stored);
    // Merge with default progress to ensure all fields are present
    return { ...getDefaultProgress(), ...parsed } as WelcomeProgress;
  } catch {
    return getDefaultProgress();
  }
}

export function saveWelcomeProgress(progress: WelcomeProgress): WelcomeProgress {
  if (typeof window === 'undefined') return progress;
  
  // Check if all steps are complete
  const allStepsComplete = 
    progress.joinedRing &&
    progress.readFirstPost &&
    progress.leftFirstComment &&
    progress.visitedProfile &&
    progress.browseRings;

  // Mark as completed if all steps are done
  if (allStepsComplete && !progress.completedWelcome) {
    progress.completedWelcome = true;
    progress.completedAt = new Date().toISOString();
  }

  localStorage.setItem(WELCOME_PROGRESS_KEY, JSON.stringify(progress));
  return progress;
}

export function updateWelcomeProgress(
  updates: Partial<WelcomeProgress>
): WelcomeProgress {
  const current = getWelcomeProgress();
  
  // Set startedAt if this is the first action
  if (!current.startedAt && Object.values(updates).some(v => v === true)) {
    updates.startedAt = new Date().toISOString();
  }
  
  const updated = { ...current, ...updates };
  const saved = saveWelcomeProgress(updated);
  
  // Dispatch event to notify components of the update
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('welcomeProgressUpdate', { 
      detail: saved 
    }));
  }
  
  return saved;
}

export function resetWelcomeProgress(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(WELCOME_PROGRESS_KEY);
}

export function clearWelcomeProgress(): void {
  resetWelcomeProgress();
}

export function getDefaultProgress(): WelcomeProgress {
  return {
    joinedRing: false,
    readFirstPost: false,
    leftFirstComment: false,
    visitedProfile: false,
    browseRings: false,
    completedWelcome: false,
  };
}

export function isWelcomeGraduate(): boolean {
  const progress = getWelcomeProgress();
  return progress.completedWelcome === true;
}