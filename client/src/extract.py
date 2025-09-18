import camelot
import pdf2image
import pytesseract
import os

# Folder containing your PDFs
pdf_folder = 'C:/Users/Administrator/Documents/PDFs'
output_folder = 'C:/Users/Administrator/Documents/Output'

# Create output folder if it doesn't exist
if not os.path.exists(output_folder):
    os.makedirs(output_folder)

# List all PDFs in the folder
pdfs = [os.path.join(pdf_folder, f) for f in os.listdir(pdf_folder) if f.endswith('.pdf')]

# Process each PDF
for pdf in pdfs:
    try:
        # Extract tables (lattice for bordered tables like your sample)
        tables = camelot.read_pdf(pdf, flavor='lattice')
        print(f"Processing {pdf}: Found {len(tables)} tables")
        for i, table in enumerate(tables):
            output_file = os.path.join(output_folder, f"table_{os.path.basename(pdf)}_{i}.csv")
            table.to_csv(output_file)
            print(f"Saved table {i} from {pdf} to {output_file}")
    except Exception as e:
        print(f"Error extracting tables from {pdf}: {str(e)}")

    try:
        # Extract text from pages (for graphs)
        images = pdf2image.convert_from_path(pdf)
        for i, image in enumerate(images):
            text = pytesseract.image_to_string(image)
            output_file = os.path.join(output_folder, f"text_{os.path.basename(pdf)}_{i}.txt")
            with open(output_file, 'w') as f:
                f.write(text)
            print(f"Saved text from page {i+1} of {pdf} to {output_file}")
    except Exception as e:
        print(f"Error extracting text from {pdf}: {str(e)}")