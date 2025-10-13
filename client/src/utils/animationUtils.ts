import anime from 'animejs';

// Check if user prefers reduced motion
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Wrapper for anime.js that respects accessibility
export function accessibleAnime(params: anime.AnimeParams): anime.AnimeInstance | null {
  if (prefersReducedMotion()) {
    // Skip animation, apply final state immediately
    const target = params.targets;
    if (target && typeof params === 'object') {
      const elements = typeof target === 'string'
        ? document.querySelectorAll(target)
        : Array.isArray(target) ? target : [target];

      elements.forEach((element: any) => {
        if (element && element.style) {
          // Apply final states
          if (params.opacity !== undefined) {
            const finalOpacity = Array.isArray(params.opacity)
              ? params.opacity[params.opacity.length - 1]
              : params.opacity;
            element.style.opacity = String(finalOpacity);
          }
          if (params.translateX !== undefined) {
            const finalX = Array.isArray(params.translateX)
              ? params.translateX[params.translateX.length - 1]
              : params.translateX;
            element.style.transform = `translateX(${finalX}px)`;
          }
          if (params.translateY !== undefined) {
            const finalY = Array.isArray(params.translateY)
              ? params.translateY[params.translateY.length - 1]
              : params.translateY;
            element.style.transform = `translateY(${finalY}px)`;
          }
          if (params.scale !== undefined) {
            const finalScale = Array.isArray(params.scale)
              ? params.scale[params.scale.length - 1]
              : params.scale;
            element.style.transform = `scale(${finalScale})`;
          }
        }
      });
    }
    return null;
  }
  return anime(params);
}

// Common animation presets
export const animationPresets = {
  fadeIn: (target: string | HTMLElement, delay: number = 0) => {
    return accessibleAnime({
      targets: target,
      opacity: [0, 1],
      duration: 400,
      delay,
      easing: 'easeOutQuad'
    });
  },

  fadeOut: (target: string | HTMLElement, onComplete?: () => void) => {
    return accessibleAnime({
      targets: target,
      opacity: [1, 0],
      duration: 300,
      easing: 'easeInQuad',
      complete: onComplete
    });
  },

  slideInLeft: (target: string | HTMLElement, delay: number = 0) => {
    return accessibleAnime({
      targets: target,
      translateX: [-50, 0],
      opacity: [0, 1],
      duration: 400,
      delay,
      easing: 'easeOutQuad'
    });
  },

  slideInRight: (target: string | HTMLElement, delay: number = 0) => {
    return accessibleAnime({
      targets: target,
      translateX: [50, 0],
      opacity: [0, 1],
      duration: 400,
      delay,
      easing: 'easeOutQuad'
    });
  },

  slideInUp: (target: string | HTMLElement, delay: number = 0) => {
    return accessibleAnime({
      targets: target,
      translateY: [30, 0],
      opacity: [0, 1],
      duration: 400,
      delay,
      easing: 'easeOutQuad'
    });
  },

  pulse: (target: string | HTMLElement) => {
    return accessibleAnime({
      targets: target,
      scale: [1, 1.1, 1],
      duration: 600,
      easing: 'easeInOutQuad'
    });
  },

  shake: (target: string | HTMLElement) => {
    return accessibleAnime({
      targets: target,
      translateX: [0, -10, 10, -10, 10, 0],
      duration: 400,
      easing: 'easeInOutQuad'
    });
  },

  bounce: (target: string | HTMLElement) => {
    return accessibleAnime({
      targets: target,
      translateY: [0, -20, 0],
      duration: 600,
      easing: 'easeOutElastic(1, .5)'
    });
  },

  scaleIn: (target: string | HTMLElement, delay: number = 0) => {
    return accessibleAnime({
      targets: target,
      scale: [0.8, 1],
      opacity: [0, 1],
      duration: 400,
      delay,
      easing: 'easeOutQuad'
    });
  },

  countUp: (element: HTMLElement, targetValue: number, duration: number = 1500) => {
    const obj = { value: 0 };
    return accessibleAnime({
      targets: obj,
      value: targetValue,
      duration,
      round: 1,
      easing: 'easeOutQuad',
      update: () => {
        element.textContent = obj.value.toLocaleString();
      }
    });
  }
};

// Stagger animation helper
export function staggerAnimate(
  selector: string,
  animationType: 'fadeIn' | 'slideInUp' | 'slideInLeft' | 'slideInRight' | 'scaleIn',
  staggerDelay: number = 100
) {
  const elements = document.querySelectorAll(selector);
  elements.forEach((element, index) => {
    const delay = index * staggerDelay;
    switch (animationType) {
      case 'fadeIn':
        animationPresets.fadeIn(element as HTMLElement, delay);
        break;
      case 'slideInUp':
        animationPresets.slideInUp(element as HTMLElement, delay);
        break;
      case 'slideInLeft':
        animationPresets.slideInLeft(element as HTMLElement, delay);
        break;
      case 'slideInRight':
        animationPresets.slideInRight(element as HTMLElement, delay);
        break;
      case 'scaleIn':
        animationPresets.scaleIn(element as HTMLElement, delay);
        break;
    }
  });
}

// Animation state manager
export class AnimationManager {
  private activeAnimations: Map<string, anime.AnimeInstance> = new Map();

  play(key: string, animation: anime.AnimeInstance | null) {
    if (animation) {
      this.stop(key);
      this.activeAnimations.set(key, animation);
    }
  }

  stop(key: string) {
    const animation = this.activeAnimations.get(key);
    if (animation) {
      animation.pause();
      this.activeAnimations.delete(key);
    }
  }

  stopAll() {
    this.activeAnimations.forEach(animation => animation.pause());
    this.activeAnimations.clear();
  }
}

export default {
  accessibleAnime,
  prefersReducedMotion,
  animationPresets,
  staggerAnimate,
  AnimationManager
};
