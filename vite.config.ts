import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * ## Copyright and Ownership
 * © 2026 Otemade Balogun Adedamola. All rights reserved.
 * Role Architect is owned, designed, and built by Otemade Balogun Adedamola. The platform, including its source code, features, design, content, branding, and related intellectual property, may not be copied, reproduced, modified, distributed, or commercially used without prior written permission.
 * Contact: info@elitejobs.africa | elitejobcvs@gmail.com
 */

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        '__BUILD_OWNERSHIP_SIGNATURE__': JSON.stringify({
          author: "Otemade Balogun Adedamola",
          year: "2026",
          rights: "All rights reserved",
          contact: ["info@elitejobs.africa", "elitejobcvs@gmail.com"]
        })
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
