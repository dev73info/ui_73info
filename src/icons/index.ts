import { createIcon } from './createIcon'

/**
 * 图标。
 *
 * 每个图标是一个渲染单条 `<svg>` 的组件，用法有两种：
 *
 * ```vue
 * <!-- ① 配 TIcon：尺寸跟随字号、能转圈、颜色取文字色 -->
 * <TIcon><Plus /></TIcon>
 * <TIcon :icon="Refresh" spin />
 *
 * <!-- ② 直接当组件用（尺寸与颜色同样跟随父元素） -->
 * <Plus />
 * ```
 *
 * 名字与 Element Plus Icons 一致，所以从 `@element-plus/icons-vue` 迁过来
 * 只需要换 import 的来源，模板一个字都不用改。
 *
 * 这些图标**不进 `src/index.ts` 的全局注册映射**：那是给「需要遍历注册」的场合用的，
 * 而图标是 59 个一把一大串，塞进去只会让映射表变成噪音。按需具名导入即可。
 */
export { createIcon } from './createIcon'
export type { IconName } from './paths'
export { iconPaths } from './paths'

export const Aim = createIcon('Aim')
export const ArrowDown = createIcon('ArrowDown')
export const ArrowLeft = createIcon('ArrowLeft')
export const ArrowRight = createIcon('ArrowRight')
export const ArrowUp = createIcon('ArrowUp')
export const Back = createIcon('Back')
export const Bell = createIcon('Bell')
export const Box = createIcon('Box')
export const Brush = createIcon('Brush')
export const ChatDotRound = createIcon('ChatDotRound')
export const Check = createIcon('Check')
export const CircleCheck = createIcon('CircleCheck')
export const Clock = createIcon('Clock')
export const Close = createIcon('Close')
export const CollectionTag = createIcon('CollectionTag')
export const Compass = createIcon('Compass')
export const Connection = createIcon('Connection')
export const CreditCard = createIcon('CreditCard')
export const DataAnalysis = createIcon('DataAnalysis')
export const Document = createIcon('Document')
export const EditPen = createIcon('EditPen')
export const Files = createIcon('Files')
export const Finished = createIcon('Finished')
export const Grid = createIcon('Grid')
export const Iphone = createIcon('Iphone')
export const Key = createIcon('Key')
export const Link = createIcon('Link')
export const Lock = createIcon('Lock')
export const MagicStick = createIcon('MagicStick')
export const Menu = createIcon('Menu')
export const Message = createIcon('Message')
export const Money = createIcon('Money')
export const Monitor = createIcon('Monitor')
export const OfficeBuilding = createIcon('OfficeBuilding')
export const Paperclip = createIcon('Paperclip')
export const Picture = createIcon('Picture')
export const Plus = createIcon('Plus')
export const Position = createIcon('Position')
export const Postcard = createIcon('Postcard')
export const Promotion = createIcon('Promotion')
export const Refresh = createIcon('Refresh')
export const RefreshLeft = createIcon('RefreshLeft')
export const RefreshRight = createIcon('RefreshRight')
export const Search = createIcon('Search')
export const Service = createIcon('Service')
export const Share = createIcon('Share')
export const Star = createIcon('Star')
export const Suitcase = createIcon('Suitcase')
export const Switch = createIcon('Switch')
export const SwitchButton = createIcon('SwitchButton')
export const Tickets = createIcon('Tickets')
export const Top = createIcon('Top')
export const UploadFilled = createIcon('UploadFilled')
export const User = createIcon('User')
export const UserFilled = createIcon('UserFilled')
export const View = createIcon('View')
export const Wallet = createIcon('Wallet')
export const Warning = createIcon('Warning')
export const WarningFilled = createIcon('WarningFilled')
