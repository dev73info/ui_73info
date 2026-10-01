/**
 * 组件层出口。
 *
 * 一条约定：**组件文件与它的 `types.ts` / `context.ts` / `index.ts` 同名同目录**，
 * 这里按目录名的字母序再导出一次，新增组件时照抄格式即可。
 *
 * `TMessage` / `TMessageBox` 是命令式 API（函数，不是组件），也在这里导出，
 * 但它们**不登记进 `src/index.ts` 的 `components` 映射**——没有模板形态。
 */
export * from './TAlert'
export * from './TButton'
export * from './TCard'
export * from './TCheckbox'
export * from './TDatePicker'
export * from './TDescriptions'
export * from './TDialog'
export * from './TDropdown'
export * from './TEmpty'
export * from './TForm'
export * from './TIcon'
export * from './TInput'
export * from './TInputNumber'
export * from './TLoading'
export * from './TMessage'
export * from './TPagination'
export * from './TPopover'
export * from './TRadio'
export * from './TScrollbar'
export * from './TSelect'
export * from './TSwitch'
export * from './TTable'
export * from './TTag'
export * from './TTooltip'
