#!/usr/bin/env python3
"""Generate a small text-based PDF for extraction testing."""
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

path = "/tmp/test_will.pdf"
c = canvas.Canvas(path, pagesize=A4)
text = c.beginText(50, 780)
lines = [
    "KOTAK MAHINDRA BANK LTD - STATEMENT OF ACCOUNT (TEST)",
    "Account Holder: SITA RAMAN",
    "Account No: 8822XX1904  Branch: Mumbai - Bandra West",
    "Period: 01-Apr-2015 to 30-Jun-2015",
    "01-Apr-2015 Balance B/F  Rs. 2,45,000.00 Cr",
    "30-Jun-2015 Balance C/F  Rs. 2,51,230.00 Cr",
    "NOTE: Account marked DORMANT by the bank in 2020.",
]
for line in lines:
    text.textLine(line)
c.drawText(text)
c.save()
print("PDF written:", path)
