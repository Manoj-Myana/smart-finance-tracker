from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import pdfplumber
import re
from datetime import datetime

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
            # Old Indian Bank format: [Date, Date, Credit_Amount, Debit_Amount, Balance, Description]
            print("Detected INDIAN BANK format (5+ columns)")
            return parse_indian_bank_format(clean_row)
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
            'frequency': 'one-time'
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
            'frequency': 'one-time'
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
            'frequency': 'one-time'
        }
        
        print(f"Extracted INDIAN BANK transaction: {transaction}")
        return transaction
        
    except Exception as e:
        print(f"Error parsing Indian Bank format: {e}")
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
                    'frequency': 'one-time'
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
        
        if not file.filename.lower().endswith('.pdf'):
            print(f"ERROR: Invalid file type: {file.filename}")
            return jsonify({'error': 'Only PDF files are supported'}), 400
        
        # Save the uploaded file
        filename = file.filename
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        print(f"Saving file to: {filepath}")
        file.save(filepath)
        print(f"File saved successfully: {filepath}")
        
        # Check file size
        file_size = os.path.getsize(filepath)
        print(f"File size: {file_size} bytes")
        
        # Process the PDF
        print("=== STARTING PDF PROCESSING ===")
        transactions = extract_transactions_from_pdf(filepath)
        print(f"=== PDF PROCESSING COMPLETE: {len(transactions)} transactions ===")
        
        # Clean up the uploaded file
        os.remove(filepath)
        print("Temporary file cleaned up")
        
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

if __name__ == "__main__":
    print("Starting minimal Flask app...")
    app.run(debug=True, port=5001)