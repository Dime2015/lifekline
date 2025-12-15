import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  // Prioritize API_KEY logic (preserving your original code)
  const apiKey = env.API_KEY || env.VITE_API_KEY;

  return {
    // ★★★ 修复 1：添加仓库路径 ★★★
    // 只有加上这一行，GitHub Pages 才能找到 CSS 和 JS 文件
    base: '/lifekline/',

    plugins: [react()],
    
    // 建议加上这个，确保环境变量能正确传递给前端
    define: {
      'process.env': env
    }
  };
});
