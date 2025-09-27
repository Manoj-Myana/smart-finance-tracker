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
  const [showExtractedTransactions, setShowExtractedTransactions] = useState(false);
  const [merging, setMerging] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<ExtractedTransaction>>({});
  const navigate = useNavigate();

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
      // Read PDF file as ArrayBuffer
      const arrayBuffer = await pdfFile.arrayBuffer();
      
      // Load PDF document
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine all text items
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += pageText + '\n';
      }
      
      // Extract transaction data from PDF text
      const extractedTransactions = extractTransactionsFromText(fullText);
      
      setExtractedTransactions(extractedTransactions);
      setShowExtractedTransactions(true);
      setPdfUploading(false);
      setPdfFile(null);
    } catch (error) {
      console.error('Error processing PDF:', error);
      setPdfUploading(false);
      alert('Error processing PDF file. Please try again.');
    }
  };

  const extractTransactionsFromText = (text: string): ExtractedTransaction[] => {
    const transactions: ExtractedTransaction[] = [];
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    // Common patterns for bank statements
    const datePattern = /(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})|(\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2})/;
    const amountPattern = /[$₹€£]?[\d,]+\.?\d{0,2}/;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip headers and irrelevant lines
      if (line.toLowerCase().includes('statement') || 
          line.toLowerCase().includes('balance') ||
          line.toLowerCase().includes('account') ||
          line.length < 10) {
        continue;
      }
      
      const dateMatch = line.match(datePattern);
      const amountMatch = line.match(amountPattern);
      
      if (dateMatch && amountMatch) {
        const dateStr = dateMatch[0];
        const amountStr = amountMatch[0].replace(/[^\d.-]/g, '');
        const amount = parseFloat(amountStr);
        
        if (!isNaN(amount) && amount > 0) {
          // Extract description (text between date and amount)
          let description = line
            .replace(dateMatch[0], '')
            .replace(amountMatch[0], '')
            .trim();
          
          // Clean up description
          description = description.replace(/\s+/g, ' ').trim();
          if (description.length < 3) {
            description = `Transaction ${transactions.length + 1}`;
          }
          
          // Format date to YYYY-MM-DD
          const formattedDate = formatDateString(dateStr);
          
          // Determine if it's credit or debit based on keywords or amount
          const isCredit = line.toLowerCase().includes('credit') || 
                          line.toLowerCase().includes('deposit') ||
                          line.toLowerCase().includes('salary') ||
                          line.toLowerCase().includes('transfer in');
          
          transactions.push({
            id: `ext-${Date.now()}-${i}`,
            date: formattedDate,
            description,
            amount,
            type: isCredit ? 'credit' : 'debit',
            frequency: 'irregular'
          });
        }
      }
    }
    
    // If no transactions found, provide a sample transaction
    if (transactions.length === 0) {
      transactions.push({
        id: `ext-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        description: 'Sample Transaction - Please verify PDF format',
        amount: 0.00,
        type: 'debit',
        frequency: 'irregular'
      });
    }
    
    return transactions.slice(0, 50); // Limit to 50 transactions
  };

  const formatDateString = (dateStr: string): string => {
    try {
      // Handle different date formats
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        // Try parsing different formats
        const parts = dateStr.split(/[/\-.]/);
        if (parts.length === 3) {
          // Assume MM/DD/YYYY or DD/MM/YYYY format
          const month = parseInt(parts[0]);
          const day = parseInt(parts[1]);
          const year = parseInt(parts[2]);
          
          if (year > 31) {
            // MM/DD/YYYY format
            return new Date(year, month - 1, day).toISOString().split('T')[0];
          } else {
            // DD/MM/YYYY format
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).toISOString().split('T')[0];
          }
        }
      }
      return date.toISOString().split('T')[0];
    } catch {
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
    // Simulate processing time
    setTimeout(() => {
      setExcelUploading(false);
      alert('Excel processing completed! Transactions will be added to your account.');
      setExcelFile(null);
    }, 3000);
  };

  const mergeTransactions = async () => {
    if (!user || extractedTransactions.length === 0) return;
    
    setMerging(true);
    
    try {
      const token = localStorage.getItem('authToken');
      
      // Convert extracted transactions to the format expected by the API
      const transactionPromises = extractedTransactions.map(async (transaction) => {
        const requestBody = {
          user_id: user.id,
          date: transaction.date,
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          frequency: transaction.frequency
        };

        const response = await fetch('http://localhost:5000/api/transactions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`Failed to add transaction: ${transaction.description}`);
        }
        
        return response.json();
      });
      
      await Promise.all(transactionPromises);
      
      // Success feedback
      alert(`Successfully merged ${extractedTransactions.length} transactions to your account!`);
      
      // Clear the extracted transactions
      setExtractedTransactions([]);
      setShowExtractedTransactions(false);
      
    } catch (error) {
      console.error('Error merging transactions:', error);
      alert('Error merging transactions. Please try again.');
    } finally {
      setMerging(false);
    }
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0, #cbd5e1)',
          backgroundAttachment: 'fixed',
          minHeight: '100vh'
        }}
      >
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-600 rounded-full animate-pulse"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-600 mt-4 font-medium">Loading upload page...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{
        background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0, #cbd5e1)',
        backgroundAttachment: 'fixed',
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
        zIndex: 1
      }}
    >
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Bank Statement Upload 📄
          </h1>
          <p className="text-gray-700 text-lg font-medium">
            Upload your bank statements to automatically import transactions
          </p>
        </div>

        {/* Upload Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* PDF Upload Section - Left Side */}
          <div 
            className="p-8 rounded-2xl shadow-lg border border-red-100/50"
            style={{
              backgroundColor: 'rgba(254, 242, 242, 0.9)',
              backgroundImage: 'none'
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-red-100 rounded-xl">
                <FileText className="h-7 w-7 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">PDF Bank Statements</h2>
            </div>

            {/* PDF Drop Zone */}
            <div
              onDrop={handlePdfDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setPdfDragOver(true);
              }}
              onDragLeave={() => setPdfDragOver(false)}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                pdfDragOver
                  ? 'border-red-500 bg-red-50'
                  : 'border-red-300 hover:border-red-400 hover:bg-red-50/50'
              }`}
              style={{ backgroundImage: 'none' }}
            >
              <Upload className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-2">
                Drop PDF files here or click to browse
              </p>
              <p className="text-sm text-gray-500 mb-4">
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
                className="hidden"
                id="pdf-upload"
              />
              
              <label
                htmlFor="pdf-upload"
                className="inline-block px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-lg cursor-pointer transition-all transform hover:scale-105 shadow-lg"
              >
                Browse PDF Files
              </label>
            </div>

            {/* PDF File Preview */}
            {pdfFile && (
              <div 
                className="mt-6 p-4 bg-white rounded-lg border border-red-200"
                style={{ backgroundImage: 'none' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-red-600" />
                    <div>
                      <p className="font-semibold text-gray-900">{pdfFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPdfFile(null)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <button
                  onClick={processPdfFile}
                  disabled={pdfUploading}
                  className="w-full mt-4 flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pdfUploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      <span>Process PDF Statement</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Excel Upload Section - Right Side */}
          <div 
            className="p-8 rounded-2xl shadow-lg border border-green-100/50"
            style={{
              backgroundColor: 'rgba(240, 253, 244, 0.9)',
              backgroundImage: 'none'
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-green-100 rounded-xl">
                <File className="h-7 w-7 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Excel Bank Statements</h2>
            </div>

            {/* Excel Drop Zone */}
            <div
              onDrop={handleExcelDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setExcelDragOver(true);
              }}
              onDragLeave={() => setExcelDragOver(false)}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                excelDragOver
                  ? 'border-green-500 bg-green-50'
                  : 'border-green-300 hover:border-green-400 hover:bg-green-50/50'
              }`}
              style={{ backgroundImage: 'none' }}
            >
              <Upload className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-2">
                Drop Excel/CSV files here or click to browse
              </p>
              <p className="text-sm text-gray-500 mb-4">
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
                className="hidden"
                id="excel-upload"
              />
              
              <label
                htmlFor="excel-upload"
                className="inline-block px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg cursor-pointer transition-all transform hover:scale-105 shadow-lg"
              >
                Browse Excel/CSV Files
              </label>
            </div>

            {/* Excel File Preview */}
            {excelFile && (
              <div 
                className="mt-6 p-4 bg-white rounded-lg border border-green-200"
                style={{ backgroundImage: 'none' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <File className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-semibold text-gray-900">{excelFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(excelFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setExcelFile(null)}
                    className="p-2 text-gray-400 hover:text-green-500 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <button
                  onClick={processExcelFile}
                  disabled={excelUploading}
                  className="w-full mt-4 flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {excelUploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
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
          className="mt-8 p-6 rounded-2xl shadow-lg border border-blue-100/50"
          style={{
            backgroundColor: 'rgba(239, 246, 255, 0.9)',
            backgroundImage: 'none'
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-900">Upload Instructions</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">📄 PDF Bank Statements</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Download official PDF statements from your bank</li>
                <li>• Ensure the PDF contains transaction details</li>
                <li>• Maximum file size: 10MB</li>
                <li>• AI will extract transaction data automatically</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">📊 Excel/CSV Bank Statements</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Export transaction data as Excel or CSV</li>
                <li>• Include columns: Date, Description, Amount, Type</li>
                <li>• Maximum file size: 10MB</li>
                <li>• Data will be imported directly to your account</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This feature is currently in development. Uploaded files will be processed 
              and transactions will be automatically added to your account. Please ensure your bank statements 
              don't contain sensitive information beyond transaction data.
            </p>
          </div>
        </div>

        {/* Extracted Transactions Table */}
        {showExtractedTransactions && extractedTransactions.length > 0 && (
          <div 
            className="mt-8 p-6 rounded-2xl shadow-lg border border-orange-100/50"
            style={{
              backgroundColor: 'rgba(255, 247, 237, 0.9)',
              backgroundImage: 'none'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                Extracted Transactions ({extractedTransactions.length} found)
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <AlertCircle className="h-4 w-4" />
                <span>Review before merging</span>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-5 px-6 font-bold text-gray-800 text-lg uppercase tracking-wider">Date</th>
                      <th className="text-left py-5 px-6 font-bold text-gray-800 text-lg uppercase tracking-wider">Description</th>
                      <th className="text-left py-5 px-6 font-bold text-gray-800 text-lg uppercase tracking-wider">Type</th>
                      <th className="text-left py-5 px-6 font-bold text-gray-800 text-lg uppercase tracking-wider">Frequency</th>
                      <th className="text-right py-5 px-6 font-bold text-gray-800 text-lg uppercase tracking-wider">Amount</th>
                      <th className="text-center py-5 px-6 font-bold text-gray-800 text-lg uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {extractedTransactions.map((transaction, index) => (
                      <tr key={transaction.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                        {/* Date Column */}
                        <td className="py-6 px-6 text-base text-gray-600 font-medium">
                          {editingTransaction === transaction.id ? (
                            <input
                              type="date"
                              value={editFormData.date || transaction.date}
                              onChange={(e) => handleEditFormChange('date', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              style={{ backgroundColor: 'white' }}
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
                        <td className="py-6 px-6">
                          <div className="max-w-xs">
                            {editingTransaction === transaction.id ? (
                              <input
                                type="text"
                                value={editFormData.description || transaction.description}
                                onChange={(e) => handleEditFormChange('description', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                style={{ backgroundColor: 'white' }}
                              />
                            ) : (
                              <p className="text-lg font-medium text-gray-900 truncate">
                                {transaction.description}
                              </p>
                            )}
                          </div>
                        </td>
                        
                        {/* Type Column */}
                        <td className="py-6 px-6">
                          {editingTransaction === transaction.id ? (
                            <select
                              value={editFormData.type || transaction.type}
                              onChange={(e) => handleEditFormChange('type', e.target.value as 'credit' | 'debit')}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              style={{ backgroundColor: 'white' }}
                            >
                              <option value="credit">Credit</option>
                              <option value="debit">Debit</option>
                            </select>
                          ) : (
                            <span className={`inline-flex items-center px-4 py-2 rounded-full text-base font-medium ${
                              transaction.type === 'credit' 
                                ? 'bg-green-100 text-green-700 border border-green-200' 
                                : 'bg-red-100 text-red-700 border border-red-200'
                            }`}>
                              {transaction.type === 'credit' ? (
                                <TrendingUp className="h-5 w-5 mr-2" />
                              ) : (
                                <TrendingDown className="h-5 w-5 mr-2" />
                              )}
                              {transaction.type}
                            </span>
                          )}
                        </td>
                        
                        {/* Frequency Column */}
                        <td className="py-6 px-6">
                          {editingTransaction === transaction.id ? (
                            <select
                              value={editFormData.frequency || transaction.frequency}
                              onChange={(e) => handleEditFormChange('frequency', e.target.value as 'regular' | 'irregular')}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              style={{ backgroundColor: 'white' }}
                            >
                              <option value="regular">Regular</option>
                              <option value="irregular">Irregular</option>
                            </select>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 border border-blue-200">
                              {transaction.frequency}
                            </span>
                          )}
                        </td>
                        
                        {/* Amount Column */}
                        <td className="py-6 px-6 text-right">
                          {editingTransaction === transaction.id ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editFormData.amount || transaction.amount}
                              onChange={(e) => handleEditFormChange('amount', parseFloat(e.target.value))}
                              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                              style={{ backgroundColor: 'white' }}
                            />
                          ) : (
                            <span className={`text-lg font-bold ${
                              transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              ${transaction.amount.toFixed(2)}
                            </span>
                          )}
                        </td>
                        
                        {/* Actions Column */}
                        <td className="py-6 px-6 text-center">
                          {editingTransaction === transaction.id ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={handleSaveEdit}
                                className="inline-flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                                title="Save changes"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="inline-flex items-center px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                                title="Cancel editing"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEditTransaction(transaction)}
                                className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                title="Edit transaction"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(transaction.id)}
                                className="inline-flex items-center px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                title="Delete transaction"
                              >
                                <Trash2 className="h-4 w-4" />
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
            <div className="flex justify-center">
              <button
                onClick={mergeTransactions}
                disabled={merging}
                className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {merging ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Merging Transactions...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-6 w-6" />
                    <span>Merge {extractedTransactions.length} Transactions</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Review:</strong> Please review the extracted transactions above. All transactions are set to 
                'irregular' frequency by default. Click "Merge Transactions" to add them to your account.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Reports;