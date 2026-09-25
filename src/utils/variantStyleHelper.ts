import { DishVariantImageStyle } from '../types';

export const DEFAULT_VARIANT_IMAGE_STYLE: DishVariantImageStyle = {
  aspectRatio: '1:1',
  borderStyle: 'subtle',
  fitMode: 'cover',
  badgeText: '',
  badgeColor: 'purple',
  filter: 'normal'
};

export function getVariantAspectClass(ratio?: DishVariantImageStyle['aspectRatio']): string {
  switch (ratio) {
    case '4:3':
      return 'aspect-[4/3]';
    case '16:9':
      return 'aspect-[16/9]';
    case 'round':
      return 'aspect-square rounded-full';
    case '1:1':
    default:
      return 'aspect-square';
  }
}

export function getVariantBorderClass(border?: DishVariantImageStyle['borderStyle']): string {
  switch (border) {
    case 'none':
      return 'border border-transparent';
    case 'purple':
      return 'border-2 border-purple-500 ring-2 ring-purple-200/70 shadow-xs';
    case 'amber':
      return 'border-2 border-amber-500 ring-2 ring-amber-200/70 shadow-xs';
    case 'emerald':
      return 'border-2 border-emerald-500 ring-2 ring-emerald-200/70 shadow-xs';
    case 'dashed':
      return 'border-2 border-dashed border-purple-400';
    case 'subtle':
    default:
      return 'border border-[#d3d1cb]';
  }
}

export function getVariantFilterClass(filter?: DishVariantImageStyle['filter']): string {
  switch (filter) {
    case 'warm':
      return 'sepia-[0.16] contrast-[1.08] brightness-[1.04]';
    case 'crisp':
      return 'contrast-[1.18] saturate-[1.18]';
    case 'lowkey':
      return 'brightness-[0.92] contrast-[1.22]';
    case 'normal':
    default:
      return '';
  }
}

export function getVariantFitClass(fit?: DishVariantImageStyle['fitMode']): string {
  switch (fit) {
    case 'contain':
      return 'object-contain bg-neutral-900/5';
    case 'cover':
    default:
      return 'object-cover';
  }
}

export function getVariantBadgeClasses(color?: DishVariantImageStyle['badgeColor']): {
  bg: string;
  text: string;
  border: string;
} {
  switch (color) {
    case 'amber':
      return {
        bg: 'bg-amber-600',
        text: 'text-white',
        border: 'border-amber-400'
      };
    case 'emerald':
      return {
        bg: 'bg-emerald-600',
        text: 'text-white',
        border: 'border-emerald-400'
      };
    case 'red':
      return {
        bg: 'bg-rose-600',
        text: 'text-white',
        border: 'border-rose-300'
      };
    case 'neutral':
      return {
        bg: 'bg-neutral-800',
        text: 'text-white',
        border: 'border-neutral-600'
      };
    case 'purple':
    default:
      return {
        bg: 'bg-purple-600',
        text: 'text-white',
        border: 'border-purple-400'
      };
  }
}
