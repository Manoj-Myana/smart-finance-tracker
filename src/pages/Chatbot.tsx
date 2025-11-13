import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Bot, User, Sparkles, TrendingUp, PieChart, Target, Zap } from 'lucide-react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'suggestion';
}

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Welcome to your Smart Finance Assistant! 🚀 I'm here to help you master your finances with AI-powered insights. What would you like to explore today?",
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickQuestions = [
    "How can I create a budget?",
    "What are my spending trends?",
    "Help me set financial goals",
    "How to save money effectively?"
  ];

  const handleQuickQuestion = (question: string) => {
    setInputMessage(question);
    handleSendMessage(question);
  };

  const handleSendMessage = (customMessage?: string) => {
    const messageText = customMessage || inputMessage;
    if (messageText.trim() === '') return;

    const newMessage: Message = {
      id: messages.length + 1,
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate bot response with more realistic delay
    setTimeout(() => {
      const botResponses = [
        "Great question! Based on your financial data, I recommend starting with tracking your monthly expenses. Would you like me to help you analyze your spending patterns?",
        "I can help you with that! Let's break down your financial goals into manageable steps. First, let's understand your current financial situation better.",
        "Excellent! Financial planning is key to success. I can provide personalized insights based on your transaction history and spending habits.",
        "That's a smart approach! I can guide you through creating a budget that aligns with your income and financial objectives."
      ];
      
      const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)];
      
      const botResponse: Message = {
        id: messages.length + 2,
        text: randomResponse,
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 25%, #e8f5e8 75%, #f3e5f5 100%)',
      padding: '2rem 1rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
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
          padding: '1rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '20px',
          marginBottom: '1.5rem',
          boxShadow: '0 20px 40px rgba(102, 126, 234, 0.3)'
        }}>
          <Sparkles style={{ width: '2.5rem', height: '2.5rem', color: 'white', marginRight: '0.5rem' }} />
          <MessageCircle style={{ width: '2.5rem', height: '2.5rem', color: 'white' }} />
        </div>
        
        <h1 style={{
          fontSize: '3.5rem',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '1rem',
          lineHeight: '1.2'
        }}>
          AI Finance Assistant
        </h1>
        
        <p style={{
          fontSize: '1.25rem',
          color: '#64748b',
          maxWidth: '600px',
          margin: '0 auto',
          lineHeight: '1.6'
        }}>
          Get personalized financial advice, budget insights, and smart money management tips powered by advanced AI
        </p>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Main Chat Container */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          boxShadow: '0 32px 64px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          overflow: 'hidden',
          marginBottom: '2rem'
        }}>
          {/* Chat Header */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '1.5rem',
            color: 'white'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '3rem',
                  height: '3rem',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '1rem'
                }}>
                  <Bot style={{ width: '1.5rem', height: '1.5rem' }} />
                </div>
                <div>
                  <h3 style={{ margin: '0', fontSize: '1.25rem', fontWeight: '600' }}>Financial Assistant</h3>
                  <p style={{ margin: '0', fontSize: '0.875rem', opacity: '0.9' }}>Online • Ready to help</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  background: '#10b981',
                  borderRadius: '50%',
                  marginRight: '0.5rem'
                }}></div>
                <span style={{ fontSize: '0.875rem' }}>AI Powered</span>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div style={{
            height: '500px',
            overflowY: 'auto',
            padding: '2rem',
            background: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)'
          }}>
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  marginBottom: '1.5rem',
                  flexDirection: message.sender === 'user' ? 'row-reverse' : 'row'
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: message.sender === 'user' 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  margin: message.sender === 'user' ? '0 0 0 1rem' : '0 1rem 0 0',
                  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)'
                }}>
                  {message.sender === 'user' ? (
                    <User style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} />
                  ) : (
                    <Bot style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} />
                  )}
                </div>

                {/* Message Bubble */}
                <div style={{
                  maxWidth: '70%',
                  padding: '1rem 1.5rem',
                  borderRadius: message.sender === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                  background: message.sender === 'user'
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'white',
                  color: message.sender === 'user' ? 'white' : '#1f2937',
                  boxShadow: message.sender === 'user' 
                    ? '0 12px 24px rgba(102, 126, 234, 0.3)'
                    : '0 8px 16px rgba(0, 0, 0, 0.1)',
                  border: message.sender === 'bot' ? '1px solid rgba(0, 0, 0, 0.05)' : 'none'
                }}>
                  <p style={{ 
                    margin: '0 0 0.5rem 0', 
                    fontSize: '1rem', 
                    lineHeight: '1.5',
                    fontWeight: message.sender === 'user' ? '500' : '400'
                  }}>
                    {message.text}
                  </p>
                  <span style={{
                    fontSize: '0.75rem',
                    opacity: message.sender === 'user' ? '0.8' : '0.6',
                    color: message.sender === 'user' ? 'rgba(255, 255, 255, 0.8)' : '#6b7280'
                  }}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  marginRight: '1rem'
                }}>
                  <Bot style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} />
                </div>
                <div style={{
                  background: 'white',
                  padding: '1rem 1.5rem',
                  borderRadius: '20px 20px 20px 4px',
                  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      background: '#9ca3af',
                      borderRadius: '50%',
                      marginRight: '4px',
                      animation: 'pulse 1.4s infinite'
                    }}></div>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      background: '#9ca3af',
                      borderRadius: '50%',
                      marginRight: '4px',
                      animation: 'pulse 1.4s infinite 0.2s'
                    }}></div>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      background: '#9ca3af',
                      borderRadius: '50%',
                      animation: 'pulse 1.4s infinite 0.4s'
                    }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {messages.length === 1 && (
            <div style={{
              padding: '0 2rem 1rem 2rem',
              background: 'linear-gradient(to bottom, #f1f5f9, #e2e8f0)'
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: '#64748b',
                marginBottom: '1rem',
                fontWeight: '500'
              }}>
                Quick questions to get started:
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.5rem'
              }}>
                {quickQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickQuestion(question)}
                    style={{
                      background: 'white',
                      border: '1px solid rgba(102, 126, 234, 0.2)',
                      borderRadius: '12px',
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: '#374151',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 16px rgba(102, 126, 234, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.color = '#374151';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div style={{
            padding: '1.5rem 2rem',
            background: 'white',
            borderTop: '1px solid rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
        </div>

        {/* Feature Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginTop: '2rem'
        }}>
          {[
            {
              icon: TrendingUp,
              title: 'Smart Analytics',
              description: 'Get AI-powered insights about your spending patterns and financial trends',
              gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
            },
            {
              icon: PieChart,
              title: 'Budget Planning',
              description: 'Create personalized budgets with intelligent recommendations',
              gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
            },
            {
              icon: Target,
              title: 'Goal Tracking',
              description: 'Set and achieve financial goals with AI-guided planning',
              gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
            },
            {
              icon: Zap,
              title: 'Quick Actions',
              description: 'Instant answers to common financial questions and calculations',
              gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
            }
          ].map((feature, index) => (
            <div
              key={index}
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px)',
                borderRadius: '20px',
                padding: '2rem',
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 16px 32px rgba(0, 0, 0, 0.1)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 24px 48px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 16px 32px rgba(0, 0, 0, 0.1)';
              }}
            >
              <div style={{
                width: '4rem',
                height: '4rem',
                background: feature.gradient,
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem auto',
                boxShadow: '0 12px 24px rgba(0, 0, 0, 0.2)'
              }}>
                <feature.icon style={{ width: '2rem', height: '2rem', color: 'white' }} />
              </div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#1f2937',
                marginBottom: '1rem'
              }}>
                {feature.title}
              </h3>
              <p style={{
                color: '#6b7280',
                fontSize: '0.975rem',
                lineHeight: '1.6',
                margin: '0'
              }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Add keyframe animations */}
      <style>
        {`
          @keyframes pulse {
            0%, 70%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            35% {
              transform: scale(1.2);
              opacity: 0.5;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Chatbot;