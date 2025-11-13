import { GoogleGenerativeAI } from '@google/generative-ai';

// Get API key from environment variables
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';

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

interface UserProfile {
  id: number;
  fullName: string;
  email: string;
  monthlyIncome?: number;
}

interface ChatRequest {
  message: string;
  user: UserProfile;
  transactions: Transaction[];
  context?: string[];
}

interface ChatResponse {
  response: string;
  suggestions?: string[];
  actionItems?: string[];
}

let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

// Initialize Gemini AI
if (API_KEY) {
  genAI = new GoogleGenerativeAI(API_KEY);
}

// Function to list available models (copied from geminiService)
const listAvailableModels = async () => {
  if (!genAI) return [];
  try {
    const models = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`,
      { method: 'GET' }
    );
    const result = await models.json();
    console.log('🔍 Available models:', result);
    
    // Extract and log model names for debugging
    if (result.models && Array.isArray(result.models)) {
      const modelNames = result.models
        .map((model: any) => model.name)
        .filter((name: string) => name && name.includes('gemini'));
      console.log('✅ Available Gemini model names:', modelNames);
    }
    
    return result.models || [];
  } catch (error) {
    console.error('❌ Error listing models:', error);
    return [];
  }
};

// Model fallback list - prioritize fast, quota-friendly models
const FALLBACK_MODEL_NAMES = [
  'gemini-2.5-flash-preview-05-20',  // Working model from logs
  'gemini-2.5-flash',
  'gemini-2.0-flash', 
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-1.5-flash-latest', 
  'gemini-1.5-flash',
  'gemini-1.0-pro',
  'gemini-pro'
];

// Simple response cache to avoid repeated API calls
interface CacheEntry {
  response: ChatResponse;
  timestamp: number;
  transactionHash: string;
}

const responseCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const generateChatbotResponse = async (chatRequest: ChatRequest): Promise<ChatResponse> => {
  console.log('🤖 Generating chatbot response for:', chatRequest.message);
  console.log('📊 Transaction count:', chatRequest.transactions.length);
  
  // Create cache key and transaction hash for caching
  const cacheKey = `${chatRequest.user.id}_${chatRequest.message.toLowerCase().trim()}`;
  const transactionHash = JSON.stringify(chatRequest.transactions.slice(0, 5)).substring(0, 100); // Quick hash
  
  // Check cache first
  const cached = responseCache.get(cacheKey);
  if (cached && 
      Date.now() - cached.timestamp < CACHE_DURATION && 
      cached.transactionHash === transactionHash) {
    console.log('💾 Returning cached response');
    return cached.response;
  }
  
  if (!API_KEY || !genAI) {
    console.warn('⚠️ Gemini API not available, using fallback response');
    return getFallbackResponse(chatRequest.message);
  }

  try {
    // Analyze user's financial data
    const financialAnalysis = analyzeUserFinances(chatRequest.transactions, chatRequest.user);
    
    // Create personalized prompt
    const prompt = createChatPrompt(chatRequest.message, financialAnalysis, chatRequest.user, chatRequest.context);
    
    console.log('📝 Sending prompt to Gemini...');
    
    // Get available models first - prioritize fast models
    const availableModels = await listAvailableModels();
    
    // Extract actual model names from the API response and prioritize fast models
    let modelNamesToTry: string[] = [];
    if (availableModels && Array.isArray(availableModels)) {
      const allModels = availableModels
        .map((model: any) => model.name)
        .filter((name: string) => name && name.includes('gemini'));
      
      // Prioritize flash models for speed and quota efficiency
      const flashModels = allModels.filter(name => name.includes('flash'));
      const otherModels = allModels.filter(name => !name.includes('flash') && !name.includes('pro-preview'));
      
      modelNamesToTry = [...flashModels.slice(0, 3), ...otherModels.slice(0, 2)];
      console.log('🚀 Optimized model priority:', modelNamesToTry);
    }
    
    // Fallback to hardcoded list if no models found
    if (modelNamesToTry.length === 0) {
      modelNamesToTry = FALLBACK_MODEL_NAMES;
      console.log('🔄 Using fallback model names:', modelNamesToTry);
    }
    
    // Try different models if needed
    let response;
    for (const fullModelName of modelNamesToTry) {
      // Extract just the model name (remove 'models/' prefix if present)
      const modelName = fullModelName.startsWith('models/') 
        ? fullModelName.replace('models/', '') 
        : fullModelName;
      
      try {
        console.log(`🔄 Trying model: ${modelName}`);
        const currentModel = genAI.getGenerativeModel({ model: modelName });
        const result = await currentModel.generateContent(prompt);
        response = await result.response;
        const text = response.text();
        console.log(`✅ Success with model: ${modelName}`);
        
        const parsedResponse = parseGeminiResponse(text);
        
        // Cache the successful response
        responseCache.set(cacheKey, {
          response: parsedResponse,
          timestamp: Date.now(),
          transactionHash
        });
        
        return parsedResponse;
      } catch (error: any) {
        console.log(`❌ Model ${modelName} failed:`, error?.message?.substring(0, 200) || error);
        
        // If it's a quota error, skip to next model quickly
        if (error?.message?.includes('429') || error?.message?.includes('quota')) {
          console.log('⚡ Quota limit hit, trying next model...');
          continue;
        }
        
        const currentIndex = modelNamesToTry.indexOf(fullModelName);
        if (currentIndex === modelNamesToTry.length - 1) {
          // This was the last model to try
          throw error;
        }
        continue;
      }
    }
    
    throw new Error('All models failed');
    
  } catch (error) {
    console.error('💥 Error generating chatbot response:', error);
    return getFallbackResponse(chatRequest.message);
  }
};

const analyzeUserFinances = (transactions: Transaction[], user: UserProfile): string => {
  const recentTransactions = getRecentTransactions(transactions, 90); // Last 90 days
  
  if (recentTransactions.length === 0) {
    return 'User has no recent transactions to analyze.';
  }

  const totalIncome = recentTransactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalExpenses = recentTransactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
  
  // Categorize expenses
  const expenseCategories = categorizeTransactions(
    recentTransactions.filter(t => t.type === 'debit')
  );
  
  // Find top spending categories
  const topCategories = Object.entries(expenseCategories)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5);
    
  // Recent high expenses
  const highExpenses = recentTransactions
    .filter(t => t.type === 'debit' && t.amount > 1000)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
    
  // Monthly averages
  const monthlyIncome = totalIncome / 3;
  const monthlyExpenses = totalExpenses / 3;
  
  return `
FINANCIAL PROFILE - ${user.fullName}:
📧 Email: ${user.email}
💰 Analysis Period: Last 90 days (${recentTransactions.length} transactions)

INCOME & EXPENSES:
• Total Income: ₹${totalIncome.toLocaleString()}
• Total Expenses: ₹${totalExpenses.toLocaleString()}
• Net Savings: ₹${netSavings.toLocaleString()}
• Savings Rate: ${savingsRate.toFixed(1)}%
• Avg Monthly Income: ₹${monthlyIncome.toLocaleString()}
• Avg Monthly Expenses: ₹${monthlyExpenses.toLocaleString()}

TOP SPENDING CATEGORIES:
${topCategories.map(([category, data]) => 
  `• ${category}: ₹${data.total.toLocaleString()} (${data.count} transactions)`
).join('\n')}

RECENT HIGH EXPENSES:
${highExpenses.map(t => 
  `• ${t.date}: ${t.description} - ₹${t.amount.toLocaleString()}`
).join('\n')}

SPENDING PATTERNS:
• Regular Expenses: ${recentTransactions.filter(t => t.type === 'debit' && t.frequency === 'regular').length} transactions
• Irregular Expenses: ${recentTransactions.filter(t => t.type === 'debit' && t.frequency === 'irregular').length} transactions
• Average Transaction: ₹${(totalExpenses / recentTransactions.filter(t => t.type === 'debit').length).toFixed(0)}
• Largest Expense: ₹${Math.max(...recentTransactions.filter(t => t.type === 'debit').map(t => t.amount)).toLocaleString()}
`;
};

const createChatPrompt = (
  userMessage: string, 
  financialAnalysis: string, 
  user: UserProfile, 
  context?: string[]
): string => {
  const contextHistory = context && context.length > 0 
    ? `\n\nPREVIOUS CONVERSATION CONTEXT:\n${context.join('\n')}`
    : '';

  return `
You are an expert AI Financial Advisor chatbot for "${user.fullName}". You have access to their real financial data and transaction history.

USER'S FINANCIAL DATA:
${financialAnalysis}

USER'S QUESTION: "${userMessage}"
${contextHistory}

INSTRUCTIONS:
1. Provide personalized, helpful financial advice based on their ACTUAL transaction data
2. Be conversational, friendly, and encouraging
3. Reference specific amounts, categories, and patterns from their data when relevant
4. Give actionable, practical advice
5. If the question is general, still try to relate it to their specific financial situation
6. Keep responses concise but informative (2-4 paragraphs max)
7. Use rupee symbol (₹) for Indian currency
8. Be supportive and positive while being realistic about their financial situation

RESPONSE FORMAT:
Respond in plain text (no JSON, no markdown). Keep it conversational and natural.

If you need to suggest specific actions, format them naturally in the text like:
"I'd recommend: 1) Action one, 2) Action two, 3) Action three"

Remember: You're not just giving generic advice - you're analyzing THEIR specific financial data to help THEM specifically.
`;
};

const parseGeminiResponse = (text: string): ChatResponse => {
  // Clean the response
  const cleanText = text.trim();
  
  // Extract suggestions if present (look for numbered lists or bullet points)
  const suggestions: string[] = [];
  const actionItems: string[] = [];
  
  // Look for patterns like "1)" "2)" or "•" or "-"
  const suggestionMatches = cleanText.match(/(?:\d+\)|[•\-])\s*([^.\n]+)/g);
  if (suggestionMatches) {
    suggestionMatches.forEach(match => {
      const cleanSuggestion = match.replace(/^\d+\)|^[•\-]\s*/, '').trim();
      if (cleanSuggestion.length > 10) { // Only meaningful suggestions
        suggestions.push(cleanSuggestion);
      }
    });
  }
  
  return {
    response: cleanText,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    actionItems: actionItems.length > 0 ? actionItems : undefined
  };
};

const getFallbackResponse = (message: string): ChatResponse => {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('budget') || lowerMessage.includes('spending')) {
    return {
      response: "I'd be happy to help you with budgeting! To give you personalized advice, I'll need to analyze your transaction data. Generally, I recommend following the 50/30/20 rule - 50% for needs, 30% for wants, and 20% for savings. Would you like me to look at your specific spending patterns?",
      suggestions: ['Track your monthly expenses', 'Set spending limits for categories', 'Review subscriptions and recurring payments']
    };
  }
  
  if (lowerMessage.includes('save') || lowerMessage.includes('saving')) {
    return {
      response: "Saving money is a great goal! Based on general principles, I suggest starting with building an emergency fund of 3-6 months of expenses, then focusing on long-term savings and investments. The key is to automate your savings so it happens without thinking about it.",
      suggestions: ['Set up automatic transfers to savings', 'Look for high-yield savings accounts', 'Reduce unnecessary expenses']
    };
  }
  
  if (lowerMessage.includes('invest') || lowerMessage.includes('investment')) {
    return {
      response: "Investment planning depends on your risk tolerance and financial goals. For beginners, I often recommend starting with systematic investment plans (SIPs) in diversified mutual funds. Make sure you have an emergency fund first before investing.",
      suggestions: ['Start with SIP in equity mutual funds', 'Consider ELSS for tax saving', 'Learn about different asset classes']
    };
  }
  
  return {
    response: "I'm here to help with your financial questions! I can analyze your spending patterns, help with budgeting, suggest ways to save money, and provide investment guidance. What specific aspect of your finances would you like to discuss?",
    suggestions: ['Ask about your spending patterns', 'Get budget recommendations', 'Learn about saving strategies', 'Discuss investment options']
  };
};

const getRecentTransactions = (transactions: Transaction[], days: number): Transaction[] => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return transactions.filter(t => new Date(t.date) >= cutoffDate);
};

const categorizeTransactions = (transactions: Transaction[]) => {
  const categories: { [key: string]: { total: number; count: number; } } = {};
  
  transactions.forEach(transaction => {
    const category = categorizeTransaction(transaction.description);
    if (!categories[category]) {
      categories[category] = { total: 0, count: 0 };
    }
    categories[category].total += transaction.amount;
    categories[category].count += 1;
  });
  
  return categories;
};

const categorizeTransaction = (description: string): string => {
  const desc = description.toLowerCase();
  
  // Food & Dining
  if (desc.includes('food') || desc.includes('restaurant') || desc.includes('zomato') || 
      desc.includes('swiggy') || desc.includes('cafe') || desc.includes('pizza') ||
      desc.includes('burger') || desc.includes('dominos') || desc.includes('kfc')) {
    return 'Food & Dining';
  }
  
  // Transportation
  if (desc.includes('uber') || desc.includes('ola') || desc.includes('transport') || 
      desc.includes('metro') || desc.includes('bus') || desc.includes('taxi') ||
      desc.includes('auto') || desc.includes('petrol') || desc.includes('fuel')) {
    return 'Transportation';
  }
  
  // Shopping & E-commerce
  if (desc.includes('shopping') || desc.includes('amazon') || desc.includes('flipkart') || 
      desc.includes('myntra') || desc.includes('ajio') || desc.includes('nykaa') ||
      desc.includes('meesho') || desc.includes('clothing') || desc.includes('shoes')) {
    return 'Shopping';
  }
  
  // Bills & Utilities
  if (desc.includes('electricity') || desc.includes('gas') || desc.includes('water') || 
      desc.includes('rent') || desc.includes('emi') || desc.includes('loan') ||
      desc.includes('mortgage') || desc.includes('internet') || desc.includes('mobile')) {
    return 'Bills & Utilities';
  }
  
  // Healthcare
  if (desc.includes('medical') || desc.includes('doctor') || desc.includes('pharmacy') || 
      desc.includes('hospital') || desc.includes('medicine') || desc.includes('clinic') ||
      desc.includes('health') || desc.includes('dental')) {
    return 'Healthcare';
  }
  
  // Entertainment
  if (desc.includes('movie') || desc.includes('entertainment') || desc.includes('netflix') || 
      desc.includes('spotify') || desc.includes('gaming') || desc.includes('book') ||
      desc.includes('music') || desc.includes('theater') || desc.includes('concert')) {
    return 'Entertainment';
  }
  
  // Groceries
  if (desc.includes('grocery') || desc.includes('supermarket') || desc.includes('market') ||
      desc.includes('vegetables') || desc.includes('fruits') || desc.includes('milk') ||
      desc.includes('bread') || desc.includes('store')) {
    return 'Groceries';
  }
  
  // Education
  if (desc.includes('education') || desc.includes('course') || desc.includes('book') ||
      desc.includes('school') || desc.includes('tuition') || desc.includes('training')) {
    return 'Education';
  }
  
  // Investment & Savings
  if (desc.includes('mutual fund') || desc.includes('sip') || desc.includes('fixed deposit') ||
      desc.includes('investment') || desc.includes('stock') || desc.includes('insurance')) {
    return 'Investment & Savings';
  }
  
  return 'Others';
};

// Fetch user transactions (this would typically come from your transaction service)
export const fetchUserTransactions = async (userId: number): Promise<Transaction[]> => {
  try {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(`http://localhost:5000/api/transactions/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const transactions = await response.json();
      return transactions || [];
    } else {
      console.error('Failed to fetch transactions for chatbot');
      return [];
    }
  } catch (error) {
    console.error('Error fetching transactions for chatbot:', error);
    return [];
  }
};

export default {
  generateChatbotResponse,
  fetchUserTransactions
};