/// <reference types="vite/client" />

// 让 TS 认识 .vue 单文件组件的默认导出。
// 注意：这是**兜底**声明，只在模块解析失败时才用得上——`.vue` 文件本身由 vue-tsc
// 解析成真实类型（含 props 类型检查）。正常路径下不走这里。
declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
