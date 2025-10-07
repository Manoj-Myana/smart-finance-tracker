import os
import pdfplumber
import pandas as pd
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from sqlalchemy import create_engine
import json
from datetime import datetime
import re
from bank_parsers import BankParserFactory

UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"pdf", "xls", "xlsx"}

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Enable CORS for React frontend
CORS(app)

# Database connection (SQLite for demo, replace with MySQL/Postgres if needed)
engine = create_engine("sqlite:///parsed_data.db")


# ---------- Helpers ----------
def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def extract_pdf_with_smart_parser(file_path):
    """
    Enhanced PDF extraction using bank-specific parsers
    """
    try:
        parser_factory = BankParserFactory()
        
        with pdfplumber.open(file_path) as pdf:
            print(f"Processing PDF with {len(pdf.pages)} pages")
            
            # Extract text from all pages
            all_text = ''
            all_tables = []
            
            for page_num, page in enumerate(pdf.pages):
                print(f"Processing page {page_num + 1}")
                
                # Extract text
                page_text = page.extract_text()
                if page_text:
                    all_text += page_text + '\n'
                
                # Extract tables
                page_tables = page.extract_tables()
                if page_tables:
                    all_tables.extend(page_tables)
            
            print(f"Extracted text length: {len(all_text)}")
            print(f"Found {len(all_tables)} tables")
            
            # Use smart parser to extract transactions
            transactions = parser_factory.parse_statement(all_text, all_tables)
            
            print(f"Extracted {len(transactions)} transactions using smart parser")
            return transactions
            
    except Exception as e:
        print(f"Error in smart parser extraction: {e}")
        # Fallback to basic extraction
        return extract_pdf_basic(file_path)


