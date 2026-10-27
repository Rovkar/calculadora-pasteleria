import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // The source icon is already full-bleed: no transparent margin on the normal icons either.
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    // The source icon is already full-bleed, so no extra padding for the maskable one.
    maskable: { sizes: [512], padding: 0, resizeOptions: { background: '#B0245A' } },
    apple: { sizes: [180], padding: 0, resizeOptions: { background: '#B0245A' } },
  },
  images: ['public/icon.svg'],
});
