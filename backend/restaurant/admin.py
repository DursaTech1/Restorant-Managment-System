from django.contrib import admin
from django.contrib.auth.admin import GroupAdmin as DjangoGroupAdmin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.contrib.auth.models import Group, User
from django.db.models import F
from django.template.response import TemplateResponse
from django.urls import reverse
from django.urls import path
from django.utils import timezone
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from datetime import datetime
from unfold.admin import ModelAdmin, TabularInline

from .models import InventoryItem, MenuItem, MenuItemRecipe, Order, OrderLine, Reservation, Table

if admin.site.is_registered(User):
    admin.site.unregister(User)
if admin.site.is_registered(Group):
    admin.site.unregister(Group)


@admin.register(User)
class UserAdmin(DjangoUserAdmin, ModelAdmin):
    """Staff accounts with the same modern UI as the rest of the admin."""


@admin.register(Group)
class GroupAdmin(DjangoGroupAdmin, ModelAdmin):
    pass


class OrderLineInline(TabularInline):
    model = OrderLine
    extra = 0
    autocomplete_fields = ("menu_item",)
    tab = True


@admin.register(Table)
class TableAdmin(ModelAdmin):
    list_display = ("label", "seats", "is_active")
    list_filter = ("is_active",)
    search_fields = ("label",)
    ordering = ("label",)
    list_per_page = 25


class MenuItemRecipeInline(TabularInline):
    model = MenuItemRecipe
    extra = 0
    autocomplete_fields = ("inventory_item",)
    tab = True


@admin.register(MenuItem)
class MenuItemAdmin(ModelAdmin):
    list_display = ("name", "image_thumb", "price", "is_available")
    list_filter = ("is_available",)
    search_fields = ("name", "description")
    ordering = ("name",)
    list_per_page = 25
    readonly_fields = ("image_preview",)
    fieldsets = (
        (None, {"fields": ("name", "description", "price", "is_available")}),
        ("Photo", {"fields": ("image", "image_preview"), "description": "Shown on the guest-facing menu and order flows."}),
    )
    inlines = [MenuItemRecipeInline]

    @admin.display(description="Photo")
    def image_thumb(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:10px;" />',
                obj.image.url,
            )
        return mark_safe('<span style="opacity:.45">—</span>')

    @admin.display(description="Preview")
    def image_preview(self, obj):
        if obj.pk and obj.image:
            return format_html(
                '<img src="{}" alt="" style="max-height:220px;max-width:100%;object-fit:contain;border-radius:12px;border:1px solid rgba(0,0,0,.08);" />',
                obj.image.url,
            )
        return "Upload an image to preview it here."


@admin.register(MenuItemRecipe)
class MenuItemRecipeAdmin(ModelAdmin):
    list_display = ("menu_item", "inventory_item", "quantity_per_portion")
    list_filter = ("menu_item",)
    search_fields = ("menu_item__name", "inventory_item__name")
    autocomplete_fields = ("menu_item", "inventory_item")
    ordering = ("menu_item__name", "inventory_item__name")


@admin.register(InventoryItem)
class InventoryItemAdmin(ModelAdmin):
    list_display = ("name", "quantity", "unit", "low_stock_threshold", "stock_badge")
    search_fields = ("name",)
    ordering = ("name",)
    list_per_page = 50
    readonly_fields = ("stock_badge",)
    fieldsets = (
        (None, {"fields": ("name", "unit")}),
        ("Levels", {"fields": ("quantity", "low_stock_threshold", "stock_badge")}),
    )

    @admin.display(description="Status")
    def stock_badge(self, obj):
        if obj.pk is None:
            return "—"
        if obj.quantity <= obj.low_stock_threshold:
            return mark_safe(
                '<span style="display:inline-block;padding:.2rem .55rem;border-radius:999px;font-size:.72rem;font-weight:600;background:#fef2f2;color:#b91c1c;">Low stock</span>'
            )
        return mark_safe(
            '<span style="display:inline-block;padding:.2rem .55rem;border-radius:999px;font-size:.72rem;font-weight:600;background:#ecfdf5;color:#047857;">OK</span>'
        )


