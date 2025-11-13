import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Send, Bot, User, Sparkles, TrendingUp, PieChart, Target, Zap, History, Plus } from 'lucide-react';
import { generateChatbotResponse, fetchUserTransactions } from '../services/chatbotService';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'suggestion';
}

interface ChatSession {
  id: string;
  name: string;
  messages: Message[];
  timestamp: Date;
}

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

type ViewMode = 'new' | 'history';

const Chatbot: React.FC = () => {
  const [user, setUser] = useState<UserType | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('new');
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Welcome to your Smart Finance Assistant! 🚀 I'm here to help you master your finances with AI-powered insights. I have access to your transaction history and can provide personalized advice. What would you like to explore today?",
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationContext, setConversationContext] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get user data and fetch transactions
    const userData = localStorage.getItem('userData');
    const token = localStorage.getItem('authToken');

    if (!userData || !token) {
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // Fetch user's transactions for chatbot analysis
      fetchUserTransactions(parsedUser.id).then(userTransactions => {
        setTransactions(userTransactions);
        console.log('💰 Loaded transactions for chatbot:', userTransactions.length);
        
        // Update welcome message with transaction count
        if (userTransactions.length > 0) {
          setMessages(prev => [
            {
              ...prev[0],
              text: `Welcome back, ${parsedUser.fullName}! 🚀 I'm your Smart Finance Assistant with AI-powered insights. I've analyzed your ${userTransactions.length} recent transactions and I'm ready to help you optimize your finances. What would you like to explore today?`
            }
          ]);
        } else {
          setMessages(prev => [
            {
              ...prev[0],
              text: `Welcome, ${parsedUser.fullName}! 🚀 I'm your Smart Finance Assistant. I notice you don't have any transactions yet. Once you add some transactions, I'll be able to provide personalized financial insights and advice. In the meantime, feel free to ask me general financial questions!`
            }
          ]);
        }
      }).catch(error => {
        console.error('Error fetching transactions:', error);
        setMessages(prev => [
          {
            ...prev[0],
            text: `Welcome, ${parsedUser.fullName}! 🚀 I'm your Smart Finance Assistant. I'm having trouble accessing your transaction data right now, but I can still help with general financial advice and guidance. What would you like to know?`
          }
        ]);
      });
    } catch (error) {
      console.error('Error loading user data:', error);
      navigate('/login');
    }
  }, [navigate]);

  // Load chat sessions from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem('chatSessions');
    if (savedSessions) {
      try {
        const parsed: ChatSession[] = JSON.parse(savedSessions).map((session: any) => ({
          ...session,
          timestamp: new Date(session.timestamp),
          messages: session.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setChatSessions(parsed);
      } catch (error) {
        console.error('Error loading chat sessions:', error);
      }
    }
  }, []);

  // Scroll to bottom of chat (internal scroll, not page scroll)
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isTyping]);

  const quickQuestions = [
    "How much did I spend this month?",
    "What are my spending patterns?",
    "Can you analyze my transactions?",
    "Give me some saving tips",
    "What's my biggest expense category?",
    "Help me create a budget plan"
  ];

  const handleQuickQuestion = (question: string) => {
    handleSendMessage(question);
  };

  const saveChatSession = (sessionMessages: Message[]) => {
    if (sessionMessages.length > 1) {
      const sessionId = currentSessionId || Date.now().toString();
      const firstUserMessage = sessionMessages.find(m => m.sender === 'user');
      const sessionName = firstUserMessage ? firstUserMessage.text.slice(0, 30) + '...' : 'New Chat';
      
      const session: ChatSession = {
        id: sessionId,
        name: sessionName,
        messages: sessionMessages,
        timestamp: new Date()
      };
      
      setChatSessions(prev => {
        const updated = prev.filter(s => s.id !== sessionId);
        updated.unshift(session);
        const final = updated.slice(0, 20); // Keep only last 20 sessions
        localStorage.setItem('chatSessions', JSON.stringify(final));
        return final;
      });
      
      if (!currentSessionId) {
        setCurrentSessionId(sessionId);
      }
    }
  };

  const handleSendMessage = async (customMessage?: string) => {
    const messageText = customMessage || inputMessage;
    if (messageText.trim() === '' || !user) return;

    const newMessage: Message = {
      id: messages.length + 1,
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Add to conversation context
      const newContext = [...conversationContext, `User: ${messageText}`];
      
      console.log('🤖 Sending message to chatbot service...');
      const response = await generateChatbotResponse({
        message: messageText,
        user: user,
        transactions: transactions,
        context: newContext.slice(-10) // Keep last 10 context items
      });

      console.log('📨 Received response:', response);

      const botResponse: Message = {
        id: messages.length + 2,
        text: response.response,
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      
      const finalMessages = [...updatedMessages, botResponse];
      setMessages(finalMessages);
      
      // Update conversation context
      setConversationContext([
        ...newContext,
        `Assistant: ${response.response}`
      ].slice(-10)); // Keep last 10 context items
      
      // Save session
      saveChatSession(finalMessages);
      
    } catch (error) {
      console.error('💥 Error getting chatbot response:', error);
      
      const errorResponse: Message = {
        id: messages.length + 2,
        text: "I apologize, but I'm having trouble processing your request right now. This could be due to a temporary issue with my AI system. Please try again in a moment, or ask a different question. I'm here to help with your financial analysis and advice!",
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      
      const finalMessages = [...updatedMessages, errorResponse];
      setMessages(finalMessages);
      saveChatSession(finalMessages);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSendMessage();
    }
  };

  const startNewChat = () => {
    setMessages([
      {
        id: 1,
        text: user ? `Welcome back, ${user.fullName}! 🚀 I'm your Smart Finance Assistant. What would you like to explore today?` : "Welcome to your Smart Finance Assistant! 🚀 I'm here to help you master your finances. What would you like to explore today?",
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      }
    ]);
    setCurrentSessionId(null);
    setConversationContext([]);
    setViewMode('new');
  };

  const loadChatSession = (session: ChatSession) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setViewMode('new');
  };

  // History View Component
  const HistoryView = () => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '24px',
      boxShadow: '0 32px 64px rgba(0, 0, 0, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      padding: '2rem',
      margin: '2rem auto',
      maxWidth: '1000px'
    }}>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: '1.5rem',
        textAlign: 'center'
      }}>Chat History</h2>
      
      {/* New Chat Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '1.5rem'
      }}>
        <button
          onClick={startNewChat}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.95rem',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
          }}
        >
          <Plus style={{ width: '1rem', height: '1rem' }} />
          Start New Chat
        </button>
      </div>
      
      {chatSessions.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          color: '#64748b'
        }}>
          <History style={{ width: '3rem', height: '3rem', margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <p>No chat history yet. Start a new conversation to see it here!</p>
          <button
            onClick={startNewChat}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Start New Chat
          </button>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          maxHeight: '60vh',
          overflowY: 'auto'
        }}>
          {chatSessions.map((session) => (
            <div
              key={session.id}
              onClick={() => loadChatSession(session)}
              style={{
                padding: '1rem',
                background: 'rgba(248, 250, 252, 0.8)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: '1px solid rgba(0, 0, 0, 0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(248, 250, 252, 0.8)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#334155',
                    margin: 0,
                    marginBottom: '0.25rem'
                  }}>
                    {session.name}
                  </h3>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#64748b',
                    margin: 0
                  }}>
                    {session.messages.length} messages • {session.timestamp.toLocaleDateString()}
                  </p>
                </div>
                <MessageCircle style={{ width: '1.25rem', height: '1.25rem', color: '#667eea' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      position: 'fixed',
      top: 0,
      left: 0,
      background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 25%, #e8f5e8 75%, #f3e5f5 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      paddingTop: '80px'
    }}>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: viewMode === 'history' ? '0' : '2rem 1rem',
        paddingTop: '1rem'
      }}>
        {viewMode === 'history' ? (
          <HistoryView />
        ) : (
          <>
            {/* Hero Header */}
            <div style={{
              maxWidth: '1200px',
              margin: '0 auto',
              textAlign: 'center',
              marginBottom: '3rem'
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                padding: '1rem 2rem',
                marginBottom: '2rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
              }}>
                <MessageCircle style={{ width: '2rem', height: '2rem', color: '#667eea', marginRight: '0.75rem' }} />
                <h1 style={{
                  fontSize: '2.5rem',
                  fontWeight: '700',
                  margin: 0,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>AI Finance Assistant</h1>
                <Sparkles style={{ width: '1.5rem', height: '1.5rem', color: '#fbbf24', marginLeft: '0.75rem' }} />
              </div>
              
              <p style={{
                fontSize: '1.25rem',
                color: '#64748b',
                maxWidth: '600px',
                margin: '0 auto',
                lineHeight: '1.8'
              }}>
                Get personalized financial insights and smart recommendations powered by advanced AI
              </p>
            </div>

            {/* Chat Mode Toggle Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              <button
                onClick={startNewChat}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  background: viewMode === 'new' 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'rgba(255, 255, 255, 0.8)',
                  color: viewMode === 'new' ? 'white' : '#64748b',
                  boxShadow: viewMode === 'new' ? '0 4px 12px rgba(102, 126, 234, 0.3)' : 'none'
                }}
              >
                <Plus style={{ width: '1rem', height: '1rem' }} />
                New Chat
              </button>
              <button
                onClick={() => setViewMode('history')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  background: (viewMode as ViewMode) === 'history' 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'rgba(255, 255, 255, 0.8)',
                  color: (viewMode as ViewMode) === 'history' ? 'white' : '#64748b',
                  boxShadow: (viewMode as ViewMode) === 'history' ? '0 4px 12px rgba(102, 126, 234, 0.3)' : 'none'
                }}
              >
                <History style={{ width: '1rem', height: '1rem' }} />
                Chat History ({chatSessions.length})
              </button>
            </div>

            {/* Quick Question Pills */}
            <div style={{
              maxWidth: '1200px',
              margin: '0 auto 3rem auto',
              textAlign: 'center'
            }}>
              <h3 style={{
                fontSize: '1.1rem',
                color: '#475569',
                marginBottom: '1.5rem',
                fontWeight: '600'
              }}>💡 Quick Questions</h3>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.75rem',
                justifyContent: 'center'
              }}>
                {quickQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickQuestion(question)}
                    style={{
                      padding: '0.75rem 1.25rem',
                      background: 'rgba(255, 255, 255, 0.9)',
                      border: '1px solid rgba(102, 126, 234, 0.2)',
                      borderRadius: '25px',
                      color: '#667eea',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontWeight: '500',
                      fontSize: '0.9rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#667eea';
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                      e.currentTarget.style.color = '#667eea';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Container */}
            <div style={{
              maxWidth: '900px',
              margin: '0 auto'
            }}>
              {/* Chat Messages */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                borderRadius: '24px',
                padding: '2rem',
                marginBottom: '6rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                minHeight: '400px',
                maxHeight: '600px',
                overflow: 'auto',
                position: 'relative'
              }}>
                {messages.map((message) => (
                  <div key={message.id} style={{
                    display: 'flex',
                    justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                    marginBottom: '1.5rem',
                    alignItems: 'flex-start'
                  }}>
                    {message.sender === 'bot' && (
                      <div style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '50%',
                        padding: '0.5rem',
                        marginRight: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '2.5rem',
                        height: '2.5rem'
                      }}>
                        <Bot style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} />
                      </div>
                    )}
                    
                    <div style={{
                      maxWidth: '80%',
                      padding: '1rem 1.25rem',
                      borderRadius: message.sender === 'user' ? '20px 20px 8px 20px' : '20px 20px 20px 8px',
                      background: message.sender === 'user' 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                        : 'rgba(248, 250, 252, 0.8)',
                      color: message.sender === 'user' ? 'white' : '#334155',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      border: message.sender === 'bot' ? '1px solid rgba(0, 0, 0, 0.05)' : 'none'
                    }}>
                      <p style={{
                        margin: 0,
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {message.text}
                      </p>
                      <div style={{
                        fontSize: '0.75rem',
                        opacity: 0.8,
                        marginTop: '0.5rem'
                      }}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>

                    {message.sender === 'user' && (
                      <div style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        borderRadius: '50%',
                        padding: '0.5rem',
                        marginLeft: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '2.5rem',
                        height: '2.5rem'
                      }}>
                        <User style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} />
                      </div>
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '50%',
                      padding: '0.5rem',
                      marginRight: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '2.5rem',
                      height: '2.5rem'
                    }}>
                      <Bot style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} />
                    </div>
                    
                    <div style={{
                      padding: '1rem 1.25rem',
                      borderRadius: '20px 20px 20px 8px',
                      background: 'rgba(248, 250, 252, 0.8)',
                      border: '1px solid rgba(0, 0, 0, 0.05)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#667eea',
                          animation: 'pulse 1.5s ease-in-out infinite'
                        }}></div>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#667eea',
                          animation: 'pulse 1.5s ease-in-out infinite 0.1s'
                        }}></div>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#667eea',
                          animation: 'pulse 1.5s ease-in-out infinite 0.2s'
                        }}></div>
                        <span style={{ marginLeft: '0.5rem', color: '#667eea', fontSize: '0.875rem' }}>
                          AI is thinking...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Fixed Input Area - Only show in new chat mode */}
      {viewMode === 'new' && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '1.5rem 2rem',
          background: 'white',
          borderTop: '1px solid rgba(0, 0, 0, 0.05)',
          zIndex: 1000
        }}>
          <div style={{
            maxWidth: '900px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{ flex: '1', position: 'relative' }}>
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your finances..."
                style={{
                  width: '100%',
                  resize: 'none',
                  border: '2px solid #e5e7eb',
                  borderRadius: '16px',
                  padding: '1rem 1.25rem',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit',
                  background: '#f9fafb'
                }}
                rows={1}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.background = 'white';
                  e.target.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.background = '#f9fafb';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isTyping}
              style={{
                background: inputMessage.trim() && !isTyping 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : '#e5e7eb',
                color: inputMessage.trim() && !isTyping ? 'white' : '#9ca3af',
                border: 'none',
                borderRadius: '16px',
                padding: '1rem',
                cursor: inputMessage.trim() && !isTyping ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '3.5rem',
                height: '3.5rem'
              }}
              onMouseEnter={(e) => {
                if (inputMessage.trim() && !isTyping) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(102, 126, 234, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Send style={{ width: '1.25rem', height: '1.25rem' }} />
            </button>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 70%, 100% {
            opacity: 0.4;
            transform: scale(0.8);
          }
          35% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default Chatbot;