from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone


class Table(models.Model):
    label = models.CharField(max_length=50, unique=True)
    seats = models.PositiveSmallIntegerField(validators=[MinValueValidator(1)])
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["label"]

    def __str__(self):
        return f"{self.label} ({self.seats} seats)"


class MenuItem(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    is_available = models.BooleanField(default=True)
    image = models.ImageField(upload_to="menu_items/", blank=True, null=True, help_text="Shown on the guest menu.")

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class InventoryItem(models.Model):
    name = models.CharField(max_length=200, unique=True)
    quantity = models.DecimalField(max_digits=14, decimal_places=4, default=0, validators=[MinValueValidator(Decimal("0"))])
    unit = models.CharField(max_length=20, default="unit")
    low_stock_threshold = models.DecimalField(
        max_digits=14, decimal_places=4, default=Decimal("0"), validators=[MinValueValidator(Decimal("0"))]
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.quantity} {self.unit})"

    @property
    def is_low_stock(self) -> bool:
        return self.quantity <= self.low_stock_threshold


class MenuItemRecipe(models.Model):
    """How much inventory is consumed per single menu item sold."""

    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE, related_name="recipe_lines")
    inventory_item = models.ForeignKey(InventoryItem, on_delete=models.PROTECT, related_name="recipe_usages")
    quantity_per_portion = models.DecimalField(max_digits=14, decimal_places=4, validators=[MinValueValidator(Decimal("0.0001"))])

    class Meta:
        unique_together = [["menu_item", "inventory_item"]]

    def __str__(self):
        return f"{self.menu_item}: {self.quantity_per_portion} {self.inventory_item.unit} of {self.inventory_item.name}"


class Reservation(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"
        COMPLETED = "completed", "Completed"

    table = models.ForeignKey(Table, on_delete=models.CASCADE, related_name="reservations")
    customer_name = models.CharField(max_length=200)
    party_size = models.PositiveSmallIntegerField(validators=[MinValueValidator(1)])
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-starts_at"]
        indexes = [
            models.Index(fields=["table", "starts_at", "ends_at"]),
        ]

    def __str__(self):
        return f"{self.customer_name} @ {self.table} ({self.starts_at})"

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.ends_at <= self.starts_at:
            raise ValidationError("Reservation end must be after start.")
        if self.party_size > self.table.seats:
            raise ValidationError("Party size cannot exceed table capacity.")

    def overlaps_confirmed(self) -> bool:
        """Another active reservation on same table overlaps this window."""
        qs = Reservation.objects.filter(
            table_id=self.table_id,
            status__in=[Reservation.Status.PENDING, Reservation.Status.CONFIRMED],
        ).exclude(pk=self.pk if self.pk else None)
        return qs.filter(starts_at__lt=self.ends_at, ends_at__gt=self.starts_at).exists()


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        PREPARING = "preparing", "Preparing"
        READY = "ready", "Ready"
        SERVED = "served", "Served"
        CANCELLED = "cancelled", "Cancelled"

    table = models.ForeignKey(Table, on_delete=models.SET_NULL, null=True, blank=True, related_name="orders")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order {self.pk} ({self.status})"


class OrderLine(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="lines")
    menu_item = models.ForeignKey(MenuItem, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ["id"]

    @property
    def line_total(self):
        return self.unit_price * self.quantity
