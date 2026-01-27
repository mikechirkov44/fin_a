"""
Сервис для управления остатками товаров и расчета себестоимости
"""
from decimal import Decimal
from datetime import date
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.inventory import Inventory
from app.models.inventory_transaction import InventoryTransaction
from app.models.product_cost import ProductCost
from app.models.product import Product
from app.models.warehouse import Warehouse

def get_or_create_inventory(product_id: int, warehouse_id: int, db: Session) -> Inventory:
    """Получить или создать запись об остатке товара на складе"""
    inventory = db.query(Inventory).filter(
        Inventory.product_id == product_id,
        Inventory.warehouse_id == warehouse_id
    ).first()
    
    if not inventory:
        inventory = Inventory(
            product_id=product_id,
            warehouse_id=warehouse_id,
            quantity=Decimal('0'),
            min_stock_level=Decimal('0')
        )
        db.add(inventory)
        db.commit()
        db.refresh(inventory)
    
    return inventory

def calculate_average_cost(product_id: int, warehouse_id: int, db: Session) -> Decimal:
    """Рассчитать среднюю себестоимость товара на складе (weighted average)"""
    # Получаем все партии товара на складе с остатком > 0
    batches = db.query(ProductCost).filter(
        ProductCost.product_id == product_id,
        ProductCost.warehouse_id == warehouse_id,
        ProductCost.quantity > 0
    ).all()
    
    if not batches:
        # Если нет партий, берем себестоимость из продукта
        product = db.query(Product).filter(Product.id == product_id).first()
        if product:
            return product.cost_price
        return Decimal('0')
    
    # Рассчитываем средневзвешенную себестоимость
    total_cost = Decimal('0')
    total_quantity = Decimal('0')
    
    for batch in batches:
        batch_cost = batch.cost_price * batch.quantity
        total_cost += batch_cost
        total_quantity += batch.quantity
    
    if total_quantity > 0:
        return total_cost / total_quantity
    return Decimal('0')

def add_inventory_transaction(
    transaction_type: str,
    product_id: int,
    warehouse_id: int,
    quantity: Decimal,
    cost_price: Decimal,
    transaction_date: date,
    db: Session,
    batch_number: str = None,
    document_type: str = None,
    document_id: int = None,
    description: str = None,
    created_by: int = None
) -> InventoryTransaction:
    """Добавить транзакцию движения товара и обновить остатки"""
    
    # Создаем транзакцию
    transaction = InventoryTransaction(
        transaction_type=transaction_type,
        product_id=product_id,
        warehouse_id=warehouse_id,
        quantity=quantity,
        cost_price=cost_price,
        date=transaction_date,
        batch_number=batch_number,
        document_type=document_type,
        document_id=document_id,
        description=description,
        created_by=created_by
    )
    db.add(transaction)
    db.flush()  # Получаем ID транзакции
    
    # Обновляем остатки
    inventory = get_or_create_inventory(product_id, warehouse_id, db)
    
    if transaction_type == "INCOME":
        # Приход товара
        inventory.quantity += quantity
        
        # Добавляем партию для расчета себестоимости
        batch = ProductCost(
            product_id=product_id,
            warehouse_id=warehouse_id,
            quantity=quantity,
            cost_price=cost_price,
            date=transaction_date,
            batch_number=batch_number or f"BATCH-{transaction.id}",
            transaction_id=transaction.id
        )
        db.add(batch)
        
    elif transaction_type == "OUTCOME":
        # Расход товара
        if inventory.quantity < quantity:
            raise ValueError(f"Insufficient inventory. Available: {inventory.quantity}, Required: {quantity}")
        
        inventory.quantity -= quantity
        
        # Для метода средней себестоимости используем текущую среднюю
        # Для FIFO/LIFO нужно будет списывать по партиям (реализуем позже)
        current_avg_cost = calculate_average_cost(product_id, warehouse_id, db)
        
        # Списываем из партий (пока упрощенная версия - списываем пропорционально)
        remaining_quantity = quantity
        batches = db.query(ProductCost).filter(
            ProductCost.product_id == product_id,
            ProductCost.warehouse_id == warehouse_id,
            ProductCost.quantity > 0
        ).order_by(ProductCost.date.asc()).all()  # FIFO порядок
        
        for batch in batches:
            if remaining_quantity <= 0:
                break
            
            if batch.quantity <= remaining_quantity:
                # Списываем всю партию
                remaining_quantity -= batch.quantity
                batch.quantity = Decimal('0')
            else:
                # Списываем часть партии
                batch.quantity -= remaining_quantity
                remaining_quantity = Decimal('0')
    
    elif transaction_type == "ADJUSTMENT":
        # Корректировка остатков
        inventory.quantity = quantity
    
    db.commit()
    db.refresh(transaction)
    return transaction

def get_inventory_balance(product_id: int, warehouse_id: int, db: Session) -> Decimal:
    """Получить текущий остаток товара на складе"""
    inventory = db.query(Inventory).filter(
        Inventory.product_id == product_id,
        Inventory.warehouse_id == warehouse_id
    ).first()
    
    if inventory:
        return inventory.quantity
    return Decimal('0')

