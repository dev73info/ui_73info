/**
 * 测试环境的 jsdom 缺口补丁
 *
 * jsdom 不是浏览器：它没有布局引擎，也没有指针事件的完整实现。组件里有两处
 * 依赖浏览器 API 的地方，在测试里必须补上，否则测的就不是组件逻辑而是 jsdom 的缺口：
 *
 * 1. `Element.prototype.scrollIntoView` —— 列表导航（`useListbox`）在移动高亮项时
 *    调用它做「高亮跟随滚动」。jsdom 里这个方法**根本不存在**（不是空实现），
 *    调用会抛 `TypeError`，于是 `TSelect` / `TDropdown` 的键盘用例全部炸掉。
 * 2. `Element.prototype.setPointerCapture` —— 表格列宽拖拽（`TTable`）与自绘滚动条
 *    拖动（`TScrollbar`）会调用它。jsdom 里同样不存在。
 *
 * 两处都补成空实现：测试关心的是「事件来了之后状态与 emit 对不对」，
 * 滚动位置与指针捕获只影响视觉，没有可断言的语义。
 */

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.hasPointerCapture = () => false
}
