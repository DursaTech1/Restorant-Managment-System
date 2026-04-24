from decimal import Decimal

from django.db import transaction
from django.db.models import F

from .models import InventoryItem, Order, Reservation, Table


class InsufficientInventory(Exception):
    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(detail)


class MissingRecipe(Exception):
    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(detail)


def compute_required_inventory(menu_item_id: int, quantity: int) -> dict[int, Decimal]:
    """Map inventory_item_id -> total quantity needed for this menu line."""
    from .models import MenuItem, MenuItemRecipe

    needed: dict[int, Decimal] = {}
    rows = list(MenuItemRecipe.objects.filter(menu_item_id=menu_item_id))
    if not rows:
        menu_name = (
            MenuItem.objects.filter(pk=menu_item_id).values_list("name", flat=True).first()
            or f"#{menu_item_id}"
        )
        raise MissingRecipe(f"Menu item '{menu_name}' has no recipe and cannot be sold.")
    for row in rows:
        inv_id = row.inventory_item_id
        needed[inv_id] = needed.get(inv_id, Decimal("0")) + row.quantity_per_portion * quantity
    return needed


def merge_inventory_needs(*dicts: dict[int, Decimal]) -> dict[int, Decimal]:
    merged: dict[int, Decimal] = {}
    for d in dicts:
        for k, v in d.items():
            merged[k] = merged.get(k, Decimal("0")) + v
    return merged


def assert_inventory_available(needs: dict[int, Decimal]) -> None:
    if not needs:
        return
    # Lock rows used in this order so check+deduct runs consistently.
    items = {i.pk: i for i in InventoryItem.objects.select_for_update().filter(pk__in=needs.keys())}
    short = []
    for inv_id, req in needs.items():
        inv = items.get(inv_id)
        if not inv:
            short.append(f"Missing inventory id {inv_id}")
            continue
        if inv.quantity < req:
            short.append(f"{inv.name}: need {req} {inv.unit}, have {inv.quantity}")
    if short:
        raise InsufficientInventory("; ".join(short))


@transaction.atomic
def deduct_inventory_for_order(order: Order) -> None:
    needs: dict[int, Decimal] = {}
    for line in order.lines.select_related("menu_item"):
        part = compute_required_inventory(line.menu_item_id, line.quantity)
        needs = merge_inventory_needs(needs, part)
    assert_inventory_available(needs)
    for inv_id, qty in needs.items():
        updated = InventoryItem.objects.filter(pk=inv_id, quantity__gte=qty).update(quantity=F("quantity") - qty)
        if updated != 1:
            inv = InventoryItem.objects.get(pk=inv_id)
            raise InsufficientInventory(f"{inv.name}: need {qty}, insufficient after lock")


@transaction.atomic
def restore_inventory_for_order(order: Order) -> None:
    needs: dict[int, Decimal] = {}
    for line in order.lines.select_related("menu_item"):
        part = compute_required_inventory(line.menu_item_id, line.quantity)
        needs = merge_inventory_needs(needs, part)
    for inv_id, qty in needs.items():
        InventoryItem.objects.filter(pk=inv_id).update(quantity=F("quantity") + qty)


ALLOWED_STATUS_TRANSITIONS: dict[str, set[str]] = {
    Order.Status.PENDING: {Order.Status.CONFIRMED, Order.Status.CANCELLED},
    Order.Status.CONFIRMED: {Order.Status.PREPARING, Order.Status.CANCELLED},
    Order.Status.PREPARING: {Order.Status.READY, Order.Status.CANCELLED},
    Order.Status.READY: {Order.Status.SERVED, Order.Status.CANCELLED},
    Order.Status.SERVED: set(),
    Order.Status.CANCELLED: set(),
}


def can_transition(from_status: str, to_status: str) -> bool:
    return to_status in ALLOWED_STATUS_TRANSITIONS.get(from_status, set())


@transaction.atomic
def set_order_status(order: Order, new_status: str) -> Order:
    old = order.status
    if old == new_status:
        return order
    if not can_transition(old, new_status):
        raise ValueError(f"Cannot move order from {old} to {new_status}")
    if new_status == Order.Status.CONFIRMED and old == Order.Status.PENDING:
        deduct_inventory_for_order(order)
    if new_status == Order.Status.CANCELLED and old in (
        Order.Status.CONFIRMED,
        Order.Status.PREPARING,
        Order.Status.READY,
    ):
        restore_inventory_for_order(order)
    order.status = new_status
    order.save(update_fields=["status", "updated_at"])
    return order


def table_is_free_for_window(table_id: int, starts_at, ends_at, exclude_reservation_id=None) -> bool:
    qs = Reservation.objects.filter(
        table_id=table_id,
        status__in=[Reservation.Status.PENDING, Reservation.Status.CONFIRMED],
    ).filter(starts_at__lt=ends_at, ends_at__gt=starts_at)
    if exclude_reservation_id:
        qs = qs.exclude(pk=exclude_reservation_id)
    return not qs.exists()


def assert_table_available(table: Table, party_size: int, starts_at, ends_at, exclude_reservation_id=None) -> None:
    if not table.is_active:
        raise ValueError("Table is not active.")
    if ends_at <= starts_at:
        raise ValueError("Reservation end must be after start.")
    if party_size > table.seats:
        raise ValueError("Party size exceeds table seats.")
    if not table_is_free_for_window(table.pk, starts_at, ends_at, exclude_reservation_id):
        raise ValueError("Table is not available for that time window.")
