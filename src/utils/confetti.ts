import confetti from 'canvas-confetti';

/**
 * Trigger celebratory burst when child finishes a reading paragraph
 */
export function triggerParagraphSuccessConfetti() {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    colors: ['#4F46E5', '#10B981', '#F59E0B'],
  });
  fire(0.2, {
    spread: 60,
    colors: ['#F59E0B', '#FBBF24', '#34D399'],
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
    colors: ['#6366F1', '#06B6D4', '#EC4899'],
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
    colors: ['#FCD34D', '#F43F5E', '#10B981'],
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
    colors: ['#818CF8', '#38BDF8'],
  });
}

export const triggerSuccessConfetti = triggerParagraphSuccessConfetti;

/**
 * Trigger huge double-cannon fireworks when daily session goal or challenge is completed
 */
export function triggerDailySessionCompleteConfetti() {
  const duration = 2500;
  const end = Date.now() + duration;

  const colors = ['#F59E0B', '#10B981', '#6366F1', '#EC4899', '#06B6D4'];

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
      zIndex: 9999,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
      zIndex: 9999,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

/**
 * Trigger star shower for tongue twister or sound drill completion
 */
export function triggerDrillMasteryConfetti() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#F59E0B', '#10B981', '#4F46E5', '#EC4899'],
    shapes: ['star', 'circle'],
    zIndex: 9999,
  });
}
