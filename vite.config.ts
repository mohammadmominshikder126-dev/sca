import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

function cleanEnvValue(raw: string | undefined, names: string[]): string {
  let val = (raw || '').trim();
  if (!val) return '';
  for (const name of names) {
    if (val.startsWith(`${name}=`)) {
      val = val.slice(name.length + 1).trim();
      break;
    }
  }
  if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
    val = val.slice(1, -1).trim();
  }
  if (val.startsWith("'") || val.startsWith('"')) val = val.slice(1).trim();
  if (val.endsWith("'") || val.endsWith('"')) val = val.slice(0, -1).trim();
  return val;
}

export default defineConfig(({mode}) => {
  const fileEnv = loadEnv(mode, process.cwd(), '');
  const cleanSupabaseUrl = cleanEnvValue(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || fileEnv.VITE_SUPABASE_URL || fileEnv.SUPABASE_URL,
    ['VITE_SUPABASE_URL', 'SUPABASE_URL']
  );
  const cleanSupabaseAnonKey = cleanEnvValue(
    process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      fileEnv.VITE_SUPABASE_ANON_KEY ||
      fileEnv.SUPABASE_ANON_KEY,
    ['VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY']
  );

  return {
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(cleanSupabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(cleanSupabaseAnonKey),
    },
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(import.meta.dirname, 'dist');
          const srcAssets = path.resolve(import.meta.dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
