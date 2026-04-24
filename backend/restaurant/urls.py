from django.urls import path

from . import views

urlpatterns = [
    path("menu/", views.MenuListView.as_view(), name="menu-list"),
    path("orders/", views.OrderListView.as_view(), name="order-list"),
    path("orders/place/", views.PlaceOrderView.as_view(), name="order-place"),
    path("orders/<int:pk>/", views.OrderDetailView.as_view(), name="order-detail"),
    path("orders/<int:pk>/status/", views.OrderStatusView.as_view(), name="order-status"),
    path("reservations/", views.ReservationListCreateView.as_view(), name="reservation-list-create"),
    path("reservations/<int:pk>/", views.ReservationDetailView.as_view(), name="reservation-detail"),
    path("inventory/", views.InventoryListView.as_view(), name="inventory-list"),
    path("inventory/<int:pk>/", views.InventoryDetailUpdateView.as_view(), name="inventory-detail"),
    path("tables/", views.TableListView.as_view(), name="table-list"),
    path("tables/<int:pk>/availability/", views.TableAvailabilityView.as_view(), name="table-availability"),
    path("reports/daily-sales/", views.DailySalesReportView.as_view(), name="report-daily-sales"),
    path("reports/stock-alerts/", views.StockAlertsView.as_view(), name="report-stock-alerts"),
]
