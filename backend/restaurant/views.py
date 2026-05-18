from datetime import datetime

from django.db.models import F
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rest_framework.views import APIView

@api_view(['GET'])
def api_root(request, format=None):
    return Response({
        'menu': reverse('menu-list', request=request, format=format),
        'orders': reverse('order-list', request=request, format=format),
        'reservations': reverse('reservation-list-create', request=request, format=format),
        'inventory': reverse('inventory-list', request=request, format=format),
        'tables': reverse('table-list', request=request, format=format),
        'reports/daily-sales': reverse('report-daily-sales', request=request, format=format),
        'reports/stock-alerts': reverse('report-stock-alerts', request=request, format=format),
    })

from .models import InventoryItem, MenuItem, Order, Reservation, Table
from .serializers import (
    InventoryItemSerializer,
    MenuItemSerializer,
    OrderSerializer,
    OrderStatusUpdateSerializer,
    PlaceOrderSerializer,
    ReservationSerializer,
    TableSerializer,
)
from .services import assert_table_available


class MenuListView(generics.ListAPIView):
    """View the menu (all items; use `is_available` to filter client-side or add `?available_only=1`)."""

    serializer_class = MenuItemSerializer

    def get_queryset(self):
        qs = MenuItem.objects.all()
        if self.request.query_params.get("available_only") in ("1", "true", "yes"):
            qs = qs.filter(is_available=True)
        return qs


class PlaceOrderView(APIView):
    """Place an order: creates order, confirms it, and deducts inventory from recipes."""

    def post(self, request):
        ser = PlaceOrderSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        order = ser.save()
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderListView(generics.ListAPIView):
    queryset = Order.objects.prefetch_related("lines__menu_item", "table").all()
    serializer_class = OrderSerializer


class OrderDetailView(generics.RetrieveAPIView):
    queryset = Order.objects.prefetch_related("lines__menu_item", "table").all()
    serializer_class = OrderSerializer


class OrderStatusView(APIView):
    """Advance order through kitchen workflow or cancel."""

    def patch(self, request, pk):
        try:
            order = Order.objects.prefetch_related("lines__menu_item").get(pk=pk)
        except Order.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        ser = OrderStatusUpdateSerializer(instance=order, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        order.refresh_from_db()
        return Response(OrderSerializer(order).data)


class ReservationListCreateView(generics.ListCreateAPIView):
    queryset = Reservation.objects.select_related("table").all()
    serializer_class = ReservationSerializer


class ReservationDetailView(generics.RetrieveUpdateAPIView):
    queryset = Reservation.objects.select_related("table").all()
    serializer_class = ReservationSerializer


class InventoryListView(generics.ListAPIView):
    queryset = InventoryItem.objects.all()
    serializer_class = InventoryItemSerializer


class InventoryDetailUpdateView(generics.RetrieveUpdateAPIView):
    queryset = InventoryItem.objects.all()
    serializer_class = InventoryItemSerializer


class TableListView(generics.ListAPIView):
    queryset = Table.objects.all()
    serializer_class = TableSerializer


class TableAvailabilityView(APIView):
    """Check whether a table is free for a time window (no overlapping active reservation)."""

    def get(self, request, pk):
        starts_raw = request.query_params.get("starts_at")
        ends_raw = request.query_params.get("ends_at")
        party_raw = request.query_params.get("party_size")
        if not starts_raw or not ends_raw:
            return Response(
                {"detail": "Query params starts_at and ends_at are required (ISO 8601)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        starts_at = parse_datetime(starts_raw)
        ends_at = parse_datetime(ends_raw)
        if not starts_at or not ends_at:
            return Response({"detail": "Invalid datetime format."}, status=status.HTTP_400_BAD_REQUEST)
        if timezone.is_naive(starts_at):
            starts_at = timezone.make_aware(starts_at, timezone.get_current_timezone())
        if timezone.is_naive(ends_at):
            ends_at = timezone.make_aware(ends_at, timezone.get_current_timezone())
        try:
            table = Table.objects.get(pk=pk)
        except Table.DoesNotExist:
            return Response({"detail": "Table not found."}, status=status.HTTP_404_NOT_FOUND)
        party_size = int(party_raw) if party_raw else 1
        try:
            assert_table_available(table, party_size, starts_at, ends_at)
            available = True
            reason = None
        except ValueError as e:
            available = False
            reason = str(e)
        return Response(
            {
                "table_id": table.pk,
                "available": available,
                "reason": reason,
                "starts_at": starts_at,
                "ends_at": ends_at,
            }
        )


class DailySalesReportView(APIView):
    """Optional: total revenue from served orders for a calendar day (UTC by default)."""

    def get(self, request):
        day_raw = request.query_params.get("date")
        if day_raw:
            try:
                day = datetime.strptime(day_raw, "%Y-%m-%d").date()
            except ValueError:
                return Response({"detail": "Use date=YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            day = timezone.now().date()
        total = (
            Order.objects.filter(status=Order.Status.SERVED, updated_at__date=day)
            .prefetch_related("lines")
        )
        revenue = sum(
            sum(line.unit_price * line.quantity for line in o.lines.all())
            for o in total
        )
        count = total.count()
        return Response({"date": str(day), "served_orders": count, "total_revenue": str(revenue)})


class StockAlertsView(APIView):
    """Optional: inventory rows at or below low_stock_threshold."""

    def get(self, request):
        rows = InventoryItem.objects.filter(quantity__lte=F("low_stock_threshold"))
        return Response(InventoryItemSerializer(rows, many=True).data)
