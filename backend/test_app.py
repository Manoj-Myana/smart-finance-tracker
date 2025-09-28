from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import pdfplumber
import pandas as pd
import openpyxl
import re
from datetime import datetime, timedelta
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def extract_transactions_from_pdf(file_path):
    """
    Extract transactions from Indian Bank PDF using pdfplumber
    """
    transactions = []
    
    try:
        with pdfplumber.open(file_path) as pdf:
            print(f"Processing PDF with {len(pdf.pages)} pages")
            
            for page_num, page in enumerate(pdf.pages):
                print(f"Processing page {page_num + 1}")
                
                # Extract text from the page
                text = page.extract_text()
                if text:
                    print(f"Extracted text from page {page_num + 1}: {len(text)} characters")
                    
                # Try to extract tables first
                tables = page.extract_tables()
                if tables:
                    print(f"Found {len(tables)} tables on page {page_num + 1}")
                    for table_num, table in enumerate(tables):
                        print(f"Processing table {table_num + 1} with {len(table)} rows")
                        
                        for row_num, row in enumerate(table):
                            print(f"RAW ROW {row_num}: {row}")
                            print(f"Checking row {row_num}: {row}")
                            if row and len(row) >= 3:  # Need at least 3 columns
                                # Skip header rows
                                if any(header in str(row[0] or '').lower() for header in 
                                      ['date', 'particulars', 's.no', 'sr.no', 'transaction', 'remarks']):
                                    print(f"Skipping header row: {row}")
                                    continue
                                
                                print(f"Processing data row {row_num}: {row}")
                                transaction = parse_transaction_row(row)
                                if transaction:
                                    transaction['id'] = len(transactions) + 1
                                    transactions.append(transaction)
                                    print(f"Added transaction: {transaction}")
                                else:
                                    print(f"Failed to parse row {row_num}: {row}")
                            else:
                                print(f"Skipping row {row_num} - insufficient columns ({len(row) if row else 0}): {row}")
                
                # DISABLED: Only try text-based extraction if NO table transactions were found
                # if not transactions and text:
                #     text_transactions = extract_from_text_patterns(text, page_num)
                #     transactions.extend(text_transactions)
    
    except Exception as e:
        print(f"Error processing PDF: {e}")
        return []
    
    # Remove duplicates and clean up
    cleaned_transactions = remove_duplicates(transactions)
    print(f"Final extracted transactions: {len(cleaned_transactions)}")
    
    return cleaned_transactions

def extract_transactions_from_excel(file_path):
    """
    Extract transactions from Excel (.xlsx, .xls) or CSV files
    """
    try:
        transactions = []
        print(f"Starting Excel processing for: {file_path}")
        
        # Determine file type and read accordingly
        file_extension = os.path.splitext(file_path.lower())[1]
        
        if file_extension == '.csv':
            print("Processing CSV file")
            df = pd.read_csv(file_path, encoding='utf-8', on_bad_lines='skip')
        elif file_extension in ['.xlsx', '.xls']:
            print(f"Processing Excel file: {file_extension}")
            # Try to read all sheets, take the first one with data
            excel_file = pd.ExcelFile(file_path)
            sheet_names = excel_file.sheet_names
            print(f"Available sheets: {sheet_names}")
            
            df = None
            for sheet in sheet_names:
                temp_df = pd.read_excel(file_path, sheet_name=sheet, header=None)
                if not temp_df.empty and len(temp_df.columns) >= 3:
                    df = temp_df
                    print(f"Using sheet: {sheet}")
                    break
            
            if df is None or df.empty:
                print("No valid sheet found with sufficient columns")
                return []
        else:
            print(f"Unsupported file format: {file_extension}")
            return []
        
        print(f"DataFrame shape: {df.shape}")
        print(f"DataFrame columns: {df.columns.tolist()}")
        
        # Convert DataFrame to list of lists (similar to PDF table format)
        rows = []
        for index, row in df.iterrows():
            row_list = [str(cell) if pd.notna(cell) else '' for cell in row.values]
            rows.append(row_list)
        
        print(f"Total rows extracted: {len(rows)}")
        
        # Process rows using the same logic as PDF
        for row_num, row in enumerate(rows):
            if len(row) >= 3:  # Minimum columns needed
                # Skip actual header row (only check first row and only if it looks like column names)
                if row_num == 0:
                    # Check if the first row contains column headers (not transaction data)
                    # Headers typically don't have dates or amounts in the first position
                    if (not is_date(row[0]) or 
                        (row[0].lower() in ['date', 'transaction_date', 'posting_date'] and 
                         row[1].lower() in ['description', 'particulars', 'reference', 'remarks'] and
                         row[2].lower() in ['amount', 'debit', 'credit', 'withdrawal', 'deposit'])):
                        print(f"Skipping header row {row_num}: {row}")
                        continue
                
                print(f"Processing Excel row {row_num}: {row}")
                transaction = parse_transaction_row(row)
                if transaction:
                    transaction['id'] = len(transactions) + 1
                    transactions.append(transaction)
                    print(f"Added Excel transaction: {transaction}")
                else:
                    print(f"Failed to parse Excel row {row_num}: {row}")
            else:
                print(f"Skipping Excel row {row_num} - insufficient columns ({len(row)}): {row}")
    
    except Exception as e:
        print(f"Error processing Excel file: {e}")
        import traceback
        traceback.print_exc()
        return []
    
    # Remove duplicates and clean up
    cleaned_transactions = remove_duplicates(transactions)
    print(f"Final extracted Excel transactions: {len(cleaned_transactions)}")
    
    return cleaned_transactions

