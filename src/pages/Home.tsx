import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Hero Section - Section 1: Image left, Text right */}
      <section className="py-20 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-1">
            <div 
              className="w-full h-80 rounded-2xl shadow-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}
            >
              <div className="text-center text-white p-8">
                <div className="text-6xl mb-4">💰</div>
                <div className="text-2xl font-bold mb-2">Money Tracking</div>
                <div className="text-lg opacity-90">Smart Financial Management</div>
                <div className="absolute inset-0 bg-black opacity-10 rounded-2xl"></div>
              </div>
            </div>
          </div>
          <div className="order-2">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Keep Track of your{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">MONEY</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Take control of your financial future with our intelligent money tracking system. 
              Monitor every penny and make informed decisions with cutting-edge technology.
            </p>
            <Link 
              to="/signup"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all transform hover:scale-105 shadow-lg inline-block no-underline"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      {/* Section 2: Text left, Image right */}
      <section className="py-20 px-4 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Automatically Extract data from{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">PDF/Excel</span>
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Stop manual data entry forever. Our AI-powered system automatically reads 
                and extracts financial data from your PDFs, Excel files, and bank statements with 99% accuracy.
              </p>
              <ul className="text-gray-600 space-y-3">
                <li className="flex items-center">
                  <span className="text-green-600 mr-3 text-xl">✓</span>
                  <span>Bank statements processing</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-3 text-xl">✓</span>
                  <span>Invoice and receipt scanning</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-3 text-xl">✓</span>
                  <span>Excel file integration</span>
                </li>
              </ul>
            </div>
            <div className="order-1 lg:order-2">
              <div 
                className="w-full h-80 rounded-2xl shadow-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                <div className="text-center text-white p-8">
                  <div className="text-6xl mb-4">📊</div>
                  <div className="text-2xl font-bold mb-2">PDF/Excel Processing</div>
                  <div className="text-lg opacity-90">Automated Data Extraction</div>
                  <div className="absolute inset-0 bg-black opacity-10 rounded-2xl"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Image left, Text right */}
      <section className="py-20 px-4 bg-gradient-to-l from-purple-50 via-pink-50 to-rose-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-1">
              <div 
                className="w-full h-80 rounded-2xl shadow-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                <div className="text-center text-white p-8">
                  <div className="text-6xl mb-4">🎯</div>
                  <div className="text-2xl font-bold mb-2">Goal Achievement</div>
                  <div className="text-lg opacity-90">Smart Target Setting</div>
                  <div className="absolute inset-0 bg-black opacity-10 rounded-2xl"></div>
                </div>
              </div>
            </div>
            <div className="order-2">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Set and Reach your{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">GOALS</span>
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Define your financial goals and let us help you achieve them with precision. From vacation 
                savings to retirement planning, we'll track your progress and celebrate every milestone.
              </p>
              <div className="space-y-4">
                <div className="flex items-center bg-white p-4 rounded-lg shadow-sm">
                  <div className="w-4 h-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mr-4"></div>
                  <span className="text-gray-700">Smart goal recommendations</span>
                </div>
                <div className="flex items-center bg-white p-4 rounded-lg shadow-sm">
                  <div className="w-4 h-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mr-4"></div>
                  <span className="text-gray-700">Progress tracking and milestones</span>
                </div>
                <div className="flex items-center bg-white p-4 rounded-lg shadow-sm">
                  <div className="w-4 h-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mr-4"></div>
                  <span className="text-gray-700">Achievement notifications</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Text left, Image right */}
      <section className="py-20 px-4 bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Predict your future{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-yellow-600">savings</span>
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Our advanced machine learning algorithms analyze your spending patterns and income trends 
                to predict your future financial position with remarkable 95% accuracy.
              </p>
              <div className="bg-white p-6 rounded-2xl shadow-lg mb-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600 font-medium">Predicted savings in 6 months</span>
                  <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">₹12,45,000</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div className="bg-gradient-to-r from-orange-500 to-yellow-500 h-3 rounded-full shadow-sm" style={{width: '75%'}}></div>
                </div>
                <div className="text-sm text-gray-500">75% of your savings goal achieved</div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div 
                className="w-full h-80 rounded-2xl shadow-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                <div className="text-center text-white p-8">
                  <div className="text-6xl mb-4">📈</div>
                  <div className="text-2xl font-bold mb-2">Future Predictions</div>
                  <div className="text-lg opacity-90">AI-Powered Forecasting</div>
                  <div className="absolute inset-0 bg-black opacity-10 rounded-2xl"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Image left, Text right */}
      <section className="py-20 px-4 bg-gradient-to-r from-cyan-50 via-sky-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-1">
              <div 
                className="w-full h-80 rounded-2xl shadow-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                <div className="text-center text-white p-8">
                  <div className="text-6xl mb-4">🤖</div>
                  <div className="text-2xl font-bold mb-2">AI Assistant</div>
                  <div className="text-lg opacity-90">Personal Finance Advisor</div>
                  <div className="absolute inset-0 bg-black opacity-10 rounded-2xl"></div>
                </div>
              </div>
            </div>
            <div className="order-2">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Get suggestions from{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">AI</span>
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Receive personalized financial advice powered by advanced artificial intelligence. 
                Our AI learns from your habits and suggests actionable ways to optimize spending and maximize savings.
              </p>
              <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 p-6 rounded-2xl mb-6 shadow-lg">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">💡</div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Today's AI Suggestion:</h4>
                    <p className="text-gray-700">
                      "Based on your spending pattern, you could save <span className="font-bold text-green-600">₹8,500</span> this month by reducing 
                      dining out expenses by 30% and switching to our recommended phone plan."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Text left, Image right */}
      <section className="py-20 px-4 bg-gradient-to-l from-violet-50 via-purple-50 to-fuchsia-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Analyze your{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-600">MONEY</span>
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Dive deep into your financial data with comprehensive analytics and insights. 
                Understand spending patterns, identify trends, and discover opportunities for financial growth.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-lg text-center border border-violet-100">
                  <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-600">15+</div>
                  <div className="text-gray-600 text-sm font-medium">Chart Types</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-lg text-center border border-green-100">
                  <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">24/7</div>
                  <div className="text-gray-600 text-sm font-medium">Real-time Updates</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-lg text-center border border-blue-100">
                  <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">12mo</div>
                  <div className="text-gray-600 text-sm font-medium">Trend Analysis</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-lg text-center border border-orange-100">
                  <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">100%</div>
                  <div className="text-gray-600 text-sm font-medium">Secure & Private</div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div 
                className="w-full h-80 rounded-2xl shadow-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                <div className="text-center text-white p-8">
                  <div className="text-6xl mb-4">📊</div>
                  <div className="text-2xl font-bold mb-2">Advanced Analytics</div>
                  <div className="text-lg opacity-90">Deep Money Insights</div>
                  <div className="absolute inset-0 bg-black opacity-10 rounded-2xl"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="max-w-4xl mx-auto text-center text-white relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Financial Future?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join over <span className="font-bold">50,000+</span> users who have already taken control of their finances with our smart platform
          </p>
          <div className="space-y-4 md:space-y-0 md:space-x-6 md:flex md:justify-center">
            <Link 
              to="/signup"
              className="bg-white text-purple-600 font-semibold py-4 px-8 rounded-xl text-lg hover:bg-gray-100 transition-all transform hover:scale-105 w-full md:w-auto shadow-2xl inline-block no-underline text-center"
            >
              Start Free Trial
            </Link>
            <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all transform hover:scale-105 w-full md:w-auto shadow-lg">
              Watch Demo
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;