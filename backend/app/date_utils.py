from datetime import datetime
from typing import Optional


def month_window(month: Optional[int] = None, year: Optional[int] = None):
    now = datetime.now()
    selected_month = month or now.month
    selected_year = year or now.year
    start = datetime(selected_year, selected_month, 1)
    if selected_month == 12:
        end = datetime(selected_year + 1, 1, 1)
    else:
        end = datetime(selected_year, selected_month + 1, 1)
    return start, end