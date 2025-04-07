import { PlusOutlined, SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons'
import DragableList from '@renderer/components/DragableList'
import Scrollbar from '@renderer/components/Scrollbar'
import { useAgents } from '@renderer/hooks/useAgents'
import { useAssistants } from '@renderer/hooks/useAssistant'
import { Assistant } from '@renderer/types'
import { FC, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import * as tinyPinyin from 'tiny-pinyin'

import AssistantItem from './AssistantItem'

interface AssistantsTabProps {
  activeAssistant: Assistant
  setActiveAssistant: (assistant: Assistant) => void
  onCreateAssistant: () => void
  onCreateDefaultAssistant: () => void
}

const Assistants: FC<AssistantsTabProps> = ({
  activeAssistant,
  setActiveAssistant,
  onCreateAssistant,
  onCreateDefaultAssistant
}) => {
  const { assistants, removeAssistant, addAssistant, updateAssistants } = useAssistants()
  const [dragging, setDragging] = useState(false)
  const [isAscending, setIsAscending] = useState(true) // 排序方向状态
  const { addAgent } = useAgents()
  const { t } = useTranslation()

  const onDelete = useCallback(
    (assistant: Assistant) => {
      const remaining = assistants.filter((a) => a.id !== assistant.id)
      if (assistant.id === activeAssistant?.id) {
        const newActive = remaining[remaining.length - 1]
        newActive ? setActiveAssistant(newActive) : onCreateDefaultAssistant()
      }
      removeAssistant(assistant.id)
    },
    [activeAssistant, assistants, removeAssistant, setActiveAssistant, onCreateDefaultAssistant]
  )

  const sortByPinyin = useCallback(() => {
    const sorted = [...assistants].sort((a, b) => {
      const pinyinA = tinyPinyin.convertToPinyin(a.name, '', true)
      const pinyinB = tinyPinyin.convertToPinyin(b.name, '', true)
      // 根据排序方向决定比较顺序
      return isAscending ? pinyinA.localeCompare(pinyinB) : pinyinB.localeCompare(pinyinA)
    })

    updateAssistants(sorted)
    // 切换排序方向
    setIsAscending(!isAscending)
  }, [assistants, updateAssistants, isAscending])

  return (
    <Container className="assistants-tab">
      <TabHeader>
        <SortButton
          onClick={sortByPinyin}
          title={isAscending ? t('common.sort.pinyin.asc') : t('common.sort.pinyin.desc')}>
          {isAscending ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
        </SortButton>
      </TabHeader>
      <DragableList
        list={assistants}
        onUpdate={(list) => {
          updateAssistants(list)
          // 拖拽后重置排序方向为升序
          setIsAscending(true)
        }}
        style={{ paddingBottom: dragging ? '34px' : 0 }}
        onDragStart={() => setDragging(true)}
        onDragEnd={() => setDragging(false)}>
        {(assistant) => (
          <AssistantItem
            key={assistant.id}
            assistant={assistant}
            isActive={assistant.id === activeAssistant.id}
            onSwitch={setActiveAssistant}
            onDelete={onDelete}
            addAgent={addAgent}
            addAssistant={addAssistant}
            onCreateDefaultAssistant={onCreateDefaultAssistant}
          />
        )}
      </DragableList>
      {!dragging && (
        <AssistantAddItem onClick={onCreateAssistant}>
          <AssistantName>
            <PlusOutlined style={{ color: 'var(--color-text-2)', marginRight: 4 }} />
            {t('chat.add.assistant.title')}
          </AssistantName>
        </AssistantAddItem>
      )}
      <div style={{ minHeight: 10 }}></div>
    </Container>
  )
}

// 样式组件
const Container = styled(Scrollbar)`
  display: flex;
  flex-direction: column;
  padding: 10px;
`

const TabHeader = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 8px;
  padding: 0 4px;
`

const SortButton = styled.button`
  background: transparent;
  border: none;
  color: var(--color-text-2);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: var(--color-background-soft);
    color: var(--color-text);
  }
`

const AssistantAddItem = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 7px 12px;
  position: relative;
  padding-right: 35px;
  font-family: Ubuntu;
  border-radius: var(--list-item-border-radius);
  border: 0.5px solid transparent;
  cursor: pointer;

  &:hover {
    background-color: var(--color-background-soft);
  }

  &.active {
    background-color: var(--color-background-soft);
    border: 0.5px solid var(--color-border);
  }
`

const AssistantName = styled.div`
  color: var(--color-text);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 13px;
`

export default Assistants
