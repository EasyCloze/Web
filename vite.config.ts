import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        'name': 'Easy Cloze',
        'short_name': 'Easy Cloze',
        'start_url': '.',
        'display': 'standalone',
        'theme_color': '#b0c4de',
        'background_color': '#b0c4de',
        'icons': [
          {
            'sizes': '192x192',
            'src': 'android-chrome-192x192.png',
            'type': 'image/png'
          },
          {
            'sizes': '512x512',
            'src': 'android-chrome-512x512.png',
            'type': 'image/png'
          }
        ]
      },
    })
  ],
  base: '',
})
