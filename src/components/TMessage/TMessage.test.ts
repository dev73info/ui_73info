import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { TMessage, TMessageBox, destroyMessageHosts } from './index'

/**
 * 这两个是**命令式 API**，不是模板组件：调用后自己建容器、挂一个独立应用，
 * 所以断言只能从 `document.body` 上做。
 */
function messageEls(): HTMLElement[] {
  // 只数当前容器里的：离场动画期间旧节点还会在 body 上停一帧
  return Array.from(document.body.querySelectorAll<HTMLElement>('.t73-message-host .t73-message'))
}

/** 确认框取最后挂上的那个：前一个的离场节点可能还没被摘掉 */
function dialogButton(text: string): HTMLButtonElement {
  const dialogs = document.body.querySelectorAll('.t73-dialog')
  const dialog = dialogs[dialogs.length - 1]
  if (!dialog) throw new Error('确认框还没渲染出来')
  const button = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button')).find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  if (!button) throw new Error(`确认框里没有「${text}」按钮`)
  return button
}

/** 等离场动画走完：删除是 `Transition` / `TransitionGroup` 驱动的，节点要下一帧才摘掉 */
async function settle(): Promise<void> {
  await flushPromises()
  await new Promise((resolve) => setTimeout(resolve, 50))
  await nextTick()
}

afterEach(() => {
  // 进程内单例：不拆掉会串到下一条用例
  destroyMessageHosts()
})

describe('TMessage', () => {
  it('弹出一条提示：文案、语气类名与角色都按 type 走', async () => {
    TMessage.success('已保存')
    await nextTick()

    const [message] = messageEls()
    expect(message?.textContent).toContain('已保存')
    expect(message?.classList.contains('t73-message--tone-success')).toBe(true)
    // 成功与信息不打断读屏用 status，警示与错误才用 alert
    expect(message?.getAttribute('role')).toBe('status')
  })

  it('error 映射成 danger 语气，并用 alert 抢播', async () => {
    TMessage.error('支付失败')
    await nextTick()

    const [message] = messageEls()
    expect(message?.classList.contains('t73-message--tone-danger')).toBe(true)
    expect(message?.getAttribute('role')).toBe('alert')
  })

  it('点关闭按钮移除这一条；handle.close() 与 onClose 回调也生效', async () => {
    TMessage.info('第一条')
    TMessage.info('第二条')
    await nextTick()
    expect(messageEls()).toHaveLength(2)

    ;(document.body.querySelector('.t73-message__close') as HTMLElement).click()
    await settle()
    expect(messageEls()).toHaveLength(1)

    let closed = false
    const handle = TMessage.warning({ message: '第三条', onClose: () => (closed = true) })
    await nextTick()
    handle.close()
    await settle()

    expect(closed).toBe(true)
    expect(messageEls().some((el) => el.textContent?.includes('第三条'))).toBe(false)
  })

  it('group 把同名同类型的两条合成一条', async () => {
    TMessage.error({ message: '网络异常', group: true })
    TMessage.error({ message: '网络异常', group: true })
    await nextTick()

    expect(messageEls()).toHaveLength(1)
  })

  it('closeAll 清空所有提示', async () => {
    TMessage.success('a')
    TMessage.success('b')
    await nextTick()
    expect(messageEls()).toHaveLength(2)

    TMessage.closeAll()
    await settle()
    expect(messageEls()).toHaveLength(0)
  })
})

describe('TMessageBox', () => {
  it('点确定 resolve true，点取消 resolve false', async () => {
    const confirmed = TMessageBox.confirm({ content: '确定删除这条需求吗？', tone: 'danger' })
    await flushPromises()
    await nextTick()

    expect(document.body.querySelector('.t73-dialog')?.textContent).toContain('确定删除这条需求吗？')
    dialogButton('确定').click()
    await expect(confirmed).resolves.toBe(true)

    const cancelled = TMessageBox.confirm('确定取消合作吗？')
    await flushPromises()
    await nextTick()
    dialogButton('取消').click()
    await expect(cancelled).resolves.toBe(false)
  })

  it('alert 不显示取消按钮，关掉后 resolve', async () => {
    const answered = TMessageBox.alert({ title: '已提交', content: '审核结果会通过站内信通知' })
    await flushPromises()
    await nextTick()

    expect(() => dialogButton('取消')).toThrow()
    dialogButton('确定').click()
    await expect(answered).resolves.toBeUndefined()
  })

  it('自定义按钮文案生效', async () => {
    const answered = TMessageBox.confirm({
      content: '继续？',
      confirmText: '继续充值',
      cancelText: '再想想',
    })
    await flushPromises()
    await nextTick()

    dialogButton('继续充值').click()
    await expect(answered).resolves.toBe(true)
  })
})