def parse_transaction_row(row):
    """
    Parse a single transaction row from table data
    """
    try:
        # Clean the row
        clean_row = [str(cell).strip().replace('\n', ' ') if cell else '' for cell in row]
        print(f"Processing transaction row: {clean_row}")
        
        # Skip empty rows
        non_empty_cells = [cell for cell in clean_row if cell]
        if len(non_empty_cells) < 3:
            print(f"Row has insufficient data ({len(non_empty_cells)} non-empty cells)")
            return None
        
        print(f"Row has {len(clean_row)} columns, determining format...")
        
        # Auto-detect bank format based on row structure and content
        if len(clean_row) >= 8:
            # New format: [Date, Remarks, Tran Id-1, UTR Number, Instr. ID, Withdrawals, Deposits, Balance]
            print("Detected NEW bank format (8+ columns)")
            return parse_new_bank_format(clean_row)
        elif len(clean_row) >= 6:
            # Check if this is Indian Bank format by looking at column structure
            # Indian Bank: [Value Date, Post Date, Credit Amount, Debit Amount, Closing Balance, Description]
            
            print(f"CHECKING 6-COLUMN FORMAT:")
            print(f"  Column 0 (should be date): '{clean_row[0]}' -> is_date: {is_date(clean_row[0])}")
            print(f"  Column 1 (should be date): '{clean_row[1]}' -> is_date: {is_date(clean_row[1])}")
            print(f"  Column 2 (credit amount): '{clean_row[2]}' -> is_amount: {is_amount(clean_row[2])}")
            print(f"  Column 3 (debit amount): '{clean_row[3]}' -> is_amount: {is_amount(clean_row[3])}")
            
            if (is_date(clean_row[0]) and is_date(clean_row[1]) and 
                (is_amount(clean_row[2]) or clean_row[2] == '') and
                (is_amount(clean_row[3]) or clean_row[3] == '')):
                print("✓ DETECTED INDIAN BANK format (6 columns)")
                return parse_indian_bank_6_column_format(clean_row)
            else:
                print("✗ NOT Indian Bank 6-column format, trying 5-column format")
                # Fallback to old 5-column Indian Bank format
                print("Detected INDIAN BANK format (5+ columns)")
                return parse_indian_bank_format(clean_row)
        elif len(clean_row) >= 5:
            # Check for CSV format: [Date, Description, Amount, Type, Category]
            if (is_date(clean_row[0]) and 
                is_amount(clean_row[2]) and 
                clean_row[3].lower() in ['credit', 'debit']):
                print("Detected CSV format: [Date, Description, Amount, Type, Category]")
                return parse_csv_format(clean_row)
            else:
                # Old Indian Bank format: [Date, Date, Credit_Amount, Debit_Amount, Balance, Description]
                print("Detected INDIAN BANK format (5+ columns)")
                return parse_indian_bank_format(clean_row)
        elif len(clean_row) >= 4:
            # Check for 4-column CSV format: [Date, Amount, Type, Description]
            if (is_date(clean_row[0]) and 
                is_amount(clean_row[1]) and 
                clean_row[2].lower() in ['credit', 'debit']):
                print("Detected 4-column CSV format: [Date, Amount, Type, Description]")
                return parse_4_column_csv_format(clean_row)
            else:
                print("Unknown 4-column format")
                return None
        else:
            print(f"Unknown format - insufficient columns ({len(clean_row)})")
            return None
        
    except Exception as e:
        print(f"Error parsing transaction row: {e}")
        import traceback
        traceback.print_exc()
        return None

