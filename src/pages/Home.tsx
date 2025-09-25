import React from 'react';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section - Section 1: Image left, Text right */}
      <section className="py-20 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-1">
            <img 
              src="/api/placeholder/600/400" 
              alt="Money tracking illustration"
              className="w-full h-auto rounded-lg shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                minHeight: '300px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '18px',
                fontWeight: 'bold'
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                target.innerHTML = '💰 Money Tracking';
              }}
            />
          </div>
          <div className="order-2">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Keep Track of your{' '}
              <span className="text-blue-600">MONEY</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Take control of your financial future with our intelligent money tracking system. 
              Monitor every penny and make informed decisions.
            </p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg text-lg transition-colors">
              Get Started Free
            </button>
          </div>
        </div>
      </section>

      {/* Section 2: Text left, Image right */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Automatically Extract data from{' '}
                <span className="text-green-600">PDF/Excel</span>
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Stop manual data entry forever. Our AI-powered system automatically reads 
                and extracts financial data from your PDFs, Excel files, and bank statements.
              </p>
              <ul className="text-gray-600 space-y-3">
                <li className="flex items-center">
                  <span className="text-green-600 mr-3">✓</span>
                  Bank statements processing
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-3">✓</span>
                  Invoice and receipt scanning
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-3">✓</span>
                  Excel file integration
                </li>
              </ul>
            </div>
            <div className="order-1 lg:order-2">
              <img 
                src="/api/placeholder/600/400" 
                alt="PDF Excel extraction illustration"
                className="w-full h-auto rounded-lg shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
                  minHeight: '300px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.innerHTML = '📊 PDF/Excel Processing';
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Image left, Text right */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-1">
              <img 
                src="/api/placeholder/600/400" 
                alt="Goal setting illustration"
                className="w-full h-auto rounded-lg shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
                  minHeight: '300px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.innerHTML = '🎯 Goal Setting';
                }}
              />
            </div>
            <div className="order-2">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Set and Reach your{' '}
                <span className="text-purple-600">GOAL</span>
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Define your financial goals and let us help you achieve them. From vacation 
                savings to retirement planning, we'll track your progress every step of the way.
              </p>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-purple-600 rounded-full mr-4"></div>
                  <span className="text-gray-700">Smart goal recommendations</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-purple-600 rounded-full mr-4"></div>
                  <span className="text-gray-700">Progress tracking and milestones</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-purple-600 rounded-full mr-4"></div>
                  <span className="text-gray-700">Achievement notifications</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Text left, Image right */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Predict your future{' '}
                <span className="text-blue-600">savings</span>
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Our advanced algorithms analyze your spending patterns and income trends 
                to predict your future financial position with remarkable accuracy.
              </p>
              <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Predicted savings in 6 months</span>
                  <span className="text-2xl font-bold text-green-600">$12,450</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{width: '75%'}}></div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <img 
                src="/api/placeholder/600/400" 
                alt="Future savings prediction illustration"
                className="w-full h-auto rounded-lg shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                  minHeight: '300px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.innerHTML = '📈 Future Predictions';
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Image left, Text right */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-1">
              <img 
                src="/api/placeholder/600/400" 
                alt="AI suggestions illustration"
                className="w-full h-auto rounded-lg shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
                  minHeight: '300px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.innerHTML = '🤖 AI Suggestions';
                }}
              />
            </div>
            <div className="order-2">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Get suggestions from{' '}
                <span className="text-pink-600">AI</span>
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Receive personalized financial advice powered by artificial intelligence. 
                Our AI learns from your habits and suggests ways to optimize your spending and increase savings.
              </p>
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-6 rounded-lg mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">💡 Today's AI Suggestion:</h4>
                <p className="text-gray-700">
                  "Based on your spending pattern, you could save $340 this month by reducing 
                  dining out expenses by 30% and switching to a cheaper phone plan."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Text left, Image right */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Analyze your{' '}
                <span className="text-indigo-600">MONEY</span>
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Dive deep into your financial data with comprehensive analytics. 
                Understand where your money goes and identify opportunities for improvement.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                  <div className="text-2xl font-bold text-indigo-600">15+</div>
                  <div className="text-gray-600 text-sm">Chart Types</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                  <div className="text-2xl font-bold text-green-600">24/7</div>
                  <div className="text-gray-600 text-sm">Real-time Updates</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                  <div className="text-2xl font-bold text-purple-600">12mo</div>
                  <div className="text-gray-600 text-sm">Trend Analysis</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                  <div className="text-2xl font-bold text-orange-600">100%</div>
                  <div className="text-gray-600 text-sm">Secure & Private</div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <img 
                src="/api/placeholder/600/400" 
                alt="Money analysis illustration"
                className="w-full h-auto rounded-lg shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  minHeight: '300px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.innerHTML = '📊 Money Analysis';
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Transform Your Financial Future?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of users who have already taken control of their finances
          </p>
          <div className="space-y-4 md:space-y-0 md:space-x-4 md:flex md:justify-center">
            <button className="bg-white text-blue-600 font-semibold py-4 px-8 rounded-lg text-lg hover:bg-gray-100 transition-colors w-full md:w-auto">
              Start Free Trial
            </button>
            <button className="border-2 border-white text-white font-semibold py-4 px-8 rounded-lg text-lg hover:bg-white hover:text-blue-600 transition-colors w-full md:w-auto">
              Watch Demo
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;