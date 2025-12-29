from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import date
from app.database import get_db
from app.models.user import User
from app.models.input1 import MoneyMovement
from app.models.realization import Realization
from app.models.shipment import Shipment
from app.models.reference import SalesChannel
from app.auth.security import get_current_user

router = APIRouter()

@router.get("/")
def get_profit_loss_analysis(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    company_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Детальный анализ прибылей и убытков (Анализ ОПУ)
    Разбивка по каналам, валовая прибыль по направлениям, производственные расходы
    """
    try:
        if not start_date:
            start_date = date.today().replace(day=1)
        if not end_date:
            end_date = date.today()
        
        # Получаем каналы продаж из справочника
        sales_channels = db.query(SalesChannel).filter(SalesChannel.is_active == True).all()
        channel_map = {channel.id: channel.name for channel in sales_channels}
        
        # Выручка по каналам из реализации (используем sales_channel_id напрямую)
        revenue_by_channel = {}
        for channel_id, channel_name in channel_map.items():
            try:
                revenue_query = db.query(func.sum(Realization.revenue)).filter(
                    Realization.date >= start_date,
                    Realization.date <= end_date,
                    Realization.sales_channel_id == channel_id
                )
                if company_id:
                    revenue_query = revenue_query.filter(Realization.company_id == company_id)
                revenue = revenue_query.scalar() or 0
                revenue_by_channel[channel_name] = float(revenue)
            except Exception as e:
                print(f"Error querying revenue for channel {channel_name}: {e}")
                revenue_by_channel[channel_name] = 0
        
        # Затраты по каналам (из отгрузок)
        marketplace_costs_by_channel = {}
        for channel_id, channel_name in channel_map.items():
            try:
                cost_query = db.query(func.sum(Shipment.cost_price * Shipment.quantity)).filter(
                    Shipment.date >= start_date,
                    Shipment.date <= end_date,
                    Shipment.sales_channel_id == channel_id
                )
                if company_id:
                    cost_query = cost_query.filter(Shipment.company_id == company_id)
                cost = cost_query.scalar() or 0
                marketplace_costs_by_channel[channel_name] = float(cost)
            except Exception as e:
                print(f"Error querying costs for channel {channel_name}: {e}")
                marketplace_costs_by_channel[channel_name] = 0
        
        # Прямые производственные расходы по каналам
        # ЗП производство, ЗП аутсорс, Сырьевые затраты
        from app.models.reference import ExpenseItem
        
        # Получаем статьи расходов для производства
        production_items = db.query(ExpenseItem).filter(
            ExpenseItem.is_active == True
        ).all()
        
        # Для упрощения считаем все расходы как производственные
        # В реальности нужно будет добавить категории или теги к статьям расходов
        direct_production_costs_query = db.query(func.sum(MoneyMovement.amount)).filter(
            MoneyMovement.movement_type == "expense",
            MoneyMovement.date >= start_date,
            MoneyMovement.date <= end_date,
            MoneyMovement.is_business == True
        )
        if company_id:
            direct_production_costs_query = direct_production_costs_query.filter(MoneyMovement.company_id == company_id)
        direct_production_costs_total = direct_production_costs_query.scalar() or 0
        
        # Распределяем производственные расходы пропорционально выручке
        total_revenue = sum(revenue_by_channel.values())
        direct_production_by_channel = {}
        for channel_name in channel_map.values():
            revenue = revenue_by_channel.get(channel_name, 0)
            if total_revenue > 0:
                direct_production_by_channel[channel_name] = float(direct_production_costs_total) * (revenue / total_revenue)
            else:
                direct_production_by_channel[channel_name] = 0
        
        # Валовая прибыль по направлениям (ВП1) = Выручка - Затраты на MP - Прямые производственные
        gross_profit_by_channel = {}
        gross_margin_by_channel = {}
        
        for channel_name in channel_map.values():
            revenue = revenue_by_channel.get(channel_name, 0)
            marketplace_cost = marketplace_costs_by_channel.get(channel_name, 0)
            direct_production = direct_production_by_channel.get(channel_name, 0)
            
            gross_profit = revenue - marketplace_cost - direct_production
            gross_profit_by_channel[channel_name] = gross_profit
            
            margin = (gross_profit / revenue * 100) if revenue > 0 else 0
            gross_margin_by_channel[channel_name] = round(margin, 2)
        
        # Общая валовая прибыль
        total_gross_profit = sum(gross_profit_by_channel.values())
        
        # Косвенные расходы
        # Административные расходы
        admin_expense_items = db.query(ExpenseItem).filter(
            ExpenseItem.is_active == True,
            func.lower(ExpenseItem.name).in_([
                'аренда', 'зарплата управляющий', 'бухгалтер', 'офис', 'коммунальные',
                'административные', 'управленческие', 'бонусы'
            ])
        ).all()
        
        admin_expense_ids = [item.id for item in admin_expense_items]
        
        administrative_expenses_query = db.query(func.sum(MoneyMovement.amount)).filter(
            MoneyMovement.movement_type == "expense",
            MoneyMovement.date >= start_date,
            MoneyMovement.date <= end_date,
            MoneyMovement.is_business == True,
            MoneyMovement.expense_item_id.in_(admin_expense_ids) if admin_expense_ids else True
        )
        if company_id:
            administrative_expenses_query = administrative_expenses_query.filter(MoneyMovement.company_id == company_id)
        administrative_expenses = administrative_expenses_query.scalar() or 0
        
        # Коммерческие расходы
        commercial_expense_items = db.query(ExpenseItem).filter(
            ExpenseItem.is_active == True,
            func.lower(ExpenseItem.name).in_([
                'маркетинг', 'реклама', 'доставка', 'продажи', 'коммерческие', 'упаковка'
            ])
        ).all()
        
        commercial_expense_ids = [item.id for item in commercial_expense_items]
        
        commercial_expenses_query = db.query(func.sum(MoneyMovement.amount)).filter(
            MoneyMovement.movement_type == "expense",
            MoneyMovement.date >= start_date,
            MoneyMovement.date <= end_date,
            MoneyMovement.is_business == True,
            MoneyMovement.expense_item_id.in_(commercial_expense_ids) if commercial_expense_ids else True
        )
        if company_id:
            commercial_expenses_query = commercial_expenses_query.filter(MoneyMovement.company_id == company_id)
        commercial_expenses = commercial_expenses_query.scalar() or 0
        
        # Если нет специальных статей, делим расходы пополам
        if administrative_expenses == 0 and commercial_expenses == 0:
            all_expenses_query = db.query(func.sum(MoneyMovement.amount)).filter(
                MoneyMovement.movement_type == "expense",
                MoneyMovement.date >= start_date,
                MoneyMovement.date <= end_date,
                MoneyMovement.is_business == True
            )
            if company_id:
                all_expenses_query = all_expenses_query.filter(MoneyMovement.company_id == company_id)
            all_expenses = all_expenses_query.scalar() or 0
            # Вычитаем уже учтенные производственные расходы
            remaining = float(all_expenses) - float(direct_production_costs_total)
            if remaining > 0:
                administrative_expenses = remaining * 0.5
                commercial_expenses = remaining * 0.5
        
        total_indirect_expenses = float(administrative_expenses) + float(commercial_expenses)
        
        # Операционная прибыль (EBITDA)
        operating_profit = total_gross_profit - total_indirect_expenses
        
        # Налоги и прочие расходы ниже EBITDA
        taxes = 0  # Можно добавить позже
        other_expenses_below_ebitda = 0  # Амортизация и т.д.
        
        # Чистая прибыль
        net_profit = operating_profit - float(taxes) - float(other_expenses_below_ebitda)
        
        # Рентабельность
        total_revenue_sum = sum(revenue_by_channel.values())
        total_gross_margin = (total_gross_profit / total_revenue_sum * 100) if total_revenue_sum > 0 else 0
        operating_margin = (operating_profit / total_revenue_sum * 100) if total_revenue_sum > 0 else 0
        net_margin = (net_profit / total_revenue_sum * 100) if total_revenue_sum > 0 else 0
        
        # Формируем результат по каналам
        channels_data = []
        for channel_name in channel_map.values():
            revenue = revenue_by_channel.get(channel_name, 0)
            marketplace_cost = marketplace_costs_by_channel.get(channel_name, 0)
            direct_production = direct_production_by_channel.get(channel_name, 0)
            gross_profit = gross_profit_by_channel.get(channel_name, 0)
            gross_margin = gross_margin_by_channel.get(channel_name, 0)
            
            channels_data.append({
                "channel": channel_name,
                "revenue": revenue,
                "marketplace_costs": marketplace_cost,
                "direct_production_costs": direct_production,
                "gross_profit": gross_profit,
                "gross_margin": gross_margin
            })
        
        # Генерация выводов и рекомендаций
        insights = []
        recommendations = []
        
        # Анализ общей выручки
        if total_revenue_sum == 0:
            insights.append("⚠️ За выбранный период отсутствует выручка. Проверьте корректность введенных данных о реализациях.")
            recommendations.append("Убедитесь, что все реализации за период зарегистрированы в системе.")
        elif total_revenue_sum < 100000:
            insights.append(f"💰 Общая выручка составляет {total_revenue_sum:,.0f} ₽. Это низкий уровень для большинства бизнесов.")
            recommendations.append("Рассмотрите возможности увеличения объемов продаж или расширения ассортимента.")
        
        # Анализ валовой прибыли
        if total_gross_margin < 0:
            insights.append(f"🔴 Валовая прибыль отрицательная ({total_gross_margin:.1f}%). Бизнес работает в убыток на уровне производства.")
            recommendations.append("Критическая ситуация! Срочно пересмотрите ценообразование и себестоимость продукции.")
        elif total_gross_margin < 10:
            insights.append(f"⚠️ Низкая рентабельность валовой прибыли ({total_gross_margin:.1f}%). Недостаточно для покрытия косвенных расходов.")
            recommendations.append("Повысьте цены или снизите производственные затраты для улучшения валовой прибыли.")
        elif total_gross_margin < 20:
            insights.append(f"📊 Рентабельность валовой прибыли на приемлемом уровне ({total_gross_margin:.1f}%), но есть потенциал для улучшения.")
            recommendations.append("Проанализируйте возможность повышения цен или снижения себестоимости товаров.")
        else:
            insights.append(f"✅ Хорошая рентабельность валовой прибыли ({total_gross_margin:.1f}%). Валовая прибыль достаточна для покрытия расходов.")
        
        # Анализ по каналам
        unprofitable_channels = [ch for ch in channels_data if ch["gross_profit"] < 0]
        if unprofitable_channels:
            channel_names = ", ".join([ch["channel"] for ch in unprofitable_channels])
            insights.append(f"🔴 Убыточные каналы: {channel_names}. Валовая прибыль отрицательная.")
            recommendations.append(f"Пересмотрите работу с каналами {channel_names}: оптимизируйте цены, снизьте затраты или рассмотрите возможность прекращения работы.")
        
        profitable_channels = [ch for ch in channels_data if ch["gross_profit"] > 0]
        if profitable_channels:
            best_channel = max(profitable_channels, key=lambda x: x["gross_margin"])
            insights.append(f"⭐ Наиболее рентабельный канал: {best_channel['channel']} (рентабельность ВП: {best_channel['gross_margin']:.1f}%).")
            recommendations.append(f"Увеличьте объемы продаж через канал {best_channel['channel']} для максимизации прибыли.")
        
        # Анализ производственных расходов
        if total_revenue_sum > 0:
            production_cost_ratio = (float(direct_production_costs_total) / total_revenue_sum) * 100
            if production_cost_ratio > 50:
                insights.append(f"⚠️ Высокая доля производственных расходов ({production_cost_ratio:.1f}% от выручки).")
                recommendations.append("Оптимизируйте производственные процессы, рассмотрите возможность снижения себестоимости или аутсорсинга.")
            elif production_cost_ratio > 30:
                insights.append(f"📊 Производственные расходы составляют {production_cost_ratio:.1f}% от выручки.")
                recommendations.append("Проанализируйте возможности снижения производственных затрат без ущерба качеству.")
        
        # Анализ косвенных расходов
        if total_revenue_sum > 0:
            indirect_expenses_ratio = (total_indirect_expenses / total_revenue_sum) * 100
            admin_ratio = (float(administrative_expenses) / total_revenue_sum) * 100
            commercial_ratio = (float(commercial_expenses) / total_revenue_sum) * 100
            
            if indirect_expenses_ratio > 30:
                insights.append(f"⚠️ Высокая доля косвенных расходов ({indirect_expenses_ratio:.1f}% от выручки).")
                recommendations.append("Оптимизируйте административные и коммерческие расходы. Рассмотрите возможность сокращения непроизводственных затрат.")
            elif indirect_expenses_ratio > 20:
                insights.append(f"📊 Косвенные расходы составляют {indirect_expenses_ratio:.1f}% от выручки (административные: {admin_ratio:.1f}%, коммерческие: {commercial_ratio:.1f}%).")
                recommendations.append("Проанализируйте структуру косвенных расходов на предмет оптимизации.")
            
            if admin_ratio > 15:
                insights.append(f"📊 Административные расходы высокие ({admin_ratio:.1f}% от выручки).")
                recommendations.append("Оптимизируйте административные расходы: рассмотрите возможность сокращения офисных затрат или оптимизации штата.")
            
            if commercial_ratio > 15:
                insights.append(f"📊 Коммерческие расходы высокие ({commercial_ratio:.1f}% от выручки).")
                recommendations.append("Проанализируйте эффективность маркетинговых и рекламных расходов. Убедитесь, что они приносят достаточный результат.")
        
        # Анализ операционной прибыли (EBITDA)
        if operating_margin < 0:
            insights.append(f"🔴 Операционная прибыль (EBITDA) отрицательная ({operating_margin:.1f}%). Бизнес убыточен на операционном уровне.")
            recommendations.append("Критическая ситуация! Необходимы срочные меры: повышение выручки, снижение всех видов расходов или пересмотр бизнес-модели.")
        elif operating_profit < 50000:
            insights.append(f"⚠️ Низкая операционная прибыль ({operating_profit:,.0f} ₽, {operating_margin:.1f}%).")
            recommendations.append("Увеличьте объемы продаж или оптимизируйте расходы для повышения операционной прибыли.")
        elif operating_margin < 5:
            insights.append(f"📊 Операционная прибыль на низком уровне ({operating_margin:.1f}%).")
            recommendations.append("Работайте над повышением операционной эффективности для увеличения прибыли.")
        else:
            insights.append(f"✅ Операционная прибыль (EBITDA) положительная ({operating_margin:.1f}%). Бизнес работает прибыльно.")
        
        # Анализ чистой прибыли
        if net_margin < 0:
            insights.append(f"🔴 Чистая прибыль отрицательная ({net_margin:.1f}%). После всех расходов бизнес работает в убыток.")
            recommendations.append("Критическая ситуация! Необходимо срочно повысить выручку или снизить расходы. Рассмотрите возможность привлечения финансирования.")
        elif net_profit < 30000:
            insights.append(f"⚠️ Низкая чистая прибыль ({net_profit:,.0f} ₽, {net_margin:.1f}%).")
            recommendations.append("Работайте над увеличением чистой прибыли через оптимизацию всех видов расходов и повышение эффективности.")
        elif net_margin < 5:
            insights.append(f"📊 Чистая прибыль на низком уровне ({net_margin:.1f}%).")
            recommendations.append("Оптимизируйте налоговое планирование и прочие расходы для увеличения чистой прибыли.")
        else:
            insights.append(f"✅ Чистая прибыль положительная ({net_margin:.1f}%). Бизнес работает прибыльно после всех расходов.")
        
        # Анализ структуры выручки по каналам
        if len(channels_data) > 1:
            revenue_by_channel_sorted = sorted([ch for ch in channels_data if ch["revenue"] > 0], key=lambda x: x["revenue"], reverse=True)
            if revenue_by_channel_sorted:
                top_channel = revenue_by_channel_sorted[0]
                top_channel_share = (top_channel["revenue"] / total_revenue_sum) * 100
                if top_channel_share > 80:
                    insights.append(f"📊 Высокая концентрация выручки на одном канале ({top_channel['channel']}: {top_channel_share:.1f}%).")
                    recommendations.append("Диверсифицируйте каналы продаж для снижения рисков зависимости от одного канала.")
        
        # Анализ эффективности затрат на маркетплейсах
        if total_revenue_sum > 0:
            marketplace_cost_ratio = (sum(marketplace_costs_by_channel.values()) / total_revenue_sum) * 100
            if marketplace_cost_ratio > 40:
                insights.append(f"⚠️ Высокая доля затрат на маркетплейсах ({marketplace_cost_ratio:.1f}% от выручки).")
                recommendations.append("Пересмотрите условия работы с маркетплейсами, рассмотрите возможность переговоров о снижении комиссий или оптимизации логистики.")
            elif marketplace_cost_ratio > 30:
                insights.append(f"📊 Затраты на маркетплейсах составляют {marketplace_cost_ratio:.1f}% от выручки.")
                recommendations.append("Проанализируйте возможность оптимизации затрат на маркетплейсах без снижения объемов продаж.")
        
        return {
            "start_date": start_date,
            "end_date": end_date,
            "total_revenue": total_revenue_sum,
            "total_marketplace_costs": sum(marketplace_costs_by_channel.values()),
            "total_direct_production_costs": float(direct_production_costs_total),
            "total_gross_profit": total_gross_profit,
            "gross_margin": round(total_gross_margin, 2),
            "administrative_expenses": float(administrative_expenses),
            "commercial_expenses": float(commercial_expenses),
            "total_indirect_expenses": total_indirect_expenses,
            "operating_profit": operating_profit,
            "operating_margin": round(operating_margin, 2),
            "taxes": float(taxes),
            "other_expenses_below_ebitda": float(other_expenses_below_ebitda),
            "net_profit": net_profit,
            "net_margin": round(net_margin, 2),
            "channels": channels_data,
            "insights": insights,
            "recommendations": recommendations
        }
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"Error in profit_loss_analysis: {str(e)}")
        print(error_detail)
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Ошибка при расчете анализа ОПУ: {str(e)}")
