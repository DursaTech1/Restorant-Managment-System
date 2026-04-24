from django.db import transaction
from rest_framework import serializers

from .models import InventoryItem, MenuItem, MenuItemRecipe, Order, OrderLine, Reservation, Table
from .services import InsufficientInventory, MissingRecipe, assert_table_available, set_order_status


class MenuItemSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = MenuItem
        fields = ["id", "name", "description", "price", "is_available", "image_url"]

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        url = obj.image.url
        if request:
            return request.build_absolute_uri(url)
        return url


class InventoryItemSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.ReadOnlyField()

    class Meta:
        model = InventoryItem
        fields = ["id", "name", "quantity", "unit", "low_stock_threshold", "is_low_stock"]


class TableSerializer(serializers.ModelSerializer):
    class Meta:
        model = Table
        fields = ["id", "label", "seats", "is_active"]


class ReservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reservation
        fields = ["id", "table", "customer_name", "party_size", "starts_at", "ends_at", "status", "created_at"]
        read_only_fields = ["id", "status", "created_at"]

    def validate(self, attrs):
        table = attrs.get("table") or (self.instance.table if self.instance else None)
        party = attrs.get("party_size", getattr(self.instance, "party_size", None))
        starts = attrs.get("starts_at", getattr(self.instance, "starts_at", None))
        ends = attrs.get("ends_at", getattr(self.instance, "ends_at", None))
        if table and party and starts and ends:
            try:
                assert_table_available(
                    table,
                    party,
                    starts,
                    ends,
                    exclude_reservation_id=self.instance.pk if self.instance else None,
                )
            except ValueError as e:
                raise serializers.ValidationError(str(e)) from e
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        validated_data.setdefault("status", Reservation.Status.CONFIRMED)
        return super().create(validated_data)


class OrderLineInputSerializer(serializers.Serializer):
    menu_item_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class PlaceOrderSerializer(serializers.Serializer):
    table_id = serializers.IntegerField(required=False, allow_null=True)
    lines = OrderLineInputSerializer(many=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_lines(self, value):
        if not value:
            raise serializers.ValidationError("At least one line is required.")
        return value

    def validate(self, attrs):
        table_id = attrs.get("table_id")
        if table_id is not None:
            if not Table.objects.filter(pk=table_id, is_active=True).exists():
                raise serializers.ValidationError({"table_id": "Invalid or inactive table."})
        for line in attrs["lines"]:
            mid = line["menu_item_id"]
            try:
                item = MenuItem.objects.get(pk=mid)
            except MenuItem.DoesNotExist as e:
                raise serializers.ValidationError({"lines": f"Unknown menu item {mid}."}) from e
            if not item.is_available:
                raise serializers.ValidationError({"lines": f"Menu item '{item.name}' is not available."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        table_id = validated_data.get("table_id")
        table = Table.objects.filter(pk=table_id).first() if table_id else None
        order = Order.objects.create(table=table, notes=validated_data.get("notes", ""), status=Order.Status.PENDING)
        for line in validated_data["lines"]:
            item = MenuItem.objects.get(pk=line["menu_item_id"])
            OrderLine.objects.create(
                order=order,
                menu_item=item,
                quantity=line["quantity"],
                unit_price=item.price,
            )
        try:
            set_order_status(order, Order.Status.CONFIRMED)
        except (InsufficientInventory, MissingRecipe) as e:
            raise serializers.ValidationError({"inventory": e.detail}) from e
        order.refresh_from_db()
        return order


class OrderLineSerializer(serializers.ModelSerializer):
    menu_item = MenuItemSerializer(read_only=True)

    class Meta:
        model = OrderLine
        fields = ["id", "menu_item", "quantity", "unit_price"]


class OrderSerializer(serializers.ModelSerializer):
    lines = OrderLineSerializer(many=True, read_only=True)
    table = TableSerializer(read_only=True)

    class Meta:
        model = Order
        fields = ["id", "table", "status", "notes", "created_at", "updated_at", "lines"]


class OrderStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.Status.choices)

    def update(self, instance, validated_data):
        new_status = validated_data["status"]
        try:
            set_order_status(instance, new_status)
        except ValueError as e:
            raise serializers.ValidationError({"status": str(e)}) from e
        except (InsufficientInventory, MissingRecipe) as e:
            raise serializers.ValidationError({"inventory": e.detail}) from e
        instance.refresh_from_db()
        return instance


class MenuItemRecipeSerializer(serializers.ModelSerializer):
    inventory_item_name = serializers.CharField(source="inventory_item.name", read_only=True)

    class Meta:
        model = MenuItemRecipe
        fields = ["id", "inventory_item", "inventory_item_name", "quantity_per_portion"]
