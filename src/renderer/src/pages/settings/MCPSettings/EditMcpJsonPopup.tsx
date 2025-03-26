import Editor from '@monaco-editor/react'
import { TopView } from '@renderer/components/TopView'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import { setMCPServers } from '@renderer/store/mcp'
import { MCPServer } from '@renderer/types'
import { Modal, Typography } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  resolve: (data: any) => void
}

const PopupContainer: React.FC<Props> = ({ resolve }) => {
  const [open, setOpen] = useState(true)
  const [jsonConfig, setJsonConfig] = useState('')
  const [jsonSaving, setJsonSaving] = useState(false)
  const [jsonError, setJsonError] = useState('')
  const mcpServers = useAppSelector((state) => state.mcp.servers)
  const editorRef = useRef<any>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  const dispatch = useAppDispatch()
  const { t } = useTranslation()

  // 获取主题模式
  const theme = useAppSelector((state) => state.settings.theme)

  const ipcRenderer = window.electron.ipcRenderer

  // 添加键盘事件处理器
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // 按下Escape键关闭弹窗
    if (e.key === 'Escape') {
      onCancel()
    }
    // 按下Ctrl+Enter保存
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      onOk()
    }
  }, [])

  // 添加和移除键盘事件监听器
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  useEffect(() => {
    try {
      const mcpServersObj: Record<string, any> = {}

      mcpServers.forEach((server) => {
        const { name, ...serverData } = server
        mcpServersObj[name] = serverData
      })

      const standardFormat = {
        mcpServers: mcpServersObj
      }

      const formattedJson = JSON.stringify(standardFormat, null, 2)
      setJsonConfig(formattedJson)
      setJsonError('')
    } catch (error) {
      console.error('Failed to format JSON:', error)
      setJsonError(t('settings.mcp.jsonFormatError'))
    }
  }, [mcpServers, t])

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor
    editor.focus()
    editor.onDidFocusEditorText(() => setJsonError(''))
  }

  const onOk = async () => {
    if (jsonSaving) return // 防止重复提交

    setJsonSaving(true)
    try {
      // 直接从编辑器实例获取当前值
      const currentJsonValue = editorRef.current?.getValue() || jsonConfig

      if (!currentJsonValue.trim()) {
        dispatch(setMCPServers([]))
        window.message.success(t('settings.mcp.jsonSaveSuccess'))
        setJsonError('')
        setJsonSaving(false)
        setOpen(false)
        TopView.hide(TopViewKey)
        return
      }

      const parsedConfig = JSON.parse(currentJsonValue)

      if (!parsedConfig.mcpServers || typeof parsedConfig.mcpServers !== 'object') {
        throw new Error(t('settings.mcp.invalidMcpFormat'))
      }

      const serversArray: MCPServer[] = []
      for (const [name, serverConfig] of Object.entries(parsedConfig.mcpServers)) {
        const server: MCPServer = {
          name,
          isActive: false,
          ...(serverConfig as any)
        }
        serversArray.push(server)
      }

      dispatch(setMCPServers(serversArray))
      ipcRenderer.send('mcp:servers-from-renderer', serversArray)

      window.message.success(t('settings.mcp.jsonSaveSuccess'))
      setJsonError('')
      setOpen(false)
      TopView.hide(TopViewKey)
    } catch (error: any) {
      console.error('Failed to save JSON config:', error)
      setJsonError(error.message || t('settings.mcp.jsonSaveError'))
      window.message.error(t('settings.mcp.jsonSaveError'))
    } finally {
      setJsonSaving(false)
    }
  }

  const onCancel = useCallback(() => {
    setOpen(false)
    TopView.hide(TopViewKey)
  }, [])

  const onClose = useCallback(() => {
    resolve({})
  }, [resolve])

  // 修复静态方法
  useEffect(() => {
    EditMcpJsonPopup.hide = onCancel
    return () => {
      // 清理静态引用，避免内存泄漏
      EditMcpJsonPopup.hide = () => {
        TopView.hide(TopViewKey)
      }
    }
  }, [onCancel])

  // 使用div而不是antd的Button组件，以避免可能的交互问题
  const CustomButton = ({
    onClick,
    type = '',
    children,
    isLoading = false
  }: {
    onClick: () => void
    type?: string
    children: React.ReactNode
    isLoading?: boolean
  }) => {
    // 根据主题设置按钮样式
    const isDarkTheme = theme === 'dark'

    // 按钮基础样式
    const baseStyle = {
      padding: '8px 16px',
      backgroundColor: type === 'primary' ? '#1890ff' : isDarkTheme ? '#333' : '#fff',
      color: type === 'primary' ? '#fff' : isDarkTheme ? '#ddd' : '#333',
      border: `1px solid ${type === 'primary' ? '#1890ff' : isDarkTheme ? '#444' : '#d9d9d9'}`,
      borderRadius: '8px', // 更大的圆角
      cursor: 'pointer',
      marginLeft: '8px',
      userSelect: 'none' as const,
      opacity: isLoading ? 0.7 : 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease', // 添加过渡效果
      boxShadow: '0 2px 0 rgba(0,0,0,0.02)', // 轻微阴影
      fontWeight: 500, // 稍微加粗字体
      height: '32px', // 固定高度
      minWidth: '80px' // 最小宽度
    }

    // 悬停样式
    const hoverStyle = {
      backgroundColor: type === 'primary' ? '#40a9ff' : isDarkTheme ? '#444' : '#fafafa',
      borderColor: type === 'primary' ? '#40a9ff' : isDarkTheme ? '#555' : '#d9d9d9'
    }

    const [isHover, setIsHover] = useState(false)

    return (
      <div
        onClick={onClick}
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        style={{
          ...baseStyle,
          ...(isHover ? hoverStyle : {})
        }}
        role="button"
        tabIndex={0}>
        {isLoading && (
          <span
            style={{
              marginRight: '8px',
              display: 'inline-flex',
              width: '14px',
              height: '14px',
              border: '2px solid',
              borderColor: type === 'primary' ? '#ffffff80' : '#1890ff80',
              borderTopColor: type === 'primary' ? '#fff' : '#1890ff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
        )}
        {children}
      </div>
    )
  }

  // 添加自定义 CSS 动画 (如果还没有的话)
  useEffect(() => {
    const style = document.createElement('style')
    style.innerHTML = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  // 自定义footer
  const modalFooter = (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginTop: '16px',
        gap: '8px' // 使用gap替代marginLeft
      }}>
      <CustomButton onClick={onCancel}>{t('common.cancel')}</CustomButton>
      <CustomButton onClick={onOk} type="primary" isLoading={jsonSaving}>
        {t('common.confirm')}
      </CustomButton>
    </div>
  )

  // 根据主题设置编辑器主题
  const editorTheme = theme === 'dark' ? 'vs-dark' : 'light'

  return (
    <div ref={modalRef}>
      <Modal
        title={t('settings.mcp.editJson')}
        open={open}
        footer={null} // 不使用任何内置footer
        onCancel={onCancel} // 只设置onCancel以处理X按钮点击
        afterClose={onClose}
        width={800}
        maskClosable={false} // 禁止点击遮罩关闭
        keyboard={false} // 禁止ESC关闭，我们用自己的处理器
        destroyOnClose
        centered>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Typography.Text type="secondary">
            {jsonError ? <span style={{ color: 'red' }}>{jsonError}</span> : ''}
          </Typography.Text>
        </div>
        <div style={{ height: '60vh', marginBottom: '16px', border: '1px solid #d9d9d9', borderRadius: '2px' }}>
          <Editor
            height="100%"
            defaultLanguage="json"
            value={jsonConfig}
            onChange={(value) => value && setJsonConfig(value)}
            theme={editorTheme}
            options={{
              minimap: { enabled: false },
              formatOnPaste: true,
              automaticLayout: true,
              scrollBeyondLastLine: false,
              fixedOverflowWidgets: true
            }}
            onMount={handleEditorDidMount}
          />
        </div>
        <Typography.Text type="secondary">{t('settings.mcp.jsonModeHint')}</Typography.Text>
        {modalFooter}
      </Modal>
    </div>
  )
}

const TopViewKey = 'EditMcpJsonPopup'

export default class EditMcpJsonPopup {
  static topviewId = 0
  static hide() {
    TopView.hide(TopViewKey)
  }
  static show() {
    return new Promise<any>((resolve) => {
      TopView.show(
        <PopupContainer
          resolve={(v) => {
            resolve(v)
            TopView.hide(TopViewKey)
          }}
        />,
        TopViewKey
      )
    })
  }
}
