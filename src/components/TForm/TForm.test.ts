import { describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import type { Rules } from './validate'
import { TForm, TFormItem } from './index'
import { TInput } from '../TInput'

type FormModel = Record<string, unknown>

function mountForm(model: FormModel, rules?: Record<string, Rules>, help?: string) {
  return mount(TForm, {
    props: { model, rules },
    slots: {
      default: () => [
        h(
          TFormItem,
          { prop: 'name', label: '姓名', help },
          {
            // 表单项把分配好的 id 交给控件，`<label for>` 才连得上
            default: ({ id }: { id: string }) => h(TInput, { id, placeholder: '请输入姓名' }),
          },
        ),
        h('button', { class: 'submit', type: 'submit' }, '提交'),
      ],
    },
  })
}

const REQUIRED: Record<string, Rules> = { name: [{ required: true, message: '请填写姓名' }] }

describe('TForm / TFormItem', () => {
  it('必填为空时提交发出 invalid 并显示错误文案', async () => {
    const model: FormModel = { name: '' }
    const wrapper = mountForm(model, REQUIRED)

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('invalid')).toHaveLength(1)
    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('.t73-form-item__message').text()).toBe('请填写姓名')
    expect(wrapper.find('.t73-form-item').classes()).toContain('t73-form-item--error')
    expect(wrapper.find('input').attributes('aria-invalid')).toBe('true')
  })

  it('填上值再提交发出 submit，错误态收起', async () => {
    const model: FormModel = { name: '' }
    const wrapper = mountForm(model, REQUIRED)

    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.emitted('invalid')).toHaveLength(1)

    model.name = '张三'
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('submit')).toHaveLength(1)
    expect(wrapper.find('.t73-form-item__message').exists()).toBe(false)
    expect(wrapper.find('.t73-form-item').classes()).not.toContain('t73-form-item--error')
  })

  it('实例方法 validate() 失败 resolve false（不 reject），clearValidate 清掉错误', async () => {
    const wrapper = mountForm({ name: '' }, REQUIRED)
    const form = wrapper.vm as unknown as {
      validate: () => Promise<boolean>
      clearValidate: () => void
    }

    await expect(form.validate()).resolves.toBe(false)
    await nextTick()
    expect(wrapper.find('.t73-form-item__message').exists()).toBe(true)

    form.clearValidate()
    await nextTick()
    expect(wrapper.find('.t73-form-item__message').exists()).toBe(false)
  })

  it('输入框失焦即校验（规则 trigger 为 blur 时）', async () => {
    const wrapper = mountForm({ name: '' }, {
      name: [{ required: true, message: '请填写姓名', trigger: 'blur' }],
    })

    await wrapper.find('input').trigger('blur')
    await flushPromises()

    expect(wrapper.find('.t73-form-item__message').text()).toBe('请填写姓名')
  })

  it('resetFields 把模型恢复到初始值并清掉错误', async () => {
    const model: FormModel = { name: '张三' }
    const wrapper = mountForm(model, REQUIRED)
    const form = wrapper.vm as unknown as {
      resetFields: () => void
      validate: () => Promise<boolean>
    }

    model.name = '李四'
    await form.validate()
    form.resetFields()
    await nextTick()

    expect(model.name).toBe('张三')
    expect(wrapper.find('.t73-form-item__message').exists()).toBe(false)
  })

  it('label 与控件 id 配对，必填带星号，help 作为说明文字', () => {
    const wrapper = mountForm({ name: '' }, REQUIRED, '与证件上的姓名一致')

    const label = wrapper.find('.t73-form-item__label')
    expect(label.attributes('for')).toBe(wrapper.find('input').attributes('id'))
    expect(wrapper.find('.t73-form-item__asterisk').exists()).toBe(true)
    expect(wrapper.find('.t73-form-item__help').text()).toBe('与证件上的姓名一致')
  })

  it('TFormItem 放在 TForm 外面直接报错', () => {
    expect(() => mount(TFormItem, { props: { prop: 'name' } })).toThrow(/必须放在 TForm 内使用/)
  })

  it('labelPosition=left 时把标签宽度配到表单根上', () => {
    const wrapper = mount(TForm, {
      props: { labelPosition: 'left', labelWidth: 96 },
      slots: { default: () => h('div', '内容') },
    })

    expect(wrapper.classes()).toContain('t73-form--label-left')
    expect(wrapper.attributes('style') ?? '').toContain('--t73-form-label-width: 96px')
  })
})
