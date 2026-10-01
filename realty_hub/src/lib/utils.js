import { clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Escala tipográfica propia (src/index.css): sin esto tailwind-merge trata `text-body` como color
// y lo elimina al combinarlo con `text-evergreen`.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['meta', 'small', 'body', 'subtitle', 'section', 'page', 'hero'] }],
    },
  },
})

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
