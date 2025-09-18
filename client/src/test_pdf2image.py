from pdf2image import convert_from_path
images = convert_from_path('C:/Users/Administrator/Documents/PDFs/esr2020.pdf', poppler_path=r'C:\Program Files\poppler-25.07.0\Library\bin')
print(f"Converted {len(images)} pages")