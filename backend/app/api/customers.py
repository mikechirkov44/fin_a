from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, desc
from datetime import date, datetime, timedelta
from decimal import Decimal
from app.database import get_db
from app.models.user import User
from app.models.customer import Customer, CustomerSegment, CustomerPurchase, CustomerInteraction
from app.models.realization import Realization
from app.schemas.customer import (
    CustomerCreate, CustomerUpdate, CustomerResponse,
    CustomerSegmentCreate, CustomerSegmentUpdate, CustomerSegmentResponse,
    CustomerPurchaseCreate, CustomerPurchaseResponse,
    CustomerInteractionCreate, CustomerInteractionResponse
)
from app.auth.security import get_current_user
from app.auth.permissions import get_user_companies

router = APIRouter()

# Customer Segments
@router.get("/segments/", response_model=List[CustomerSegmentResponse])
def get_customer_segments(
    skip: int = 0,
    limit: int = 100,
    company_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(CustomerSegment)
    
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        query = query.filter(CustomerSegment.company_id.in_(user_company_ids))
    
    if company_id:
        query = query.filter(CustomerSegment.company_id == company_id)
    
    query = query.filter(CustomerSegment.is_active == True)
    segments = query.order_by(CustomerSegment.name).offset(skip).limit(limit).all()
    return segments

@router.post("/segments/", response_model=CustomerSegmentResponse)
def create_customer_segment(
    segment: CustomerSegmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        if segment.company_id not in user_company_ids:
            raise HTTPException(status_code=403, detail="No access to this company")
    
    db_segment = CustomerSegment(**segment.dict())
    db.add(db_segment)
    db.commit()
    db.refresh(db_segment)
    return db_segment

@router.put("/segments/{segment_id}", response_model=CustomerSegmentResponse)
def update_customer_segment(
    segment_id: int,
    segment_update: CustomerSegmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    segment = db.query(CustomerSegment).filter(CustomerSegment.id == segment_id).first()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")
    
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        if segment.company_id not in user_company_ids:
            raise HTTPException(status_code=403, detail="No access to this segment")
    
    update_data = segment_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(segment, key, value)
    
    db.commit()
    db.refresh(segment)
    return segment

@router.delete("/segments/{segment_id}")
def delete_customer_segment(
    segment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    segment = db.query(CustomerSegment).filter(CustomerSegment.id == segment_id).first()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")
    
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        if segment.company_id not in user_company_ids:
            raise HTTPException(status_code=403, detail="No access to this segment")
    
    segment.is_active = False
    db.commit()
    return {"message": "Segment deleted"}

# Customers CRUD
@router.get("/", response_model=List[CustomerResponse])
def get_customers(
    skip: int = 0,
    limit: int = 100,
    company_id: Optional[int] = Query(None),
    segment_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Customer)
    
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        query = query.filter(Customer.company_id.in_(user_company_ids))
    
    if company_id:
        query = query.filter(Customer.company_id == company_id)
    if segment_id:
        query = query.filter(Customer.segment_id == segment_id)
    if search:
        query = query.filter(
            or_(
                Customer.name.ilike(f"%{search}%"),
                Customer.phone.ilike(f"%{search}%"),
                Customer.email.ilike(f"%{search}%")
            )
        )
    
    query = query.filter(Customer.is_active == True)
    customers = query.order_by(Customer.name).offset(skip).limit(limit).all()
    return customers

@router.post("/", response_model=CustomerResponse)
def create_customer(
    customer: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        if customer.company_id not in user_company_ids:
            raise HTTPException(status_code=403, detail="No access to this company")
    
    db_customer = Customer(**customer.dict())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        if customer.company_id not in user_company_ids:
            raise HTTPException(status_code=403, detail="No access to this customer")
    
    return customer

@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: int,
    customer_update: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        if customer.company_id not in user_company_ids:
            raise HTTPException(status_code=403, detail="No access to this customer")
    
    update_data = customer_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(customer, key, value)
    
    db.commit()
    db.refresh(customer)
    return customer

@router.delete("/{customer_id}")
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        if customer.company_id not in user_company_ids:
            raise HTTPException(status_code=403, detail="No access to this customer")
    
    customer.is_active = False
    db.commit()
    return {"message": "Customer deleted"}

# Customer Analytics - обновление метрик
@router.post("/{customer_id}/update-metrics")
def update_customer_metrics(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Получаем все покупки клиента
    purchases = db.query(CustomerPurchase).filter(
        CustomerPurchase.customer_id == customer_id
    ).all()
    
    if purchases:
        total_purchases = sum(float(p.amount) for p in purchases)
        purchase_count = len(purchases)
        average_check = total_purchases / purchase_count if purchase_count > 0 else 0
        last_purchase_date = max(p.purchase_date for p in purchases)
        
        # RFM метрики
        today = date.today()
        recency = (today - last_purchase_date).days if last_purchase_date else None
        frequency = purchase_count
        monetary = total_purchases
        
        customer.total_purchases = Decimal(str(total_purchases))
        customer.purchase_count = purchase_count
        customer.average_check = Decimal(str(average_check))
        customer.last_purchase_date = last_purchase_date
        customer.recency = recency
        customer.frequency = frequency
        customer.monetary = Decimal(str(monetary))
        customer.ltv = Decimal(str(monetary))  # Упрощенный LTV
    else:
        customer.total_purchases = Decimal('0')
        customer.purchase_count = 0
        customer.average_check = Decimal('0')
        customer.last_purchase_date = None
        customer.recency = None
        customer.frequency = 0
        customer.monetary = Decimal('0')
        customer.ltv = Decimal('0')
    
    db.commit()
    db.refresh(customer)
    return {"message": "Metrics updated", "customer": CustomerResponse.from_orm(customer)}

# Customer Purchases
@router.get("/{customer_id}/purchases/", response_model=List[CustomerPurchaseResponse])
def get_customer_purchases(
    customer_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        if customer.company_id not in user_company_ids:
            raise HTTPException(status_code=403, detail="No access to this customer")
    
    purchases = db.query(CustomerPurchase).filter(
        CustomerPurchase.customer_id == customer_id
    ).order_by(CustomerPurchase.purchase_date.desc()).offset(skip).limit(limit).all()
    
    return purchases

@router.post("/{customer_id}/purchases/", response_model=CustomerPurchaseResponse)
def create_customer_purchase(
    customer_id: int,
    purchase: CustomerPurchaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        if customer.company_id not in user_company_ids:
            raise HTTPException(status_code=403, detail="No access to this customer")
    
    purchase_data = purchase.dict()
    purchase_data["customer_id"] = customer_id
    db_purchase = CustomerPurchase(**purchase_data)
    db.add(db_purchase)
    db.commit()
    
    # Обновляем метрики клиента
    purchases = db.query(CustomerPurchase).filter(
        CustomerPurchase.customer_id == customer_id
    ).all()
    
    if purchases:
        total_purchases = sum(float(p.amount) for p in purchases)
        purchase_count = len(purchases)
        average_check = total_purchases / purchase_count if purchase_count > 0 else 0
        last_purchase_date = max(p.purchase_date for p in purchases)
        
        today = date.today()
        recency = (today - last_purchase_date).days if last_purchase_date else None
        
        customer.total_purchases = Decimal(str(total_purchases))
        customer.purchase_count = purchase_count
        customer.average_check = Decimal(str(average_check))
        customer.last_purchase_date = last_purchase_date
        customer.recency = recency
        customer.frequency = purchase_count
        customer.monetary = Decimal(str(total_purchases))
        customer.ltv = Decimal(str(total_purchases))
        db.commit()
    
    db.refresh(db_purchase)
    return db_purchase

# Customer Interactions
@router.get("/{customer_id}/interactions/", response_model=List[CustomerInteractionResponse])
def get_customer_interactions(
    customer_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        if customer.company_id not in user_company_ids:
            raise HTTPException(status_code=403, detail="No access to this customer")
    
    interactions = db.query(CustomerInteraction).filter(
        CustomerInteraction.customer_id == customer_id
    ).order_by(CustomerInteraction.interaction_date.desc()).offset(skip).limit(limit).all()
    
    return interactions

@router.post("/{customer_id}/interactions/", response_model=CustomerInteractionResponse)
def create_customer_interaction(
    customer_id: int,
    interaction: CustomerInteractionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    if current_user.role.value != "ADMIN":
        user_company_ids = get_user_companies(current_user.id, db)
        if customer.company_id not in user_company_ids:
            raise HTTPException(status_code=403, detail="No access to this customer")
    
    interaction_data = interaction.dict()
    interaction_data["customer_id"] = customer_id
    if not interaction_data.get("user_id"):
        interaction_data["user_id"] = current_user.id
    
    db_interaction = CustomerInteraction(**interaction_data)
    db.add(db_interaction)
    db.commit()
    db.refresh(db_interaction)
    return db_interaction