def parse_indian_bank_6_column_format(clean_row):
    """Parse the 6-column Indian Bank statement format"""
    try:
        print(f"INDIAN BANK 6-COL: Parsing row with {len(clean_row)} columns: {clean_row}")
        
        # Format: [Value Date, Post Date, Credit Amount, Debit Amount, Closing Balance, Description]
        # Index:     0          1          2             3             4               5
        
        # Extract date from Value Date (first column)
        date_str = clean_row[0]
        if not is_date(date_str):
            print(f"INDIAN BANK 6-COL: Date validation failed for: {date_str}")
            return None
        
        # Extract amounts - Credit Amount (index 2) and Debit Amount (index 3)
        credit_amount = 0
        debit_amount = 0
        
        if len(clean_row) > 2 and clean_row[2] and is_amount(clean_row[2]):
            credit_amount = float(clean_amount(clean_row[2]))
            print(f"INDIAN BANK 6-COL: Found credit amount: {credit_amount}")
        
        if len(clean_row) > 3 and clean_row[3] and is_amount(clean_row[3]):
            debit_amount = float(clean_amount(clean_row[3]))
            print(f"INDIAN BANK 6-COL: Found debit amount: {debit_amount}")
        
        # Determine transaction type and amount
        if credit_amount > 0:
            amount = credit_amount
            amount_type = 'credit'
        elif debit_amount > 0:
            amount = debit_amount
            amount_type = 'debit'
        else:
            print(f"INDIAN BANK 6-COL: No valid amount found in row")
            return None
        
        # Extract description (last column - index 5)
        description = clean_row[5] if len(clean_row) > 5 else 'Transaction'
        if not description or description.strip() == '':
            description = 'Transaction'
        
        # Clean up description
        description = description.replace('\n', ' ').strip()
        if len(description) > 150:
            description = description[:150] + '...'
        
        transaction = {
            'id': 0,  # Will be assigned proper ID later
            'date': format_date(date_str),
            'description': description,
            'amount': amount,
            'type': amount_type,
            'category': detect_category(description),
            'frequency': 'irregular'
        }
        
        print(f"INDIAN BANK 6-COL: Successfully extracted transaction: {transaction}")
        return transaction
        
    except Exception as e:
        print(f"INDIAN BANK 6-COL: Error parsing: {e}")
        import traceback
        traceback.print_exc()
        return None

def parse_new_bank_format(clean_row):
    """Parse the new bank statement format"""
    try:
        print(f"NEW FORMAT: Parsing row with {len(clean_row)} columns: {clean_row}")
        
        # Extract date (first column)
        date_str = clean_row[0]
        if not is_date(date_str):
            print(f"NEW FORMAT: Date validation failed for: {date_str}")
            return None
        
        # Extract description from Remarks column (index 1)
        description = clean_row[1] if len(clean_row) > 1 else ''
        
        # Extract amounts from Withdrawals (index 5) and Deposits (index 6) columns
        withdrawal_amount = 0
        deposit_amount = 0
        
        if len(clean_row) > 5 and clean_row[5] and is_amount(clean_row[5]):
            withdrawal_amount = float(clean_amount(clean_row[5]))
            print(f"NEW FORMAT: Found withdrawal amount: {withdrawal_amount}")
        
        if len(clean_row) > 6 and clean_row[6] and is_amount(clean_row[6]):
            deposit_amount = float(clean_amount(clean_row[6]))
            print(f"NEW FORMAT: Found deposit amount: {deposit_amount}")
        
        # Determine transaction type and amount
        if deposit_amount > 0:
            amount = deposit_amount
            amount_type = 'credit'
        elif withdrawal_amount > 0:
            amount = withdrawal_amount
            amount_type = 'debit'
        else:
            print(f"NEW FORMAT: No valid amount found in row")
            return None
        
        # Clean up description
        description = description.replace('\n', ' ').strip()
        if len(description) > 150:
            description = description[:150] + '...'
        
        transaction = {
            'id': 0,  # Will be assigned proper ID later
            'date': format_date(date_str),
            'description': description,
            'amount': amount,
            'type': amount_type,
            'category': detect_category(description),
            'frequency': 'irregular'
        }
        
        print(f"NEW FORMAT: Successfully extracted transaction: {transaction}")
        return transaction
        
    except Exception as e:
        print(f"NEW FORMAT: Error parsing: {e}")
        import traceback
        traceback.print_exc()
        return None

def parse_indian_bank_format(clean_row):
    """Parse the previous Indian Bank format"""
    try:
        # Extract date (first column)
        date_str = clean_row[0] if clean_row[0] else clean_row[1]
        if not is_date(date_str):
            return None
        
        # Extract amounts - check both credit (index 2) and debit (index 3) columns
        credit_amount = 0
        debit_amount = 0
        
        if len(clean_row) > 2 and clean_row[2] and is_amount(clean_row[2]):
            credit_amount = float(clean_amount(clean_row[2]))
        
        if len(clean_row) > 3 and clean_row[3] and is_amount(clean_row[3]):
            debit_amount = float(clean_amount(clean_row[3]))
        
        # Determine the transaction amount and type
        if credit_amount > 0:
            amount = credit_amount
            amount_type = 'credit'
        elif debit_amount > 0:
            amount = debit_amount
            amount_type = 'debit'
        else:
            return None
        
        # Extract description (usually the last column)
        description = ''
        if len(clean_row) > 5:
            description = clean_row[5]  # Last column usually has description
        elif len(clean_row) > 4:
            description = clean_row[4]
        else:
            description = 'Transaction'
        
        # Clean up description
        description = description.replace('\n', ' ').strip()
        if len(description) > 100:
            description = description[:100] + '...'
        
        transaction = {
            'id': 0,  # Will be assigned proper ID later
            'date': format_date(date_str),
            'description': description,
            'amount': amount,
            'type': amount_type,
            'category': detect_category(description),
            'frequency': 'irregular'
        }
        
        print(f"Extracted INDIAN BANK transaction: {transaction}")
        return transaction
        
    except Exception as e:
        print(f"Error parsing Indian Bank format: {e}")
        return None

