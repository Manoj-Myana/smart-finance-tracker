import pdfplumber
import os
import sys

def debug_pdf_structure(file_path):
    """Debug function to see what pdfplumber extracts from a PDF"""
    
    try:
        with pdfplumber.open(file_path) as pdf:
            print(f"PDF has {len(pdf.pages)} pages")
            
            for page_num, page in enumerate(pdf.pages):
                print(f"\n=== PAGE {page_num + 1} ===")
                
                # Extract raw text
                text = page.extract_text()
                if text:
                    print(f"Text length: {len(text)} characters")
                    print("First 500 characters:")
                    print(text[:500])
                    print("\n" + "="*50)
                
                # Extract tables
                tables = page.extract_tables()
                print(f"Found {len(tables)} tables")
                
                for table_num, table in enumerate(tables):
                    print(f"\nTable {table_num + 1}:")
                    print(f"  Rows: {len(table) if table else 0}")
                    if table and len(table) > 0:
                        print(f"  Columns in first row: {len(table[0]) if table[0] else 0}")
                        print("  First few rows:")
                        for i, row in enumerate(table[:5]):  # Show first 5 rows
                            print(f"    Row {i+1}: {row}")
                            
    except Exception as e:
        print(f"Error reading PDF: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
        if os.path.exists(pdf_path):
            debug_pdf_structure(pdf_path)
        else:
            print(f"File not found: {pdf_path}")
    else:
        print("Usage: python test_pdf_debug.py <pdf_file_path>")
        print("This script will help debug PDF structure for transaction extraction")