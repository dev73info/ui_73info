import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    // jsdom 没有布局与指针捕获，组件里依赖它们的两处要补桩，见 test-setup.ts
    setupFiles: ['./src/test-setup.ts'],
    restoreMocks: true,
  },
})
