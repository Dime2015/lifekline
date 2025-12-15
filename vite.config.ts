import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  // Prioritize API_KEY logic (preserving your original code)
  const apiKey = env.API_KEY || env.VITE_API_KEY;

  return {
    // ★★★ Mofified for Local Dev & GitHub Pages ★★★
    // In production (GitHub Pages), use repo name. In dev, use root.
    base: mode === 'production' ? '/lifekline/' : '/',

    plugins: [react()],

    // 建议加上这个，确保环境变量能正确传递给前端
    define: {
      'process.env': env
    }
  };
});
