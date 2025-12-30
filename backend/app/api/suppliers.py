from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.user import User
from app.models.supplier import Supplier, SupplierOrder, SupplierOrderItem, SupplierContract
from app.schemas.supplier import (
    SupplierCreate, SupplierUpdate, SupplierResponse,
    SupplierOrderCreate, SupplierOrderUpdate, SupplierOrderResponse,
    SupplierContractCreate, SupplierContractUpdate, SupplierContractResponse
)
from app.auth.security import get_current_user
from app.auth.permissions import get_user_companies, filter_by_user_companies

router = APIRouter()

# Suppliers CRUD
@router.get("/", response_model=List[SupplierResponse])
def get_suppliers(
    skip: int = 0,
    limit: int = 100,
    company_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Supplier)
    
    # Фильтрация по компаниям пользователя
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        query = query.filter(Supplier.company_id.in_(user_company_ids))
    
    if company_id:
        query = query.filter(Supplier.company_id == company_id)
    
    if search:
        query = query.filter(
            or_(
                Supplier.name.ilike(f"%{search}%"),
                Supplier.contact_person.ilike(f"%{search}%"),
                Supplier.phone.ilike(f"%{search}%"),
                Supplier.email.ilike(f"%{search}%")
            )
        )
    
    query = query.filter(Supplier.is_active == True)
    suppliers = query.order_by(Supplier.name).offset(skip).limit(limit).all()
    return suppliers

@router.post("/", response_model=SupplierResponse)
def create_supplier(
    supplier: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Проверка доступа к компании
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        if supplier.company_id not in user_company_ids:
            raise HTTPException(status_code=403, detail="No access to this company")
    
    db_supplier = Supplier(**supplier.dict())
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier

@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Проверка доступа
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        if supplier.company_id not in user_company_ids:
            raise HTTPException(status_code=403, detail="No access to this supplier")
    
    return supplier

@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: int,
    supplier_update: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Проверка доступа
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        if supplier.company_id not in user_company_ids:
            raise HTTPException(status_code=403, detail="No access to this supplier")
    
    update_data = supplier_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(supplier, key, value)
    
    db.commit()
    db.refresh(supplier)
    return supplier

@router.delete("/{supplier_id}")
def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Проверка доступа
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        if supplier.company_id not in user_company_ids:
            raise HTTPException(status_code=403, detail="No access to this supplier")
    
    supplier.is_active = False
    db.commit()
    return {"message": "Supplier deleted"}

# Supplier Orders
@router.get("/orders/", response_model=List[SupplierOrderResponse])
def get_supplier_orders(
    skip: int = 0,
    limit: int = 100,
    supplier_id: Optional[int] = Query(None),
    company_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(SupplierOrder)
    
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        query = query.filter(SupplierOrder.company_id.in_(user_company_ids))
    
    if supplier_id:
        query = query.filter(SupplierOrder.supplier_id == supplier_id)
    if company_id:
        query = query.filter(SupplierOrder.company_id == company_id)
    if status:
        query = query.filter(SupplierOrder.status == status)
    
    orders = query.order_by(SupplierOrder.order_date.desc()).offset(skip).limit(limit).all()
    return orders

@router.post("/orders/", response_model=SupplierOrderResponse)
def create_supplier_order(
    order: SupplierOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Проверка доступа
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        if order.company_id not in user_company_ids:
            raise HTTPException(status_code=403, detail="No access to this company")
    
    # Создаем заказ
    order_data = order.dict()
    items_data = order_data.pop("items")
    
    db_order = SupplierOrder(**order_data)
    db.add(db_order)
    db.flush()
    
    # Добавляем товары
    total_amount = 0
    for item_data in items_data:
        item = SupplierOrderItem(order_id=db_order.id, **item_data)
        db.add(item)
        total_amount += float(item_data["total_price"])
    
    db_order.total_amount = total_amount
    db.commit()
    db.refresh(db_order)
    return db_order

@router.get("/orders/{order_id}", response_model=SupplierOrderResponse)
def get_supplier_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(SupplierOrder).filter(SupplierOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Проверка доступа
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        if order.company_id not in user_company_ids:
            raise HTTPException(status_code=403, detail="No access to this order")
    
    return order

@router.put("/orders/{order_id}", response_model=SupplierOrderResponse)
def update_supplier_order(
    order_id: int,
    order_update: SupplierOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(SupplierOrder).filter(SupplierOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Проверка доступа
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        if order.company_id not in user_company_ids:
            raise HTTPException(status_code=403, detail="No access to this order")
    
    update_data = order_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(order, key, value)
    
    db.commit()
    db.refresh(order)
    return order

@router.delete("/orders/{order_id}")
def delete_supplier_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(SupplierOrder).filter(SupplierOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Проверка доступа
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        if order.company_id not in user_company_ids:
            raise HTTPException(status_code=403, detail="No access to this order")
    
    db.delete(order)
    db.commit()
    return {"message": "Order deleted"}

# Supplier Contracts
@router.get("/contracts/", response_model=List[SupplierContractResponse])
def get_supplier_contracts(
    skip: int = 0,
    limit: int = 100,
    supplier_id: Optional[int] = Query(None),
    company_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(SupplierContract)
    
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        query = query.filter(SupplierContract.company_id.in_(user_company_ids))
    
    if supplier_id:
        query = query.filter(SupplierContract.supplier_id == supplier_id)
    if company_id:
        query = query.filter(SupplierContract.company_id == company_id)
    if is_active is not None:
        query = query.filter(SupplierContract.is_active == is_active)
    
    contracts = query.order_by(SupplierContract.contract_date.desc()).offset(skip).limit(limit).all()
    return contracts

@router.post("/contracts/", response_model=SupplierContractResponse)
def create_supplier_contract(
    contract: SupplierContractCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Проверка доступа
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        if contract.company_id not in user_company_ids:
            raise HTTPException(status_code=403, detail="No access to this company")
    
    db_contract = SupplierContract(**contract.dict())
    db.add(db_contract)
    db.commit()
    db.refresh(db_contract)
    return db_contract

@router.put("/contracts/{contract_id}", response_model=SupplierContractResponse)
def update_supplier_contract(
    contract_id: int,
    contract_update: SupplierContractUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contract = db.query(SupplierContract).filter(SupplierContract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Проверка доступа
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        if contract.company_id not in user_company_ids:
            raise HTTPException(status_code=403, detail="No access to this contract")
    
    update_data = contract_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(contract, key, value)
    
    db.commit()
    db.refresh(contract)
    return contract

@router.delete("/contracts/{contract_id}")
def delete_supplier_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contract = db.query(SupplierContract).filter(SupplierContract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Проверка доступа
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        if contract.company_id not in user_company_ids:
            raise HTTPException(status_code=403, detail="No access to this contract")
    
    db.delete(contract)
    db.commit()
    return {"message": "Contract deleted"}

