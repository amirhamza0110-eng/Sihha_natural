import csv
import hmac
import io
import os
import smtplib
import ssl
from datetime import datetime
from email.message import EmailMessage
from typing import Iterator, Optional

from bson import ObjectId
from fastapi import APIRouter, Header, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.database import db

router = APIRouter()
REPORT_RECIPIENT = "amir.hamza0110@gmail.com"


def _month_window(month: Optional[int], year: Optional[int]):
    now = datetime.now()
    selected_month = month or now.month
    selected_year = year or now.year
    start = datetime(selected_year, selected_month, 1)
    if selected_month == 12:
        end = datetime(selected_year + 1, 1, 1)
    else:
        end = datetime(selected_year, selected_month + 1, 1)
    return start, end


def _previous_month_window():
    this_month_start = datetime.now().replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )
    if this_month_start.month == 1:
        previous_month_start = this_month_start.replace(
            year=this_month_start.year - 1, month=12
        )
    else:
        previous_month_start = this_month_start.replace(
            month=this_month_start.month - 1
        )
    return previous_month_start, this_month_start


def _find_item_product(item):
    product_id = item.get("product_id")
    if product_id and ObjectId.is_valid(product_id):
        product = db.products.find_one({"_id": ObjectId(product_id)})
        if product:
            return product
    name = item.get("name")
    if name:
        return db.products.find_one({"name": name})
    return None


def _item_cost(item):
    if item.get("cost_price") is not None:
        return float(item["cost_price"])
    product = _find_item_product(item)
    return float(product.get("cost_price", 0)) if product else 0.0


def _order_profit(order):
    if order.get("total_profit") is not None:
        return float(order["total_profit"])
    return sum(
        (float(item.get("price", 0)) - _item_cost(item))
        * int(item.get("quantity", 0))
        for item in order.get("items", [])
    )


def _load_report_data(start: datetime, end: datetime):
    orders = list(
        db.orders.find({"created_at": {"$gte": start, "$lt": end}}).sort(
            "created_at", 1
        )
    )
    expenses = list(
        db.expenses.find({"date": {"$gte": start, "$lt": end}}).sort("date", 1)
    )
    summary = {
        "revenue": sum(float(order.get("total", 0)) for order in orders),
        "gross_profit": sum(_order_profit(order) for order in orders),
        "expenses": sum(float(expense.get("amount", 0)) for expense in expenses),
    }
    summary["net_profit"] = summary["gross_profit"] - summary["expenses"]
    return orders, expenses, summary


def _csv_cell(value):
    if isinstance(value, str) and value.startswith(("=", "+", "-", "@", "\t", "\r")):
        return "'" + value
    return value


def _csv_line(row) -> str:
    buffer = io.StringIO(newline="")
    csv.writer(buffer).writerow([_csv_cell(value) for value in row])
    return buffer.getvalue()


def _date_cell(value):
    if isinstance(value, datetime):
        return value.isoformat(sep=" ", timespec="seconds")
    return str(value or "")


