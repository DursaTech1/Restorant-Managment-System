from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import InventoryItem, MenuItem, MenuItemRecipe, Order, Reservation, Table


class RMSTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.table = Table.objects.create(label="T1", seats=4)
        self.inv = InventoryItem.objects.create(name="Beef", quantity=Decimal("10"), unit="kg", low_stock_threshold=Decimal("1"))
        self.item = MenuItem.objects.create(name="Burger", price=Decimal("12.00"))
        MenuItemRecipe.objects.create(menu_item=self.item, inventory_item=self.inv, quantity_per_portion=Decimal("0.2"))

    def test_menu_list(self):
        r = self.client.get("/api/menu/")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(len(data), 1)
        self.assertIn("image_url", data[0])
        self.assertIsNone(data[0]["image_url"])

    def test_place_order_deducts_inventory(self):
        r = self.client.post(
            "/api/orders/place/",
            {"table_id": self.table.pk, "lines": [{"menu_item_id": self.item.pk, "quantity": 2}]},
            format="json",
        )
        self.assertEqual(r.status_code, 201, r.content)
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity, Decimal("9.6"))

    def test_reservation_overlap_rejected(self):
        start = timezone.now().replace(hour=18, minute=0, second=0, microsecond=0)
        end = start + timezone.timedelta(hours=2)
        self.client.post(
            "/api/reservations/",
            {
                "table": self.table.pk,
                "customer_name": "A",
                "party_size": 2,
                "starts_at": start.isoformat(),
                "ends_at": end.isoformat(),
            },
            format="json",
        )
        r2 = self.client.post(
            "/api/reservations/",
            {
                "table": self.table.pk,
                "customer_name": "B",
                "party_size": 2,
                "starts_at": start.isoformat(),
                "ends_at": end.isoformat(),
            },
            format="json",
        )
        self.assertEqual(r2.status_code, 400)

    def test_order_workflow(self):
        r = self.client.post(
            "/api/orders/place/",
            {"lines": [{"menu_item_id": self.item.pk, "quantity": 1}]},
            format="json",
        )
        oid = r.json()["id"]
        for st in ["preparing", "ready", "served"]:
            resp = self.client.patch(f"/api/orders/{oid}/status/", {"status": st}, format="json")
            self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(Order.objects.get(pk=oid).status, Order.Status.SERVED)
