import pandas as pd
import sys

try:
    file_path = "Formula F1NTA 2026.xlsx"
    xls = pd.ExcelFile(file_path)
    print("Sheets available:", xls.sheet_names)
    for sheet in xls.sheet_names:
        print(f"\n--- Sheet: {sheet} ---")
        df = pd.read_excel(file_path, sheet_name=sheet, nrows=20)
        print(df.head(10).to_string())
except Exception as e:
    print(f"Error: {e}")
