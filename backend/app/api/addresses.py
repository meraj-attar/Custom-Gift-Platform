from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.entities import Address, User
from app.schemas.address import AddressCreate, AddressPublic, AddressUpdate
from app.schemas.common import MessageResponse

router = APIRouter(prefix="/addresses", tags=["Addresses"])


def get_user_address(db: Session, address_id: int, user_id: int) -> Address:
    address = db.scalar(
        select(Address).where(Address.id == address_id, Address.user_id == user_id)
    )
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found or does not belong to you",
        )
    return address


@router.get("", response_model=list[AddressPublic])
def list_addresses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns all saved delivery addresses for the authenticated user,
    with default address first.
    """
    stmt = (
        select(Address)
        .where(Address.user_id == current_user.id)
        .order_by(Address.is_default.desc(), Address.created_at.desc())
    )
    return list(db.scalars(stmt).all())


@router.post("", response_model=AddressPublic, status_code=status.HTTP_201_CREATED)
def create_address(
    payload: AddressCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Creates a new delivery address for the authenticated user.
    If this is the user's first address or is_default is True, sets as default.
    """
    # Check if user has any existing saved addresses
    existing_address = db.scalar(
        select(Address).where(Address.user_id == current_user.id)
    )
    should_be_default = payload.is_default or existing_address is None

    if should_be_default:
        # Clear default flag on existing addresses
        db.query(Address).where(Address.user_id == current_user.id).update(
            {"is_default": False}
        )

    new_address = Address(
        user_id=current_user.id,
        full_name=payload.full_name,
        phone=payload.phone,
        email=payload.email,
        address_line1=payload.address_line1,
        address_line2=payload.address_line2,
        landmark=payload.landmark,
        city=payload.city,
        state=payload.state,
        pincode=payload.pincode,
        is_default=should_be_default,
    )
    db.add(new_address)
    db.commit()
    db.refresh(new_address)
    return new_address


@router.get("/{address_id}", response_model=AddressPublic)
def get_address_detail(
    address_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves details for a specific saved address belonging to current user.
    """
    return get_user_address(db, address_id, current_user.id)


@router.put("/{address_id}", response_model=AddressPublic)
def update_address(
    address_id: int,
    payload: AddressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Updates an existing delivery address belonging to the authenticated user.
    """
    address = get_user_address(db, address_id, current_user.id)

    if payload.is_default is True:
        db.query(Address).where(Address.user_id == current_user.id).update(
            {"is_default": False}
        )

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(address, field, value)

    db.commit()
    db.refresh(address)
    return address


@router.delete("/{address_id}", response_model=MessageResponse)
def delete_address(
    address_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Deletes a saved delivery address belonging to the authenticated user.
    If default address is deleted, marks the most recently created remaining address as default.
    """
    address = get_user_address(db, address_id, current_user.id)
    was_default = address.is_default

    db.delete(address)
    db.flush()

    if was_default:
        remaining = db.scalar(
            select(Address)
            .where(Address.user_id == current_user.id)
            .order_by(Address.created_at.desc())
        )
        if remaining:
            remaining.is_default = True

    db.commit()
    return MessageResponse(message="Address deleted successfully")


@router.post("/{address_id}/default", response_model=AddressPublic)
def set_default_address(
    address_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Marks the given address as default and clears default flag on all others.
    """
    address = get_user_address(db, address_id, current_user.id)
    db.query(Address).where(Address.user_id == current_user.id).update(
        {"is_default": False}
    )
    address.is_default = True
    db.commit()
    db.refresh(address)
    return address
