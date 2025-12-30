/**
 * Утилита для экспорта данных в PDF
 * Использует jsPDF и html2canvas для генерации PDF из HTML
 */

export interface PDFExportOptions {
  title: string
  filename?: string
  orientation?: 'portrait' | 'landscape'
  format?: 'a4' | 'letter'
  margin?: {
    top?: number
    right?: number
    bottom?: number
    left?: number
  }
}

/**
 * Экспорт HTML элемента в PDF
 */
export const exportToPDF = async (
  element: HTMLElement,
  options: PDFExportOptions
): Promise<void> => {
  try {
    // Динамический импорт библиотек
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas')
    ])

    // Создаем canvas из HTML элемента
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: options.format || 'a4'
    })

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = canvas.width
    const imgHeight = canvas.height
    const ratio = Math.min(
      (pdfWidth - (options.margin?.left || 10) - (options.margin?.right || 10)) / imgWidth,
      (pdfHeight - (options.margin?.top || 10) - (options.margin?.bottom || 10)) / imgHeight
    )

    const imgScaledWidth = imgWidth * ratio
    const imgScaledHeight = imgHeight * ratio

    // Добавляем заголовок
    if (options.title) {
      pdf.setFontSize(16)
      pdf.text(
        options.title,
        pdfWidth / 2,
        (options.margin?.top || 10),
        { align: 'center' }
      )
    }

    // Добавляем изображение
    pdf.addImage(
      imgData,
      'PNG',
      (options.margin?.left || 10),
      (options.margin?.top || 10) + (options.title ? 10 : 0),
      imgScaledWidth,
      imgScaledHeight
    )

    // Сохраняем PDF
    const filename = options.filename || `${options.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    pdf.save(filename)
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    throw new Error('Не удалось экспортировать в PDF. Убедитесь, что библиотеки jsPDF и html2canvas установлены.')
  }
}

/**
 * Экспорт таблицы в PDF
 */
export const exportTableToPDF = async (
  tableElement: HTMLTableElement,
  options: PDFExportOptions
): Promise<void> => {
  // Обертываем таблицу в контейнер для лучшего отображения
  const container = document.createElement('div')
  container.style.padding = '20px'
  container.style.backgroundColor = '#ffffff'
  container.appendChild(tableElement.cloneNode(true))
  document.body.appendChild(container)

  try {
    await exportToPDF(container, options)
  } finally {
    document.body.removeChild(container)
  }
}

/**
 * Экспорт отчета в PDF с форматированием
 */
export const exportReportToPDF = async (
  reportElement: HTMLElement,
  options: PDFExportOptions & {
    includeDate?: boolean
    includeCompany?: string
  }
): Promise<void> => {
  const container = document.createElement('div')
  container.style.padding = '20px'
  container.style.backgroundColor = '#ffffff'
  container.style.fontFamily = 'Arial, sans-serif'

  // Добавляем заголовок отчета
  const header = document.createElement('div')
  header.style.marginBottom = '20px'
  header.style.borderBottom = '2px solid #333'
  header.style.paddingBottom = '10px'

  const title = document.createElement('h1')
  title.textContent = options.title
  title.style.margin = '0 0 10px 0'
  title.style.fontSize = '24px'
  header.appendChild(title)

  if (options.includeDate) {
    const date = document.createElement('div')
    date.textContent = `Дата формирования: ${new Date().toLocaleDateString('ru-RU')}`
    date.style.fontSize = '12px'
    date.style.color = '#666'
    header.appendChild(date)
  }

  if (options.includeCompany) {
    const company = document.createElement('div')
    company.textContent = `Организация: ${options.includeCompany}`
    company.style.fontSize = '12px'
    company.style.color = '#666'
    header.appendChild(company)
  }

  container.appendChild(header)
  container.appendChild(reportElement.cloneNode(true))
  document.body.appendChild(container)

  try {
    await exportToPDF(container, options)
  } finally {
    document.body.removeChild(container)
  }
}

