import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

/**
 * 本库**没有构建步骤**（发源码，宿主的 Vite 直接编译），这个配置只服务 playground：
 * 用来看组件长什么样、切换主题比对两套视觉体系。
 *
 * playground 位于本目录下，但它要 import 上一层 `../src` 里的源码，
 * 所以 `server.fs.allow` 要放开到仓库根——这一点和 user-client 里
 * 已有的 `fs: { allow: ['..'] }` 是同一个理由。
 */
export default defineConfig({
  root: fileURLToPath(new URL('./playground', import.meta.url)),
  plugins: [vue()],
  server: {
    /**
     * 5173 / 5174 / 5176 分别被 user-client / admin_client / support_client 占用，
     * 5175 是「user-client 第二实例（开发者身份）」的约定端口（见
     * `.cursor/rules/dev-servers.mdc` 第二节），5177 实测被别的进程常年占着。
     * 所以 playground 用 **5180**。
     *
     * `strictPort: true` 是刻意的：端口被占时直接报错，而不是悄悄换一个——
     * 悄悄换端口会让人对着文档里的地址拿到另一个页面（实测踩过一次）。
     */
    port: 5180,
    strictPort: true,
    fs: {
      allow: ['..'],
    },
  },
})
