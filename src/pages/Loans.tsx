import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Calculator, Calendar, TrendingUp, PiggyBank, AlertCircle, CheckCircle, Loader, Save, Eye, Trash2 } from 'lucide-react';

interface UserType {
  id: number;
  fullName: string;
  email: string;
}

interface Transaction {
  id: number;
  user_id: number;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  frequency: 'regular' | 'irregular';
  created_at: string;
}

interface PredictionData {
  month: string;
  year?: number;
  income_expected: number;
  expense_expected: number;
  savings_expected: number;
}

interface LoanData {
  id?: number;
  user_id: number;
  loan_amount: number;
  interest_rate: number;
  tenure: number;
  loan_type: string;
  interest_type: 'simple' | 'compound';
  monthly_emi: number;
  total_amount: number;
  total_interest: number;
  expected_clearance_date: string;
  status: 'active' | 'completed' | 'defaulted';
  created_at: string;
}

const Loans: React.FC = () => {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [activeTab, setActiveTab] = useState<'calculator' | 'myLoans'>('calculator');
  
  // Loan input states
  const [loanAmount, setLoanAmount] = useState<number>(100000);
  const [interestRate, setInterestRate] = useState<number>(12);
  const [tenure, setTenure] = useState<number>(12);
  const [loanType, setLoanType] = useState<string>('personal');
  const [interestType, setInterestType] = useState<'simple' | 'compound'>('compound');
  
  // Calculated values
  const [monthlyEMI, setMonthlyEMI] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [totalInterest, setTotalInterest] = useState<number>(0);
  
  // AI prediction states
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [clearanceDate, setClearanceDate] = useState<string>('');
  const [canAfford, setCanAfford] = useState<boolean>(false);
  const [monthsToRepay, setMonthsToRepay] = useState<number>(0);
  const [hasPredictions, setHasPredictions] = useState<boolean>(false);
  const [predictionsStale, setPredictionsStale] = useState<boolean>(false);
  
  // Timeout ref for debouncing automatic predictions
  const predictionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Loan management states
  const [takenLoans, setTakenLoans] = useState<LoanData[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  
  const navigate = useNavigate();

  const loanTypes = [
    { value: 'personal', label: 'Personal Loan', description: 'For personal expenses and emergencies' },
    { value: 'home', label: 'Home Loan', description: 'For purchasing or constructing a house' },
    { value: 'car', label: 'Car Loan', description: 'For purchasing a vehicle' },
    { value: 'education', label: 'Education Loan', description: 'For educational expenses' },
    { value: 'business', label: 'Business Loan', description: 'For business investments and expansion' },
    { value: 'gold', label: 'Gold Loan', description: 'Against gold jewelry as collateral' }
  ];

  useEffect(() => {
    const userData = localStorage.getItem('userData');
    const token = localStorage.getItem('authToken');

    if (!userData || !token) {
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      fetchTakenLoans();
      setLoading(false);
      // Reset predictions for new user session
      setHasPredictions(false);
      setPredictionsStale(false);
      setPredictions([]);
      setClearanceDate('');
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    if (loanAmount > 0 && interestRate > 0 && tenure > 0) {
      calculateLoanDetails();
    }
  }, [loanAmount, interestRate, tenure, interestType]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (predictionTimeoutRef.current) {
        clearTimeout(predictionTimeoutRef.current);
      }
    };
  }, []);

  const calculateLoanDetails = () => {
    const principal = loanAmount;
    const annualRate = interestRate / 100;
    const totalMonths = tenure;

    if (interestType === 'simple') {
      const simpleInterest = (principal * annualRate * (totalMonths / 12));
      const totalAmountPayable = principal + simpleInterest;
      const emi = totalAmountPayable / totalMonths;
      
      setMonthlyEMI(emi);
      setTotalAmount(totalAmountPayable);
      setTotalInterest(simpleInterest);
    } else {
      const monthlyRate = annualRate / 12;
      const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / 
                  (Math.pow(1 + monthlyRate, totalMonths) - 1);
      
      const totalAmountPayable = emi * totalMonths;
      const totalInterestPayable = totalAmountPayable - principal;

      setMonthlyEMI(emi);
      setTotalAmount(totalAmountPayable);
      setTotalInterest(totalInterestPayable);
    }
  };

  const fetchTakenLoans = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('userData');
      let userId = '1'; // Default fallback
      
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          userId = parsedUser.id || '1';
        } catch (e) {
          console.error('Error parsing userData:', e);
        }
      }
      
      console.log('DEBUG - fetchTakenLoans token:', token ? 'Token exists' : 'No token');
      console.log('DEBUG - fetchTakenLoans userId:', userId);
      console.log('DEBUG - fetchTakenLoans user object:', user);
      
      const response = await fetch(`http://localhost:5000/api/loans/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('DEBUG - fetchTakenLoans response status:', response.status);

      if (response.ok) {
        const loans = await response.json();
        setTakenLoans(Array.isArray(loans) ? loans : []);
      } else {
        const errorText = await response.text();
        console.log('DEBUG - fetchTakenLoans error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching loans:', error);
      setTakenLoans([]);
    }
  };

  const getNextLoanStartDate = () => {
    if (takenLoans.length === 0) {
      return new Date();
    }

    const latestClearanceDate = takenLoans.reduce((latest, loan) => {
      const loanClearanceDate = new Date(loan.expected_clearance_date);
      return loanClearanceDate > latest ? loanClearanceDate : latest;
    }, new Date());

    latestClearanceDate.setMonth(latestClearanceDate.getMonth() + 1);
    return latestClearanceDate;
  };

  const confirmLoan = async () => {
    console.log('DEBUG - confirmLoan called');
    console.log('DEBUG - hasPredictions:', hasPredictions);
    console.log('DEBUG - predictionsStale:', predictionsStale);
    console.log('DEBUG - clearanceDate:', clearanceDate);
    
    if (!hasPredictions) {
      alert('Please get AI predictions first before confirming the loan.');
      return;
    }

    if (!clearanceDate) {
      alert('Please calculate AI predictions first before confirming the loan.');
      return;
    }

    // If predictions are stale, show warning but allow confirmation
    if (predictionsStale) {
      const proceed = window.confirm('Your predictions may be outdated due to recent changes. Do you want to proceed with the loan confirmation anyway?');
      if (!proceed) {
        return;
      }
    }

    setIsConfirming(true);
    try {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('userData');
      let userId = 1; // Default fallback
      
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          userId = parsedUser.id || 1;
        } catch (e) {
          console.error('Error parsing userData:', e);
        }
      }
      
      const nextStartDate = getNextLoanStartDate();
      
      const adjustedClearanceDate = new Date(nextStartDate);
      adjustedClearanceDate.setMonth(adjustedClearanceDate.getMonth() + monthsToRepay);

      const loanData: Omit<LoanData, 'id'> = {
        user_id: userId,
        loan_amount: loanAmount,
        interest_rate: interestRate,
        tenure: tenure,
        loan_type: loanType,
        interest_type: interestType,
        monthly_emi: monthlyEMI,
        total_amount: totalAmount,
        total_interest: totalInterest,
        expected_clearance_date: adjustedClearanceDate.toISOString().split('T')[0],
        status: 'active',
        created_at: new Date().toISOString()
      };

      console.log('Sending loan request with data:', loanData);
      console.log('Using token:', token ? 'Token exists' : 'No token found');
      
      const response = await fetch('http://localhost:5000/api/loans', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loanData)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (response.ok) {
        alert('Loan confirmed successfully! 🎉');
        await fetchTakenLoans();
        setActiveTab('myLoans');
        
        setLoanAmount(100000);
        setInterestRate(12);
        setTenure(12);
        setLoanType('personal');
        setInterestType('compound');
        setClearanceDate('');
      } else {
        const responseText = await response.text();
        console.error('Error response:', responseText);
        try {
          const error = JSON.parse(responseText);
          alert(`Error confirming loan: ${error.message || 'Unknown error'}`);
        } catch (e) {
          alert(`Error confirming loan: ${response.status} - ${responseText}`);
        }
      }
    } catch (error) {
      console.error('Error confirming loan:', error);
      alert('Failed to confirm loan. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  const deleteLoan = async (loanId: number) => {
    if (!window.confirm('Are you sure you want to delete this loan record?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/loans/${loanId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('Loan deleted successfully!');
        await fetchTakenLoans();
      } else {
        alert('Failed to delete loan');
      }
    } catch (error) {
      console.error('Error deleting loan:', error);
      alert('Failed to delete loan');
    }
  };

  const fetchAIPredictions = async () => {
    if (!user) return;

    console.log('DEBUG - Starting AI predictions fetch');
    setCalculating(true);
    try {
      const userData = localStorage.getItem('userData');
      let userId = '1'; // Default fallback
      
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          userId = parsedUser.id || '1';
        } catch (e) {
          console.error('Error parsing userData:', e);
        }
      }
      
      const token = localStorage.getItem('authToken');
      
      console.log('DEBUG - Fetching transactions for userId:', userId);
      
      const transactionResponse = await fetch(`http://localhost:5000/api/transactions/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!transactionResponse.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const transactions = await transactionResponse.json();
      console.log('DEBUG - Transactions fetched:', transactions?.length || 0);
      
      if (!Array.isArray(transactions) || transactions.length === 0) {
        throw new Error('No transaction data available for predictions');
      }

      console.log('DEBUG - Calling prediction service');
      const predictionResponse = await fetch(`http://127.0.0.1:5001/api/predict-future`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactions: transactions,
          months_ahead: 60
        }),
      });

      const result = await predictionResponse.json();
      console.log('DEBUG - Prediction result:', result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate predictions');
      }

      setPredictions(result.predictions || []);
      calculateClearanceDate(result.predictions || []);
      setHasPredictions(true);
      setPredictionsStale(false);
      console.log('DEBUG - Predictions set successfully');
      
    } catch (error) {
      console.error('Error fetching AI predictions:', error);
      console.log('DEBUG - Using fallback prediction calculation');
      
      // Provide fallback prediction when AI service fails
      setPredictions([]);
      const fallbackClearanceDate = calculateFallbackClearanceDate();
      setClearanceDate(fallbackClearanceDate);
      setHasPredictions(true);
      setPredictionsStale(false);
      
      console.log('DEBUG - Fallback prediction set, hasPredictions:', true);
      
      // Show user-friendly message
      alert('AI predictions unavailable. Using basic calculation based on loan tenure.');
    } finally {
      setCalculating(false);
      console.log('DEBUG - AI predictions fetch completed');
    }
  };

  const handleParameterChange = async (parameterSetter: () => void) => {
    parameterSetter();
    
    if (hasPredictions) {
      setPredictionsStale(true);
      
      // Clear existing timeout
      if (predictionTimeoutRef.current) {
        clearTimeout(predictionTimeoutRef.current);
      }
      
      // Set new timeout for auto-refresh predictions after user stops making changes
      predictionTimeoutRef.current = setTimeout(async () => {
        console.log('DEBUG - Auto-refreshing predictions due to parameter change');
        await fetchAIPredictions();
      }, 1500); // 1.5 seconds delay to avoid too many API calls
    }
  };

  const calculateFallbackClearanceDate = (): string => {
    const loanStartDate = getNextLoanStartDate();
    const clearanceDate = new Date(loanStartDate);
    clearanceDate.setMonth(clearanceDate.getMonth() + tenure);
    
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    
    // Set basic affordability based on typical income assumptions
    setCanAfford(monthlyEMI <= 50000); // Assume affordability if EMI is reasonable
    setMonthsToRepay(tenure);
    
    return `${monthNames[clearanceDate.getMonth()]} ${clearanceDate.getFullYear()}`;
  };

  const calculateClearanceDate = (predictionData: PredictionData[]) => {
    if (!predictionData.length || !monthlyEMI) {
      // Use fallback calculation when no prediction data
      const fallbackDate = calculateFallbackClearanceDate();
      setClearanceDate(fallbackDate);
      return;
    }

    const loanStartDate = getNextLoanStartDate();
    const currentDate = new Date();
    const monthsUntilStart = Math.max(0, Math.floor((loanStartDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));

    let cumulativeSavings = 0;
    let monthsRequired = 0;
    let foundClearanceMonth = false;

    const averageMonthlySavings = predictionData.slice(0, 6).reduce((sum, p) => sum + p.savings_expected, 0) / 6;
    setCanAfford(averageMonthlySavings >= monthlyEMI);

    const startIndex = Math.min(monthsUntilStart, predictionData.length - 1);
    
    for (let i = startIndex; i < predictionData.length; i++) {
      const prediction = predictionData[i];
      cumulativeSavings += prediction.savings_expected;
      monthsRequired = i + 1 - startIndex;

      if (cumulativeSavings >= totalAmount) {
        foundClearanceMonth = true;
        const clearanceYear = (prediction.year || new Date().getFullYear());
        setClearanceDate(`${prediction.month} ${clearanceYear}`);
        setMonthsToRepay(monthsRequired);
        break;
      }
    }

    if (!foundClearanceMonth) {
      const estimatedYears = Math.ceil(totalAmount / (averageMonthlySavings * 12)) + (monthsUntilStart / 12);
      setClearanceDate(`Estimated ${estimatedYears.toFixed(1)} years from loan start`);
      setMonthsToRepay(Math.ceil(totalAmount / averageMonthlySavings));
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '50%',
            padding: '24px',
            marginBottom: '20px',
            backdropFilter: 'blur(10px)'
          }}>
            <Loader style={{ 
              height: '48px', 
              width: '48px', 
              color: 'white',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
            }} className="animate-spin" />
          </div>
          <p style={{ 
            color: 'white', 
            fontWeight: '600',
            fontSize: '18px',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            Loading Loan Calculator...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '32px 16px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header with Tabs */}
        <div style={{
          background: 'rgba(255,255,255,0.98)',
          borderRadius: '24px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
          padding: '32px',
          marginBottom: '32px',
          border: '1px solid rgba(255,255,255,0.3)',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '16px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CreditCard style={{ height: '32px', width: '32px', color: 'white' }} />
            </div>
            <div>
              <h1 style={{ 
                fontSize: '32px', 
                fontWeight: '800', 
                color: '#1a202c',
                margin: '0'
              }}>
                💳 Smart Loan Calculator
              </h1>
              <p style={{ 
                color: '#4a5568', 
                fontSize: '16px',
                margin: '8px 0 0 0'
              }}>
                Calculate loan EMI, get AI predictions, and manage your loans
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setActiveTab('calculator')}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: 'none',
                background: activeTab === 'calculator' 
                  ? 'linear-gradient(135deg, #48bb78, #38a169)' 
                  : 'rgba(107, 114, 128, 0.1)',
                color: activeTab === 'calculator' ? 'white' : '#4a5568',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Calculator style={{ height: '16px', width: '16px' }} />
              Loan Calculator
            </button>
            <button
              onClick={() => setActiveTab('myLoans')}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: 'none',
                background: activeTab === 'myLoans' 
                  ? 'linear-gradient(135deg, #48bb78, #38a169)' 
                  : 'rgba(107, 114, 128, 0.1)',
                color: activeTab === 'myLoans' ? 'white' : '#4a5568',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Eye style={{ height: '16px', width: '16px' }} />
              My Loans ({takenLoans.length})
            </button>
          </div>
        </div>

        {/* Calculator Tab */}
        {activeTab === 'calculator' && (
          <div style={{
            background: 'rgba(255,255,255,0.98)',
            borderRadius: '24px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
            padding: '32px',
            border: '1px solid rgba(255,255,255,0.3)',
            backdropFilter: 'blur(20px)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              {/* Input Section */}
              <div>
                <h2 style={{ 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  color: '#1a202c',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <Calculator style={{ color: '#667eea' }} />
                  Loan Details
                </h2>

                {/* Loan Amount */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    💰 Loan Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={loanAmount}
                    onChange={(e) => {
                      handleParameterChange(() => setLoanAmount(Number(e.target.value)));
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '2px solid #e2e8f0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#2d3748',
                      background: '#f8fafc',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#667eea';
                      e.target.style.background = 'white';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.background = '#f8fafc';
                    }}
                  />
                </div>

                {/* Interest Rate */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    📊 Interest Rate (% per annum)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => {
                      handleParameterChange(() => setInterestRate(Number(e.target.value)));
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '2px solid #e2e8f0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#2d3748',
                      background: '#f8fafc',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#667eea';
                      e.target.style.background = 'white';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.background = '#f8fafc';
                    }}
                  />
                </div>

                {/* Tenure */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    ⏱️ Tenure (months)
                  </label>
                  <input
                    type="number"
                    value={tenure}
                    onChange={(e) => {
                      handleParameterChange(() => setTenure(Number(e.target.value)));
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '2px solid #e2e8f0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#2d3748',
                      background: '#f8fafc',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#667eea';
                      e.target.style.background = 'white';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.background = '#f8fafc';
                    }}
                  />
                </div>

                {/* Interest Type */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    🔢 Interest Type
                  </label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: `2px solid ${interestType === 'simple' ? '#48bb78' : '#e2e8f0'}`,
                      background: interestType === 'simple' ? '#f0fff4' : '#f8fafc',
                      cursor: 'pointer',
                      flex: 1,
                      transition: 'all 0.3s ease'
                    }}>
                      <input
                        type="radio"
                        name="interestType"
                        value="simple"
                        checked={interestType === 'simple'}
                        onChange={(e) => {
                          handleParameterChange(() => setInterestType(e.target.value as 'simple' | 'compound'));
                        }}
                        style={{ margin: 0 }}
                      />
                      <span style={{ fontWeight: '600', color: '#2d3748' }}>Simple Interest</span>
                    </label>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: `2px solid ${interestType === 'compound' ? '#48bb78' : '#e2e8f0'}`,
                      background: interestType === 'compound' ? '#f0fff4' : '#f8fafc',
                      cursor: 'pointer',
                      flex: 1,
                      transition: 'all 0.3s ease'
                    }}>
                      <input
                        type="radio"
                        name="interestType"
                        value="compound"
                        checked={interestType === 'compound'}
                        onChange={(e) => {
                          handleParameterChange(() => setInterestType(e.target.value as 'simple' | 'compound'));
                        }}
                        style={{ margin: 0 }}
                      />
                      <span style={{ fontWeight: '600', color: '#2d3748' }}>Compound (EMI)</span>
                    </label>
                  </div>
                </div>

                {/* Loan Type */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    🏠 Loan Type
                  </label>
                  <select
                    value={loanType}
                    onChange={(e) => {
                      handleParameterChange(() => setLoanType(e.target.value));
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '2px solid #e2e8f0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#2d3748',
                      background: '#f8fafc',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#667eea';
                      e.target.style.background = 'white';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.background = '#f8fafc';
                    }}
                  >
                    {loanTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Results Section */}
              <div>
                <h2 style={{ 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  color: '#1a202c',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <TrendingUp style={{ color: '#48bb78' }} />
                  Calculation Results
                </h2>

                {/* EMI Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #48bb78, #38a169)',
                  color: 'white',
                  padding: '20px',
                  borderRadius: '16px',
                  marginBottom: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '14px', opacity: '0.9', marginBottom: '4px' }}>
                    Monthly EMI
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '700' }}>
                    {formatCurrency(monthlyEMI)}
                  </div>
                </div>

                {/* Other Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}>
                    <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '4px' }}>
                      Total Amount
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#1a202c' }}>
                      {formatCurrency(totalAmount)}
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(236, 72, 153, 0.1)',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(236, 72, 153, 0.2)'
                  }}>
                    <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '4px' }}>
                      Total Interest
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#1a202c' }}>
                      {formatCurrency(totalInterest)}
                    </div>
                  </div>
                </div>

                {/* AI Predictions Section */}
                <div style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  borderRadius: '16px',
                  padding: '20px',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  marginBottom: '24px'
                }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#1a202c',
                    margin: '0 0 16px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    🤖 AI Prediction
                  </h3>
                  
                  {!clearanceDate ? (
                    <button
                      onClick={fetchAIPredictions}
                      disabled={calculating}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '12px',
                        border: 'none',
                        background: calculating 
                          ? 'rgba(107, 114, 128, 0.3)' 
                          : predictionsStale 
                            ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                            : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: calculating ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      {calculating ? (
                        <>
                          <Loader style={{ height: '16px', width: '16px' }} className="animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          {predictionsStale ? '🔄 Refresh Predictions' : '🔮 Get AI Predictions'}
                        </>
                      )}
                    </button>
                  ) : (
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '12px'
                      }}>
                        {canAfford ? (
                          <CheckCircle style={{ height: '20px', width: '20px', color: '#48bb78' }} />
                        ) : (
                          <AlertCircle style={{ height: '20px', width: '20px', color: '#f56565' }} />
                        )}
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: canAfford ? '#48bb78' : '#f56565'
                        }}>
                          {canAfford ? 'Loan is Affordable' : 'Loan may be challenging'}
                        </span>
                      </div>
                      
                      {/* Stale Predictions Warning */}
                      {predictionsStale && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '12px',
                          padding: '8px 12px',
                          background: 'rgba(252, 211, 77, 0.1)',
                          borderRadius: '8px',
                          border: '1px solid rgba(252, 211, 77, 0.3)'
                        }}>
                          <AlertCircle style={{ height: '16px', width: '16px', color: '#d97706' }} />
                          <span style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#d97706'
                          }}>
                            Predictions may be outdated. Please get fresh predictions after making changes.
                          </span>
                        </div>
                      )}
                      
                      <div style={{ fontSize: '14px', color: '#4a5568', marginBottom: '8px' }}>
                        Expected Clearance Date:
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#1a202c' }}>
                        📅 {clearanceDate}
                      </div>
                      {takenLoans.length > 0 && (
                        <div style={{
                          marginTop: '12px',
                          padding: '12px',
                          background: 'rgba(251, 191, 36, 0.1)',
                          borderRadius: '8px',
                          border: '1px solid rgba(251, 191, 36, 0.3)'
                        }}>
                          <div style={{ fontSize: '12px', color: '#92400e', fontWeight: '600' }}>
                            ⚠️ Note: This loan will start after your current loan(s) are cleared
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Confirm Loan Button */}
                <button
                  onClick={confirmLoan}
                  disabled={!hasPredictions || !clearanceDate || isConfirming}
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '16px',
                    border: 'none',
                    background: (!hasPredictions || !clearanceDate || isConfirming)
                      ? 'rgba(107, 114, 128, 0.3)'
                      : 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: (!hasPredictions || !clearanceDate || isConfirming) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px'
                  }}
                >
                  {isConfirming ? (
                    <>
                      <Loader style={{ height: '20px', width: '20px' }} className="animate-spin" />
                      Confirming Loan...
                    </>
                  ) : (
                    <>
                      <CheckCircle style={{ height: '20px', width: '20px' }} />
                      {(!hasPredictions || predictionsStale) ? 'Get AI Predictions First' : 'Confirm & Take Loan'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* My Loans Tab */}
        {activeTab === 'myLoans' && (
          <div style={{
            background: 'rgba(255,255,255,0.98)',
            borderRadius: '24px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
            padding: '32px',
            border: '1px solid rgba(255,255,255,0.3)',
            backdropFilter: 'blur(20px)'
          }}>
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              color: '#1a202c',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <PiggyBank style={{ color: '#667eea' }} />
              My Loans ({takenLoans.length})
            </h2>

            {takenLoans.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 24px',
                color: '#6b7280'
              }}>
                <PiggyBank style={{ height: '64px', width: '64px', margin: '0 auto 16px', opacity: '0.5' }} />
                <h3 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 8px 0' }}>
                  No Loans Taken Yet
                </h3>
                <p style={{ fontSize: '16px', margin: '0' }}>
                  Use the calculator to plan and confirm your first loan!
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
                {takenLoans.map((loan) => (
                  <div
                    key={loan.id}
                    style={{
                      background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                      borderRadius: '16px',
                      padding: '24px',
                      border: '2px solid #e2e8f0',
                      position: 'relative',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '16px'
                    }}>
                      <div>
                        <h3 style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          color: '#1a202c',
                          margin: '0 0 4px 0',
                          textTransform: 'capitalize'
                        }}>
                          {loan.loan_type} Loan
                        </h3>
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          background: loan.status === 'active' 
                            ? 'rgba(34, 197, 94, 0.1)' 
                            : 'rgba(156, 163, 175, 0.1)',
                          color: loan.status === 'active' ? '#059669' : '#6b7280',
                          fontSize: '12px',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          {loan.status}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteLoan(loan.id!)}
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#dc2626',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                        }}
                      >
                        <Trash2 style={{ height: '16px', width: '16px' }} />
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                          Loan Amount
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#1a202c' }}>
                          {formatCurrency(loan.loan_amount)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                          Monthly EMI
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#1a202c' }}>
                          {formatCurrency(loan.monthly_emi)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                          Interest Rate
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a202c' }}>
                          {loan.interest_rate}% ({loan.interest_type})
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                          Tenure
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a202c' }}>
                          {loan.tenure} months
                        </div>
                      </div>
                    </div>

                    <div style={{
                      background: 'rgba(139, 92, 246, 0.1)',
                      borderRadius: '12px',
                      padding: '12px',
                      border: '1px solid rgba(139, 92, 246, 0.2)'
                    }}>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                        <Calendar style={{ height: '12px', width: '12px', display: 'inline', marginRight: '4px' }} />
                        Expected Clearance Date
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#7c3aed' }}>
                        {new Date(loan.expected_clearance_date).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>

                    <div style={{
                      fontSize: '11px',
                      color: '#9ca3af',
                      marginTop: '12px',
                      textAlign: 'center'
                    }}>
                      Taken on {new Date(loan.created_at).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Loans;