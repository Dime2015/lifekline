import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  // Prioritize API_KEY, but fallback to VITE_API_KEY if the user followed standard Vite naming conventions
  const apiKey = env.API_KEY || env.VITE_API_KEY;

  return {
    // -------------------------------------------------------------------
    // ★★★ 核心修改点：添加 base 路径 ★★★
    // 如果你的 GitHub 仓库名不是 lifekline，请将下面的 /lifekline/ 改为 /你的仓库名/
    base: '/lifekline/',
    // -------------------------------------------------------------------

    plugins: [react()],

    // 确保环境变量能注入到应用中
    define: {
      'process.env': env
    }
  };
});
