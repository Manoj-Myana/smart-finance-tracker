# Smart Finance Tracker

A modern React.js application for tracking personal finances, built with TypeScript and a beautiful UI.

## 🚀 Features

### ✅ Currently Implemented
- **Modern Home Page** with 6 feature sections
- **Responsive Navigation** with Login/Signup buttons
- **User Authentication Pages** (Login & Signup)
- **Redux State Management** for financial data
- **TypeScript Support** for type safety
- **Responsive Design** that works on all devices

### 🔮 Planned Features
- Transaction management (Add, Edit, Delete)
- Analytics and charts with Chart.js
- Budget tracking and alerts
- Financial goal setting and progress tracking
- PDF/Excel data extraction
- AI-powered financial suggestions
- Spending analysis and insights

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript
- **State Management**: Redux Toolkit
- **Styling**: Custom CSS utilities (Tailwind-like)
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Charts**: Chart.js + React-ChartJS-2 (ready to use)
- **HTTP Client**: Axios (for future API integration)

## 📁 Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── Card.tsx
│   ├── Layout.tsx
│   ├── Navbar.tsx
│   └── HomeNavbar.tsx
├── pages/             # Page components
│   ├── Home.tsx       # Landing page with 6 sections
│   ├── Login.tsx      # User login form
│   ├── Signup.tsx     # User registration form
│   └── Dashboard.tsx  # Main app dashboard
├── store/             # Redux store and slices
│   ├── slices/
│   │   ├── transactionSlice.ts
│   │   ├── categorySlice.ts
│   │   ├── budgetSlice.ts
│   │   └── goalSlice.ts
│   └── index.ts
├── types/             # TypeScript type definitions
│   └── index.ts       # Financial data interfaces
├── utils/             # Helper functions
│   └── helpers.ts     # Currency, date formatting utils
└── hooks/             # Custom React hooks (future)
```

## 🏠 Home Page Sections

1. **Money Tracking** - Keep track of every transaction
2. **PDF/Excel Import** - Automatically extract financial data
3. **Goal Setting** - Set and achieve financial goals
4. **Savings Prediction** - AI-powered future savings forecasts
5. **AI Suggestions** - Personalized financial advice
6. **Money Analysis** - Comprehensive spending analytics

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/smart-finance-tracker.git
   cd smart-finance-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## 📸 Screenshots

### Home Page
- Modern landing page with alternating image/text sections
- Responsive navigation with Login/Signup buttons
- Beautiful gradient placeholder images
- Professional color scheme and typography

### Authentication
- Clean login and signup forms
- Form validation and error handling
- Social login integration ready

## 🔧 Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run eject` - Ejects from Create React App (one-way operation)

## 🎨 Design Features

- **Responsive Layout** - Works perfectly on desktop, tablet, and mobile
- **Modern UI** - Clean, professional design with smooth animations
- **Custom CSS Utilities** - Tailwind-like utility classes for consistent styling
- **Gradient Images** - Beautiful placeholder images with relevant icons
- **Interactive Elements** - Hover effects, transitions, and animations

## 🚧 Development Roadmap

### Phase 1: Core Features ✅
- [x] Home page implementation
- [x] Authentication UI
- [x] Redux store setup
- [x] Routing and navigation

### Phase 2: Transaction Management
- [ ] Add transaction forms
- [ ] Transaction list and filtering
- [ ] Category management
- [ ] Import/export functionality

### Phase 3: Analytics & Insights
- [ ] Charts and visualizations
- [ ] Spending analysis
- [ ] Budget tracking
- [ ] Goal progress tracking

### Phase 4: Advanced Features
- [ ] PDF/Excel data extraction
- [ ] AI-powered suggestions
- [ ] Predictive analytics
- [ ] Mobile app companion

## 🤝 Contributing

This project follows modern React development practices:
- Functional components with hooks
- TypeScript for type safety
- Redux Toolkit for state management
- Component composition patterns
- Responsive design principles

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Create React App for the initial project setup
- Redux Toolkit for simplified state management
- Lucide React for beautiful icons
- React Router for seamless navigation

---

**Smart Finance Tracker** - Take control of your financial future! 💰📈

*Built with ❤️ using React and TypeScript*