"""
Сервис для генерации бизнес-рекомендаций
"""
from decimal import Decimal
from datetime import date, timedelta, datetime
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from app.models.recommendation import (
    Recommendation, RecommendationType, RecommendationPriority, RecommendationCategory
)
from app.models.product import Product
from app.models.input1 import MoneyMovement
from app.models.realization import Realization, RealizationItem
from app.models.shipment import Shipment
from app.models.input2 import Asset, Liability
from app.models.budget import Budget, BudgetType, BudgetPeriod
from app.models.inventory import Inventory
from app.models.warehouse import Warehouse
from app.models.customer import Customer
from app.models.supplier import Supplier
from app.models.reference import SalesChannel, ExpenseItem, IncomeItem

class RecommendationService:
    def __init__(self, db: Session):
        self.db = db
        # Пороговые значения для генерации рекомендаций
        self.MIN_MARGIN_PERCENT = 10  # Минимальная маржинальность (%)
        self.LOW_MARGIN_PERCENT = 15  # Низкая маржинальность (%)
        self.HIGH_EXPENSE_GROWTH = 30  # Высокий рост расходов (%)
        self.MIN_CASH_DAYS = 30  # Минимальный остаток денежных средств (дней)
        self.SLOW_TURNOVER_DAYS = 90  # Медленная оборачиваемость (дней)
    
    def generate_recommendations(self, company_id: int, user_id: int = None) -> int:
        """Генерирует все типы рекомендаций для компании на основе анализа данных"""
        count = 0
        
        # Список методов генерации рекомендаций
        generation_methods = [
            # Финансовые рекомендации на основе анализа
            ("_generate_margin_recommendations", self._generate_margin_recommendations),
            ("_generate_expense_recommendations", self._generate_expense_recommendations),
            ("_generate_cash_flow_recommendations", self._generate_cash_flow_recommendations),
            ("_generate_profitability_analysis", self._generate_profitability_analysis),
            
            # Операционные рекомендации на основе анализа
            ("_generate_turnover_recommendations", self._generate_turnover_recommendations),
            ("_generate_product_recommendations", self._generate_product_recommendations),
            ("_generate_product_performance_analysis", self._generate_product_performance_analysis),
            
            # Аналитические рекомендации на основе трендов и статистики
            ("_generate_trend_recommendations", self._generate_trend_recommendations),
            ("_generate_statistical_anomalies", self._generate_statistical_anomalies),
            ("_generate_period_comparison_recommendations", self._generate_period_comparison_recommendations),
            
            # Рекомендации по продажам
            ("_generate_sales_recommendations", self._generate_sales_recommendations),
            
            # Рекомендации по бюджету
            ("_generate_budget_recommendations", self._generate_budget_recommendations),
            
            # Рекомендации по активам/пассивам
            ("_generate_assets_liabilities_recommendations", self._generate_assets_liabilities_recommendations),
            
            # Рекомендации по складам и остаткам
            ("_generate_inventory_recommendations", self._generate_inventory_recommendations),
            
            # Рекомендации по клиентам и поставщикам
            ("_generate_customers_suppliers_recommendations", self._generate_customers_suppliers_recommendations),
        ]
        
        # Выполняем каждый метод с обработкой ошибок
        for method_name, method_func in generation_methods:
            try:
                count += method_func(company_id, user_id)
            except Exception as e:
                import traceback
                error_detail = traceback.format_exc()
                print(f"Error in {method_name} for company {company_id}: {str(e)}")
                print(error_detail)
                # Продолжаем выполнение других методов
                continue
        
        return count
    
    def _check_existing_recommendation(
        self, company_id: int, category: RecommendationCategory,
        related_table: str = None, related_id: int = None,
        is_dismissed: bool = False, title: str = None
    ) -> bool:
        """Проверяет, существует ли уже такая рекомендация"""
        query = self.db.query(Recommendation).filter(
            Recommendation.company_id == company_id,
            Recommendation.is_dismissed == is_dismissed
        )
        
        # Всегда проверяем по title (он уникален для каждой рекомендации)
        # Если title не передан, используем комбинацию category + related_table + related_id
        if title:
            query = query.filter(Recommendation.title == title)
        else:
            # Без title проверяем по комбинации
            if category:
                query = query.filter(Recommendation.category == category)
            if related_table:
                query = query.filter(Recommendation.related_table == related_table)
            if related_id:
                query = query.filter(Recommendation.related_id == related_id)
        
        return query.first() is not None
    
    def _create_recommendation(
        self, company_id: int, type: RecommendationType,
        category: RecommendationCategory, priority: RecommendationPriority,
        title: str, description: str, action: str = None,
        meta_data: dict = None, related_table: str = None,
        related_id: int = None, user_id: int = None
    ):
        """Создает рекомендацию, если она еще не существует"""
        # Проверяем по title (уникален для каждой рекомендации)
        # Временно упрощаем: проверяем только по title для избежания дублей
        if title:
            existing = self.db.query(Recommendation).filter(
                Recommendation.company_id == company_id,
                Recommendation.title == title,
                Recommendation.is_dismissed == False
            ).first()
            if existing:
                return False
        
        recommendation = Recommendation(
            company_id=company_id,
            user_id=user_id,
            type=type,
            category=category,
            priority=priority,
            title=title,
            description=description,
            action=action,
            meta_data=meta_data,
            related_table=related_table,
            related_id=related_id
        )
        self.db.add(recommendation)
        self.db.commit()
        return True
    
    def _generate_margin_recommendations(self, company_id: int, user_id: int = None) -> int:
        """Генерирует рекомендации по маржинальности товаров"""
        count = 0
        products = self.db.query(Product).filter(Product.is_active == True).all()
        
        for product in products:
            if product.cost_price and product.selling_price:
                margin_amount = float(product.selling_price) - float(product.cost_price)
                margin_percent = (margin_amount / float(product.selling_price) * 100) if float(product.selling_price) > 0 else 0
                
                if margin_percent < self.MIN_MARGIN_PERCENT:
                    # Критично низкая маржинальность
                    if self._create_recommendation(
                        company_id=company_id,
                        type=RecommendationType.FINANCIAL,
                        category=RecommendationCategory.MARGIN,
                        priority=RecommendationPriority.CRITICAL,
                        title=f"Критически низкая маржинальность товара '{product.name}'",
                        description=f"Маржинальность товара '{product.name}' составляет {margin_percent:.1f}%, что ниже минимального порога {self.MIN_MARGIN_PERCENT}%.",
                        action=f"Рассмотрите повышение цены продажи товара '{product.name}' или снижение себестоимости.",
                        meta_data={"product_id": product.id, "margin_percent": float(margin_percent)},
                        related_table="products",
                        related_id=product.id,
                        user_id=user_id
                    ):
                        count += 1
                
                elif margin_percent < self.LOW_MARGIN_PERCENT:
                    # Низкая маржинальность
                    if self._create_recommendation(
                        company_id=company_id,
                        type=RecommendationType.FINANCIAL,
                        category=RecommendationCategory.MARGIN,
                        priority=RecommendationPriority.IMPORTANT,
                        title=f"Низкая маржинальность товара '{product.name}'",
                        description=f"Маржинальность товара '{product.name}' составляет {margin_percent:.1f}%, что ниже рекомендуемого значения {self.LOW_MARGIN_PERCENT}%.",
                        action=f"Рекомендуется пересмотреть ценовую политику для товара '{product.name}'.",
                        meta_data={"product_id": product.id, "margin_percent": float(margin_percent)},
                        related_table="products",
                        related_id=product.id,
                        user_id=user_id
                    ):
                        count += 1
        
        return count
    
    def _generate_expense_recommendations(self, company_id: int, user_id: int = None) -> int:
        """Генерирует рекомендации по расходам"""
        count = 0
        today = date.today()
        last_month = today - timedelta(days=30)
        two_months_ago = today - timedelta(days=60)
        
        # Анализ роста расходов по статьям
        expense_items = self.db.query(MoneyMovement.expense_item_id).filter(
            MoneyMovement.movement_type == "expense",
            MoneyMovement.company_id == company_id,
            MoneyMovement.is_business == True
        ).distinct().all()
        
        for (expense_item_id,) in expense_items:
            if not expense_item_id:
                continue
            
            # Сумма расходов за последний месяц
            last_month_total = self.db.query(func.sum(MoneyMovement.amount)).filter(
                MoneyMovement.expense_item_id == expense_item_id,
                MoneyMovement.company_id == company_id,
                MoneyMovement.date >= last_month,
                MoneyMovement.date < today
            ).scalar() or 0
            
            # Сумма расходов за предыдущий месяц
            prev_month_total = self.db.query(func.sum(MoneyMovement.amount)).filter(
                MoneyMovement.expense_item_id == expense_item_id,
                MoneyMovement.company_id == company_id,
                MoneyMovement.date >= two_months_ago,
                MoneyMovement.date < last_month
            ).scalar() or 0
            
            if prev_month_total > 0 and last_month_total > 0:
                growth_percent = ((last_month_total - prev_month_total) / prev_month_total) * 100
                
                if growth_percent > self.HIGH_EXPENSE_GROWTH:
                    if self._create_recommendation(
                        company_id=company_id,
                        type=RecommendationType.FINANCIAL,
                        category=RecommendationCategory.EXPENSES,
                        priority=RecommendationPriority.IMPORTANT,
                        title=f"Высокий рост расходов",
                        description=f"Расходы по статье увеличились на {growth_percent:.1f}% за последний месяц.",
                        action="Проанализируйте причины роста расходов и рассмотрите возможность оптимизации.",
                        meta_data={"expense_item_id": expense_item_id, "growth_percent": float(growth_percent)},
                        related_table="expense_items",
                        related_id=expense_item_id,
                        user_id=user_id
                    ):
                        count += 1
        
        return count
    
    def _generate_cash_flow_recommendations(self, company_id: int, user_id: int = None) -> int:
        """Генерирует рекомендации по денежным средствам"""
        count = 0
        today = date.today()
        
        # Рассчитываем остаток денежных средств
        total_income = self.db.query(func.sum(MoneyMovement.amount)).filter(
            MoneyMovement.movement_type == "income",
            MoneyMovement.company_id == company_id,
            MoneyMovement.is_business == True
        ).scalar() or 0
        
        total_expense = self.db.query(func.sum(MoneyMovement.amount)).filter(
            MoneyMovement.movement_type == "expense",
            MoneyMovement.company_id == company_id,
            MoneyMovement.is_business == True
        ).scalar() or 0
        
        cash_balance = total_income - total_expense
        
        # Рассчитываем средние ежедневные расходы
        first_movement = self.db.query(func.min(MoneyMovement.date)).filter(
            MoneyMovement.company_id == company_id
        ).scalar()
        
        if first_movement:
            days_count = (today - first_movement).days
            if days_count > 0:
                avg_daily_expense = total_expense / days_count
                days_of_cash = (cash_balance / avg_daily_expense) if avg_daily_expense > 0 else 0
                
                if days_of_cash < self.MIN_CASH_DAYS and cash_balance < 0:
                    # Критический недостаток денежных средств
                    if self._create_recommendation(
                        company_id=company_id,
                        type=RecommendationType.FINANCIAL,
                        category=RecommendationCategory.CASH_FLOW,
                        priority=RecommendationPriority.CRITICAL,
                        title="Критический недостаток денежных средств",
                        description=f"Отрицательный остаток денежных средств. Достаточно средств примерно на {days_of_cash:.0f} дней при текущих расходах.",
                        action="Срочно примите меры по увеличению денежных потоков или сокращению расходов.",
                        meta_data={"cash_balance": float(cash_balance), "days_of_cash": float(days_of_cash)},
                        user_id=user_id
                    ):
                        count += 1
                
                elif days_of_cash < self.MIN_CASH_DAYS:
                    # Низкий остаток денежных средств
                    if self._create_recommendation(
                        company_id=company_id,
                        type=RecommendationType.FINANCIAL,
                        category=RecommendationCategory.CASH_FLOW,
                        priority=RecommendationPriority.IMPORTANT,
                        title="Низкий остаток денежных средств",
                        description=f"Остаток денежных средств достаточен только на {days_of_cash:.0f} дней при текущих расходах (минимум {self.MIN_CASH_DAYS} дней).",
                        action="Рекомендуется увеличить денежные резервы для обеспечения финансовой стабильности.",
                        meta_data={"cash_balance": float(cash_balance), "days_of_cash": float(days_of_cash)},
                        user_id=user_id
                    ):
                        count += 1
        
        return count
    
    def _generate_turnover_recommendations(self, company_id: int, user_id: int = None) -> int:
        """Генерирует рекомендации по оборачиваемости товаров"""
        count = 0
        today = date.today()
        cutoff_date = today - timedelta(days=self.SLOW_TURNOVER_DAYS)
        
        # Товары, которые не продавались долгое время
        products_with_sales = self.db.query(Shipment.product_id).filter(
            Shipment.company_id == company_id,
            Shipment.date >= cutoff_date
        ).distinct().all()
        
        products_with_sales_ids = [p[0] for p in products_with_sales]
        
        if products_with_sales_ids:
            slow_products = self.db.query(Product).filter(
                Product.is_active == True,
                ~Product.id.in_(products_with_sales_ids)
            ).all()
        else:
            slow_products = self.db.query(Product).filter(Product.is_active == True).all()
        
        for product in slow_products:
            if self._create_recommendation(
                company_id=company_id,
                type=RecommendationType.OPERATIONAL,
                category=RecommendationCategory.TURNOVER,
                priority=RecommendationPriority.IMPORTANT,
                title=f"Товар '{product.name}' не продавался более {self.SLOW_TURNOVER_DAYS} дней",
                description=f"Товар '{product.name}' не имеет продаж за последние {self.SLOW_TURNOVER_DAYS} дней, что указывает на медленную оборачиваемость.",
                action=f"Рассмотрите возможность проведения распродажи или пересмотра маркетинговой стратегии для товара '{product.name}'.",
                meta_data={"product_id": product.id},
                related_table="products",
                related_id=product.id,
                user_id=user_id
            ):
                count += 1
        
        return count
    
    def _generate_product_recommendations(self, company_id: int, user_id: int = None) -> int:
        """Генерирует рекомендации по товарам"""
        count = 0
        
        # Товары без цены продажи
        products_without_price = self.db.query(Product).filter(
            Product.is_active == True,
            or_(Product.selling_price.is_(None), Product.selling_price == 0)
        ).all()
        
        for product in products_without_price:
            if self._create_recommendation(
                company_id=company_id,
                type=RecommendationType.OPERATIONAL,
                category=RecommendationCategory.PRODUCT,
                priority=RecommendationPriority.IMPORTANT,
                title=f"Товар '{product.name}' без цены продажи",
                description=f"Товар '{product.name}' не имеет установленной цены продажи.",
                action=f"Установите цену продажи для товара '{product.name}'.",
                meta_data={"product_id": product.id},
                related_table="products",
                related_id=product.id,
                user_id=user_id
            ):
                count += 1
        
        return count
    
    def _generate_trend_recommendations(self, company_id: int, user_id: int = None) -> int:
        """Генерирует аналитические рекомендации на основе трендов"""
        count = 0
        today = date.today()
        last_month = today - timedelta(days=30)
        two_months_ago = today - timedelta(days=60)
        
        # Анализ динамики продаж
        last_month_revenue = self.db.query(func.sum(Realization.revenue)).filter(
            Realization.company_id == company_id,
            Realization.date >= last_month,
            Realization.date < today
        ).scalar() or 0
        
        prev_month_revenue = self.db.query(func.sum(Realization.revenue)).filter(
            Realization.company_id == company_id,
            Realization.date >= two_months_ago,
            Realization.date < last_month
        ).scalar() or 0
        
        if prev_month_revenue > 0:
            revenue_change = ((last_month_revenue - prev_month_revenue) / prev_month_revenue) * 100
            
            if revenue_change < -20:  # Падение выручки более чем на 20%
                if self._create_recommendation(
                    company_id=company_id,
                    type=RecommendationType.ANALYTICAL,
                    category=RecommendationCategory.TREND,
                    priority=RecommendationPriority.IMPORTANT,
                    title="Снижение выручки",
                    description=f"Выручка снизилась на {abs(revenue_change):.1f}% по сравнению с предыдущим месяцем.",
                    action="Проанализируйте причины снижения выручки и разработайте план по ее увеличению.",
                    meta_data={"revenue_change_percent": float(revenue_change)},
                    user_id=user_id
                ):
                    count += 1
            elif revenue_change > 20:  # Рост выручки более чем на 20%
                if self._create_recommendation(
                    company_id=company_id,
                    type=RecommendationType.ANALYTICAL,
                    category=RecommendationCategory.TREND,
                    priority=RecommendationPriority.INFO,
                    title="Рост выручки",
                    description=f"Выручка выросла на {revenue_change:.1f}% по сравнению с предыдущим месяцем.",
                    action="Отличные результаты! Продолжайте в том же духе и масштабируйте успешные стратегии.",
                    meta_data={"revenue_change_percent": float(revenue_change)},
                    user_id=user_id
                ):
                    count += 1
        
        return count
    
    def _generate_profitability_analysis(self, company_id: int, user_id: int = None) -> int:
        """Генерирует рекомендации на основе анализа рентабельности"""
        count = 0
        today = date.today()
        last_3_months = today - timedelta(days=90)
        
        # Выручка за последние 3 месяца
        revenue = self.db.query(func.sum(Realization.revenue)).filter(
            Realization.company_id == company_id,
            Realization.date >= last_3_months,
            Realization.date <= today
        ).scalar() or 0
        
        # Себестоимость
        cost_of_goods = self.db.query(func.sum(Shipment.cost_price * Shipment.quantity)).filter(
            Shipment.company_id == company_id,
            Shipment.date >= last_3_months,
            Shipment.date <= today
        ).scalar() or 0
        
        # Расходы
        expenses = self.db.query(func.sum(MoneyMovement.amount)).filter(
            MoneyMovement.movement_type == "expense",
            MoneyMovement.company_id == company_id,
            MoneyMovement.date >= last_3_months,
            MoneyMovement.date <= today,
            MoneyMovement.is_business == True
        ).scalar() or 0
        
        if revenue > 0:
            # Валовая рентабельность
            gross_margin = ((float(revenue) - float(cost_of_goods)) / float(revenue)) * 100
            
            # Чистая рентабельность
            net_profit = float(revenue) - float(cost_of_goods) - float(expenses)
            net_margin = (net_profit / float(revenue)) * 100
            
            # Норма валовой рентабельности для бизнеса (обычно 20-40%)
            if gross_margin < 15:
                if self._create_recommendation(
                    company_id=company_id,
                    type=RecommendationType.FINANCIAL,
                    category=RecommendationCategory.MARGIN,
                    priority=RecommendationPriority.CRITICAL,
                    title="Критически низкая валовая рентабельность",
                    description=f"Валовая рентабельность составляет {gross_margin:.1f}%, что критически ниже нормы (обычно 20-40%).",
                    action="Необходимо срочно пересмотреть ценообразование или оптимизировать себестоимость продукции.",
                    meta_data={"gross_margin": float(gross_margin), "net_margin": float(net_margin)},
                    user_id=user_id
                ):
                    count += 1
            
            # Норма чистой рентабельности (обычно 5-15%)
            if net_margin < 0:
                if self._create_recommendation(
                    company_id=company_id,
                    type=RecommendationType.FINANCIAL,
                    category=RecommendationCategory.TREND,
                    priority=RecommendationPriority.CRITICAL,
                    title="Убыточность бизнеса",
                    description=f"Чистая рентабельность отрицательная ({net_margin:.1f}%). Бизнес работает в убыток.",
                    action="Критически необходимо увеличить выручку или сократить расходы для выхода на прибыльность.",
                    meta_data={"net_margin": float(net_margin), "net_profit": float(net_profit)},
                    user_id=user_id
                ):
                    count += 1
            elif net_margin < 5 and net_margin > 0:
                if self._create_recommendation(
                    company_id=company_id,
                    type=RecommendationType.FINANCIAL,
                    category=RecommendationCategory.MARGIN,
                    priority=RecommendationPriority.IMPORTANT,
                    title="Низкая чистая рентабельность",
                    description=f"Чистая рентабельность составляет {net_margin:.1f}%, что ниже рекомендуемой нормы (5-15%).",
                    action="Рекомендуется оптимизировать структуру расходов или увеличить выручку для повышения рентабельности.",
                    meta_data={"net_margin": float(net_margin)},
                    user_id=user_id
                ):
                    count += 1
        
        return count
    
    def _generate_product_performance_analysis(self, company_id: int, user_id: int = None) -> int:
        """Генерирует рекомендации на основе анализа эффективности товаров"""
        count = 0
        today = date.today()
        last_90_days = today - timedelta(days=90)
        
        # Анализ продаж по товарам за последние 90 дней
        product_sales = self.db.query(
            Shipment.product_id,
            func.sum(Shipment.quantity).label('total_quantity'),
            func.sum(Shipment.cost_price * Shipment.quantity).label('total_cost')
        ).filter(
            Shipment.company_id == company_id,
            Shipment.date >= last_90_days,
            Shipment.date <= today
        ).group_by(Shipment.product_id).all()
        
        if product_sales:
            # Находим товары с наименьшими продажами
            sorted_sales = sorted(product_sales, key=lambda x: float(x.total_quantity or 0))
            bottom_20_percent = sorted_sales[:max(1, len(sorted_sales) // 5)]
            
            for product_sale in bottom_20_percent:
                product = self.db.query(Product).filter(Product.id == product_sale.product_id).first()
                if product and product.is_active:
                    if self._create_recommendation(
                        company_id=company_id,
                        type=RecommendationType.OPERATIONAL,
                        category=RecommendationCategory.PRODUCT,
                        priority=RecommendationPriority.IMPORTANT,
                        title=f"Товар '{product.name}' в числе наименее продаваемых",
                        description=f"Товар '{product.name}' находится в нижних 20% по продажам за последние 90 дней ({product_sale.total_quantity or 0} единиц).",
                        action=f"Рассмотрите возможность акций, улучшения позиционирования или прекращения продаж товара '{product.name}'.",
                        meta_data={"product_id": product.id, "sales_quantity": float(product_sale.total_quantity or 0)},
                        related_table="products",
                        related_id=product.id,
                        user_id=user_id
                    ):
                        count += 1
        
        return count
    
    def _generate_statistical_anomalies(self, company_id: int, user_id: int = None) -> int:
        """Выявляет аномалии в данных на основе статистического анализа"""
        count = 0
        today = date.today()
        last_6_months = today - timedelta(days=180)
        
        # Собираем месячные данные о выручке за последние 6 месяцев
        monthly_revenues = []
        current = last_6_months.replace(day=1)
        
        while current <= today:
            month_end = (current + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            if month_end > today:
                month_end = today
            
            month_revenue = self.db.query(func.sum(Realization.revenue)).filter(
                Realization.company_id == company_id,
                Realization.date >= current,
                Realization.date <= month_end
            ).scalar() or 0
            
            if month_revenue > 0:
                monthly_revenues.append(float(month_revenue))
            
            if current.month == 12:
                current = current.replace(year=current.year + 1, month=1)
            else:
                current = current.replace(month=current.month + 1)
        
        if len(monthly_revenues) >= 3:
            # Вычисляем среднее и стандартное отклонение
            avg_revenue = sum(monthly_revenues) / len(monthly_revenues)
            variance = sum((x - avg_revenue) ** 2 for x in monthly_revenues) / len(monthly_revenues)
            std_dev = variance ** 0.5
            
            # Последний месяц
            last_month_revenue = monthly_revenues[-1]
            
            # Выявляем аномалии (отклонение более 2 стандартных отклонений)
            if std_dev > 0:
                z_score = (last_month_revenue - avg_revenue) / std_dev
                
                if abs(z_score) > 2:
                    if z_score < -2:  # Сильное падение
                        if self._create_recommendation(
                            company_id=company_id,
                            type=RecommendationType.ANALYTICAL,
                            category=RecommendationCategory.ANOMALY,
                            priority=RecommendationPriority.CRITICAL,
                            title="Аномальное падение выручки",
                            description=f"Выручка в текущем месяце ({last_month_revenue:.0f} ₽) отклоняется от среднего значения более чем на 2 стандартных отклонения. Это статистически значимое отклонение.",
                            action="Проанализируйте причины аномального падения и примите срочные меры по восстановлению продаж.",
                            meta_data={"z_score": float(z_score), "avg_revenue": float(avg_revenue), "last_revenue": float(last_month_revenue)},
                            user_id=user_id
                        ):
                            count += 1
        
        return count
    
    def _generate_period_comparison_recommendations(self, company_id: int, user_id: int = None) -> int:
        """Генерирует рекомендации на основе сравнения периодов"""
        count = 0
        today = date.today()
        
        # Сравнение текущего квартала с предыдущим
        current_quarter_start = date(today.year, ((today.month - 1) // 3) * 3 + 1, 1)
        prev_quarter_start = date(current_quarter_start.year, current_quarter_start.month - 3, 1) if current_quarter_start.month > 3 else date(current_quarter_start.year - 1, 10, 1)
        prev_quarter_end = (current_quarter_start - timedelta(days=1))
        
        # Выручка текущего квартала
        current_quarter_revenue = self.db.query(func.sum(Realization.revenue)).filter(
            Realization.company_id == company_id,
            Realization.date >= current_quarter_start,
            Realization.date <= today
        ).scalar() or 0
        
        # Выручка предыдущего квартала
        prev_quarter_revenue = self.db.query(func.sum(Realization.revenue)).filter(
            Realization.company_id == company_id,
            Realization.date >= prev_quarter_start,
            Realization.date <= prev_quarter_end
        ).scalar() or 0
        
        if prev_quarter_revenue > 0:
            # Расходы текущего квартала
            current_quarter_expenses = self.db.query(func.sum(MoneyMovement.amount)).filter(
                MoneyMovement.movement_type == "expense",
                MoneyMovement.company_id == company_id,
                MoneyMovement.date >= current_quarter_start,
                MoneyMovement.date <= today,
                MoneyMovement.is_business == True
            ).scalar() or 0
            
            # Расходы предыдущего квартала
            prev_quarter_expenses = self.db.query(func.sum(MoneyMovement.amount)).filter(
                MoneyMovement.movement_type == "expense",
                MoneyMovement.company_id == company_id,
                MoneyMovement.date >= prev_quarter_start,
                MoneyMovement.date <= prev_quarter_end,
                MoneyMovement.is_business == True
            ).scalar() or 0
            
            revenue_change = ((current_quarter_revenue - prev_quarter_revenue) / prev_quarter_revenue) * 100
            expenses_change = ((current_quarter_expenses - prev_quarter_expenses) / prev_quarter_expenses) * 100 if prev_quarter_expenses > 0 else 0
            
            # Если расходы растут быстрее выручки
            if expenses_change > 0 and revenue_change < expenses_change and expenses_change - revenue_change > 10:
                if self._create_recommendation(
                    company_id=company_id,
                    type=RecommendationType.FINANCIAL,
                    category=RecommendationCategory.EXPENSES,
                    priority=RecommendationPriority.IMPORTANT,
                    title="Рост расходов опережает рост выручки",
                    description=f"Расходы выросли на {expenses_change:.1f}%, а выручка на {revenue_change:.1f}% в сравнении с предыдущим кварталом. Разница составляет {expenses_change - revenue_change:.1f}%.",
                    action="Необходимо оптимизировать структуру расходов или увеличить выручку для поддержания рентабельности.",
                    meta_data={"revenue_change": float(revenue_change), "expenses_change": float(expenses_change)},
                    user_id=user_id
                ):
                    count += 1
        
        return count
    
    def _generate_sales_recommendations(self, company_id: int, user_id: int = None) -> int:
        """Генерирует рекомендации по продажам и каналам продаж"""
        count = 0
        today = date.today()
        last_month = today - timedelta(days=30)
        two_months_ago = today - timedelta(days=60)
        last_90_days = today - timedelta(days=90)
        
        # Анализ эффективности каналов продаж
        channel_sales = self.db.query(
            Realization.sales_channel_id,
            func.sum(Realization.revenue).label('total_revenue'),
            func.sum(Realization.quantity).label('total_quantity'),
            func.count(Realization.id).label('transaction_count')
        ).filter(
            Realization.company_id == company_id,
            Realization.date >= last_90_days,
            Realization.date <= today
        ).group_by(Realization.sales_channel_id).all()
        
        if len(channel_sales) > 1:
            # Находим каналы с низкими продажами
            total_revenue = sum(float(sale.total_revenue or 0) for sale in channel_sales)
            avg_revenue_per_channel = total_revenue / len(channel_sales) if len(channel_sales) > 0 else 0
            
            for sale in channel_sales:
                channel_revenue = float(sale.total_revenue or 0)
                if channel_revenue > 0 and channel_revenue < avg_revenue_per_channel * 0.5:
                    # Канал продаж работает менее чем на 50% от среднего
                    channel = self.db.query(SalesChannel).filter(SalesChannel.id == sale.sales_channel_id).first()
                    if channel:
                        if self._create_recommendation(
                            company_id=company_id,
                            type=RecommendationType.OPERATIONAL,
                            category=RecommendationCategory.SALES,
                            priority=RecommendationPriority.IMPORTANT,
                            title=f"Низкая эффективность канала продаж '{channel.name}'",
                            description=f"Канал продаж '{channel.name}' показывает низкие результаты: {channel_revenue:.0f} ₽ за последние 90 дней, что ниже среднего по всем каналам.",
                            action=f"Проанализируйте причины низкой эффективности канала '{channel.name}' и рассмотрите возможность оптимизации или перераспределения ресурсов.",
                            meta_data={"sales_channel_id": channel.id, "revenue": channel_revenue, "avg_revenue": avg_revenue_per_channel},
                            related_table="sales_channels",
                            related_id=channel.id,
                            user_id=user_id
                        ):
                            count += 1
        
        # Анализ динамики продаж по каналам
        for sale in channel_sales:
            channel_id = sale.sales_channel_id
            if not channel_id:
                continue
            
            # Продажи за последний месяц
            last_month_revenue = self.db.query(func.sum(Realization.revenue)).filter(
                Realization.company_id == company_id,
                Realization.sales_channel_id == channel_id,
                Realization.date >= last_month,
                Realization.date < today
            ).scalar() or 0
            
            # Продажи за предыдущий месяц
            prev_month_revenue = self.db.query(func.sum(Realization.revenue)).filter(
                Realization.company_id == company_id,
                Realization.sales_channel_id == channel_id,
                Realization.date >= two_months_ago,
                Realization.date < last_month
            ).scalar() or 0
            
            if prev_month_revenue > 0 and last_month_revenue > 0:
                change_percent = ((last_month_revenue - prev_month_revenue) / prev_month_revenue) * 100
                
                if change_percent < -30:  # Падение более чем на 30%
                    channel = self.db.query(SalesChannel).filter(SalesChannel.id == channel_id).first()
                    if channel:
                        if self._create_recommendation(
                            company_id=company_id,
                            type=RecommendationType.ANALYTICAL,
                            category=RecommendationCategory.SALES,
                            priority=RecommendationPriority.IMPORTANT,
                            title=f"Резкое падение продаж в канале '{channel.name}'",
                            description=f"Продажи в канале '{channel.name}' упали на {abs(change_percent):.1f}% по сравнению с предыдущим месяцем.",
                            action=f"Срочно проанализируйте причины падения продаж в канале '{channel.name}' и примите меры по восстановлению.",
                            meta_data={"sales_channel_id": channel.id, "change_percent": float(change_percent)},
                            related_table="sales_channels",
                            related_id=channel.id,
                            user_id=user_id
                        ):
                            count += 1
        
        # Анализ товаров с низкими продажами в реализации
        product_sales = self.db.query(
            RealizationItem.product_id,
            func.sum(RealizationItem.quantity).label('total_quantity'),
            func.sum(RealizationItem.price * RealizationItem.quantity).label('total_revenue')
        ).join(Realization).filter(
            Realization.company_id == company_id,
            Realization.date >= last_90_days,
            Realization.date <= today
        ).group_by(RealizationItem.product_id).all()
        
        if product_sales:
            sorted_sales = sorted(product_sales, key=lambda x: float(x.total_revenue or 0))
            bottom_products = sorted_sales[:max(1, len(sorted_sales) // 5)]
            
            for product_sale in bottom_products:
                product = self.db.query(Product).filter(Product.id == product_sale.product_id).first()
                if product and product.is_active:
                    revenue = float(product_sale.total_revenue or 0)
                    if revenue > 0:  # Только если были продажи
                        if self._create_recommendation(
                            company_id=company_id,
                            type=RecommendationType.OPERATIONAL,
                            category=RecommendationCategory.SALES,
                            priority=RecommendationPriority.INFO,
                            title=f"Товар '{product.name}' в числе наименее продаваемых",
                            description=f"Товар '{product.name}' находится в нижних 20% по выручке от продаж за последние 90 дней ({revenue:.0f} ₽).",
                            action=f"Рассмотрите возможность улучшения маркетинга или пересмотра стратегии продаж для товара '{product.name}'.",
                            meta_data={"product_id": product.id, "revenue": revenue},
                            related_table="products",
                            related_id=product.id,
                            user_id=user_id
                        ):
                            count += 1
        
        return count
    
    def _generate_budget_recommendations(self, company_id: int, user_id: int = None) -> int:
        """Генерирует рекомендации по бюджету"""
        count = 0
        today = date.today()
        
        # Получаем все активные бюджеты
        budgets = self.db.query(Budget).filter(
            Budget.company_id == company_id
        ).all()
        
        for budget in budgets:
            try:
                # Определяем период для бюджета
                if budget.period_type == BudgetPeriod.MONTH:
                    # Формат: "2024-01"
                    year, month = map(int, budget.period_value.split('-'))
                    start_date = date(year, month, 1)
                    if month == 12:
                        end_date = date(year + 1, 1, 1) - timedelta(days=1)
                    else:
                        end_date = date(year, month + 1, 1) - timedelta(days=1)
                elif budget.period_type == BudgetPeriod.QUARTER:
                    # Формат: "2024-Q1"
                    year, quarter = budget.period_value.split('-Q')
                    year = int(year)
                    quarter = int(quarter)
                    start_month = (quarter - 1) * 3 + 1
                    start_date = date(year, start_month, 1)
                    if quarter == 4:
                        end_date = date(year + 1, 1, 1) - timedelta(days=1)
                    else:
                        end_date = date(year, start_month + 3, 1) - timedelta(days=1)
                elif budget.period_type == BudgetPeriod.YEAR:
                    # Формат: "2024"
                    year = int(budget.period_value)
                    start_date = date(year, 1, 1)
                    end_date = date(year, 12, 31)
                else:
                    continue
                
                # Проверяем, относится ли период к текущему времени
                if end_date < today or start_date > today:
                    continue
                
                # Рассчитываем фактические суммы
                if budget.budget_type == BudgetType.INCOME:
                    # Для доходов
                    if budget.income_item_id:
                        actual = self.db.query(func.sum(MoneyMovement.amount)).filter(
                            MoneyMovement.movement_type == "income",
                            MoneyMovement.company_id == company_id,
                            MoneyMovement.income_item_id == budget.income_item_id,
                            MoneyMovement.date >= start_date,
                            MoneyMovement.date <= min(end_date, today),
                            MoneyMovement.is_business == True
                        ).scalar() or 0
                    else:
                        # Общий доход
                        actual = self.db.query(func.sum(MoneyMovement.amount)).filter(
                            MoneyMovement.movement_type == "income",
                            MoneyMovement.company_id == company_id,
                            MoneyMovement.date >= start_date,
                            MoneyMovement.date <= min(end_date, today),
                            MoneyMovement.is_business == True
                        ).scalar() or 0
                else:
                    # Для расходов
                    if budget.expense_item_id:
                        actual = self.db.query(func.sum(MoneyMovement.amount)).filter(
                            MoneyMovement.movement_type == "expense",
                            MoneyMovement.company_id == company_id,
                            MoneyMovement.expense_item_id == budget.expense_item_id,
                            MoneyMovement.date >= start_date,
                            MoneyMovement.date <= min(end_date, today),
                            MoneyMovement.is_business == True
                        ).scalar() or 0
                    else:
                        # Общий расход
                        actual = self.db.query(func.sum(MoneyMovement.amount)).filter(
                            MoneyMovement.movement_type == "expense",
                            MoneyMovement.company_id == company_id,
                            MoneyMovement.date >= start_date,
                            MoneyMovement.date <= min(end_date, today),
                            MoneyMovement.is_business == True
                        ).scalar() or 0
                
                planned = float(budget.planned_amount)
                actual_float = float(actual)
                
                # Проверяем отклонения
                if planned > 0:
                    deviation_percent = ((actual_float - planned) / planned) * 100
                    
                    # Превышение бюджета расходов более чем на 10%
                    if budget.budget_type == BudgetType.EXPENSE and deviation_percent > 10:
                        item_name = "расходов"
                        if budget.expense_item_id:
                            expense_item = self.db.query(ExpenseItem).filter(ExpenseItem.id == budget.expense_item_id).first()
                            if expense_item:
                                item_name = f"расходов по статье '{expense_item.name}'"
                        
                        if self._create_recommendation(
                            company_id=company_id,
                            type=RecommendationType.FINANCIAL,
                            category=RecommendationCategory.BUDGET,
                            priority=RecommendationPriority.IMPORTANT if deviation_percent < 20 else RecommendationPriority.CRITICAL,
                            title=f"Превышение бюджета {item_name}",
                            description=f"Фактические {item_name} ({actual_float:.0f} ₽) превышают запланированные ({planned:.0f} ₽) на {deviation_percent:.1f}% за период {budget.period_value}.",
                            action="Проанализируйте причины превышения бюджета и примите меры по оптимизации расходов.",
                            meta_data={"budget_id": budget.id, "planned": planned, "actual": actual_float, "deviation_percent": float(deviation_percent)},
                            related_table="budgets",
                            related_id=budget.id,
                            user_id=user_id
                        ):
                            count += 1
                    
                    # Недостижение бюджета доходов более чем на 15%
                    elif budget.budget_type == BudgetType.INCOME and deviation_percent < -15:
                        item_name = "доходов"
                        if budget.income_item_id:
                            income_item = self.db.query(IncomeItem).filter(IncomeItem.id == budget.income_item_id).first()
                            if income_item:
                                item_name = f"доходов по статье '{income_item.name}'"
                        
                        if self._create_recommendation(
                            company_id=company_id,
                            type=RecommendationType.FINANCIAL,
                            category=RecommendationCategory.BUDGET,
                            priority=RecommendationPriority.IMPORTANT,
                            title=f"Недостижение бюджета {item_name}",
                            description=f"Фактические {item_name} ({actual_float:.0f} ₽) ниже запланированных ({planned:.0f} ₽) на {abs(deviation_percent):.1f}% за период {budget.period_value}.",
                            action="Проанализируйте причины недостижения плана по доходам и разработайте меры по их увеличению.",
                            meta_data={"budget_id": budget.id, "planned": planned, "actual": actual_float, "deviation_percent": float(deviation_percent)},
                            related_table="budgets",
                            related_id=budget.id,
                            user_id=user_id
                        ):
                            count += 1
            except Exception as e:
                # Пропускаем бюджеты с некорректными данными
                continue
        
        return count
    
    def _generate_assets_liabilities_recommendations(self, company_id: int, user_id: int = None) -> int:
        """Генерирует рекомендации по активам и пассивам"""
        count = 0
        today = date.today()
        
        # Суммируем активы по категориям
        current_assets = self.db.query(func.sum(Asset.value)).filter(
            Asset.company_id == company_id,
            Asset.category == "current",
            Asset.date <= today
        ).scalar() or 0
        
        receivable_assets = self.db.query(func.sum(Asset.value)).filter(
            Asset.company_id == company_id,
            Asset.category == "receivable",
            Asset.date <= today
        ).scalar() or 0
        
        fixed_assets = self.db.query(func.sum(Asset.value)).filter(
            Asset.company_id == company_id,
            Asset.category == "fixed",
            Asset.date <= today
        ).scalar() or 0
        
        total_assets = float(current_assets) + float(receivable_assets) + float(fixed_assets)
        
        # Суммируем обязательства
        short_term_liabilities = self.db.query(func.sum(Liability.value)).filter(
            Liability.company_id == company_id,
            Liability.category == "short_term",
            Liability.date <= today
        ).scalar() or 0
        
        payable_liabilities = self.db.query(func.sum(Liability.value)).filter(
            Liability.company_id == company_id,
            Liability.category == "payable",
            Liability.date <= today
        ).scalar() or 0
        
        long_term_liabilities = self.db.query(func.sum(Liability.value)).filter(
            Liability.company_id == company_id,
            Liability.category == "long_term",
            Liability.date <= today
        ).scalar() or 0
        
        total_liabilities = float(short_term_liabilities) + float(payable_liabilities) + float(long_term_liabilities)
        
        # Анализ соотношения активов и обязательств
        if total_assets > 0:
            debt_to_assets_ratio = (total_liabilities / total_assets) * 100
            
            # Высокое соотношение долга к активам (более 70%)
            if debt_to_assets_ratio > 70:
                if self._create_recommendation(
                    company_id=company_id,
                    type=RecommendationType.FINANCIAL,
                    category=RecommendationCategory.CASH_FLOW,
                    priority=RecommendationPriority.CRITICAL,
                    title="Высокое соотношение долга к активам",
                    description=f"Соотношение обязательств к активам составляет {debt_to_assets_ratio:.1f}%, что указывает на высокую долговую нагрузку.",
                    action="Необходимо проанализировать структуру обязательств и рассмотреть возможность реструктуризации долга.",
                    meta_data={"debt_to_assets_ratio": float(debt_to_assets_ratio), "total_assets": total_assets, "total_liabilities": total_liabilities},
                    user_id=user_id
                ):
                    count += 1
            
            # Низкое соотношение оборотных активов к краткосрочным обязательствам (менее 1.0)
            current_liabilities = float(short_term_liabilities) + float(payable_liabilities)
            if current_liabilities > 0:
                current_ratio = float(current_assets) / current_liabilities
                if current_ratio < 1.0:
                    if self._create_recommendation(
                        company_id=company_id,
                        type=RecommendationType.FINANCIAL,
                        category=RecommendationCategory.CASH_FLOW,
                        priority=RecommendationPriority.CRITICAL,
                        title="Низкий коэффициент текущей ликвидности",
                        description=f"Коэффициент текущей ликвидности составляет {current_ratio:.2f}, что ниже рекомендуемого значения 1.0. Оборотные активы недостаточны для покрытия краткосрочных обязательств.",
                        action="Необходимо увеличить оборотные активы или сократить краткосрочные обязательства для обеспечения финансовой стабильности.",
                        meta_data={"current_ratio": float(current_ratio), "current_assets": float(current_assets), "current_liabilities": current_liabilities},
                        user_id=user_id
                    ):
                        count += 1
        
        # Анализ дебиторской задолженности
        if float(receivable_assets) > 0:
            # Сравниваем с выручкой за последние 3 месяца
            last_3_months = today - timedelta(days=90)
            revenue = self.db.query(func.sum(Realization.revenue)).filter(
                Realization.company_id == company_id,
                Realization.date >= last_3_months,
                Realization.date <= today
            ).scalar() or 0
            
            if float(revenue) > 0:
                receivable_to_revenue_ratio = (float(receivable_assets) / float(revenue)) * 100
                
                # Высокая дебиторская задолженность (более 30% от выручки)
                if receivable_to_revenue_ratio > 30:
                    if self._create_recommendation(
                        company_id=company_id,
                        type=RecommendationType.FINANCIAL,
                        category=RecommendationCategory.CASH_FLOW,
                        priority=RecommendationPriority.IMPORTANT,
                        title="Высокая дебиторская задолженность",
                        description=f"Дебиторская задолженность составляет {receivable_to_revenue_ratio:.1f}% от выручки за последние 3 месяца, что указывает на проблемы с взысканием платежей.",
                        action="Усильте работу по взысканию дебиторской задолженности и рассмотрите возможность ужесточения условий оплаты.",
                        meta_data={"receivable_assets": float(receivable_assets), "revenue": float(revenue), "ratio": float(receivable_to_revenue_ratio)},
                        user_id=user_id
                    ):
                        count += 1
        
        return count
    
    def _generate_inventory_recommendations(self, company_id: int, user_id: int = None) -> int:
        """Генерирует рекомендации по складам и остаткам"""
        count = 0
        today = date.today()
        last_90_days = today - timedelta(days=90)
        
        # Анализ остатков товаров на складах
        # Фильтруем через Warehouse, так как Product не имеет company_id
        inventory_items = self.db.query(Inventory).join(
            Product, Inventory.product_id == Product.id
        ).join(
            Warehouse, Inventory.warehouse_id == Warehouse.id
        ).filter(
            Warehouse.company_id == company_id,
            Product.is_active == True
        ).all()
        
        for inv in inventory_items:
            quantity = float(inv.quantity or 0)
            min_stock = float(inv.min_stock_level or 0)
            
            # Низкий остаток (ниже минимального уровня)
            if min_stock > 0 and quantity < min_stock:
                if self._create_recommendation(
                    company_id=company_id,
                    type=RecommendationType.OPERATIONAL,
                    category=RecommendationCategory.PRODUCT,
                    priority=RecommendationPriority.IMPORTANT,
                    title=f"Низкий остаток товара '{inv.product.name}' на складе",
                    description=f"Остаток товара '{inv.product.name}' на складе ({quantity:.0f}) ниже минимального уровня ({min_stock:.0f}).",
                    action=f"Необходимо пополнить остаток товара '{inv.product.name}' для обеспечения бесперебойных продаж.",
                    meta_data={"product_id": inv.product_id, "warehouse_id": inv.warehouse_id, "quantity": quantity, "min_stock": min_stock},
                    related_table="inventory",
                    related_id=inv.id,
                    user_id=user_id
                ):
                    count += 1
            
            # Избыточный остаток (более 180 дней оборачиваемости)
            if quantity > 0 and inv.product.selling_price:
                # Рассчитываем общее количество продаж за последние 90 дней
                total_sales = self.db.query(func.sum(RealizationItem.quantity)).filter(
                    RealizationItem.product_id == inv.product_id
                ).join(Realization).filter(
                    Realization.company_id == company_id,
                    Realization.date >= last_90_days,
                    Realization.date <= today
                ).scalar() or 0
                
                if total_sales and float(total_sales) > 0:
                    avg_daily_sales = float(total_sales) / 90
                    days_of_stock = quantity / avg_daily_sales
                    
                    if days_of_stock > 180:
                        if self._create_recommendation(
                            company_id=company_id,
                            type=RecommendationType.OPERATIONAL,
                            category=RecommendationCategory.TURNOVER,
                            priority=RecommendationPriority.IMPORTANT,
                            title=f"Избыточный остаток товара '{inv.product.name}'",
                            description=f"Остаток товара '{inv.product.name}' на складе достаточен на {days_of_stock:.0f} дней при текущих темпах продаж, что указывает на избыточные запасы.",
                            action=f"Рассмотрите возможность проведения распродажи или снижения закупок товара '{inv.product.name}' для оптимизации оборотных средств.",
                            meta_data={"product_id": inv.product_id, "warehouse_id": inv.warehouse_id, "quantity": quantity, "days_of_stock": float(days_of_stock)},
                            related_table="inventory",
                            related_id=inv.id,
                            user_id=user_id
                        ):
                            count += 1
            
            # Товары без продаж, но с остатками
            if quantity > 0:
                has_sales = self.db.query(RealizationItem).join(Realization).filter(
                    RealizationItem.product_id == inv.product_id,
                    Realization.company_id == company_id,
                    Realization.date >= last_90_days
                ).first()
                
                if not has_sales:
                    if self._create_recommendation(
                        company_id=company_id,
                        type=RecommendationType.OPERATIONAL,
                        category=RecommendationCategory.TURNOVER,
                        priority=RecommendationPriority.IMPORTANT,
                        title=f"Товар '{inv.product.name}' не продавался, но есть остатки",
                        description=f"Товар '{inv.product.name}' имеет остаток на складе ({quantity:.0f} единиц), но не продавался за последние 90 дней.",
                        action=f"Рассмотрите возможность распродажи или списания неликвидного товара '{inv.product.name}'.",
                        meta_data={"product_id": inv.product_id, "warehouse_id": inv.warehouse_id, "quantity": quantity},
                        related_table="inventory",
                        related_id=inv.id,
                        user_id=user_id
                    ):
                        count += 1
        
        return count
    
    def _generate_customers_suppliers_recommendations(self, company_id: int, user_id: int = None) -> int:
        """Генерирует рекомендации по клиентам и поставщикам"""
        count = 0
        today = date.today()
        last_90_days = today - timedelta(days=90)
        last_180_days = today - timedelta(days=180)
        
        # Анализ клиентов
        customers = self.db.query(Customer).filter(
            Customer.company_id == company_id,
            Customer.is_active == True
        ).all()
        
        # Клиенты без покупок более 90 дней
        for customer in customers:
            if customer.last_purchase_date:
                days_since_purchase = (today - customer.last_purchase_date).days
                
                if days_since_purchase > 90:
                    if self._create_recommendation(
                        company_id=company_id,
                        type=RecommendationType.OPERATIONAL,
                        category=RecommendationCategory.SALES,
                        priority=RecommendationPriority.INFO,
                        title=f"Клиент '{customer.name}' не совершал покупок более 90 дней",
                        description=f"Клиент '{customer.name}' не совершал покупок {days_since_purchase} дней. Последняя покупка: {customer.last_purchase_date}.",
                        action=f"Рекомендуется связаться с клиентом '{customer.name}' для восстановления активности или выяснения причин отсутствия покупок.",
                        meta_data={"customer_id": customer.id, "days_since_purchase": days_since_purchase, "ltv": float(customer.ltv or 0)},
                        related_table="customers",
                        related_id=customer.id,
                        user_id=user_id
                    ):
                        count += 1
        
        # Анализ дебиторской задолженности через активы
        receivable_assets = self.db.query(Asset).filter(
            Asset.company_id == company_id,
            Asset.category == "receivable",
            Asset.date <= today
        ).all()
        
        # Группируем по клиентам (если есть связь через имя или метаданные)
        total_receivable = sum(float(asset.value) for asset in receivable_assets)
        
        if total_receivable > 0:
            # Сравниваем с выручкой
            revenue = self.db.query(func.sum(Realization.revenue)).filter(
                Realization.company_id == company_id,
                Realization.date >= last_180_days,
                Realization.date <= today
            ).scalar() or 0
            
            if float(revenue) > 0:
                receivable_ratio = (total_receivable / float(revenue)) * 100
                
                if receivable_ratio > 25:
                    if self._create_recommendation(
                        company_id=company_id,
                        type=RecommendationType.FINANCIAL,
                        category=RecommendationCategory.CASH_FLOW,
                        priority=RecommendationPriority.IMPORTANT,
                        title="Высокая дебиторская задолженность клиентов",
                        description=f"Общая дебиторская задолженность составляет {total_receivable:.0f} ₽, что составляет {receivable_ratio:.1f}% от выручки за последние 6 месяцев.",
                        action="Усильте работу по взысканию дебиторской задолженности. Рассмотрите возможность ужесточения условий оплаты или введения предоплаты.",
                        meta_data={"total_receivable": total_receivable, "revenue": float(revenue), "ratio": float(receivable_ratio)},
                        user_id=user_id
                    ):
                        count += 1
        
        # Анализ поставщиков
        suppliers = self.db.query(Supplier).filter(
            Supplier.company_id == company_id,
            Supplier.is_active == True
        ).all()
        
        # Поставщики с низким рейтингом
        for supplier in suppliers:
            if supplier.rating and float(supplier.rating) < 3.0:
                if self._create_recommendation(
                    company_id=company_id,
                    type=RecommendationType.OPERATIONAL,
                    category=RecommendationCategory.PRODUCT,
                    priority=RecommendationPriority.INFO,
                    title=f"Низкий рейтинг поставщика '{supplier.name}'",
                    description=f"Поставщик '{supplier.name}' имеет низкий рейтинг ({supplier.rating:.1f}/5.0), что может указывать на проблемы с качеством или сроками поставок.",
                    action=f"Проанализируйте причины низкого рейтинга поставщика '{supplier.name}' и рассмотрите возможность поиска альтернативных поставщиков.",
                    meta_data={"supplier_id": supplier.id, "rating": float(supplier.rating)},
                    related_table="suppliers",
                    related_id=supplier.id,
                    user_id=user_id
                ):
                    count += 1
        
        # Анализ кредиторской задолженности через обязательства
        payable_liabilities = self.db.query(Liability).filter(
            Liability.company_id == company_id,
            Liability.category == "payable",
            Liability.date <= today
        ).all()
        
        total_payable = sum(float(liability.value) for liability in payable_liabilities)
        
        if total_payable > 0:
            # Сравниваем с расходами за последние 3 месяца
            expenses = self.db.query(func.sum(MoneyMovement.amount)).filter(
                MoneyMovement.movement_type == "expense",
                MoneyMovement.company_id == company_id,
                MoneyMovement.date >= last_90_days,
                MoneyMovement.date <= today,
                MoneyMovement.is_business == True
            ).scalar() or 0
            
            if float(expenses) > 0:
                payable_ratio = (total_payable / float(expenses)) * 100
                
                # Высокая кредиторская задолженность (более 50% от расходов)
                if payable_ratio > 50:
                    if self._create_recommendation(
                        company_id=company_id,
                        type=RecommendationType.FINANCIAL,
                        category=RecommendationCategory.CASH_FLOW,
                        priority=RecommendationPriority.IMPORTANT,
                        title="Высокая кредиторская задолженность",
                        description=f"Общая кредиторская задолженность составляет {total_payable:.0f} ₽, что составляет {payable_ratio:.1f}% от расходов за последние 3 месяца.",
                        action="Проанализируйте структуру кредиторской задолженности и разработайте план погашения. Рассмотрите возможность реструктуризации долга.",
                        meta_data={"total_payable": total_payable, "expenses": float(expenses), "ratio": float(payable_ratio)},
                        user_id=user_id
                    ):
                        count += 1
        
        return count