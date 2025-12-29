// Функция для преобразования английских названий месяцев в русские
export const translateMonthToRussian = (label: string): string => {
  if (!label) return label

  const monthMap: Record<string, string> = {
    'January': 'Январь',
    'February': 'Февраль',
    'March': 'Март',
    'April': 'Апрель',
    'May': 'Май',
    'June': 'Июнь',
    'July': 'Июль',
    'August': 'Август',
    'September': 'Сентябрь',
    'October': 'Октябрь',
    'November': 'Ноябрь',
    'December': 'Декабрь',
    // Также обрабатываем варианты с маленькой буквы
    'january': 'Январь',
    'february': 'Февраль',
    'march': 'Март',
    'april': 'Апрель',
    'may': 'Май',
    'june': 'Июнь',
    'july': 'Июль',
    'august': 'Август',
    'september': 'Сентябрь',
    'october': 'Октябрь',
    'november': 'Ноябрь',
    'december': 'Декабрь',
  }

  // Заменяем английские названия месяцев на русские
  let translated = label
  for (const [en, ru] of Object.entries(monthMap)) {
    // Заменяем "Month Year" на "Месяц Год"
    const regex = new RegExp(`\\b${en}\\b`, 'gi')
    translated = translated.replace(regex, ru)
  }

  return translated
}

// Функция для преобразования массива данных с label полями
export const translateChartLabels = (data: any[]): any[] => {
  if (!data || !Array.isArray(data)) return data

  return data.map(item => ({
    ...item,
    label: translateMonthToRussian(item.label || ''),
    period: translateMonthToRussian(item.period || ''),
  }))
}