@admin.register(Order)
class OrderAdmin(ModelAdmin):
    list_display = ("id", "table", "status_badge", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("notes", "table__label")
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")
    inlines = [OrderLineInline]
    autocomplete_fields = ("table",)
    fieldsets = (
        (None, {"fields": ("table", "status", "notes")}),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    @admin.display(description="Status", ordering="status")
    def status_badge(self, obj):
        colors = {
            "pending": ("#1e40af", "#dbeafe"),
            "confirmed": ("#854d0e", "#fef9c3"),
            "preparing": ("#9a3412", "#ffedd5"),
            "ready": ("#6b21a8", "#f3e8ff"),
            "served": ("#14532d", "#dcfce7"),
            "cancelled": ("#991b1b", "#fee2e2"),
        }
        fg, bg = colors.get(obj.status, ("#374151", "#f3f4f6"))
        label = obj.get_status_display()
        return format_html(
            '<span style="color:{};background:{};padding:.2rem .55rem;border-radius:999px;font-size:.72rem;font-weight:600;">{}</span>',
            fg,
            bg,
            label,
        )


@admin.register(Reservation)
class ReservationAdmin(ModelAdmin):
    list_display = ("customer_name", "table", "party_size", "starts_at", "ends_at", "status")
    list_filter = ("status", "starts_at")
    search_fields = ("customer_name", "table__label")
    date_hierarchy = "starts_at"
    ordering = ("-starts_at",)
    autocomplete_fields = ("table",)
    readonly_fields = ("created_at",)
    fieldsets = (
        (None, {"fields": ("table", "customer_name", "party_size", "status")}),
        ("Window", {"fields": ("starts_at", "ends_at")}),
        ("Meta", {"fields": ("created_at",), "classes": ("collapse",)}),
    )


def admin_reports_view(request):
    day_raw = request.GET.get("date")
    error = None
    if day_raw:
        try:
            day = datetime.strptime(day_raw, "%Y-%m-%d").date()
        except ValueError:
            day = timezone.now().date()
            error = "Invalid date format. Use YYYY-MM-DD."
    else:
        day = timezone.now().date()

    served_orders = (
        Order.objects.filter(status=Order.Status.SERVED, updated_at__date=day)
        .prefetch_related("lines")
    )
    total_revenue = sum(
        sum(line.unit_price * line.quantity for line in order.lines.all())
        for order in served_orders
    )
    stock_alerts = InventoryItem.objects.filter(quantity__lte=F("low_stock_threshold")).order_by("name")

    context = {
        **admin.site.each_context(request),
        "title": "Reports",
        "report_date": day,
        "served_orders_count": served_orders.count(),
        "total_revenue": total_revenue,
        "stock_alerts": stock_alerts,
        "error": error,
    }
    return TemplateResponse(request, "admin/reports_dashboard.html", context)


_original_admin_get_urls = admin.site.get_urls


def _admin_get_urls():
    custom_urls = [
        path("restaurant/reports/", admin.site.admin_view(admin_reports_view), name="reports-dashboard"),
    ]
    return custom_urls + _original_admin_get_urls()


admin.site.get_urls = _admin_get_urls


_original_admin_get_app_list = admin.site.get_app_list


def _admin_get_app_list(request, app_label=None):
    app_list = _original_admin_get_app_list(request, app_label=app_label)
    reports_url = reverse("admin:reports-dashboard")
    for app in app_list:
        if app.get("app_label") != "restaurant":
            continue
        models = app.setdefault("models", [])
        exists = any(model.get("object_name") == "ReportsDashboard" for model in models)
        if exists:
            break
        models.append(
            {
                "name": "Reports",
                "object_name": "ReportsDashboard",
                "admin_url": reports_url,
                "add_url": None,
                "view_only": True,
                "perms": {"add": False, "change": True, "delete": False, "view": True},
            }
        )
        break
    return app_list


admin.site.get_app_list = _admin_get_app_list