def reverse_inventory_transaction(transaction: InventoryTransaction, db: Session):
    """Откатить транзакцию - вернуть остатки в исходное состояние"""
    inventory = get_or_create_inventory(transaction.product_id, transaction.warehouse_id, db)
    
    if transaction.transaction_type == "INCOME":
        # Откатываем приход - уменьшаем остаток
        if inventory.quantity < transaction.quantity:
            raise ValueError(f"Cannot reverse transaction: insufficient inventory. Available: {inventory.quantity}, Required: {transaction.quantity}")
        inventory.quantity -= transaction.quantity
        
        # Удаляем связанные партии
        db.query(ProductCost).filter(
            ProductCost.transaction_id == transaction.id
        ).delete()
        
    elif transaction.transaction_type == "OUTCOME":
        # Откатываем расход - увеличиваем остаток
        inventory.quantity += transaction.quantity
        
    elif transaction.transaction_type == "ADJUSTMENT":
        # Для корректировки нужно восстановить старое значение
        # Это сложнее, так как мы не знаем старое значение
        # Пока просто не меняем остаток при удалении корректировки
        pass
    
    db.commit()

def update_inventory_transaction(
    transaction_id: int,
    transaction_type: str = None,
    product_id: int = None,
    warehouse_id: int = None,
    quantity: Decimal = None,
    cost_price: Decimal = None,
    transaction_date: date = None,
    db: Session = None,
    batch_number: str = None,
    document_type: str = None,
    document_id: int = None,
    description: str = None
) -> InventoryTransaction:
    """Обновить транзакцию движения товара"""
    transaction = db.query(InventoryTransaction).filter(InventoryTransaction.id == transaction_id).first()
    if not transaction:
        raise ValueError(f"Transaction {transaction_id} not found")
    
    # Откатываем старую транзакцию
    reverse_inventory_transaction(transaction, db)
    
    # Обновляем поля транзакции
    if transaction_type is not None:
        transaction.transaction_type = transaction_type
    if product_id is not None:
        transaction.product_id = product_id
    if warehouse_id is not None:
        transaction.warehouse_id = warehouse_id
    if quantity is not None:
        transaction.quantity = quantity
    if cost_price is not None:
        transaction.cost_price = cost_price
    if transaction_date is not None:
        transaction.date = transaction_date
    if batch_number is not None:
        transaction.batch_number = batch_number
    if document_type is not None:
        transaction.document_type = document_type
    if document_id is not None:
        transaction.document_id = document_id
    if description is not None:
        transaction.description = description
    
    # Применяем новую транзакцию
    inventory = get_or_create_inventory(transaction.product_id, transaction.warehouse_id, db)
    
    if transaction.transaction_type == "INCOME":
        inventory.quantity += transaction.quantity
        
        # Добавляем партию
        batch = ProductCost(
            product_id=transaction.product_id,
            warehouse_id=transaction.warehouse_id,
            quantity=transaction.quantity,
            cost_price=transaction.cost_price,
            date=transaction.date,
            batch_number=batch_number or f"BATCH-{transaction.id}",
            transaction_id=transaction.id
        )
        db.add(batch)
        
    elif transaction.transaction_type == "OUTCOME":
        if inventory.quantity < transaction.quantity:
            raise ValueError(f"Insufficient inventory. Available: {inventory.quantity}, Required: {transaction.quantity}")
        inventory.quantity -= transaction.quantity
        
        # Списываем из партий (FIFO)
        remaining_quantity = transaction.quantity
        batches = db.query(ProductCost).filter(
            ProductCost.product_id == transaction.product_id,
            ProductCost.warehouse_id == transaction.warehouse_id,
            ProductCost.quantity > 0
        ).order_by(ProductCost.date.asc()).all()
        
        for batch in batches:
            if remaining_quantity <= 0:
                break
            if batch.quantity <= remaining_quantity:
                remaining_quantity -= batch.quantity
                batch.quantity = Decimal('0')
            else:
                batch.quantity -= remaining_quantity
                remaining_quantity = Decimal('0')
    
    elif transaction.transaction_type == "ADJUSTMENT":
        inventory.quantity = transaction.quantity
    
    db.commit()
    db.refresh(transaction)
    return transaction

def delete_inventory_transaction(transaction_id: int, db: Session):
    """Удалить транзакцию и откатить изменения остатков"""
    transaction = db.query(InventoryTransaction).filter(InventoryTransaction.id == transaction_id).first()
    if not transaction:
        raise ValueError(f"Transaction {transaction_id} not found")
    
    # Откатываем транзакцию
    reverse_inventory_transaction(transaction, db)
    
    # Удаляем транзакцию
    db.delete(transaction)
    db.commit()

def get_low_stock_alerts(company_id: int, db: Session) -> List[dict]:
    """Получить список товаров с низкими остатками"""
    from app.models.warehouse import Warehouse
    
    # Получаем все склады организации
    warehouses = db.query(Warehouse).filter(
        Warehouse.company_id == company_id,
        Warehouse.is_active == True
    ).all()
    
    warehouse_ids = [w.id for w in warehouses]
    
    if not warehouse_ids:
        return []
    
    # Находим товары с остатками ниже минимального уровня
    alerts = db.query(Inventory).join(Product).join(Warehouse).filter(
        Inventory.warehouse_id.in_(warehouse_ids),
        Inventory.quantity < Inventory.min_stock_level,
        Inventory.min_stock_level > 0
    ).all()
    
    result = []
    for alert in alerts:
        result.append({
            "product_id": alert.product_id,
            "product_name": alert.product.name if alert.product else None,
            "warehouse_id": alert.warehouse_id,
            "warehouse_name": alert.warehouse.name if alert.warehouse else None,
            "current_quantity": float(alert.quantity),
            "min_stock_level": float(alert.min_stock_level),
            "deficit": float(alert.min_stock_level - alert.quantity)
        })
    
    return result

