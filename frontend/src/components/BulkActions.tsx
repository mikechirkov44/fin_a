import { useConfirm } from '../contexts/ConfirmContext'
import { useToast } from '../contexts/ToastContext'
import Tooltip from './Tooltip'
import { HiOutlineTrash } from 'react-icons/hi2'
import './BulkActions.css'

interface BulkActionsProps {
  selectedCount: number
  onDelete: () => void
  onExport?: () => void
  deleteLabel?: string
  exportLabel?: string
}

const BulkActions = ({
  selectedCount,
  onDelete,
  onExport,
  deleteLabel = 'Удалить выбранные',
  exportLabel = 'Экспортировать выбранные',
}: BulkActionsProps) => {
  const { confirm } = useConfirm()
  const { showSuccess } = useToast()

  if (selectedCount === 0) {
    return null
  }

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Групповое удаление',
      message: `Вы уверены, что хотите удалить ${selectedCount} ${selectedCount === 1 ? 'запись' : 'записей'}?`,
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger',
    })

    if (confirmed) {
      onDelete()
    }
  }

  const handleExport = () => {
    if (onExport) {
      onExport()
      showSuccess(`Экспортировано ${selectedCount} ${selectedCount === 1 ? 'запись' : 'записей'}`)
    }
  }

  return (
    <div className="bulk-actions">
      <div className="bulk-actions-info">
        Выбрано: <strong>{selectedCount}</strong>
      </div>
      <div className="bulk-actions-buttons">
        {onExport && (
          <Tooltip content={exportLabel}>
            <button onClick={handleExport} className="bulk-action-btn">
              📥 Экспорт
            </button>
          </Tooltip>
        )}
        <Tooltip content={deleteLabel}>
          <button onClick={handleDelete} className="bulk-action-btn bulk-action-btn-delete">
            <HiOutlineTrash />
            <span>Удалить</span>
          </button>
        </Tooltip>
      </div>
    </div>
  )
}

export default BulkActions

