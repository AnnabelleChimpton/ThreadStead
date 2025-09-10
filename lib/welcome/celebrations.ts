export interface CelebrationOptions {
  message: string;
  emoji?: string;
  duration?: number;
}

// Store for celebration callbacks - will be set by components that use celebrations
let showSuccessToast: ((message: string) => void) | null = null;

export function setCelebrationToastHandler(handler: (message: string) => void) {
  showSuccessToast = handler;
}

// Gentle celebration messages
const CELEBRATION_MESSAGES = {
  joinedRing: "Welcome to the Welcome Ring! Let's get started! 🎉",
  firstPost: "Nice! You've joined the conversation! 💬",
  firstComment: "Great comment! You're helping build the community! 💬",
  visitedProfile: "Profile explored! You're discovering what makes Threadstead special! ✨",
  browseRings: "Ring explorer activated! So many communities to discover! 🧵",
  completedWelcome: "You're a ThreadRings pro now! Time to explore more Rings! 🎓",
  default: "Nice work! Keep exploring! 🌟"
};

export function celebrateAction(action: keyof typeof CELEBRATION_MESSAGES | 'default'): void {
  const message = CELEBRATION_MESSAGES[action] || CELEBRATION_MESSAGES.default;
  
  // Show encouraging toast if handler is available
  if (showSuccessToast) {
    showSuccessToast(message);
  } else {
    // Wait a bit and try again in case the handler isn't set up yet
    setTimeout(() => {
      if (showSuccessToast) {
        showSuccessToast(message);
      } else {
        // Fallback to console if no toast handler is set after waiting
        console.log('🎉 ' + message);
      }
    }, 100);
  }

  // Trigger gentle confetti only for major milestones
  if (action === 'completedWelcome') {
    triggerGentleConfetti();
  }
}

export function triggerGentleConfetti(): void {
  // Only run on client side
  if (typeof window === 'undefined') return;

  // Create confetti elements
  const colors = ['#fbbf24', '#f59e0b', '#d97706', '#92400e']; // warm, friendly colors
  const confettiCount = 30; // gentle amount

  for (let i = 0; i < confettiCount; i++) {
    setTimeout(() => {
      createConfettiParticle(colors[Math.floor(Math.random() * colors.length)]);
    }, i * 50); // stagger creation
  }
}

function createConfettiParticle(color: string): void {
  const particle = document.createElement('div');
  
  // Random starting position at top of viewport
  const startX = Math.random() * window.innerWidth;
  const startY = -20;
  
  particle.style.cssText = `
    position: fixed;
    left: ${startX}px;
    top: ${startY}px;
    width: 10px;
    height: 10px;
    background: ${color};
    border: 1px solid #000;
    pointer-events: none;
    z-index: 9999;
    transform: rotate(${Math.random() * 360}deg);
  `;

  document.body.appendChild(particle);

  // Animate falling
  let y = startY;
  let x = startX;
  let rotation = Math.random() * 360;
  const xVelocity = (Math.random() - 0.5) * 2;
  const yVelocity = Math.random() * 3 + 2;
  const rotationVelocity = (Math.random() - 0.5) * 10;

  const animate = () => {
    y += yVelocity;
    x += xVelocity;
    rotation += rotationVelocity;

    particle.style.top = `${y}px`;
    particle.style.left = `${x}px`;
    particle.style.transform = `rotate(${rotation}deg)`;

    if (y < window.innerHeight) {
      requestAnimationFrame(animate);
    } else {
      particle.remove();
    }
  };

  requestAnimationFrame(animate);
}

// Encouraging messages for different contexts
export function getEncouragingMessage(context: 'empty' | 'locked' | 'progress'): string {
  const messages = {
    empty: "Your Ring neighborhood is empty! Let's fix that 🏠",
    locked: "Join a few Rings first, then you can start your own! 🌱",
    progress: "You're doing great! Keep exploring! ⭐"
  };
  
  return messages[context];
}