def parse_csv_format(clean_row):
    """Parse CSV format: [Date, Description, Amount, Type, Category]"""
    try:
        # Extract date (first column)
        date_str = clean_row[0]
        if not is_date(date_str):
            return None
        
        # Extract description (second column)
        description = clean_row[1] if len(clean_row) > 1 else 'Transaction'
        
        # Extract amount (third column)
        amount_str = clean_row[2]
        if not is_amount(amount_str):
            return None
        
        amount = float(clean_amount(amount_str))
        
        # Extract type (fourth column)
        type_str = clean_row[3].lower() if len(clean_row) > 3 else ''
        if type_str not in ['credit', 'debit']:
            # Try to determine from amount sign
            if amount < 0:
                amount = abs(amount)
                amount_type = 'debit'
            else:
                amount_type = 'credit'
        else:
            amount_type = type_str
            amount = abs(amount)  # Make sure amount is positive
        
        # Extract category (fifth column, optional)
        category = clean_row[4] if len(clean_row) > 4 else detect_category(description)
        
        # Clean up description
        description = description.replace('\n', ' ').strip()
        if len(description) > 100:
            description = description[:100] + '...'
        
        transaction = {
            'id': 0,  # Will be assigned proper ID later
            'date': format_date(date_str),
            'description': description,
            'amount': amount,
            'type': amount_type,
            'category': category,
            'frequency': 'irregular'
        }
        
        print(f"Extracted CSV transaction: {transaction}")
        return transaction
        
    except Exception as e:
        print(f"Error parsing CSV format: {e}")
        import traceback
        traceback.print_exc()
        return None

def parse_4_column_csv_format(clean_row):
    """Parse 4-column CSV format: [Date, Amount, Type, Description]"""
    try:
        # Extract date (first column)
        date_str = clean_row[0]
        if not is_date(date_str):
            return None
        
        # Extract amount (second column)
        amount_str = clean_row[1]
        if not is_amount(amount_str):
            return None
        
        amount = float(clean_amount(amount_str))
        
        # Extract type (third column)
        type_str = clean_row[2].lower() if len(clean_row) > 2 else ''
        if type_str not in ['credit', 'debit']:
            # Try to determine from amount sign
            if amount < 0:
                amount = abs(amount)
                amount_type = 'debit'
            else:
                amount_type = 'credit'
        else:
            amount_type = type_str
            amount = abs(amount)  # Make sure amount is positive
        
        # Extract description (fourth column)
        description = clean_row[3] if len(clean_row) > 3 else 'Transaction'
        
        # Auto-detect category from description
        category = detect_category(description)
        
        # Clean up description
        description = description.replace('\n', ' ').strip()
        if len(description) > 100:
            description = description[:100] + '...'
        
        transaction = {
            'id': 0,  # Will be assigned proper ID later
            'date': format_date(date_str),
            'description': description,
            'amount': amount,
            'type': amount_type,
            'category': category,
            'frequency': 'irregular'
        }
        
        print(f"Extracted 4-column CSV transaction: {transaction}")
        return transaction
        
    except Exception as e:
        print(f"Error parsing 4-column CSV format: {e}")
        import traceback
        traceback.print_exc()
        return None

