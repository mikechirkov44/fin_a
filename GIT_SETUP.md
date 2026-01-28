# Инструкция по настройке Git репозитория

## Локальный репозиторий уже готов ✅

Первый коммит создан:
```
6c9133d Initial commit: Financial Analysis System with detailed DDS and OPU analysis
```

## Следующие шаги

### 1. Создайте репозиторий на GitHub

1. Перейдите на https://github.com
2. Нажмите кнопку "+" в правом верхнем углу → "New repository"
3. Заполните:
   - **Repository name**: `fin_a` (или другое имя)
   - **Description**: "Financial Analysis System - система финансовой отчетности"
   - **Visibility**: Public или Private (на ваш выбор)
   - **НЕ** ставьте галочки на "Initialize with README", "Add .gitignore", "Choose a license" (у нас уже есть эти файлы)
4. Нажмите "Create repository"

### 2. Подключите удаленный репозиторий

После создания репозитория GitHub покажет вам URL. Выполните команды:

```bash
# Добавить remote (замените YOUR_USERNAME на ваш GitHub username)
git remote add origin https://github.com/mikechirkov44/fin_a.git

# Или если используете SSH:
# git remote add origin git@github.com:YOUR_USERNAME/fin_a.git

# Проверить, что remote добавлен
git remote -v
```

### 3. Выгрузите код

```bash
# Переименовать ветку в main (если нужно)
git branch -M main

# Выгрузить код
git push -u origin main
```

Если ваша ветка называется `master`:
```bash
git push -u origin master
```

### 4. Проверка

После успешной выгрузки:
- Обновите страницу репозитория на GitHub
- Все файлы должны отобразиться
- Коммит должен быть виден в истории

## Альтернативные платформы

### GitLab
```bash
git remote add origin https://gitlab.com/YOUR_USERNAME/fin_a.git
git push -u origin master
```

### Bitbucket
```bash
git remote add origin https://bitbucket.org/YOUR_USERNAME/fin_a.git
git push -u origin master
```

## Полезные команды

```bash
# Проверить статус
git status

# Посмотреть историю коммитов
git log --oneline

# Посмотреть настроенные remote репозитории
git remote -v

# Изменить URL remote (если нужно)
git remote set-url origin <новый_URL>

# Удалить remote (если нужно)
git remote remove origin
```

## Настройка git config (глобально)

Если хотите настроить имя и email для всех репозиториев:

```bash
git config --global user.name "mikechirkov44"
git config --global user.email "ya.mikechirkov@yandex.ru"
```
