import React from 'react';
import { Brain } from 'lucide-react';

const AiSuggestions: React.FC = () => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: '40px 20px'
    }}>
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.05);
            }
          }
        `}
      </style>

      {/* Header Section */}
      <div style={{
        textAlign: 'center',
        marginBottom: '60px',
        animation: 'fadeInUp 0.6s ease-out'
      }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '16px',
          letterSpacing: '-2px'
        }}>
          🤖 AI Suggestions
        </h1>
        <p style={{
          fontSize: '20px',
          color: '#6b7280',
          maxWidth: '600px',
          margin: '0 auto',
          lineHeight: '1.6'
        }}>
          Intelligent financial insights and personalized recommendations powered by AI
        </p>
      </div>

      {/* Coming Soon Card */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '50px'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '60px 40px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          textAlign: 'center',
          maxWidth: '600px',
          width: '100%',
          animation: 'pulse 2s ease-in-out infinite'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 30px auto'
          }}>
            <Brain style={{ width: '40px', height: '40px', color: 'white' }} />
          </div>
          
          <h2 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '16px'
          }}>
            AI Suggestions Coming Soon!
          </h2>
          
          <p style={{
            fontSize: '18px',
            color: '#6b7280',
            marginBottom: '30px',
            lineHeight: '1.6'
          }}>
            We're working on building intelligent AI-powered features that will analyze your financial data and provide personalized suggestions to help you achieve your financial goals.
          </p>
          
          <div style={{
            display: 'inline-block',
            background: 'rgba(102, 126, 234, 0.1)',
            border: '1px solid rgba(102, 126, 234, 0.3)',
            color: '#667eea',
            padding: '12px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            🚀 Feature in Development
          </div>
        </div>
      </div>

      {/* Preview Features Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {[
          {
            title: 'Smart Spending Insights',
            description: 'AI will analyze your spending patterns and suggest areas for optimization',
            icon: '📊',
            color: '#10b981'
          },
          {
            title: 'Budget Recommendations',
            description: 'Personalized budget suggestions based on your income and spending habits',
            icon: '💰',
            color: '#3b82f6'
          },
          {
            title: 'Investment Opportunities',
            description: 'AI-powered investment suggestions tailored to your financial goals',
            icon: '📈',
            color: '#8b5cf6'
          },
          {
            title: 'Goal Achievement Plans',
            description: 'Smart strategies to help you reach your financial goals faster',
            icon: '🎯',
            color: '#f59e0b'
          },
          {
            title: 'Expense Optimization',
            description: 'Identify recurring expenses that can be reduced or eliminated',
            icon: '✂️',
            color: '#ef4444'
          },
          {
            title: 'Financial Health Score',
            description: 'Get an AI-calculated score of your overall financial wellness',
            icon: '❤️',
            color: '#06b6d4'
          }
        ].map((feature, index) => (
          <div
            key={feature.title}
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              padding: '30px',
              borderRadius: '20px',
              boxShadow: '0 15px 35px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              transition: 'all 0.3s ease',
              animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 25px 50px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.1)';
            }}
          >
            <div style={{
              background: feature.color,
              color: 'white',
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              marginBottom: '20px'
            }}>
              {feature.icon}
            </div>
            
            <h3 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#1f2937',
              marginBottom: '12px'
            }}>
              {feature.title}
            </h3>
            
            <p style={{
              fontSize: '16px',
              color: '#6b7280',
              lineHeight: '1.6',
              margin: '0'
            }}>
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AiSuggestions;