def extract_from_text_patterns(text, page_num):
    """
    Extract transactions from raw text using regex patterns
    """
    transactions = []
    lines = text.split('\n')
    
    print(f"Trying text-based extraction on page {page_num}")
    
    for line_num, line in enumerate(lines):
        # Pattern for Indian Bank: Date Description Amount
        patterns = [
            r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+(\d+(?:,\d{3})*\.?\d*)',
            r'(\d{1,2}\s+\w{3}\s+\d{4})\s+(.+?)\s+(\d+(?:,\d{3})*\.?\d*)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, line.strip())
            if match:
                date_str, description, amount_str = match.groups()
                
                transaction = {
                    'id': len(transactions) + 1,
                    'date': format_date(date_str),
                    'description': description.strip(),
                    'amount': float(clean_amount(amount_str)),
                    'type': 'debit',
                    'category': detect_category(description),
                    'frequency': 'irregular'
                }
                
                transactions.append(transaction)
                print(f"Text extracted: {transaction}")
                break
    
    return transactions

def is_date(text):
    """Check if text looks like a date (with or without timestamp)"""
    if not text:
        return False
    
    # Clean the text - remove newlines, extra spaces, and normalize spaces
    cleaned_text = text.replace('\n', '').strip()
    # Remove multiple spaces and replace with single space, then remove spaces around slashes
    cleaned_text = re.sub(r'\s+', ' ', cleaned_text)  # Multiple spaces -> single space
    cleaned_text = re.sub(r'\s*/\s*', '/', cleaned_text)  # Remove spaces around slashes
    cleaned_text = re.sub(r'\s*-\s*', '-', cleaned_text)  # Remove spaces around dashes
    
    date_patterns = [
        r'^\d{1,2}/\d{1,2}/\d{2,4}$',              # DD/MM/YYYY
        r'^\d{1,2}-\d{1,2}-\d{2,4}$',              # DD-MM-YYYY  
        r'^\d{1,2}/\d{1,2}/\d{2,4}\s+\d{1,2}:\d{2}(:\d{2})?$',  # DD/MM/YYYY HH:MM:SS or DD/MM/YYYY HH:MM
        r'^\d{1,2}-\d{1,2}-\d{2,4}\s+\d{1,2}:\d{2}(:\d{2})?$',  # DD-MM-YYYY HH:MM:SS
        r'^\d{1,2}\w{3}\d{4}$',                    # DDMMMYYYY (no spaces)
        r'^\d{1,2}\s+\w{3}\s+\d{4}$',             # DD MMM YYYY (with spaces)
        r'^\d{4}/\d{1,2}/\d{1,2}$',               # YYYY/MM/DD
        r'^\d{4}-\d{1,2}-\d{1,2}$',               # YYYY-MM-DD
        r'^\d{4}/\d{1,2}/\d{1,2}\s+\d{1,2}:\d{2}(:\d{2})?$',  # YYYY/MM/DD HH:MM:SS
        r'^\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{2}(:\d{2})?$',  # YYYY-MM-DD HH:MM:SS
    ]
    
    result = any(re.match(pattern, cleaned_text) for pattern in date_patterns)
    print(f"IS_DATE: '{text}' -> '{cleaned_text}' -> {result}")
    return result

def is_amount(text):
    """Check if text looks like an amount"""
    if not text:
        return False
    
    # Remove currency symbols and commas
    cleaned = re.sub(r'[₹,\s]', '', text.strip())
    
    try:
        float(cleaned)
        return len(cleaned) > 0
    except ValueError:
        return False

def clean_amount(text):
    """Clean amount string for parsing"""
    return re.sub(r'[₹,\s]', '', text.strip())

def format_date(date_str):
    """Format date string to YYYY-MM-DD (strip time if present)"""
    try:
        # Clean the date string - remove newlines, extra spaces, and normalize
        cleaned_date = date_str.replace('\n', ' ').strip()
        # Remove multiple spaces and replace with single space
        cleaned_date = re.sub(r'\s+', ' ', cleaned_date)
        # Remove spaces around slashes and dashes
        cleaned_date = re.sub(r'\s*/\s*', '/', cleaned_date)
        cleaned_date = re.sub(r'\s*-\s*', '-', cleaned_date)
        
        # Extract just the date part if there's a timestamp
        # Look for patterns like "DD/MM/YYYY HH:MM:SS" and extract "DD/MM/YYYY"
        date_match = re.match(r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', cleaned_date)
        if date_match:
            date_part = date_match.group(1)
        else:
            date_part = cleaned_date
        
        print(f"FORMAT_DATE: Input='{date_str}' -> Cleaned='{cleaned_date}' -> DatePart='{date_part}'")
        
        # Handle DD/MM/YYYY or DD-MM-YYYY
        if re.match(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', date_part):
            if '/' in date_part:
                parts = date_part.split('/')
            else:
                parts = date_part.split('-')
            
            day, month, year = parts
            
            if len(year) == 2:
                year = '20' + year
            
            # Ensure proper padding
            day = day.zfill(2)
            month = month.zfill(2)
            
            formatted_date = f"{year}-{month}-{day}"
            print(f"FORMAT_DATE: Formatted as: {formatted_date}")
            return formatted_date
        
        # Handle DD MMM YYYY
        elif re.match(r'\d{1,2}\s*\w{3}\s*\d{4}', date_part):
            # Handle possible spaces or lack thereof
            parts = re.split(r'\s+', date_part.replace('\n', ' ').strip())
            if len(parts) >= 3:
                day, month_str, year = parts[0], parts[1], parts[2]
                
                month_map = {
                    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
                    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
                    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
                }
                
                month = month_map.get(month_str.lower()[:3], '01')
                return f"{year}-{month}-{day.zfill(2)}"
        
        return datetime.now().strftime('%Y-%m-%d')
        
    except Exception as e:
        print(f"Error formatting date '{date_str}': {e}")
        return datetime.now().strftime('%Y-%m-%d')

def detect_category(description):
    """Auto-detect transaction category"""
    desc_lower = description.lower()
    
    if any(word in desc_lower for word in ['upi', 'gpay', 'paytm', 'phonepe', 'bhim']):
        return 'Digital Payment'
    elif any(word in desc_lower for word in ['atm', 'cash withdrawal', 'cwd']):
        return 'Cash Withdrawal'
    elif any(word in desc_lower for word in ['salary', 'sal']):
        return 'Salary'
    elif any(word in desc_lower for word in ['interest', 'int']):
        return 'Interest'
    else:
        return 'Others'

def remove_duplicates(transactions):
    """Remove duplicate transactions"""
    seen = set()
    unique = []
    
    for trans in transactions:
        key = (trans['date'], trans['amount'], trans['description'][:20])
        if key not in seen:
            seen.add(key)
            trans['id'] = len(unique) + 1
            unique.append(trans)
    
    return unique

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

@app.route("/api/test", methods=["GET"])
def test_endpoint():
    return jsonify({'message': 'Flask backend is working!', 'timestamp': datetime.now().isoformat()})

@app.route("/api/transactions", methods=["GET"])
def get_transactions():
    """
    Get all transactions from database for a specific user
    """
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        # This would typically query the database for user-specific transactions
        # For now, return empty array - you can connect to your actual database
        return jsonify([])
    except Exception as e:
        print(f"Error fetching transactions: {e}")
        return jsonify({'error': str(e)}), 500

@app.route("/api/transactions/<user_id>", methods=["GET"])
def get_user_transactions(user_id):
    """
    Get all transactions for a specific user
    """
    try:
        # This would typically query the database for user-specific transactions
        # For now, return empty array - you can connect to your actual database
        return jsonify([])
    except Exception as e:
        print(f"Error fetching user transactions: {e}")
        return jsonify({'error': str(e)}), 500

@app.route("/api/transactions", methods=["POST"])
def save_transaction():
    """
    Save a single transaction to database
    """
    try:
        transaction_data = request.json
        print(f"Saving transaction: {transaction_data}")
        
        if not transaction_data:
            return jsonify({'error': 'No transaction data provided'}), 400
        
        # Validate required fields
        required_fields = ['user_id', 'date', 'description', 'amount', 'type', 'frequency']
        for field in required_fields:
            if field not in transaction_data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Here you would typically save to your database
        # For now, we'll simulate success
        print(f"Transaction would be saved: {transaction_data}")
        
        # Return success response with a mock ID
        response_data = {
            'success': True,
            'transaction': {
                **transaction_data,
                'id': len(str(transaction_data)) + 1,  # Mock ID
                'created_at': datetime.now().isoformat()
            }
        }
        
        return jsonify(response_data)
    
    except Exception as e:
        print(f"Error saving transaction: {e}")
        return jsonify({'error': str(e)}), 500

@app.route("/api/transactions/batch", methods=["POST"])
def save_transactions_batch():
    """
    Save multiple transactions to database
    """
    try:
        transactions_data = request.json.get('transactions', [])
        print(f"Saving {len(transactions_data)} transactions in batch")
        
        if not transactions_data:
            return jsonify({'error': 'No transactions provided'}), 400
        
        # Process each transaction
        saved_transactions = []
        for i, transaction_data in enumerate(transactions_data):
            # Validate required fields
            required_fields = ['user_id', 'date', 'description', 'amount', 'type', 'frequency']
            for field in required_fields:
                if field not in transaction_data:
                    return jsonify({'error': f'Missing required field "{field}" in transaction {i+1}'}), 400
            
            # Here you would typically save to your database
            saved_transaction = {
                **transaction_data,
                'id': i + 1000,  # Mock ID
                'created_at': datetime.now().isoformat()
            }
            saved_transactions.append(saved_transaction)
        
        print(f"Successfully processed {len(saved_transactions)} transactions")
        
        return jsonify({
            'success': True,
            'saved_count': len(saved_transactions),
            'transactions': saved_transactions
        })
    
    except Exception as e:
        print(f"Error saving transactions batch: {e}")
        return jsonify({'error': str(e)}), 500

@app.route("/api/upload", methods=["POST"])
def upload_and_process():
    try:
        print("=== UPLOAD REQUEST RECEIVED ===")
        print(f"Request method: {request.method}")
        print(f"Request files: {request.files}")
        print(f"Request form: {request.form}")
        
        if 'file' not in request.files:
            print("ERROR: No 'file' key in request.files")
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        print(f"File object: {file}")
        print(f"Filename: {file.filename}")
        
        if file.filename == '':
            print("ERROR: Empty filename")
            return jsonify({'error': 'No file selected'}), 400
        
        # Check file extension
        filename_lower = file.filename.lower()
        supported_extensions = ['.pdf', '.xlsx', '.xls', '.csv']
        if not any(filename_lower.endswith(ext) for ext in supported_extensions):
            print(f"ERROR: Invalid file type: {file.filename}")
            return jsonify({'error': 'Supported file types: PDF, Excel (.xlsx, .xls), CSV'}), 400
        
        # Save the uploaded file
        filename = file.filename
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        print(f"Saving file to: {filepath}")
        file.save(filepath)
        print(f"File saved successfully: {filepath}")
        
        # Check file size
        file_size = os.path.getsize(filepath)
        print(f"File size: {file_size} bytes")
        
        # Determine file type and process accordingly
        filename_lower = file.filename.lower()
        if filename_lower.endswith('.pdf'):
            print("=== STARTING PDF PROCESSING ===")
            transactions = extract_transactions_from_pdf(filepath)
            print(f"=== PDF PROCESSING COMPLETE: {len(transactions)} transactions ===")
        elif filename_lower.endswith(('.xlsx', '.xls', '.csv')):
            print("=== STARTING EXCEL/CSV PROCESSING ===")
            transactions = extract_transactions_from_excel(filepath)
            print(f"=== EXCEL/CSV PROCESSING COMPLETE: {len(transactions)} transactions ===")
        else:
            print(f"ERROR: Unsupported file type: {file.filename}")
            os.remove(filepath)
            return jsonify({'error': 'Unsupported file type'}), 400
        
        # Clean up the uploaded file
        try:
            os.remove(filepath)
            print("Temporary file cleaned up")
        except PermissionError as pe:
            print(f"Warning: Could not delete temporary file {filepath}: {pe}")
            # File is still in use, but processing completed successfully
            pass
        
        return jsonify({
            'success': True,
            'transactions': transactions,
            'count': len(transactions)
        })
        
    except Exception as e:
        print(f"ERROR in upload_and_process: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

def prepare_transaction_data_for_ml(transactions_data):
    """
    Prepare transaction data for machine learning prediction
    """
    try:
        print(f"Preparing ML data for {len(transactions_data)} transactions")
        
        if not transactions_data:
            return None
            
        # Convert to DataFrame
        df = pd.DataFrame(transactions_data)
        
        # Convert date to datetime
        df['date'] = pd.to_datetime(df['date'])
        
        # Extract year-month for grouping
        df['year_month'] = df['date'].dt.to_period('M')
        
        # Separate income and expenses
        income_df = df[df['type'] == 'credit'].copy()
        expense_df = df[df['type'] == 'debit'].copy()
        
        # Group by month and calculate totals
        monthly_data = []
        
        # Get all unique months
        all_months = df['year_month'].unique()
        
        for month in all_months:
            month_income = income_df[income_df['year_month'] == month]['amount'].sum()
            month_expense = expense_df[expense_df['year_month'] == month]['amount'].sum()
            month_savings = month_income - month_expense
            
            monthly_data.append({
                'year_month': month,
                'income': month_income,
                'expense': month_expense,
                'savings': month_savings,
                'month_numeric': month.month,
                'year': month.year
            })
        
        monthly_df = pd.DataFrame(monthly_data)
        monthly_df = monthly_df.sort_values('year_month')
        
        print(f"Prepared {len(monthly_df)} monthly data points for ML")
        return monthly_df
        
    except Exception as e:
        print(f"Error preparing ML data: {e}")
        return None

def create_ml_features(monthly_df):
    """
    Create features for machine learning model
    """
    try:
        if len(monthly_df) < 3:
            print("Insufficient data for ML (need at least 3 months)")
            return None, None
            
        # Create features (X) and targets (y)
        features = []
        targets = {'income': [], 'expense': [], 'savings': []}
        
        # Use sequential month numbers as primary feature
        monthly_df = monthly_df.reset_index(drop=True)
        
        for i in range(len(monthly_df)):
            # Features: [month_sequence, month_of_year, recent_trend]
            month_sequence = i + 1
            month_of_year = monthly_df.iloc[i]['month_numeric']
            
            # Calculate recent trend (average of last 2-3 months)
            if i >= 2:
                recent_income_trend = monthly_df.iloc[max(0, i-2):i]['income'].mean()
                recent_expense_trend = monthly_df.iloc[max(0, i-2):i]['expense'].mean()
            else:
                recent_income_trend = monthly_df.iloc[:i+1]['income'].mean()
                recent_expense_trend = monthly_df.iloc[:i+1]['expense'].mean()
            
            features.append([
                month_sequence,
                month_of_year,
                recent_income_trend,
                recent_expense_trend
            ])
            
            targets['income'].append(monthly_df.iloc[i]['income'])
            targets['expense'].append(monthly_df.iloc[i]['expense'])
            targets['savings'].append(monthly_df.iloc[i]['savings'])
        
        X = np.array(features)
        y = {
            'income': np.array(targets['income']),
            'expense': np.array(targets['expense']),
            'savings': np.array(targets['savings'])
        }
        
        print(f"Created features: {X.shape}, targets: {len(y)}")
        return X, y
        
    except Exception as e:
        print(f"Error creating ML features: {e}")
        return None, None

def train_prediction_models(X, y):
    """
    Train machine learning models for income, expense, and savings prediction
    """
    try:
        models = {}
        scalers = {}
        
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Train separate models for income, expense, and savings
        for target_type in ['income', 'expense', 'savings']:
            model = LinearRegression()
            model.fit(X_scaled, y[target_type])
            models[target_type] = model
            
            print(f"Trained {target_type} model, score: {model.score(X_scaled, y[target_type]):.3f}")
        
        scalers['feature_scaler'] = scaler
        
        return models, scalers
        
    except Exception as e:
        print(f"Error training ML models: {e}")
        return None, None

def predict_future_values(models, scalers, last_month_data, months_ahead=6):
    """
    Predict future income, expense, and savings for the next N months
    """
    try:
        predictions = []
        
        # Get the last month info
        last_sequence = len(last_month_data)
        current_date = datetime.now()
        
        for i in range(1, months_ahead + 1):
            # Calculate future date
            future_date = current_date + timedelta(days=30 * i)
            future_month = future_date.month
            future_year = future_date.year
            
            # Calculate recent trends (use last available data)
            recent_income_trend = last_month_data['income'].tail(3).mean()
            recent_expense_trend = last_month_data['expense'].tail(3).mean()
            
            # Create features for prediction
            future_features = np.array([[
                last_sequence + i,
                future_month,
                recent_income_trend,
                recent_expense_trend
            ]])
            
            # Scale features
            future_features_scaled = scalers['feature_scaler'].transform(future_features)
            
            # Make predictions
            predicted_income = max(0, models['income'].predict(future_features_scaled)[0])
            predicted_expense = max(0, models['expense'].predict(future_features_scaled)[0])
            predicted_savings = predicted_income - predicted_expense
            
            predictions.append({
                'future_date': f"{future_date.strftime('%B')} {future_year}",
                'month': future_date.strftime('%B'),
                'year': future_year,
                'income_expected': round(predicted_income, 2),
                'expense_expected': round(predicted_expense, 2),
                'savings_expected': round(predicted_savings, 2)
            })
        
        print(f"Generated {len(predictions)} future predictions")
        return predictions
        
    except Exception as e:
        print(f"Error making predictions: {e}")
        return []

@app.route('/api/predict-future', methods=['POST'])
def predict_future_financial_values():
    """
    API endpoint to predict future income, expenses, and savings
    """
    try:
        print("=== FUTURE PREDICTION REQUEST ===")
        
        # Get transaction data from request
        request_data = request.get_json()
        
        if not request_data or 'transactions' not in request_data:
            return jsonify({
                'success': False,
                'error': 'Transaction data required for prediction'
            }), 400
        
        transactions = request_data['transactions']
        months_ahead = request_data.get('months_ahead', 6)  # Default to 6 months
        
        print(f"Received {len(transactions)} transactions for prediction")
        
        # Prepare data for ML
        monthly_df = prepare_transaction_data_for_ml(transactions)
        if monthly_df is None or len(monthly_df) < 3:
            return jsonify({
                'success': False,
                'error': 'Insufficient transaction history for prediction (need at least 3 months)',
                'predictions': []
            }), 400
        
        # Create ML features
        X, y = create_ml_features(monthly_df)
        if X is None:
            return jsonify({
                'success': False,
                'error': 'Unable to create features for machine learning',
                'predictions': []
            }), 400
        
        # Train models
        models, scalers = train_prediction_models(X, y)
        if models is None:
            return jsonify({
                'success': False,
                'error': 'Unable to train prediction models',
                'predictions': []
            }), 400
        
        # Make predictions
        predictions = predict_future_values(models, scalers, monthly_df, months_ahead)
        
        # Calculate model accuracy info
        model_info = {
            'data_points_used': len(monthly_df),
            'months_predicted': len(predictions),
            'data_range': {
                'from': str(monthly_df['year_month'].min()),
                'to': str(monthly_df['year_month'].max())
            }
        }
        
        return jsonify({
            'success': True,
            'predictions': predictions,
            'model_info': model_info
        })
        
    except Exception as e:
        print(f"Error in prediction endpoint: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'predictions': []
        }), 500

if __name__ == "__main__":
    print("Starting minimal Flask app...")
    app.run(debug=True, port=5001)