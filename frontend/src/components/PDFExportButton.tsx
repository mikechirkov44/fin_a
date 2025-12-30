import { useRef, useState } from 'react'
import { exportToPDF, exportTableToPDF, exportReportToPDF, PDFExportOptions } from '../utils/pdfExport'
import { useToast } from '../contexts/ToastContext'
import './PDFExportButton.css'

interface PDFExportButtonProps {
  elementId?: string
  tableElement?: HTMLTableElement
  reportElement?: HTMLElement
  options: PDFExportOptions
  className?: string
  children?: React.ReactNode
}

const PDFExportButton = ({
  elementId,
  tableElement,
  reportElement,
  options,
  className = '',
  children
}: PDFExportButtonProps) => {
  const { showSuccess, showError } = useToast()
  const [isExporting, setIsExporting] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleExport = async () => {
    try {
      setIsExporting(true)

      if (reportElement) {
        await exportReportToPDF(reportElement, options)
      } else if (tableElement) {
        await exportTableToPDF(tableElement, options)
      } else if (elementId) {
        const element = document.getElementById(elementId)
        if (!element) {
          throw new Error(`Элемент с id "${elementId}" не найден`)
        }
        await exportToPDF(element, options)
      } else {
        throw new Error('Не указан элемент для экспорта')
      }

      showSuccess('PDF успешно экспортирован')
    } catch (error: any) {
      console.error('PDF export error:', error)
      showError(error.message || 'Ошибка экспорта в PDF')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <button
      ref={buttonRef}
      onClick={handleExport}
      disabled={isExporting}
      className={`pdf-export-button ${className}`}
      title="Экспорт в PDF"
    >
      {children || (
        <>
          <span>📄</span>
          <span>{isExporting ? 'Экспорт...' : 'Экспорт PDF'}</span>
        </>
      )}
    </button>
  )
}

export default PDFExportButton

