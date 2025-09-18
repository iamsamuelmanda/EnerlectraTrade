import camelot
tables = camelot.read_pdf('C:/Users/Administrator/Documents/PDFs/esr2020.pdf', flavor='lattice', backend='tesseract')
print(f"Found {len(tables)} tables")
for i, table in enumerate(tables):
    print(f"Table {i}:\n{table.df}")
    table.to_csv(f'C:/Users/Administrator/Documents/Output/test_table_tesseract_{i}.csv')