def extract_pdf_basic(file_path):
    """
    Basic PDF extraction as fallback
    """
    transactions = []
    
    with pdfplumber.open(file_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            print(f"Processing page {page_num + 1}")
            
            # Extract text for pattern matching
            text = page.extract_text()
            if not text:
                continue
            
            # Try table extraction first
            tables = page.extract_tables()
            if tables:
                for table in tables:
                    for row in table:
                        if row and len(row) >= 4:  # Minimum columns for a transaction
                            # Skip header rows
                            if any(header in str(row[0] or '') for header in ['Date', 'Particulars', 'S.No', 'Sr.No']):
                                continue
                            
                            transaction = parse_indian_bank_row(row)
                            if transaction:
                                transactions.append(transaction)
            
            # If table extraction fails, try text-based extraction
            if not transactions:
                text_transactions = extract_from_text_patterns(text)
                transactions.extend(text_transactions)
    
    return transactions


def parse_indian_bank_row(row):
    """
    Parse a row from Indian Bank statement table
    """
    try:
        # Clean the row
        clean_row = [str(cell).strip() if cell else '' for cell in row]
        
        # Find date (usually first column that looks like a date)
        date_str = None
        date_idx = 0
        for i, cell in enumerate(clean_row):
            if re.match(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', cell):
                date_str = cell
                date_idx = i
                break
        
        if not date_str:
            return None
        
        # Find description (usually after date)
        description = ''
        for i in range(date_idx + 1, len(clean_row)):
            if clean_row[i] and not re.match(r'^\d+\.?\d*$', clean_row[i]):
                description = clean_row[i]
                break
        
        # Find amount (last numeric value in the row)
        amount = 0
        amount_type = 'debit'
        
        for i in range(len(clean_row) - 1, -1, -1):
            cell = clean_row[i]
            if cell and re.match(r'^\d+\.?\d*$', cell):
                amount = float(cell)
                # Check if it's in credit column (Indian bank usually has separate debit/credit columns)
                if i == len(clean_row) - 1:  # Assuming last column is credit
                    amount_type = 'credit'
                break
        
        return {
            'date': format_date(date_str),
            'description': description,
            'amount': amount,
            'type': amount_type,
            'frequency': 'one-time'
        }
        
    except Exception as e:
        print(f"Error parsing row: {e}")
        return None


def extract_from_text_patterns(text):
    """
    Extract transactions from text using regex patterns for Indian Bank
    """
    transactions = []
    lines = text.split('\n')
    
    for line in lines:
        # Pattern for Indian Bank: Date Description Amount
        pattern = r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+(\d+\.?\d*)'
        match = re.search(pattern, line)
        
        if match:
            date_str, description, amount_str = match.groups()
            
            transaction = {
                'date': format_date(date_str),
                'description': description.strip(),
                'amount': float(amount_str),
                'type': 'debit',  # Default, can be enhanced
                'frequency': 'one-time'
            }
            
            transactions.append(transaction)
    
    return transactions


def format_date(date_str):
    """
    Format date string to YYYY-MM-DD
    """
    try:
        # Handle DD/MM/YYYY or DD-MM-YYYY format
        if '/' in date_str:
            parts = date_str.split('/')
        else:
            parts = date_str.split('-')
        
        if len(parts) == 3:
            day, month, year = parts
            
            # Handle 2-digit years
            if len(year) == 2:
                year = '20' + year
            
            # Ensure proper formatting
            day = day.zfill(2)
            month = month.zfill(2)
            
            return f"{year}-{month}-{day}"
        
        return date_str
    except:
        return datetime.now().strftime('%Y-%m-%d')


def extract_excel(file_path):
    """
    Extract data from Excel files
    """
    df = pd.read_excel(file_path)
    return df.to_dict('records')


def normalize_transactions(transactions):
    """
    Normalize transaction data to standard format
    """
    normalized = []
    
    for trans in transactions:
        normalized_trans = {
            'id': len(normalized) + 1,
            'date': trans.get('date', ''),
            'description': trans.get('description', ''),
            'amount': float(trans.get('amount', 0)),
            'type': trans.get('type', 'debit'),
            'frequency': trans.get('frequency', 'one-time'),
            'category': detect_category(trans.get('description', '')),
            'actions': 'edit,delete'
        }
        normalized.append(normalized_trans)
    
    return normalized


def detect_category(description):
    """
    Auto-detect transaction category based on description
    """
    description_lower = description.lower()
    
    if any(word in description_lower for word in ['upi', 'gpay', 'paytm', 'phonepe']):
        return 'Digital Payment'
    elif any(word in description_lower for word in ['atm', 'cash']):
        return 'Cash Withdrawal'
    elif any(word in description_lower for word in ['salary', 'sal']):
        return 'Salary'
    elif any(word in description_lower for word in ['food', 'restaurant', 'hotel']):
        return 'Food & Dining'
    elif any(word in description_lower for word in ['fuel', 'petrol', 'diesel']):
        return 'Fuel'
    else:
        return 'Others'


def detect_frequency(transactions):
    """
    Detect recurring transactions
    """
    # Group by description and amount
    grouped = {}
    for trans in transactions:
        key = (trans['description'], trans['amount'])
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(trans)
    
    # Mark recurring transactions
    for key, group in grouped.items():
        if len(group) > 1:
            for trans in group:
                trans['frequency'] = 'recurring'
    
    return transactions


# ---------- API Routes ----------
@app.route("/api/upload", methods=["POST"])
def upload_file():
    """
    Handle file upload and processing
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if file and allowed_file(file.filename):
            filename = file.filename
            filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
            file.save(filepath)
            
            # Extract data based on file type
            if filename.lower().endswith('.pdf'):
                transactions = extract_pdf_with_smart_parser(filepath)
            else:
                transactions = extract_excel(filepath)
            
            # Normalize and enhance data
            normalized_transactions = normalize_transactions(transactions)
            enhanced_transactions = detect_frequency(normalized_transactions)
            
            # Clean up uploaded file
            os.remove(filepath)
            
            return jsonify({
                'success': True,
                'transactions': enhanced_transactions,
                'count': len(enhanced_transactions)
            })
        
        else:
            return jsonify({'error': 'Invalid file type'}), 400
    
    except Exception as e:
        print(f"Error processing file: {e}")
        return jsonify({'error': str(e)}), 500


@app.route("/api/transactions", methods=["GET"])
def get_transactions():
    """
    Get all transactions from database
    """
    try:
        # This would typically query the database
        # For now, return empty array
        return jsonify({'transactions': []})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route("/api/transactions/<int:user_id>", methods=["GET"])
def get_user_transactions(user_id):
    """
    Get transactions for a specific user
    """
    try:
        # For demo purposes, return sample transaction data
        sample_transactions = [
            {
                'id': 1,
                'user_id': user_id,
                'date': '2024-01-15',
                'description': 'Salary Credit',
                'amount': 5000.00,
                'type': 'credit',
                'frequency': 'regular',
                'created_at': '2024-01-15T10:00:00'
            },
            {
                'id': 2,
                'user_id': user_id,
                'date': '2024-01-16',
                'description': 'Grocery Shopping',
                'amount': 150.00,
                'type': 'debit',
                'frequency': 'regular',
                'created_at': '2024-01-16T14:30:00'
            },
            {
                'id': 3,
                'user_id': user_id,
                'date': '2024-01-18',
                'description': 'Utility Bill Payment',
                'amount': 200.00,
                'type': 'debit',
                'frequency': 'regular',
                'created_at': '2024-01-18T09:15:00'
            },
            {
                'id': 4,
                'user_id': user_id,
                'date': '2024-02-15',
                'description': 'Salary Credit',
                'amount': 5000.00,
                'type': 'credit',
                'frequency': 'regular',
                'created_at': '2024-02-15T10:00:00'
            },
            {
                'id': 5,
                'user_id': user_id,
                'date': '2024-02-20',
                'description': 'Restaurant Bill',
                'amount': 75.00,
                'type': 'debit',
                'frequency': 'irregular',
                'created_at': '2024-02-20T19:45:00'
            },
            {
                'id': 6,
                'user_id': user_id,
                'date': '2024-03-15',
                'description': 'Salary Credit',
                'amount': 5000.00,
                'type': 'credit',
                'frequency': 'regular',
                'created_at': '2024-03-15T10:00:00'
            },
            {
                'id': 7,
                'user_id': user_id,
                'date': '2024-03-22',
                'description': 'Gas Bill',
                'amount': 80.00,
                'type': 'debit',
                'frequency': 'regular',
                'created_at': '2024-03-22T11:20:00'
            },
            {
                'id': 8,
                'user_id': user_id,
                'date': '2024-04-15',
                'description': 'Salary Credit',
                'amount': 5000.00,
                'type': 'credit',
                'frequency': 'regular',
                'created_at': '2024-04-15T10:00:00'
            },
            {
                'id': 9,
                'user_id': user_id,
                'date': '2024-04-25',
                'description': 'Entertainment Expense',
                'amount': 120.00,
                'type': 'debit',
                'frequency': 'irregular',
                'created_at': '2024-04-25T16:30:00'
            },
            {
                'id': 10,
                'user_id': user_id,
                'date': '2024-05-15',
                'description': 'Salary Credit',
                'amount': 5000.00,
                'type': 'credit',
                'frequency': 'regular',
                'created_at': '2024-05-15T10:00:00'
            },
            {
                'id': 11,
                'user_id': user_id,
                'date': '2024-05-28',
                'description': 'Medical Expense',
                'amount': 300.00,
                'type': 'debit',
                'frequency': 'irregular',
                'created_at': '2024-05-28T13:15:00'
            },
            {
                'id': 12,
                'user_id': user_id,
                'date': '2024-06-15',
                'description': 'Salary Credit',
                'amount': 5000.00,
                'type': 'credit',
                'frequency': 'regular',
                'created_at': '2024-06-15T10:00:00'
            },
            {
                'id': 13,
                'user_id': user_id,
                'date': '2024-06-30',
                'description': 'Transportation',
                'amount': 45.00,
                'type': 'debit',
                'frequency': 'regular',
                'created_at': '2024-06-30T08:45:00'
            }
        ]
        
        return jsonify(sample_transactions)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route("/api/transactions", methods=["POST"])
def save_transactions():
    """
    Save transactions to database
    """
    try:
        transactions = request.json.get('transactions', [])
        
        if not transactions:
            return jsonify({'error': 'No transactions provided'}), 400
        
        # Convert to DataFrame for database operations
        df = pd.DataFrame(transactions)
        
        # Save to database
        df.to_sql("transactions", con=engine, if_exists="append", index=False)
        
        return jsonify({
            'success': True,
            'saved_count': len(transactions)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route("/api/health", methods=["GET"])
def health_check():
    """
    Health check endpoint
    """
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})


if __name__ == "__main__":
    # Create upload directory
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    
    # Run the Flask app on port 5001
    app.run(debug=True, port=5001)