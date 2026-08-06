import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devApiTarget =
    env.PISTACHIO_DEV_API_TARGET?.trim() ||
    'http://localhost:3001'

  return {
    plugins: [
      tailwindcss(),
      react(),
      babel({ presets: [reactCompilerPreset()] })
    ],
    server: {
      proxy: {
        '/api': {
          target: devApiTarget,
          changeOrigin: true,
        },
      },
    },
    test: {
      // Keep collection anchored to the workspace sources so an extracted
      // patch bundle or a build output directory can never join the run.
      include: [
        'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
        'apps/api/**/*.{test,spec}.{js,jsx,ts,tsx}',
        'packages/**/*.{test,spec}.{js,jsx,ts,tsx}',
      ],
      exclude: ['**/node_modules/**', 'dist/**', 'tests/playwright/**'],
    },
  }
})