def _iter_monthly_csv(
    start: datetime,
    orders,
    expenses,
    summary,
    generated_at: datetime,
) -> Iterator[str]:
    yield _csv_line(["Company: Sihha Naturals"])
    yield _csv_line(["Report: Monthly Accounting & Sales"])
    yield _csv_line(["Period:", start.strftime("%B %Y")])
    yield _csv_line(["Date:", generated_at.strftime("%Y-%m-%d %H:%M:%S")])
    yield _csv_line([])
    yield _csv_line(["FINANCIAL SUMMARY"])
    yield _csv_line(["Metric", "Amount (BDT)"])
    yield _csv_line(["Revenue", f'{summary["revenue"]:.2f}'])
    yield _csv_line(["Gross Profit", f'{summary["gross_profit"]:.2f}'])
    yield _csv_line(["Expenses", f'{summary["expenses"]:.2f}'])
    yield _csv_line(["Net Profit", f'{summary["net_profit"]:.2f}'])
    yield _csv_line([])
    yield _csv_line(["SALES DETAILS"])
    yield _csv_line(
        [
            "Date",
            "Order ID",
            "Customer",
            "Order Type",
            "Product",
            "Quantity",
            "Selling Price",
            "Cost Price",
            "Line Revenue",
            "Line Gross Profit",
            "Order Total",
            "Order Gross Profit",
        ]
    )

    for order in orders:
        items = order.get("items", [])
        order_id = str(order.get("_id", ""))
        order_profit = _order_profit(order)
        if not items:
            yield _csv_line(
                [
                    _date_cell(order.get("created_at")),
                    order_id,
                    order.get("customer_name", ""),
                    order.get("order_type", "online"),
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    order.get("total", 0),
                    order_profit,
                ]
            )
            continue

        for index, item in enumerate(items):
            quantity = int(item.get("quantity", 0))
            price = float(item.get("price", 0))
            cost = _item_cost(item)
            yield _csv_line(
                [
                    _date_cell(order.get("created_at")),
                    order_id,
                    order.get("customer_name", ""),
                    order.get("order_type", "online"),
                    item.get("name", ""),
                    quantity,
                    f"{price:.2f}",
                    f"{cost:.2f}",
                    f"{price * quantity:.2f}",
                    f"{(price - cost) * quantity:.2f}",
                    order.get("total", 0) if index == 0 else "",
                    order_profit if index == 0 else "",
                ]
            )

    yield _csv_line([])
    yield _csv_line(["EXPENSE DETAILS"])
    yield _csv_line(["Date", "Title", "Category", "Shop", "Amount (BDT)"])
    for expense in expenses:
        yield _csv_line(
            [
                _date_cell(expense.get("date")),
                expense.get("title", ""),
                expense.get("category", ""),
                expense.get("shop_name", ""),
                f'{float(expense.get("amount", 0)):.2f}',
            ]
        )


@router.get("/monthly/download")
def download_monthly_report(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
):
    start, end = _month_window(month, year)
    orders, expenses, summary = _load_report_data(start, end)
    generated_at = datetime.now()
    filename = f"sihha-monthly-report-{start:%Y-%m}.csv"
    return StreamingResponse(
        _iter_monthly_csv(start, orders, expenses, summary, generated_at),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/monthly/email-trigger")
def email_previous_month_report(
    x_cron_secret: str = Header(..., min_length=1, alias="X-Cron-Secret"),
):
    expected_secret = os.getenv("REPORT_CRON_SECRET")
    if not expected_secret:
        raise HTTPException(status_code=503, detail="Report email is not configured")
    if not hmac.compare_digest(x_cron_secret, expected_secret):
        raise HTTPException(status_code=403, detail="Invalid cron secret")

    sender = os.getenv("SMTP_SENDER_EMAIL")
    app_password = os.getenv("SMTP_APP_PASSWORD")
    if not sender or not app_password:
        raise HTTPException(status_code=503, detail="SMTP credentials are not configured")

    start, end = _previous_month_window()
    _, _, summary = _load_report_data(start, end)
    message = EmailMessage()
    message["Subject"] = f"Sihha Naturals Monthly Report - {start:%B %Y}"
    message["From"] = sender
    message["To"] = REPORT_RECIPIENT
    message.set_content(
        "Sihha Naturals - Monthly Accounting & Sales Report\n"
        f"Period: {start:%B %Y}\n\n"
        f"Revenue: BDT {summary['revenue']:.2f}\n"
        f"Gross Profit: BDT {summary['gross_profit']:.2f}\n"
        f"Expenses: BDT {summary['expenses']:.2f}\n"
        f"Net Profit: BDT {summary['net_profit']:.2f}\n"
    )

    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    try:
        smtp_port = int(os.getenv("SMTP_PORT", "465"))
    except ValueError as exc:
        raise HTTPException(status_code=503, detail="SMTP_PORT must be a number") from exc

    try:
        with smtplib.SMTP_SSL(
            smtp_host, smtp_port, context=ssl.create_default_context()
        ) as smtp:
            smtp.login(sender, app_password)
            smtp.send_message(message)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Could not send report email") from exc

    return {"message": "Previous month report sent", "period": start.strftime("%Y-%m")}