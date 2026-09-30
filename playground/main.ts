import { createApp } from 'vue'
import '../src/styles/index.css'
import App from './App.vue'

// 注意这里引的是**相对路径**而不是 `ui_73info/styles.css`：
// playground 与库在同一个包里，走 exports 映射会绕一圈自我引用，
// 没有意义。宿主（user-client）那边才用包名 + 子路径。
createApp(App).mount('#app')
