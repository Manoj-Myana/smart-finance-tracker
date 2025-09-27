"""
Bank-specific parsers for different Indian banks
"""
import re
from datetime import datetime
from typing import List, Dict, Any, Optional


class BankParser:
    """Base class for bank-specific parsers"""
    
    def __init__(self):
        self.bank_name = "Generic"
    
    def can_parse(self, text: str) -> bool:
        """Check if this parser can handle the given PDF text"""
        return False
    
    def parse(self, text: str, tables: List = None) -> List[Dict[str, Any]]:
        """Parse transactions from the PDF text/tables"""
        return []


class IndianBankParser(BankParser):
    """Parser for Indian Bank statements"""
    
    def __init__(self):
        super().__init__()
        self.bank_name = "Indian Bank"
    
    def can_parse(self, text: str) -> bool:
        """Check if this is an Indian Bank statement"""
        indicators = [
            "indian bank", "INDIAN BANK", "Indian Bank Ltd",
            "Account Statement", "Statement of Account"
        ]
        return any(indicator in text for indicator in indicators)
    
    def parse(self, text: str, tables: List = None) -> List[Dict[str, Any]]:
        """Parse Indian Bank statement"""
        transactions = []
        
        # Try table-based parsing first
        if tables:
            for table in tables:
                table_transactions = self._parse_table(table)
                transactions.extend(table_transactions)
        
        # If no table data, try text-based parsing
        if not transactions:
            transactions = self._parse_text(text)
        
        return self._deduplicate_transactions(transactions)
    
    def _parse_table(self, table: List[List]) -> List[Dict[str, Any]]:
        """Parse transactions from table data"""
        transactions = []
        
        for row in table:
            if not row or len(row) < 4:
                continue
            
            # Skip header rows
            if any(header in str(row[0] or '').lower() for header in 
                   ['date', 'particulars', 's.no', 'sr.no', 'transaction', 'description']):
                continue
            
            transaction = self._parse_row(row)
            if transaction:
                transactions.append(transaction)
        
        return transactions
    
    def _parse_row(self, row: List) -> Optional[Dict[str, Any]]:
        """Parse a single row from the table"""
        try:
            clean_row = [str(cell).strip() if cell else '' for cell in row]
            
            # Find date column
            date_str = None
            date_idx = -1
            for i, cell in enumerate(clean_row):
                if self._is_date(cell):
                    date_str = cell
                    date_idx = i
                    break
            
            if not date_str:
                return None
            
            # Find description (usually after date)
            description = ''
            for i in range(date_idx + 1, len(clean_row)):
                if clean_row[i] and not self._is_amount(clean_row[i]) and clean_row[i] != date_str:
                    description = clean_row[i]
                    break
            
            # Find amounts (debit and credit columns)
            debit_amount = 0
            credit_amount = 0
            
            for i, cell in enumerate(clean_row):
                if self._is_amount(cell):
                    amount = float(self._clean_amount(cell))
                    # Heuristic: later columns are more likely to be credit
                    if i > len(clean_row) // 2:
                        credit_amount = amount
                    else:
                        debit_amount = amount
            
            # Determine transaction type and amount
            if credit_amount > 0:
                amount = credit_amount
                trans_type = 'credit'
            else:
                amount = debit_amount
                trans_type = 'debit'
            
            if amount == 0:
                return None
            
            return {
                'date': self._format_date(date_str),
                'description': description,
                'amount': amount,
                'type': trans_type,
                'frequency': 'one-time',
                'category': self._detect_category(description)
            }
            
        except Exception as e:
            print(f"Error parsing row: {e}")
            return None
    
    def _parse_text(self, text: str) -> List[Dict[str, Any]]:
        """Parse transactions from raw text"""
        transactions = []
        lines = text.split('\n')
        
        for line in lines:
            # Indian Bank pattern: Date Description Amount (variations)
            patterns = [
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+?)\s+(\d+(?:,\d{3})*\.?\d*)',
                r'(\d{1,2}\s+\w{3}\s+\d{4})\s+(.+?)\s+(\d+(?:,\d{3})*\.?\d*)',
            ]
            
            for pattern in patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    date_str, description, amount_str = match.groups()
                    
                    transaction = {
                        'date': self._format_date(date_str),
                        'description': description.strip(),
                        'amount': float(self._clean_amount(amount_str)),
                        'type': 'debit',  # Default, could be enhanced
                        'frequency': 'one-time',
                        'category': self._detect_category(description)
                    }
                    
                    transactions.append(transaction)
                    break
        
        return transactions
    
    def _is_date(self, text: str) -> bool:
        """Check if text looks like a date"""
        if not text:
            return False
        
        date_patterns = [
            r'^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$',
            r'^\d{1,2}\s+\w{3}\s+\d{4}$',
            r'^\d{4}[/-]\d{1,2}[/-]\d{1,2}$'
        ]
        
        return any(re.match(pattern, text.strip()) for pattern in date_patterns)
    
    def _is_amount(self, text: str) -> bool:
        """Check if text looks like an amount"""
        if not text:
            return False
        
        # Remove common currency symbols and commas
        cleaned = re.sub(r'[₹,\s]', '', text.strip())
        
        # Check if it's a valid number
        try:
            float(cleaned)
            return True
        except ValueError:
            return False
    
    def _clean_amount(self, text: str) -> str:
        """Clean amount string for parsing"""
        # Remove currency symbols, commas, and extra spaces
        cleaned = re.sub(r'[₹,\s]', '', text.strip())
        return cleaned
    
    def _format_date(self, date_str: str) -> str:
        """Format date string to YYYY-MM-DD"""
        try:
            # Handle different date formats
            date_str = date_str.strip()
            
            # DD/MM/YYYY or DD-MM-YYYY
            if re.match(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', date_str):
                if '/' in date_str:
                    parts = date_str.split('/')
                else:
                    parts = date_str.split('-')
                
                day, month, year = parts
                
                # Handle 2-digit years
                if len(year) == 2:
                    year = '20' + year
                
                return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
            
            # DD MMM YYYY (e.g., 15 Jan 2024)
            elif re.match(r'\d{1,2}\s+\w{3}\s+\d{4}', date_str):
                parts = date_str.split()
                day, month_str, year = parts
                
                month_map = {
                    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
                    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
                    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
                }
                
                month = month_map.get(month_str.lower()[:3], '01')
                return f"{year}-{month}-{day.zfill(2)}"
            
            return datetime.now().strftime('%Y-%m-%d')
            
        except Exception:
            return datetime.now().strftime('%Y-%m-%d')
    
    def _detect_category(self, description: str) -> str:
        """Detect transaction category from description"""
        desc_lower = description.lower()
        
        if any(word in desc_lower for word in ['upi', 'gpay', 'paytm', 'phonepe', 'bhim']):
            return 'Digital Payment'
        elif any(word in desc_lower for word in ['atm', 'cash withdrawal', 'cwd']):
            return 'Cash Withdrawal'
        elif any(word in desc_lower for word in ['salary', 'sal', 'wages']):
            return 'Salary'
        elif any(word in desc_lower for word in ['interest', 'int']):
            return 'Interest'
        elif any(word in desc_lower for word in ['transfer', 'tfr', 'neft', 'rtgs', 'imps']):
            return 'Transfer'
        elif any(word in desc_lower for word in ['fee', 'charges', 'charge']):
            return 'Bank Charges'
        else:
            return 'Others'
    
    def _deduplicate_transactions(self, transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate transactions"""
        seen = set()
        unique_transactions = []
        
        for trans in transactions:
            # Create a unique key based on date, amount, and first 20 chars of description
            key = (
                trans['date'],
                trans['amount'],
                trans['description'][:20].strip()
            )
            
            if key not in seen:
                seen.add(key)
                unique_transactions.append(trans)
        
        return unique_transactions


class SBIParser(BankParser):
    """Parser for State Bank of India statements"""
    
    def __init__(self):
        super().__init__()
        self.bank_name = "State Bank of India"
    
    def can_parse(self, text: str) -> bool:
        """Check if this is an SBI statement"""
        indicators = [
            "state bank of india", "STATE BANK OF INDIA", "SBI",
            "sbi.co.in", "Corporate Internet Banking"
        ]
        return any(indicator in text for indicator in indicators)
    
    def parse(self, text: str, tables: List = None) -> List[Dict[str, Any]]:
        """Parse SBI statement - similar logic to Indian Bank but with SBI-specific patterns"""
        # Implementation similar to IndianBankParser but with SBI-specific patterns
        transactions = []
        # Add SBI-specific parsing logic here
        return transactions


class HDFCParser(BankParser):
    """Parser for HDFC Bank statements"""
    
    def __init__(self):
        super().__init__()
        self.bank_name = "HDFC Bank"
    
    def can_parse(self, text: str) -> bool:
        """Check if this is an HDFC statement"""
        indicators = [
            "hdfc bank", "HDFC BANK", "hdfcbank.com",
            "HDFC Bank Limited"
        ]
        return any(indicator in text for indicator in indicators)
    
    def parse(self, text: str, tables: List = None) -> List[Dict[str, Any]]:
        """Parse HDFC statement"""
        transactions = []
        # Add HDFC-specific parsing logic here
        return transactions


class BankParserFactory:
    """Factory to get the appropriate parser for a bank statement"""
    
    def __init__(self):
        self.parsers = [
            IndianBankParser(),
            SBIParser(),
            HDFCParser(),
        ]
    
    def get_parser(self, text: str) -> BankParser:
        """Get the appropriate parser for the given PDF text"""
        for parser in self.parsers:
            if parser.can_parse(text):
                return parser
        
        # Return the first parser (Indian Bank) as default
        return self.parsers[0]
    
    def parse_statement(self, text: str, tables: List = None) -> List[Dict[str, Any]]:
        """Parse bank statement using the appropriate parser"""
        parser = self.get_parser(text)
        print(f"Using parser: {parser.bank_name}")
        return parser.parse(text, tables)