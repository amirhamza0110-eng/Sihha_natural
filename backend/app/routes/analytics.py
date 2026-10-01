from datetime import datetime

from fastapi import APIRouter

from app.database import db

router = APIRouter()


@router.get("/monthly")
def get_monthly_analytics():
    now = datetime.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if month_start.month == 12:
        next_month_start = month_start.replace(year=month_start.year + 1, month=1)
    else:
        next_month_start = month_start.replace(month=month_start.month + 1)

    order_summary = next(
        db.orders.aggregate(
            [
                {
                    "$match": {
                        "created_at": {
                            "$gte": month_start,
                            "$lt": next_month_start,
                        }
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "online_orders": {
                            "$sum": {
                                "$cond": [
                                    {
                                        "$eq": [
                                            {"$ifNull": ["$order_type", "online"]},
                                            "online",
                                        ]
                                    },
                                    1,
                                    0,
                                ]
                            }
                        },
                        "offline_orders": {
                            "$sum": {
                                "$cond": [
                                    {"$eq": ["$order_type", "offline"]},
                                    1,
                                    0,
                                ]
                            }
                        },
                        "total_revenue": {"$sum": {"$ifNull": ["$total", 0]}},
                        "total_profit": {
                            "$sum": {"$ifNull": ["$total_profit", 0]}
                        },
                    }
                },
            ]
        ),
        {},
    )

    expense_summary = next(
        db.expenses.aggregate(
            [
                {
                    "$match": {
                        "date": {"$gte": month_start, "$lt": next_month_start}
                    }
                },
                {"$group": {"_id": None, "total_expenses": {"$sum": "$amount"}}},
            ]
        ),
        {},
    )

    total_expenses = float(expense_summary.get("total_expenses", 0))
    total_profit = float(order_summary.get("total_profit", 0))
    return {
        "total_orders_count": {
            "online": int(order_summary.get("online_orders", 0)),
            "offline": int(order_summary.get("offline_orders", 0)),
        },
        "total_revenue": float(order_summary.get("total_revenue", 0)),
        "total_expenses": total_expenses,
        "net_profit": total_profit - total_expenses,
    }