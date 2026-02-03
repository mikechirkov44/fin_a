import { useState, useEffect } from 'react'
import { referenceService } from '../services/api'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import Modal from './Modal'
import FormField from './FormField'
import { HiOutlinePencil, HiOutlineTrash, HiOutlineChevronRight, HiOutlineChevronDown, HiOutlinePlus } from 'react-icons/hi2'
import { Button } from './ui'
import './IncomeExpenseHierarchy.css'

interface TreeNode {
  id: number
  name: string
  description?: string
  type: 'group' | 'item'
  parent_id?: number | null
  children?: TreeNode[]
  expanded?: boolean
}

type TabType = 'income' | 'expense'

const IncomeExpenseHierarchy = () => {
  const { showSuccess, showError } = useToast()
  const { confirm } = useConfirm()
  const [activeTab, setActiveTab] = useState<TabType>('income')
  const [tree, setTree] = useState<TreeNode[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingNode, setEditingNode] = useState<TreeNode | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent_id: null as number | null,
    isGroup: false
  })
  const [draggedNode, setDraggedNode] = useState<TreeNode | null>(null)

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    try {
      let groups: any[] = []
      let items: any[] = []
      
      if (activeTab === 'income') {
        groups = await referenceService.getIncomeGroups()
        items = await referenceService.getIncomeItems()
      } else {
        groups = await referenceService.getExpenseGroups()
        items = await referenceService.getExpenseItems()
      }

      console.log('Loaded groups:', groups, 'Type:', typeof groups, 'IsArray:', Array.isArray(groups))
      console.log('Loaded items:', items, 'Type:', typeof items, 'IsArray:', Array.isArray(items))

      // Убеждаемся, что это массивы
      if (!Array.isArray(groups)) {
        console.error('Groups is not an array:', groups, typeof groups)
        groups = []
      }
      if (!Array.isArray(items)) {
        console.error('Items is not an array:', items, typeof items)
        items = []
      }

      // Строим дерево
      const groupsMap = new Map<number, TreeNode>()
      const itemsMap = new Map<number, TreeNode>()
      
      // Сначала добавляем все группы
      try {
        groups.forEach((group: any) => {
          groupsMap.set(group.id, {
            id: group.id,
            name: group.name,
            description: group.description || '',
            type: 'group',
            parent_id: group.parent_group_id || null,
            children: [],
            expanded: true
          })
        })
      } catch (e) {
        console.error('Error processing groups:', e, groups)
        throw e
      }

      // Затем добавляем статьи
      try {
        items.forEach((item: any) => {
          itemsMap.set(item.id, {
            id: item.id,
            name: item.name,
            description: item.description || '',
            type: 'item',
            parent_id: item.group_id || null,
            expanded: false
          })
        })
      } catch (e) {
        console.error('Error processing items:', e, items)
        throw e
      }

      // Строим иерархию групп
      const rootNodes: TreeNode[] = []
      
      // Сначала обрабатываем группы (только группы в группы)
      groupsMap.forEach((node) => {
        if (node.parent_id) {
          const parent = groupsMap.get(node.parent_id)
          if (parent) {
            if (!parent.children) parent.children = []
            parent.children.push(node)
          } else {
            rootNodes.push(node)
          }
        } else {
          rootNodes.push(node)
        }
      })

      // Затем добавляем статьи в группы
      itemsMap.forEach((itemNode) => {
        if (itemNode.parent_id) {
          const parentGroup = groupsMap.get(itemNode.parent_id)
          if (parentGroup) {
            if (!parentGroup.children) parentGroup.children = []
            parentGroup.children.push(itemNode)
          } else {
            // Статья без группы - добавляем в корень
            rootNodes.push(itemNode)
          }
        } else {
          // Статья без группы - добавляем в корень
          rootNodes.push(itemNode)
        }
      })

      // Сортируем: сначала группы, потом статьи
      const sortTreeNodes = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'group' ? -1 : 1
          }
          return a.name.localeCompare(b.name, 'ru')
        }).map(node => ({
          ...node,
          children: node.children && node.children.length > 0 ? sortTreeNodes(node.children) : undefined
        }))
      }

      const sortedTree = sortTreeNodes(rootNodes)
      console.log('Built tree:', sortedTree)
      setTree(sortedTree)
    } catch (error) {
      console.error('Error loading data:', error)
      showError('Ошибка загрузки данных')
    }
  }

  const toggleExpand = (nodeId: number, nodes: TreeNode[]): TreeNode[] => {
    return nodes.map(node => {
      if (node.id === nodeId) {
        return { ...node, expanded: !node.expanded }
      }
      if (node.children) {
        return { ...node, children: toggleExpand(nodeId, node.children) }
      }
      return node
    })
  }

  const handleToggleExpand = (nodeId: number) => {
    setTree(prev => toggleExpand(nodeId, prev))
  }

  const handleAdd = (parentId?: number | null, isGroup: boolean = false) => {
    setFormData({
      name: '',
      description: '',
      parent_id: parentId || null,
      isGroup
    })
    setEditingNode(null)
    setShowForm(true)
  }

  const handleEdit = (node: TreeNode) => {
    setEditingNode(node)
    setFormData({
      name: node.name,
      description: node.description || '',
      parent_id: node.parent_id || null,
      isGroup: node.type === 'group'
    })
    setShowForm(true)
  }

  const handleDelete = async (node: TreeNode) => {
    const confirmed = await confirm(
      'Удаление',
      `Вы уверены, что хотите удалить "${node.name}"?`
    )
    if (!confirmed) return

    try {
      if (node.type === 'group') {
        if (activeTab === 'income') {
          await referenceService.deleteIncomeGroup(node.id)
        } else {
          await referenceService.deleteExpenseGroup(node.id)
        }
      } else {
        if (activeTab === 'income') {
          await referenceService.deleteIncomeItem(node.id)
        } else {
          await referenceService.deleteExpenseItem(node.id)
        }
      }
      showSuccess('Запись успешно удалена')
      loadData()
    } catch (error: any) {
      showError(error.response?.data?.detail || 'Ошибка удаления')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const submitData: any = {
        name: formData.name,
        description: formData.description || null
      }

      if (formData.isGroup) {
        if (formData.parent_id) {
          submitData.parent_group_id = formData.parent_id
        }
        if (editingNode) {
          if (activeTab === 'income') {
            await referenceService.updateIncomeGroup(editingNode.id, submitData)
          } else {
            await referenceService.updateExpenseGroup(editingNode.id, submitData)
          }
        } else {
          if (activeTab === 'income') {
            await referenceService.createIncomeGroup(submitData)
          } else {
            await referenceService.createExpenseGroup(submitData)
          }
        }
      } else {
        if (formData.parent_id) {
          submitData.group_id = formData.parent_id
        }
        if (editingNode) {
          if (activeTab === 'income') {
            await referenceService.updateIncomeItem(editingNode.id, submitData)
          } else {
            await referenceService.updateExpenseItem(editingNode.id, submitData)
          }
        } else {
          if (activeTab === 'income') {
            await referenceService.createIncomeItem(submitData)
          } else {
            await referenceService.createExpenseItem(submitData)
          }
        }
      }

      showSuccess(editingNode ? 'Запись обновлена' : 'Запись создана')
      handleClose()
      loadData()
    } catch (error: any) {
      showError(error.response?.data?.detail || 'Ошибка сохранения')
    }
  }

  const handleClose = () => {
    setShowForm(false)
    setEditingNode(null)
    setFormData({ name: '', description: '', parent_id: null, isGroup: false })
  }

  const getAllGroups = (nodes: TreeNode[]): TreeNode[] => {
    const groups: TreeNode[] = []
    nodes.forEach(node => {
      if (node.type === 'group') {
        groups.push(node)
        if (node.children) {
          groups.push(...getAllGroups(node.children))
        }
      }
    })
    return groups
  }

  const renderNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0

    return (
      <div key={node.id} className="hierarchy-node" data-level={level}>
        <div
          className={`hierarchy-node-row ${node.type === 'group' ? 'group' : 'item'}`}
          onDragStart={(e) => {
            setDraggedNode(node)
            e.dataTransfer.effectAllowed = 'move'
          }}
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
          }}
          onDrop={(e) => {
            e.preventDefault()
            if (draggedNode && draggedNode.id !== node.id) {
              // TODO: Реализовать изменение иерархии через API
              console.log('Move', draggedNode.id, 'to', node.id)
            }
            setDraggedNode(null)
          }}
          draggable
        >
          <div className="hierarchy-node-content">
            {hasChildren ? (
              <button
                className="hierarchy-expand-button"
                onClick={() => handleToggleExpand(node.id)}
                aria-label={node.expanded ? 'Свернуть' : 'Развернуть'}
              >
                {node.expanded ? <HiOutlineChevronDown /> : <HiOutlineChevronRight />}
              </button>
            ) : (
              <span className="hierarchy-expand-placeholder" />
            )}
            <span className={`hierarchy-node-name ${node.type === 'group' ? 'group' : ''}`}>
              {node.name}
            </span>
            {node.description && (
              <span className="hierarchy-node-description">
                {node.description}
              </span>
            )}
          </div>
          <div className="hierarchy-node-actions">
            <button
              className="hierarchy-action-button add"
              onClick={() => handleAdd(node.id, node.type === 'group')}
              title={node.type === 'group' ? 'Добавить подгруппу' : 'Добавить статью'}
              aria-label={node.type === 'group' ? 'Добавить подгруппу' : 'Добавить статью'}
            >
              <HiOutlinePlus />
            </button>
            <button
              className="hierarchy-action-button edit"
              onClick={() => handleEdit(node)}
              title="Редактировать"
              aria-label="Редактировать"
            >
              <HiOutlinePencil />
            </button>
            <button
              className="hierarchy-action-button delete"
              onClick={() => handleDelete(node)}
              title="Удалить"
              aria-label="Удалить"
            >
              <HiOutlineTrash />
            </button>
          </div>
        </div>
        {hasChildren && node.expanded && (
          <div className="hierarchy-children">
            {node.children!.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="hierarchy-container">
      <div className="hierarchy-tabs">
        <button
          className={`hierarchy-tab ${activeTab === 'income' ? 'active' : ''}`}
          onClick={() => setActiveTab('income')}
        >
          Доходы
        </button>
        <button
          className={`hierarchy-tab ${activeTab === 'expense' ? 'active' : ''}`}
          onClick={() => setActiveTab('expense')}
        >
          Расходы
        </button>
      </div>

      <div className="card">
        <div className="hierarchy-card-header">
          <span className="hierarchy-card-title">
            Группы и статьи {activeTab === 'income' ? 'доходов' : 'расходов'}
          </span>
          <Button
            variant="primary"
            onClick={() => handleAdd(null, true)}
            icon={<HiOutlinePlus />}
          >
            Добавить группу
          </Button>
        </div>
        <div className="hierarchy-scroll-container">
          {tree.length === 0 ? (
            <div className="hierarchy-empty-state">
              Нет данных. Создайте группу или статью, используя кнопку "Добавить группу" выше.
            </div>
          ) : (
            tree.map(node => renderNode(node, 0))
          )}
        </div>
      </div>

      <Modal
        isOpen={showForm}
        onClose={handleClose}
        title={editingNode ? `Редактировать ${formData.isGroup ? 'группу' : 'статью'}` : `Добавить ${formData.isGroup ? 'группу' : 'статью'}`}
        maxWidth="600px"
      >
        <form onSubmit={handleSubmit}>
          <FormField label="Наименование" required>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </FormField>
          {!editingNode && (
            <FormField label="Тип">
              <select
                value={formData.isGroup ? 'group' : 'item'}
                onChange={(e) => setFormData({ ...formData, isGroup: e.target.value === 'group' })}
              >
                <option value="group">Группа</option>
                <option value="item">Статья</option>
              </select>
            </FormField>
          )}
          {formData.isGroup && (
            <FormField label="Родительская группа">
              <select
                value={formData.parent_id || ''}
                onChange={(e) => setFormData({ ...formData, parent_id: e.target.value ? parseInt(e.target.value) : null })}
              >
                <option value="">Нет (основная группа)</option>
                {getAllGroups(tree)
                  .filter(g => !editingNode || g.id !== editingNode.id)
                  .map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
              </select>
            </FormField>
          )}
          {!formData.isGroup && (
            <FormField label="Группа">
              <select
                value={formData.parent_id || ''}
                onChange={(e) => setFormData({ ...formData, parent_id: e.target.value ? parseInt(e.target.value) : null })}
              >
                <option value="">Не выбрано</option>
                {getAllGroups(tree).map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </FormField>
          )}
          <FormField label="Описание">
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </FormField>
          <div className="compact-form-actions">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Отмена
            </Button>
            <Button type="submit" variant="primary">
              Сохранить
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default IncomeExpenseHierarchy
