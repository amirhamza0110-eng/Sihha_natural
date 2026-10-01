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

    monthly_order_summary = next(
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
                    "$unwind": {
                        "path": "$items",
                        "preserveNullAndEmptyArrays": True,
                    }
                },
                {
                    "$lookup": {
                        "from": "products",
                        "localField": "items.name",
                        "foreignField": "name",
                        "as": "_legacy_products",
                    }
                },
                {
                    "$addFields": {
                        "_resolved_item_cost": {
                            "$ifNull": [
                                "$items.cost_price",
                                {"$arrayElemAt": ["$_legacy_products.cost_price", 0]},
                            ]
                        }
                    }
                },
                {
                    "$group": {
                        "_id": "$_id",
                        "order_revenue": {"$first": {"$ifNull": ["$total", 0]}},
                        "stored_profit": {
                            "$first": {"$ifNull": ["$total_profit", None]}
                        },
                        "calculated_profit": {
                            "$sum": {
                                "$multiply": [
                                    {
                                        "$subtract": [
                                            {"$ifNull": ["$items.price", 0]},
                                            {"$ifNull": ["$_resolved_item_cost", 0]},
                                        ]
                                    },
                                    {"$ifNull": ["$items.quantity", 0]},
                                ]
                            }
                        },
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "monthly_revenue": {"$sum": "$order_revenue"},
                        "monthly_gross_profit": {
                            "$sum": {
                                "$ifNull": ["$stored_profit", "$calculated_profit"]
                            }
                        },
                    }
                },
            ]
        ),
        {},
    )

    monthly_expense_summary = next(
        db.expenses.aggregate(
            [
                {
                    "$match": {
                        "date": {"$gte": month_start, "$lt": next_month_start}
                    }
                },
                {"$group": {"_id": None, "monthly_expenses": {"$sum": "$amount"}}},
            ]
        ),
        {},
    )

    investment_summary = next(
        db.inventory_purchases.aggregate(
            [
                {
                    "$group": {
                        "_id": None,
                        "total_stock_investment": {"$sum": "$amount"},
                    }
                }
            ]
        ),
        {},
    )

    cogs_summary = next(
        db.orders.aggregate(
            [
                {
                    "$unwind": {
                        "path": "$items",
                        "preserveNullAndEmptyArrays": True,
                    }
                },
                {
                    "$lookup": {
                        "from": "products",
                        "localField": "items.name",
                        "foreignField": "name",
                        "as": "_legacy_products",
                    }
                },
                {
                    "$addFields": {
                        "_resolved_item_cost": {
                            "$ifNull": [
                                "$items.cost_price",
                                {"$arrayElemAt": ["$_legacy_products.cost_price", 0]},
                            ]
                        }
                    }
                },
                {
                    "$group": {
                        "_id": "$_id",
                        "line_revenue": {
                            "$sum": {
                                "$multiply": [
                                    {"$ifNull": ["$items.price", 0]},
                                    {"$ifNull": ["$items.quantity", 0]},
                                ]
                            }
                        },
                        "line_cogs": {
                            "$sum": {
                                "$multiply": [
                                    {"$ifNull": ["$_resolved_item_cost", 0]},
                                    {"$ifNull": ["$items.quantity", 0]},
                                ]
                            }
                        },
                        "stored_profit": {
                            "$first": {"$ifNull": ["$total_profit", None]}
                        },
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        "all_time_cogs": {
                            "$sum": {
                                "$cond": [
                                    {"$ne": ["$stored_profit", None]},
                                    {"$subtract": ["$line_revenue", "$stored_profit"]},
                                    "$line_cogs",
                                ]
                            }
                        },
                    }
                },
            ]
        ),
        {},
    )

    monthly_revenue = float(monthly_order_summary.get("monthly_revenue", 0))
    monthly_gross_profit = float(
        monthly_order_summary.get("monthly_gross_profit", 0)
    )
    monthly_expenses = float(monthly_expense_summary.get("monthly_expenses", 0))
    total_stock_investment = float(
        investment_summary.get("total_stock_investment", 0)
    )
    all_time_cogs = float(cogs_summary.get("all_time_cogs", 0))

    return {
        "monthly_revenue": monthly_revenue,
        "monthly_gross_profit": monthly_gross_profit,
        "monthly_expenses": monthly_expenses,
        "monthly_net_profit": monthly_gross_profit - monthly_expenses,
        "total_stock_investment": total_stock_investment,
        "remaining_stock_value": total_stock_investment - all_time_cogs,
    }