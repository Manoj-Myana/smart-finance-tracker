import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Calendar, DollarSign, PiggyBank, AlertCircle, BarChart3, Loader } from 'lucide-react';

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
  future_date: string;
  month: string;
  year: number;
  income_expected: number;
  expense_expected: number;
  savings_expected: number;
}

interface ModelInfo {
  data_points_used: number;
  months_predicted: number;
  data_range: {
    from: string;
    to: string;
  };
}

const Predict: React.FC = () => {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [error, setError] = useState<string>('');
  const [monthsAhead, setMonthsAhead] = useState<number>(6);
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

  const fetchTransactions = async (): Promise<Transaction[]> => {
    try {
      const userId = localStorage.getItem('userId') || user?.id || '1';
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`http://localhost:5000/api/transactions/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.status}`);
      }

      const transactions = await response.json();
      return Array.isArray(transactions) ? transactions : [];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  };

  const generatePredictions = async () => {
    if (!user) return;

    setPredicting(true);
    setError('');
    setPredictions([]);
    setModelInfo(null);

    try {
      console.log('Fetching transactions for prediction...');
      const transactions = await fetchTransactions();
      
      if (transactions.length === 0) {
        throw new Error('No transaction data available for prediction');
      }

      console.log(`Sending ${transactions.length} transactions for ML prediction`);

      // Send transactions to Flask ML API
      const response = await fetch('http://localhost:5001/api/predict-future', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactions: transactions,
          months_ahead: monthsAhead
        }),
      });

      const result = await response.json();
      console.log('ML Prediction result:', result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate predictions');
      }

      setPredictions(result.predictions);
      setModelInfo(result.model_info);
      
    } catch (error) {
      console.error('Error generating predictions:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setPredicting(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getRowClassName = (savings: number): string => {
    if (savings > 0) return 'bg-green-50 border-green-200';
    if (savings < 0) return 'bg-red-50 border-red-200';
    return 'bg-yellow-50 border-yellow-200';
  };

  const getSavingsTextColor = (savings: number): string => {
    if (savings > 0) return 'text-green-700 font-semibold';
    if (savings < 0) return 'text-red-700 font-semibold';
    return 'text-yellow-700 font-semibold';
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
            🚀 Initializing AI Prediction System...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            marginBottom: '24px' 
          }}>
            <div style={{
              padding: '16px',
              background: 'linear-gradient(135deg, #ff6b6b, #ff8e53)',
              borderRadius: '50%',
              boxShadow: '0 20px 40px rgba(255, 107, 107, 0.3)',
              transform: 'scale(1)',
              transition: 'transform 0.3s ease'
            }}>
              <TrendingUp style={{ height: '32px', width: '32px', color: 'white' }} />
            </div>
          </div>
          <h1 style={{
            fontSize: '48px',
            fontWeight: '800',
            color: 'white',
            marginBottom: '12px',
            textShadow: '0 4px 8px rgba(0,0,0,0.2)',
            letterSpacing: '-1px'
          }}>
            Predict Future Values
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: '20px',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.6',
            fontWeight: '300'
          }}>
            Harness the power of advanced machine learning to forecast your financial future with precision
          </p>
        </div>

        {/* Controls */}
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '24px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
          padding: '32px',
          marginBottom: '40px',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Calendar style={{ height: '24px', width: '24px', color: '#667eea' }} />
                <label style={{ 
                  color: '#2d3748', 
                  fontWeight: '600',
                  fontSize: '16px'
                }}>
                  Prediction Timeline:
                </label>
              </div>
              <select
                value={monthsAhead}
                onChange={(e) => setMonthsAhead(Number(e.target.value))}
                style={{
                  padding: '12px 20px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '500',
                  background: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  minWidth: '160px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value={3}>3 months ahead</option>
                <option value={6}>6 months ahead</option>
                <option value={12}>12 months ahead</option>
                <option value={18}>18 months ahead</option>
                <option value={24}>24 months ahead</option>
              </select>
            </div>
            
            <button
              onClick={generatePredictions}
              disabled={predicting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 32px',
                background: predicting 
                  ? 'linear-gradient(135deg, #a0aec0, #718096)' 
                  : 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                fontWeight: '600',
                borderRadius: '16px',
                border: 'none',
                cursor: predicting ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                boxShadow: predicting 
                  ? 'none' 
                  : '0 10px 30px rgba(102, 126, 234, 0.4)',
                transform: predicting ? 'none' : 'translateY(0px)',
                transition: 'all 0.3s ease',
                opacity: predicting ? 0.7 : 1
              }}
              onMouseOver={(e) => {
                if (!predicting) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 15px 40px rgba(102, 126, 234, 0.5)';
                }
              }}
              onMouseOut={(e) => {
                if (!predicting) {
                  e.currentTarget.style.transform = 'translateY(0px)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(102, 126, 234, 0.4)';
                }
              }}
            >
              {predicting ? (
                <>
                  <Loader style={{ height: '20px', width: '20px' }} className="animate-spin" />
                  <span>Generating AI Predictions...</span>
                </>
              ) : (
                <>
                  <BarChart3 style={{ height: '20px', width: '20px' }} />
                  <span>Generate Predictions</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: 'linear-gradient(135deg, #fed7d7, #feb2b2)',
            border: '1px solid #fc8181',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            boxShadow: '0 10px 25px rgba(252, 129, 129, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <AlertCircle style={{ height: '28px', width: '28px', color: '#c53030', flexShrink: 0 }} />
              <div>
                <p style={{ color: '#742a2a', fontWeight: '700', fontSize: '18px', marginBottom: '4px' }}>
                  Prediction Error
                </p>
                <p style={{ color: '#9b2c2c', fontSize: '16px', lineHeight: '1.5' }}>
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Model Info */}
        {modelInfo && (
          <div style={{
            background: 'linear-gradient(135deg, #ebf8ff, #bee3f8)',
            border: '1px solid #90cdf4',
            borderRadius: '20px',
            padding: '32px',
            marginBottom: '32px',
            boxShadow: '0 15px 35px rgba(59, 130, 246, 0.15)'
          }}>
            <h3 style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              color: '#1e3a8a', 
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              🤖 AI Model Analytics
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '24px' 
            }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ 
                  fontSize: '36px', 
                  fontWeight: '800', 
                  color: '#1d4ed8',
                  marginBottom: '8px'
                }}>
                  {modelInfo.data_points_used}
                </p>
                <p style={{ color: '#3730a3', fontSize: '14px', fontWeight: '600' }}>
                  Months of Historical Data
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ 
                  fontSize: '36px', 
                  fontWeight: '800', 
                  color: '#1d4ed8',
                  marginBottom: '8px'
                }}>
                  {modelInfo.months_predicted}
                </p>
                <p style={{ color: '#3730a3', fontSize: '14px', fontWeight: '600' }}>
                  Future Months Forecasted
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  color: '#1d4ed8',
                  marginBottom: '8px'
                }}>
                  {modelInfo.data_range.from} → {modelInfo.data_range.to}
                </p>
                <p style={{ color: '#3730a3', fontSize: '14px', fontWeight: '600' }}>
                  Training Data Period
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Predictions Table */}
        {predictions.length > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.98)',
            borderRadius: '24px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.3)',
            backdropFilter: 'blur(20px)'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
              padding: '24px 32px'
            }}>
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: '700', 
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                <PiggyBank style={{ height: '28px', width: '28px' }} />
                🔮 AI-Powered Financial Forecasts
              </h2>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #f7fafc, #edf2f7)' }}>
                    <th style={{
                      padding: '20px 24px',
                      textAlign: 'left',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#2d3748',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      borderBottom: '2px solid #e2e8f0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar style={{ height: '18px', width: '18px', color: '#667eea' }} />
                        📅 Future Date
                      </div>
                    </th>
                    <th style={{
                      padding: '20px 24px',
                      textAlign: 'right',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#2d3748',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      borderBottom: '2px solid #e2e8f0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <TrendingUp style={{ height: '18px', width: '18px', color: '#48bb78' }} />
                        💰 Income Expected
                      </div>
                    </th>
                    <th style={{
                      padding: '20px 24px',
                      textAlign: 'right',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#2d3748',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      borderBottom: '2px solid #e2e8f0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <TrendingUp style={{ height: '18px', width: '18px', color: '#f56565', transform: 'rotate(180deg)' }} />
                        💸 Expense Expected
                      </div>
                    </th>
                    <th style={{
                      padding: '20px 24px',
                      textAlign: 'right',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#2d3748',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      borderBottom: '2px solid #e2e8f0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <PiggyBank style={{ height: '18px', width: '18px', color: '#4299e1' }} />
                        🏦 Savings Expected
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((prediction, index) => (
                    <tr
                      key={index}
                      style={{
                        background: prediction.savings_expected > 0 
                          ? 'linear-gradient(135deg, #f0fff4, #c6f6d5)' 
                          : prediction.savings_expected < 0 
                          ? 'linear-gradient(135deg, #fffbfb, #fed7d7)' 
                          : 'linear-gradient(135deg, #fffff0, #fefdd8)',
                        borderBottom: '1px solid rgba(0,0,0,0.05)',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'scale(1.01)';
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <td style={{ padding: '20px 24px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: '700', color: '#2d3748', fontSize: '16px' }}>
                          {prediction.future_date}
                        </div>
                        <div style={{ fontSize: '14px', color: '#718096', marginTop: '4px' }}>
                          {prediction.month} {prediction.year}
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                        <div style={{ 
                          fontSize: '18px', 
                          fontWeight: '700', 
                          color: '#38a169',
                          textShadow: '0 1px 2px rgba(56, 161, 105, 0.2)'
                        }}>
                          {formatCurrency(prediction.income_expected)}
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                        <div style={{ 
                          fontSize: '18px', 
                          fontWeight: '700', 
                          color: '#e53e3e',
                          textShadow: '0 1px 2px rgba(229, 62, 62, 0.2)'
                        }}>
                          {formatCurrency(prediction.expense_expected)}
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                        <div style={{ 
                          fontSize: '18px', 
                          fontWeight: '800',
                          color: prediction.savings_expected > 0 
                            ? '#38a169' 
                            : prediction.savings_expected < 0 
                            ? '#e53e3e' 
                            : '#d69e2e',
                          textShadow: `0 1px 2px ${prediction.savings_expected > 0 
                            ? 'rgba(56, 161, 105, 0.2)' 
                            : prediction.savings_expected < 0 
                            ? 'rgba(229, 62, 62, 0.2)' 
                            : 'rgba(214, 158, 46, 0.2)'}`
                        }}>
                          {formatCurrency(prediction.savings_expected)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Summary Footer */}
            <div style={{
              background: 'linear-gradient(135deg, #f7fafc, #edf2f7)',
              padding: '32px',
              borderTop: '2px solid #e2e8f0'
            }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '24px',
                textAlign: 'center'
              }}>
                <div style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, #f0fff4, #c6f6d5)',
                  borderRadius: '16px',
                  border: '2px solid #9ae6b4'
                }}>
                  <p style={{ fontSize: '14px', color: '#2f855a', fontWeight: '600', marginBottom: '8px' }}>
                    💰 Total Expected Income
                  </p>
                  <p style={{ 
                    fontSize: '28px', 
                    fontWeight: '800', 
                    color: '#38a169',
                    textShadow: '0 2px 4px rgba(56, 161, 105, 0.3)'
                  }}>
                    {formatCurrency(predictions.reduce((sum, p) => sum + p.income_expected, 0))}
                  </p>
                </div>
                <div style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, #fffbfb, #fed7d7)',
                  borderRadius: '16px',
                  border: '2px solid #fc8181'
                }}>
                  <p style={{ fontSize: '14px', color: '#c53030', fontWeight: '600', marginBottom: '8px' }}>
                    💸 Total Expected Expenses
                  </p>
                  <p style={{ 
                    fontSize: '28px', 
                    fontWeight: '800', 
                    color: '#e53e3e',
                    textShadow: '0 2px 4px rgba(229, 62, 62, 0.3)'
                  }}>
                    {formatCurrency(predictions.reduce((sum, p) => sum + p.expense_expected, 0))}
                  </p>
                </div>
                <div style={{
                  padding: '20px',
                  background: predictions.reduce((sum, p) => sum + p.savings_expected, 0) > 0
                    ? 'linear-gradient(135deg, #f0fff4, #c6f6d5)'
                    : predictions.reduce((sum, p) => sum + p.savings_expected, 0) < 0
                    ? 'linear-gradient(135deg, #fffbfb, #fed7d7)'
                    : 'linear-gradient(135deg, #fffff0, #fefdd8)',
                  borderRadius: '16px',
                  border: predictions.reduce((sum, p) => sum + p.savings_expected, 0) > 0
                    ? '2px solid #9ae6b4'
                    : predictions.reduce((sum, p) => sum + p.savings_expected, 0) < 0
                    ? '2px solid #fc8181'
                    : '2px solid #f6e05e'
                }}>
                  <p style={{ 
                    fontSize: '14px', 
                    color: predictions.reduce((sum, p) => sum + p.savings_expected, 0) > 0 
                      ? '#2f855a' 
                      : predictions.reduce((sum, p) => sum + p.savings_expected, 0) < 0 
                      ? '#c53030' 
                      : '#b7791f', 
                    fontWeight: '600', 
                    marginBottom: '8px' 
                  }}>
                    🏦 Total Expected Savings
                  </p>
                  <p style={{ 
                    fontSize: '28px', 
                    fontWeight: '800',
                    color: predictions.reduce((sum, p) => sum + p.savings_expected, 0) > 0 
                      ? '#38a169' 
                      : predictions.reduce((sum, p) => sum + p.savings_expected, 0) < 0 
                      ? '#e53e3e' 
                      : '#d69e2e',
                    textShadow: `0 2px 4px ${predictions.reduce((sum, p) => sum + p.savings_expected, 0) > 0 
                      ? 'rgba(56, 161, 105, 0.3)' 
                      : predictions.reduce((sum, p) => sum + p.savings_expected, 0) < 0 
                      ? 'rgba(229, 62, 62, 0.3)' 
                      : 'rgba(214, 158, 46, 0.3)'}`
                  }}>
                    {formatCurrency(predictions.reduce((sum, p) => sum + p.savings_expected, 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Getting Started */}
        {predictions.length === 0 && !predicting && !error && (
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '24px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
            padding: '48px',
            textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.3)',
            backdropFilter: 'blur(20px)'
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div style={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                borderRadius: '50%',
                width: '80px',
                height: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: '0 15px 35px rgba(102, 126, 234, 0.4)'
              }}>
                <TrendingUp style={{ height: '40px', width: '40px', color: 'white' }} />
              </div>
              <h3 style={{
                fontSize: '32px',
                fontWeight: '800',
                color: '#2d3748',
                marginBottom: '16px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                🚀 Ready to Unlock Your Financial Future?
              </h3>
              <p style={{
                color: '#4a5568',
                marginBottom: '32px',
                fontSize: '18px',
                lineHeight: '1.7',
                fontWeight: '400'
              }}>
                Our cutting-edge AI analyzes your spending patterns and transaction history to deliver 
                precise financial forecasts. Discover what your future income, expenses, and savings could look like!
              </p>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '24px',
                marginTop: '40px'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #ebf8ff, #bee3f8)',
                  borderRadius: '20px',
                  padding: '24px',
                  border: '2px solid #90cdf4'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #3182ce, #2c5282)',
                    borderRadius: '50%',
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px'
                  }}>
                    <BarChart3 style={{ height: '24px', width: '24px', color: 'white' }} />
                  </div>
                  <h4 style={{ fontWeight: '700', color: '#1a365d', fontSize: '18px', marginBottom: '8px' }}>
                    🤖 AI-Powered Analytics
                  </h4>
                  <p style={{ fontSize: '14px', color: '#2c5282', lineHeight: '1.5' }}>
                    Advanced machine learning algorithms trained on your financial data
                  </p>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #f7fafc, #e2e8f0)',
                  borderRadius: '20px',
                  padding: '24px',
                  border: '2px solid #cbd5e0'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #805ad5, #553c9a)',
                    borderRadius: '50%',
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px'
                  }}>
                    <DollarSign style={{ height: '24px', width: '24px', color: 'white' }} />
                  </div>
                  <h4 style={{ fontWeight: '700', color: '#2d3748', fontSize: '18px', marginBottom: '8px' }}>
                    📊 Precision Forecasting
                  </h4>
                  <p style={{ fontSize: '14px', color: '#4a5568', lineHeight: '1.5' }}>
                    Personalized predictions based on your unique spending patterns
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Professional Disclaimer */}
        <div style={{
          background: 'rgba(255,255,255,0.9)',
          borderRadius: '20px',
          padding: '32px',
          marginTop: '40px',
          boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
          border: '1px solid rgba(255,255,255,0.3)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <h4 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#2d3748',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              ⚠️ Important Disclaimer
            </h4>
            <p style={{
              color: '#4a5568',
              fontSize: '16px',
              lineHeight: '1.7',
              fontWeight: '400',
              textAlign: 'justify'
            }}>
              <strong>Please Note:</strong> The financial predictions displayed above are <em>estimates and assumptions</em> generated 
              by machine learning algorithms based on your historical transaction data. These values are <strong>not guaranteed</strong> and 
              should be considered as <em>expected projections</em> rather than definitive outcomes. Actual future income, expenses, and 
              savings may vary significantly due to various factors including market conditions, personal circumstances, economic changes, 
              and unforeseen events. These predictions are intended for <strong>informational and planning purposes only</strong> and should 
              not be used as the sole basis for financial decisions. Always consult with a qualified financial advisor for comprehensive 
              financial planning and investment advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Predict;