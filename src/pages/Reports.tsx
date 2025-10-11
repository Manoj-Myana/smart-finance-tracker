import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload,
  FileText,
  File,
  CheckCircle,
  AlertCircle,
  X,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Edit2,
  Trash2,
  Save,
  XCircle
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import Toast from '../components/Toast';

// Set up PDF.js worker with local worker
pdfjsLib.GlobalWorkerOptions.workerSrc = process.env.NODE_ENV === 'development' 
  ? '/js/pdf.worker.min.js'
  : `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface UserType {
  id: number;
  fullName: string;
  email: string;
}

interface ExtractedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  frequency: 'regular' | 'irregular';
  category?: string;
}

interface ExistingTransaction {
  id: number;
  user_id: number;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  frequency: 'regular' | 'irregular';
  created_at: string;
}

const Reports: React.FC = () => {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [excelUploading, setExcelUploading] = useState(false);
  const [pdfDragOver, setPdfDragOver] = useState(false);
  const [excelDragOver, setExcelDragOver] = useState(false);
  const [extractedTransactions, setExtractedTransactions] = useState<ExtractedTransaction[]>([]);
  const [existingTransactions, setExistingTransactions] = useState<ExistingTransaction[]>([]);
  const [showExtractedTransactions, setShowExtractedTransactions] = useState(false);
  const [merging, setMerging] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<ExtractedTransaction>>({});
  
  // Toast notification states
  const [toastMessage, setToastMessage] = useState<string>('');
  const [showToast, setShowToast] = useState<boolean>(false);
  
  const navigate = useNavigate();
  
  // Helper function to show toast notification
  const showToastNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
  };
  
  // Function to fetch existing transactions from the database
  const fetchExistingTransactions = async () => {
    try {
      const userId = localStorage.getItem('userId') || '1';
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/transactions/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setExistingTransactions(data || []);
      } else {
        console.error('Failed to fetch existing transactions');
      }
    } catch (error) {
      console.error('Error fetching existing transactions:', error);
    }
  };

  useEffect(() => {
    fetchExistingTransactions();
  }, []);

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('userData');
    const token = localStorage.getItem('authToken');

    if (!userData || !token) {
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setLoading(false);
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
    }
  }, [navigate]);

  const handlePdfUpload = (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Please upload only PDF files');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size should be less than 10MB');
      return;
    }
    
    setPdfFile(file);
  };

  const handleExcelUpload = (file: File) => {
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      alert('Please upload only Excel (.xlsx, .xls) or CSV files');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size should be less than 10MB');
      return;
    }
    
    setExcelFile(file);
  };

  const handlePdfDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setPdfDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handlePdfUpload(files[0]);
    }
  };

  const handleExcelDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setExcelDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleExcelUpload(files[0]);
    }
  };

  const processPdfFile = async () => {
    if (!pdfFile) return;
    
    setPdfUploading(true);
    
    try {
      console.log('Processing PDF with Flask backend:', pdfFile.name, 'Size:', pdfFile.size);
      
      // Create FormData to send file to backend
      const formData = new FormData();
      formData.append('file', pdfFile);
      
      // Send file to Node.js backend for processing (temporary fix)
      const response = await fetch('http://localhost:5001/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Flask backend response:', result);
      
      if (result.success && result.transactions) {
        console.log('Extracted transactions from Flask:', result.transactions);
        setExtractedTransactions(result.transactions);
        setShowExtractedTransactions(true);
        showToastNotification(`Successfully extracted ${result.count} transactions!`);
        
        // Scroll to extracted transactions section after a short delay
        setTimeout(() => {
          const element = document.getElementById('extracted-transactions-section');
          if (element) {
            element.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start',
              inline: 'nearest'
            });
          }
        }, 500);
      } else {
        throw new Error('Invalid response from Flask backend');
      }
      
      setPdfUploading(false);
      setPdfFile(null);
    } catch (error) {
      console.error('Error processing PDF with Flask:', error);
      setPdfUploading(false);
      alert(`Error processing PDF: ${error instanceof Error ? error.message : 'Flask backend may not be running on port 5000'}`);
    }
  };

  const extractTransactionsFromText = (text: string): ExtractedTransaction[] => {
    const transactions: ExtractedTransaction[] = [];
    
    console.log('Processing PDF text for Indian Bank format...');
    
    // Split into lines and clean them
    const allLines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Find where transaction data starts (after the header)
    let transactionStartIndex = -1;
    for (let i = 0; i < allLines.length; i++) {
      if (allLines[i].includes('Credit Amount') && allLines[i].includes('Debit Amount')) {
        transactionStartIndex = i + 1;
        break;
      }
    }
    
    if (transactionStartIndex === -1) {
      transactionStartIndex = 0;
    }
    
    const transactionLines = allLines.slice(transactionStartIndex);
    console.log('Transaction lines:', transactionLines);
    
    // Create a more structured approach - identify complete transactions
    // Look for patterns like: "DD/MM/" followed by "YYYY" followed by amount and closing balance
    
    let i = 0;
    while (i < transactionLines.length - 1) {
      // Look for date pattern DD/MM/
      if (/^\d{1,2}\/\d{1,2}\/$/.test(transactionLines[i])) {
        // Check if next line has year
        if (i + 1 < transactionLines.length && /^\d{4}/.test(transactionLines[i + 1])) {
          // Look ahead for the amount line (should be within next few lines)
          let amountLineIndex = -1;
          for (let j = i + 2; j < Math.min(i + 6, transactionLines.length); j++) {
            const line = transactionLines[j];
            const numbers = line.match(/^\d+(\.\d+)?\s+\d+(\.\d+)?$/);
            if (numbers) {
              amountLineIndex = j;
              break;
            }
          }
          
          if (amountLineIndex !== -1) {
            // We found a complete transaction pattern
            const dateStr = transactionLines[i] + transactionLines[i + 1].substring(0, 4);
            const amountLine = transactionLines[amountLineIndex];
            
            // Extract description lines between date and amount
            const descriptionLines = transactionLines.slice(i + 2, amountLineIndex);
            // Also get lines after amount for more description
            const moreDescLines = transactionLines.slice(amountLineIndex + 1, Math.min(amountLineIndex + 5, transactionLines.length));
            
            console.log(`Found transaction - Date: ${dateStr}, Amount line: ${amountLine}`);
            console.log('Description lines:', [...descriptionLines, ...moreDescLines]);
            
            const transaction = parseCompleteTransaction(dateStr, amountLine, [...descriptionLines, ...moreDescLines]);
            if (transaction) {
              transactions.push(transaction);
              console.log('Added transaction:', transaction);
            }
            
            // Move past this transaction
            i = amountLineIndex + 3;
          } else {
            i++;
          }
        } else {
          i++;
        }
      } else {
        i++;
      }
    }
    
    console.log('Final extracted transactions:', transactions);
    
    return transactions.length > 0 ? transactions : [{
      id: `ext-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description: 'No transactions could be parsed from the PDF structure',
      amount: 0.00,
      type: 'debit',
      frequency: 'irregular'
    }];
  };

  const parseCompleteTransaction = (dateStr: string, amountLine: string, descriptionLines: string[]): ExtractedTransaction | null => {
    try {
      console.log('Parsing complete transaction:');
      console.log('Date:', dateStr);
      console.log('Amount line:', amountLine);
      console.log('Description lines:', descriptionLines);
      
      // Parse amount from amount line (format: "320   152810.25")
      const amountMatch = amountLine.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/);
      if (!amountMatch) {
        console.log('Could not parse amount line');
        return null;
      }
      
      const transactionAmount = parseFloat(amountMatch[1]);
      const closingBalance = parseFloat(amountMatch[2]);
      
      console.log('Transaction amount:', transactionAmount, 'Closing balance:', closingBalance);
      
      // Parse date
      const formattedDate = formatIndianDate(dateStr);
      
      // Determine transaction type and build description from description lines
      let type: 'credit' | 'debit' = 'debit';
      let description = '';
      
      const allDescText = descriptionLines.join(' ').trim();
      
      // Determine type
      if (allDescText.includes('UPI CREDIT')) {
        type = 'credit';
      } else if (allDescText.includes('UPI DEBIT')) {
        type = 'debit';
      }
      
      // Build description
      if (allDescText.includes('UPI')) {
        // This is a UPI transaction, extract meaningful parts
        
        // Extract merchant name (usually at the end after last /)
        const parts = allDescText.split('/');
        let merchantName = '';
        
        if (parts.length > 1) {
          // Find the last part that looks like a name (not contains @ or numbers)
          for (let i = parts.length - 1; i >= 0; i--) {
            const part = parts[i].trim();
            if (part.length > 3 && !part.includes('@') && !part.match(/^\d+$/)) {
              merchantName = part;
              break;
            }
          }
        }
        
        if (merchantName) {
          description = `UPI ${type.toUpperCase()} - ${merchantName}`;
        } else {
          // Try to extract from other patterns
          if (allDescText.includes('Google Play')) {
            description = 'Google Play';
          } else if (allDescText.includes('Paytm')) {
            description = 'UPI via Paytm';
          } else {
            description = `UPI ${type.toUpperCase()} Transaction`;
          }
        }
      } else {
        description = 'Bank Transaction';
      }
      
      // Clean up description
      description = description
        .replace(/XXXXX/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 80);
      
      console.log('Final description:', description);
      
      const transaction: ExtractedTransaction = {
        id: `ext-${Date.now()}-${Math.random()}`,
        date: formattedDate,
        description,
        amount: transactionAmount,
        type,
        frequency: 'irregular'
      };
      
      console.log('Created transaction:', transaction);
      return transaction;
      
    } catch (error) {
      console.error('Error parsing complete transaction:', error);
      return null;
    }
  };

  const formatIndianDate = (dateStr: string): string => {
    try {
      console.log('Formatting Indian date:', dateStr);
      
      // Handle DD/MM/YYYY format
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        
        console.log('Date parts:', { day, month, year });
        
        if (day <= 31 && month <= 12 && year > 1900) {
          // Use UTC to avoid timezone issues that can cause day shifts
          const date = new Date(Date.UTC(year, month - 1, day));
          const formatted = date.toISOString().split('T')[0];
          console.log('Formatted date:', formatted);
          return formatted;
        }
      }
      
      console.log('Could not parse date, using current date');
      return new Date().toISOString().split('T')[0];
    } catch (error) {
      console.error('Error formatting date:', error);
      return new Date().toISOString().split('T')[0];
    }
  };


  // Edit and Delete handlers
  const handleEditTransaction = (transaction: ExtractedTransaction) => {
    setEditingTransaction(transaction.id);
    setEditFormData(transaction);
  };

  const handleSaveEdit = () => {
    if (!editingTransaction || !editFormData) return;

    setExtractedTransactions(transactions => 
      transactions.map(transaction => 
        transaction.id === editingTransaction 
          ? { ...transaction, ...editFormData }
          : transaction
      )
    );
    
    setEditingTransaction(null);
    setEditFormData({});
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
    setEditFormData({});
  };

  const handleDeleteTransaction = (transactionId: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      setExtractedTransactions(transactions => 
        transactions.filter(transaction => transaction.id !== transactionId)
      );
    }
  };

  const handleEditFormChange = (field: keyof ExtractedTransaction, value: string | number) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const processExcelFile = async () => {
    if (!excelFile) return;
    
    setExcelUploading(true);
    
    try {
      console.log('Processing Excel with Flask backend:', excelFile.name, 'Size:', excelFile.size);
      
      // Create FormData to send file to backend
      const formData = new FormData();
      formData.append('file', excelFile);
      
      // Send file to Flask backend for processing (same as PDF)
      const response = await fetch('http://localhost:5001/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Flask backend response:', result);
      
      if (result.success && result.transactions) {
        console.log('Extracted transactions from Flask:', result.transactions);
        setExtractedTransactions(result.transactions);
        setShowExtractedTransactions(true);
        showToastNotification(`Successfully extracted ${result.count} transactions!`);
        
        // Scroll to extracted transactions section after a short delay
        setTimeout(() => {
          const element = document.getElementById('extracted-transactions-section');
          if (element) {
            element.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start',
              inline: 'nearest'
            });
          }
        }, 500);
      } else {
        throw new Error('Invalid response from Flask backend');
      }
      
    } catch (error) {
      console.error('Error processing Excel file:', error);
      alert(`Error processing Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setExcelUploading(false);
    }
  };

  const mergeTransactions = async () => {
    if (!user || extractedTransactions.length === 0) return;
    
    setMerging(true);
    
    try {
      const token = localStorage.getItem('authToken');
      
      // Convert extracted transactions to the format expected by the API
      const transactionsForAPI = extractedTransactions.map((transaction) => ({
        user_id: user.id,
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        frequency: transaction.frequency
      }));

      console.log('Merging transactions:', transactionsForAPI);

      // Use POST endpoint for transactions
      const response = await fetch('http://localhost:5000/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ transactions: transactionsForAPI }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Merge result:', result);
      
      // Success feedback
      showToastNotification(`Successfully merged ${result.saved_count} transactions to your account!`);
      
      // Clear the extracted transactions
      setExtractedTransactions([]);
      setShowExtractedTransactions(false);
      
      // Refresh existing transactions after merge
      await fetchExistingTransactions();
      
      // Optional: Navigate to transactions page to see the new data
      // navigate('/transactions');
      
    } catch (error) {
      console.error('Error merging transactions:', error);
      alert(`Error merging transactions: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setMerging(false);
    }
  };

  if (loading) {
    return (
      <div 
        style={{
          background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0, #cbd5e1)',
          backgroundAttachment: 'fixed',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '64px',
              height: '64px',
              border: '4px solid #4b5563',
              borderRadius: '50%',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}></div>
            <div style={{
              position: 'absolute',
              top: '0',
              left: '0',
              width: '64px',
              height: '64px',
              border: '4px solid #3b82f6',
              borderTop: '4px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
          </div>
          <p style={{
            color: '#4b5563',
            marginTop: '16px',
            fontWeight: '500'
          }}>Loading upload page...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
      <div 
        style={{
          background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0, #cbd5e1)',
          backgroundAttachment: 'fixed',
          minHeight: '100vh',
          width: '100%',
          position: 'relative',
          zIndex: 1
        }}
      >
        <main style={{ 
          maxWidth: '1280px', 
          marginLeft: 'auto', 
          marginRight: 'auto', 
          paddingLeft: '16px', 
          paddingRight: '16px', 
          paddingTop: '24px', 
          paddingBottom: '24px' 
        }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ 
            fontSize: '36px', 
            fontWeight: 'bold', 
            color: '#111827', 
            marginBottom: '8px' 
          }}>
            Bank Statement Upload 📄
          </h1>
          <p style={{ 
            color: '#374151', 
            fontSize: '18px', 
            fontWeight: '500' 
          }}>
            Upload your bank statements to automatically import transactions
          </p>
        </div>

        {/* Upload Sections */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr', 
          gap: '32px' 
        }}>
          
          {/* PDF Upload Section - Left Side */}
          <div 
            style={{
              padding: '32px',
              borderRadius: '16px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              border: '1px solid rgba(254, 226, 226, 0.5)',
              backgroundColor: 'rgba(254, 242, 242, 0.9)',
              backgroundImage: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#fecaca', 
                borderRadius: '12px' 
              }}>
                <FileText style={{ height: '28px', width: '28px', color: '#dc2626' }} />
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>PDF Bank Statements</h2>
            </div>

            {/* PDF Drop Zone */}
            <div
              onDrop={handlePdfDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setPdfDragOver(true);
              }}
              onDragLeave={() => setPdfDragOver(false)}
              style={{
                border: '2px dashed',
                borderColor: pdfDragOver ? '#dc2626' : '#fca5a5',
                backgroundColor: pdfDragOver ? '#fef2f2' : 'rgba(254, 242, 242, 0.5)',
                borderRadius: '12px',
                padding: '32px',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                backgroundImage: 'none',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                if (!pdfDragOver) {
                  e.currentTarget.style.borderColor = '#f87171';
                  e.currentTarget.style.backgroundColor = 'rgba(254, 242, 242, 0.7)';
                }
              }}
              onMouseLeave={(e) => {
                if (!pdfDragOver) {
                  e.currentTarget.style.borderColor = '#fca5a5';
                  e.currentTarget.style.backgroundColor = 'rgba(254, 242, 242, 0.5)';
                }
              }}
            >
              <Upload style={{ height: '48px', width: '48px', color: '#f87171', margin: '0 auto 16px auto' }} />
              <p style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '8px' 
              }}>
                Drop PDF files here or click to browse
              </p>
              <p style={{ 
                fontSize: '14px', 
                color: '#6b7280', 
                marginBottom: '16px' 
              }}>
                Supports PDF bank statements up to 10MB
              </p>
              
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handlePdfUpload(e.target.files[0]);
                  }
                }}
                style={{ display: 'none' }}
                id="pdf-upload"
              />
              
              <label
                htmlFor="pdf-upload"
                style={{
                  display: 'inline-block',
                  paddingLeft: '24px',
                  paddingRight: '24px',
                  paddingTop: '12px',
                  paddingBottom: '12px',
                  background: 'linear-gradient(to right, #ef4444, #dc2626)',
                  color: 'white',
                  fontWeight: '600',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: 'scale(1)',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(to right, #dc2626, #b91c1c)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(to right, #ef4444, #dc2626)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Browse PDF Files
              </label>
            </div>

            {/* PDF File Preview */}
            {pdfFile && (
              <div 
                style={{ 
                  marginTop: '24px', 
                  padding: '16px', 
                  backgroundColor: 'white', 
                  borderRadius: '8px', 
                  border: '1px solid #fecaca',
                  backgroundImage: 'none' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FileText style={{ height: '24px', width: '24px', color: '#dc2626' }} />
                    <div>
                      <p style={{ fontWeight: '600', color: '#111827' }}>{pdfFile.name}</p>
                      <p style={{ fontSize: '14px', color: '#6b7280' }}>
                        {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPdfFile(null)}
                    style={{ 
                      padding: '8px', 
                      color: '#9ca3af', 
                      transition: 'color 0.3s ease',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                  >
                    <X style={{ height: '20px', width: '20px' }} />
                  </button>
                </div>
                
                <button
                  onClick={processPdfFile}
                  disabled={pdfUploading}
                  style={{
                    width: '100%',
                    marginTop: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                    background: pdfUploading ? 'rgba(239, 68, 68, 0.5)' : 'linear-gradient(to right, #ef4444, #dc2626)',
                    color: 'white',
                    fontWeight: '600',
                    borderRadius: '8px',
                    transition: 'all 0.3s ease',
                    opacity: pdfUploading ? '0.5' : '1',
                    cursor: pdfUploading ? 'not-allowed' : 'pointer',
                    border: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!pdfUploading) {
                      e.currentTarget.style.background = 'linear-gradient(to right, #dc2626, #b91c1c)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!pdfUploading) {
                      e.currentTarget.style.background = 'linear-gradient(to right, #ef4444, #dc2626)';
                    }
                  }}
                >
                  {pdfUploading ? (
                    <>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        border: '2px solid white',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle style={{ height: '20px', width: '20px' }} />
                      <span>Process PDF Statement</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Excel Upload Section - Right Side */}
          <div 
            style={{
              padding: '32px',
              borderRadius: '16px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              border: '1px solid rgba(220, 252, 231, 0.5)',
              backgroundColor: 'rgba(240, 253, 244, 0.9)',
              backgroundImage: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#dcfce7', 
                borderRadius: '12px' 
              }}>
                <File style={{ height: '28px', width: '28px', color: '#16a34a' }} />
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>Excel Bank Statements</h2>
            </div>

            {/* Excel Drop Zone */}
            <div
              onDrop={handleExcelDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setExcelDragOver(true);
              }}
              onDragLeave={() => setExcelDragOver(false)}
              style={{
                border: '2px dashed',
                borderColor: excelDragOver ? '#22c55e' : '#86efac',
                backgroundColor: excelDragOver ? '#f0fdf4' : 'rgba(240, 253, 244, 0.5)',
                borderRadius: '12px',
                padding: '32px',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                backgroundImage: 'none',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                if (!excelDragOver) {
                  e.currentTarget.style.borderColor = '#4ade80';
                  e.currentTarget.style.backgroundColor = 'rgba(240, 253, 244, 0.7)';
                }
              }}
              onMouseLeave={(e) => {
                if (!excelDragOver) {
                  e.currentTarget.style.borderColor = '#86efac';
                  e.currentTarget.style.backgroundColor = 'rgba(240, 253, 244, 0.5)';
                }
              }}
            >
              <Upload style={{ 
                height: '48px', 
                width: '48px', 
                color: '#4ade80', 
                margin: '0 auto 16px auto' 
              }} />
              <p style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: '8px' 
              }}>
                Drop Excel/CSV files here or click to browse
              </p>
              <p style={{ 
                fontSize: '14px', 
                color: '#6b7280', 
                marginBottom: '16px' 
              }}>
                Supports .xlsx, .xls, and .csv files up to 10MB
              </p>
              
              <input
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleExcelUpload(e.target.files[0]);
                  }
                }}
                style={{ display: 'none' }}
                id="excel-upload"
              />
              
              <label
                htmlFor="excel-upload"
                style={{
                  display: 'inline-block',
                  paddingLeft: '24px',
                  paddingRight: '24px',
                  paddingTop: '12px',
                  paddingBottom: '12px',
                  background: 'linear-gradient(to right, #22c55e, #16a34a)',
                  color: 'white',
                  fontWeight: '600',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: 'scale(1)',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(to right, #16a34a, #15803d)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(to right, #22c55e, #16a34a)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Browse Excel/CSV Files
              </label>
            </div>

            {/* Excel File Preview */}
            {excelFile && (
              <div 
                style={{ 
                  marginTop: '24px', 
                  padding: '16px', 
                  backgroundColor: 'white', 
                  borderRadius: '8px', 
                  border: '1px solid #dcfce7',
                  backgroundImage: 'none' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <File style={{ height: '24px', width: '24px', color: '#16a34a' }} />
                    <div>
                      <p style={{ fontWeight: '600', color: '#111827' }}>{excelFile.name}</p>
                      <p style={{ fontSize: '14px', color: '#6b7280' }}>
                        {(excelFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setExcelFile(null)}
                    style={{ 
                      padding: '8px', 
                      color: '#9ca3af', 
                      transition: 'color 0.3s ease',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#22c55e'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                  >
                    <X style={{ height: '20px', width: '20px' }} />
                  </button>
                </div>
                
                <button
                  onClick={processExcelFile}
                  disabled={excelUploading}
                  style={{
                    width: '100%',
                    marginTop: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                    background: excelUploading ? 'rgba(34, 197, 94, 0.5)' : 'linear-gradient(to right, #22c55e, #16a34a)',
                    color: 'white',
                    fontWeight: '600',
                    borderRadius: '8px',
                    transition: 'all 0.3s ease',
                    opacity: excelUploading ? '0.5' : '1',
                    cursor: excelUploading ? 'not-allowed' : 'pointer',
                    border: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!excelUploading) {
                      e.currentTarget.style.background = 'linear-gradient(to right, #16a34a, #15803d)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!excelUploading) {
                      e.currentTarget.style.background = 'linear-gradient(to right, #22c55e, #16a34a)';
                    }
                  }}
                >
                  {excelUploading ? (
                    <>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        border: '2px solid white',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle style={{ height: '20px', width: '20px' }} />
                      <span>Process Excel Statement</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div 
          style={{
            marginTop: '32px',
            padding: '24px',
            borderRadius: '16px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid rgba(219, 234, 254, 0.5)',
            backgroundColor: 'rgba(239, 246, 255, 0.9)',
            backgroundImage: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <AlertCircle style={{ height: '24px', width: '24px', color: '#2563eb' }} />
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>Upload Instructions</h3>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '24px' 
          }}>
            <div>
              <h4 style={{ fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>📄 PDF Bank Statements</h4>
              <ul style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.5' }}>
                <li style={{ marginBottom: '4px' }}>Download official PDF statements from your bank</li>
                <li style={{ marginBottom: '4px' }}>Ensure the PDF contains transaction details</li>
                <li style={{ marginBottom: '4px' }}>Maximum file size: 10MB</li>
                <li style={{ marginBottom: '4px' }}>AI will extract transaction data automatically</li>
              </ul>
            </div>
            
            <div>
              <h4 style={{ fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>📊 Excel/CSV Bank Statements</h4>
              <ul style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.5' }}>
                <li style={{ marginBottom: '4px' }}>Export transaction data as Excel or CSV</li>
                <li style={{ marginBottom: '4px' }}>Include columns: Date, Description, Amount, Type</li>
                <li style={{ marginBottom: '4px' }}>Maximum file size: 10MB</li>
                <li style={{ marginBottom: '4px' }}>Data will be imported directly to your account</li>
              </ul>
            </div>
          </div>
          
          <div style={{ 
            marginTop: '16px', 
            padding: '16px', 
            backgroundColor: '#fefce8', 
            border: '1px solid #fde047', 
            borderRadius: '8px' 
          }}>
            <p style={{ fontSize: '14px', color: '#a16207' }}>
              <strong>Note:</strong> This feature is currently in development. Uploaded files will be processed 
              and transactions will be automatically added to your account. Please ensure your bank statements 
              don't contain sensitive information beyond transaction data.
            </p>
          </div>
        </div>

        {/* Extracted Transactions Table */}
        {showExtractedTransactions && extractedTransactions.length > 0 && (
          <div 
            id="extracted-transactions-section"
            style={{
              marginTop: '32px',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              border: '1px solid rgba(254, 215, 170, 0.5)',
              backgroundColor: 'rgba(255, 247, 237, 0.9)',
              backgroundImage: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
                Extracted Transactions ({extractedTransactions.length} found)
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#4b5563' }}>
                <AlertCircle style={{ height: '16px', width: '16px' }} />
                <span>Review before merging</span>
              </div>
            </div>

            {/* Transactions Table */}
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '12px', 
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', 
              border: '1px solid #f3f4f6', 
              overflow: 'hidden', 
              marginBottom: '24px' 
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%' }}>
                  <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <tr>
                      <th style={{ textAlign: 'left', paddingTop: '20px', paddingBottom: '20px', paddingLeft: '24px', paddingRight: '24px', fontWeight: 'bold', color: '#1f2937', fontSize: '18px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                      <th style={{ textAlign: 'left', paddingTop: '20px', paddingBottom: '20px', paddingLeft: '24px', paddingRight: '24px', fontWeight: 'bold', color: '#1f2937', fontSize: '18px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</th>
                      <th style={{ textAlign: 'left', paddingTop: '20px', paddingBottom: '20px', paddingLeft: '24px', paddingRight: '24px', fontWeight: 'bold', color: '#1f2937', fontSize: '18px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                      <th style={{ textAlign: 'left', paddingTop: '20px', paddingBottom: '20px', paddingLeft: '24px', paddingRight: '24px', fontWeight: 'bold', color: '#1f2937', fontSize: '18px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Frequency</th>
                      <th style={{ textAlign: 'right', paddingTop: '20px', paddingBottom: '20px', paddingLeft: '24px', paddingRight: '24px', fontWeight: 'bold', color: '#1f2937', fontSize: '18px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</th>
                      <th style={{ textAlign: 'center', paddingTop: '20px', paddingBottom: '20px', paddingLeft: '24px', paddingRight: '24px', fontWeight: 'bold', color: '#1f2937', fontSize: '18px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody style={{ borderTop: '1px solid #f3f4f6' }}>
                    {extractedTransactions.map((transaction, index) => (
                      <tr 
                        key={transaction.id} 
                        style={{
                          backgroundColor: index % 2 === 0 ? 'white' : 'rgba(249, 250, 251, 0.3)',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : 'rgba(249, 250, 251, 0.3)'}
                      >
                        {/* Date Column */}
                        <td style={{ paddingTop: '24px', paddingBottom: '24px', paddingLeft: '24px', paddingRight: '24px', fontSize: '16px', color: '#4b5563', fontWeight: '500' }}>
                          {editingTransaction === transaction.id ? (
                            <input
                              type="date"
                              value={editFormData.date || transaction.date}
                              onChange={(e) => handleEditFormChange('date', e.target.value)}
                              style={{ 
                                width: '100%', 
                                padding: '8px 12px', 
                                border: '1px solid #d1d5db', 
                                borderRadius: '8px', 
                                backgroundColor: 'white',
                                outline: 'none'
                              }}
                              onFocus={(e) => {
                                e.currentTarget.style.borderColor = '#3b82f6';
                                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.2)';
                              }}
                              onBlur={(e) => {
                                e.currentTarget.style.borderColor = '#d1d5db';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            />
                          ) : (
                            new Date(transaction.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          )}
                        </td>
                        
                        {/* Description Column */}
                        <td style={{ paddingTop: '24px', paddingBottom: '24px', paddingLeft: '24px', paddingRight: '24px' }}>
                          <div style={{ maxWidth: '300px' }}>
                            {editingTransaction === transaction.id ? (
                              <input
                                type="text"
                                value={editFormData.description || transaction.description}
                                onChange={(e) => handleEditFormChange('description', e.target.value)}
                                style={{ 
                                  width: '100%', 
                                  padding: '8px 12px', 
                                  border: '1px solid #d1d5db', 
                                  borderRadius: '8px', 
                                  backgroundColor: 'white',
                                  outline: 'none'
                                }}
                                onFocus={(e) => {
                                  e.currentTarget.style.borderColor = '#3b82f6';
                                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.2)';
                                }}
                                onBlur={(e) => {
                                  e.currentTarget.style.borderColor = '#d1d5db';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                              />
                            ) : (
                              <p style={{ 
                                fontSize: '18px', 
                                fontWeight: '500', 
                                color: '#111827', 
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {transaction.description}
                              </p>
                            )}
                          </div>
                        </td>
                        
                        {/* Type Column */}
                        <td style={{ paddingTop: '24px', paddingBottom: '24px', paddingLeft: '24px', paddingRight: '24px' }}>
                          {editingTransaction === transaction.id ? (
                            <select
                              value={editFormData.type || transaction.type}
                              onChange={(e) => handleEditFormChange('type', e.target.value as 'credit' | 'debit')}
                              style={{ 
                                padding: '8px 12px', 
                                border: '1px solid #d1d5db', 
                                borderRadius: '8px', 
                                backgroundColor: 'white',
                                outline: 'none'
                              }}
                              onFocus={(e) => {
                                e.currentTarget.style.borderColor = '#3b82f6';
                                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.2)';
                              }}
                              onBlur={(e) => {
                                e.currentTarget.style.borderColor = '#d1d5db';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <option value="credit">Credit</option>
                              <option value="debit">Debit</option>
                            </select>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              paddingLeft: '16px',
                              paddingRight: '16px',
                              paddingTop: '8px',
                              paddingBottom: '8px',
                              borderRadius: '50px',
                              fontSize: '16px',
                              fontWeight: '500',
                              border: '1px solid',
                              backgroundColor: transaction.type === 'credit' ? '#dcfce7' : '#fef2f2',
                              color: transaction.type === 'credit' ? '#166534' : '#991b1b',
                              borderColor: transaction.type === 'credit' ? '#bbf7d0' : '#fecaca'
                            }}>
                              {transaction.type === 'credit' ? (
                                <TrendingUp style={{ height: '20px', width: '20px', marginRight: '8px' }} />
                              ) : (
                                <TrendingDown style={{ height: '20px', width: '20px', marginRight: '8px' }} />
                              )}
                              {transaction.type}
                            </span>
                          )}
                        </td>
                        
                        {/* Frequency Column */}
                        <td style={{ paddingTop: '24px', paddingBottom: '24px', paddingLeft: '24px', paddingRight: '24px' }}>
                          {editingTransaction === transaction.id ? (
                            <select
                              value={editFormData.frequency || transaction.frequency}
                              onChange={(e) => handleEditFormChange('frequency', e.target.value as 'regular' | 'irregular')}
                              style={{ 
                                padding: '8px 12px', 
                                border: '1px solid #d1d5db', 
                                borderRadius: '8px', 
                                backgroundColor: 'white',
                                outline: 'none'
                              }}
                              onFocus={(e) => {
                                e.currentTarget.style.borderColor = '#3b82f6';
                                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.2)';
                              }}
                              onBlur={(e) => {
                                e.currentTarget.style.borderColor = '#d1d5db';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <option value="regular">Regular</option>
                              <option value="irregular">Irregular</option>
                            </select>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              paddingLeft: '12px',
                              paddingRight: '12px',
                              paddingTop: '4px',
                              paddingBottom: '4px',
                              borderRadius: '50px',
                              fontSize: '14px',
                              fontWeight: '500',
                              backgroundColor: '#dbeafe',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe'
                            }}>
                              {transaction.frequency}
                            </span>
                          )}
                        </td>
                        
                        {/* Amount Column */}
                        <td style={{ paddingTop: '24px', paddingBottom: '24px', paddingLeft: '24px', paddingRight: '24px', textAlign: 'right' }}>
                          {editingTransaction === transaction.id ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editFormData.amount || transaction.amount}
                              onChange={(e) => handleEditFormChange('amount', parseFloat(e.target.value))}
                              style={{ 
                                width: '128px', 
                                padding: '8px 12px', 
                                border: '1px solid #d1d5db', 
                                borderRadius: '8px', 
                                textAlign: 'right', 
                                backgroundColor: 'white',
                                outline: 'none'
                              }}
                              onFocus={(e) => {
                                e.currentTarget.style.borderColor = '#3b82f6';
                                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.2)';
                              }}
                              onBlur={(e) => {
                                e.currentTarget.style.borderColor = '#d1d5db';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            />
                          ) : (
                            <span style={{
                              fontSize: '18px',
                              fontWeight: 'bold',
                              color: transaction.type === 'credit' ? '#059669' : '#dc2626'
                            }}>
                              ${transaction.amount.toFixed(2)}
                            </span>
                          )}
                        </td>
                        
                        {/* Actions Column */}
                        <td style={{ paddingTop: '24px', paddingBottom: '24px', paddingLeft: '24px', paddingRight: '24px', textAlign: 'center' }}>
                          {editingTransaction === transaction.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              <button
                                onClick={handleSaveEdit}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  paddingLeft: '12px',
                                  paddingRight: '12px',
                                  paddingTop: '4px',
                                  paddingBottom: '4px',
                                  backgroundColor: '#059669',
                                  color: 'white',
                                  borderRadius: '8px',
                                  transition: 'background-color 0.2s ease',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                                title="Save changes"
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#047857'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                              >
                                <Save style={{ height: '16px', width: '16px' }} />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  paddingLeft: '12px',
                                  paddingRight: '12px',
                                  paddingTop: '4px',
                                  paddingBottom: '4px',
                                  backgroundColor: '#6b7280',
                                  color: 'white',
                                  borderRadius: '8px',
                                  transition: 'background-color 0.2s ease',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                                title="Cancel editing"
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6b7280'}
                              >
                                <XCircle style={{ height: '16px', width: '16px' }} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              <button
                                onClick={() => handleEditTransaction(transaction)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  paddingLeft: '12px',
                                  paddingRight: '12px',
                                  paddingTop: '4px',
                                  paddingBottom: '4px',
                                  backgroundColor: '#2563eb',
                                  color: 'white',
                                  borderRadius: '8px',
                                  transition: 'background-color 0.2s ease',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                                title="Edit transaction"
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                              >
                                <Edit2 style={{ height: '16px', width: '16px' }} />
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(transaction.id)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  paddingLeft: '12px',
                                  paddingRight: '12px',
                                  paddingTop: '4px',
                                  paddingBottom: '4px',
                                  backgroundColor: '#dc2626',
                                  color: 'white',
                                  borderRadius: '8px',
                                  transition: 'background-color 0.2s ease',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                                title="Delete transaction"
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                              >
                                <Trash2 style={{ height: '16px', width: '16px' }} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Merge Button */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={mergeTransactions}
                disabled={merging}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  paddingLeft: '32px',
                  paddingRight: '32px',
                  paddingTop: '16px',
                  paddingBottom: '16px',
                  background: merging ? 'rgba(34, 197, 94, 0.5)' : 'linear-gradient(to right, #22c55e, #16a34a)',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '18px',
                  borderRadius: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.3s ease',
                  transform: 'scale(1)',
                  opacity: merging ? '0.5' : '1',
                  cursor: merging ? 'not-allowed' : 'pointer',
                  border: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!merging) {
                    e.currentTarget.style.background = 'linear-gradient(to right, #16a34a, #15803d)';
                    e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!merging) {
                    e.currentTarget.style.background = 'linear-gradient(to right, #22c55e, #16a34a)';
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                {merging ? (
                  <>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      border: '2px solid white',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    <span>Merging Transactions...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight style={{ height: '24px', width: '24px' }} />
                    <span>Merge {extractedTransactions.length} Transactions</span>
                  </>
                )}
              </button>
            </div>

            <div style={{ 
              marginTop: '16px', 
              padding: '16px', 
              backgroundColor: '#eff6ff', 
              borderRadius: '8px', 
              border: '1px solid #bfdbfe' 
            }}>
              <p style={{ fontSize: '14px', color: '#1e40af' }}>
                <strong>Review:</strong> Please review the extracted transactions above. All transactions are set to 
                'irregular' frequency by default. Click "Merge Transactions" to add them to your account.
              </p>
            </div>
          </div>
        )}

        {/* Existing Transactions Table */}
        {existingTransactions.length > 0 && (
          <div 
            style={{
              marginTop: '32px',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              border: '1px solid rgba(156, 163, 175, 0.3)',
              backgroundColor: 'rgba(249, 250, 251, 0.9)',
              backgroundImage: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
                Your Existing Transactions ({existingTransactions.length})
              </h3>
            </div>

            {/* Existing Transactions Table */}
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '12px', 
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              border: '1px solid #f3f4f6',
              overflow: 'hidden',
              marginBottom: '24px'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%' }}>
                  <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <tr>
                      <th style={{ 
                        textAlign: 'left', 
                        paddingTop: '20px', 
                        paddingBottom: '20px', 
                        paddingLeft: '24px', 
                        paddingRight: '24px',
                        fontWeight: 'bold', 
                        color: '#374151', 
                        fontSize: '18px', 
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>Date</th>
                      <th style={{ 
                        textAlign: 'left', 
                        paddingTop: '20px', 
                        paddingBottom: '20px', 
                        paddingLeft: '24px', 
                        paddingRight: '24px',
                        fontWeight: 'bold', 
                        color: '#374151', 
                        fontSize: '18px', 
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>Description</th>
                      <th style={{ 
                        textAlign: 'left', 
                        paddingTop: '20px', 
                        paddingBottom: '20px', 
                        paddingLeft: '24px', 
                        paddingRight: '24px',
                        fontWeight: 'bold', 
                        color: '#374151', 
                        fontSize: '18px', 
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>Type</th>
                      <th style={{ 
                        textAlign: 'left', 
                        paddingTop: '20px', 
                        paddingBottom: '20px', 
                        paddingLeft: '24px', 
                        paddingRight: '24px',
                        fontWeight: 'bold', 
                        color: '#374151', 
                        fontSize: '18px', 
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>Frequency</th>
                      <th style={{ 
                        textAlign: 'right', 
                        paddingTop: '20px', 
                        paddingBottom: '20px', 
                        paddingLeft: '24px', 
                        paddingRight: '24px',
                        fontWeight: 'bold', 
                        color: '#374151', 
                        fontSize: '18px', 
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: 'white' }}>
                    {existingTransactions.map((transaction, index) => (
                      <tr 
                        key={transaction.id || index}
                        style={{ 
                          borderBottom: index < existingTransactions.length - 1 ? '1px solid #f3f4f6' : 'none',
                          transition: 'background-color 0.15s ease-in-out'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        <td style={{ 
                          paddingTop: '16px', 
                          paddingBottom: '16px', 
                          paddingLeft: '24px', 
                          paddingRight: '24px',
                          fontSize: '16px',
                          fontWeight: '500',
                          color: '#374151'
                        }}>
                          {new Date(transaction.date).toLocaleDateString()}
                        </td>
                        <td style={{ 
                          paddingTop: '16px', 
                          paddingBottom: '16px', 
                          paddingLeft: '24px', 
                          paddingRight: '24px',
                          fontSize: '16px',
                          color: '#111827',
                          fontWeight: '500'
                        }}>
                          {transaction.description}
                        </td>
                        <td style={{ 
                          paddingTop: '16px', 
                          paddingBottom: '16px', 
                          paddingLeft: '24px', 
                          paddingRight: '24px',
                          fontSize: '14px'
                        }}>
                          <span style={{
                            paddingLeft: '12px',
                            paddingRight: '12px',
                            paddingTop: '4px',
                            paddingBottom: '4px',
                            backgroundColor: transaction.type === 'credit' ? '#dcfce7' : '#fee2e2',
                            color: transaction.type === 'credit' ? '#166534' : '#dc2626',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            {transaction.type}
                          </span>
                        </td>
                        <td style={{ 
                          paddingTop: '16px', 
                          paddingBottom: '16px', 
                          paddingLeft: '24px', 
                          paddingRight: '24px',
                          fontSize: '14px',
                          color: '#6b7280'
                        }}>
                          {transaction.frequency}
                        </td>
                        <td style={{ 
                          paddingTop: '16px', 
                          paddingBottom: '16px', 
                          paddingLeft: '24px', 
                          paddingRight: '24px',
                          textAlign: 'right',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: transaction.type === 'credit' ? '#059669' : '#dc2626'
                        }}>
                          {transaction.type === 'credit' ? '+' : '-'}₹{Math.abs(transaction.amount).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Toast Notification */}
      <Toast 
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
    </>
  );
};

export default Reports;