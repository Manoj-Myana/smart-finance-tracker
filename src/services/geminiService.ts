import { GoogleGenerativeAI } from '@google/generative-ai';

// Get API key from environment variables
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';

console.log('Gemini API Key check:', API_KEY ? 'API key found' : 'API key not found');

if (!API_KEY) {
  console.warn('Gemini API key not found. Please add REACT_APP_GEMINI_API_KEY to your .env file');
}

let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

// Function to list available models
const listAvailableModels = async () => {
  if (!genAI) return [];
  try {
    const models = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`,
      { method: 'GET' }
    );
    const result = await models.json();
    console.log('Available models:', result);
    
    // Extract and log model names for debugging
    if (result.models && Array.isArray(result.models)) {
      const modelNames = result.models
        .map((model: any) => model.name)
        .filter((name: string) => name && name.includes('gemini'));
      console.log('Available Gemini model names:', modelNames);
    }
    
    return result.models || [];
  } catch (error) {
    console.error('Error listing models:', error);
    return [];
  }
};

// List of model names to try in order of preference
const MODEL_NAMES = [
  'gemini-1.5-pro-latest',
  'gemini-1.5-flash-latest', 
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.0-pro-latest',
  'gemini-1.0-pro',
  'gemini-pro',
  'text-bison-001'
];

if (API_KEY) {
  genAI = new GoogleGenerativeAI(API_KEY);
  // We'll try different models in the generatePersonalizedSuggestions function
  model = genAI.getGenerativeModel({ model: MODEL_NAMES[0] });
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

interface GeminiSuggestion {
  category: string;
  priority: 'high' | 'medium' | 'low';
  suggestion: string;
  potentialSavings?: string;
  actionItems: string[];
}

export const generatePersonalizedSuggestions = async (
  transactions: Transaction[],
  userProfile: { name: string; monthlyIncome?: number }
): Promise<GeminiSuggestion[]> => {
  console.log('Starting Gemini AI suggestion generation...');
  console.log('API Key available:', !!API_KEY);
  console.log('Total transactions received:', transactions.length);
  
  if (!API_KEY || !model) {
    console.log('No API key or model available, using fallback suggestions');
    return getStaticFallbackSuggestions();
  }

  try {
    // Filter transactions from last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const recentTransactions = transactions.filter(t => 
      new Date(t.date) >= threeMonthsAgo
    );

    console.log('Recent transactions (last 3 months):', recentTransactions.length);
    
    if (recentTransactions.length === 0) {
      console.log('No recent transactions found, using fallback suggestions');
      return getStaticFallbackSuggestions();
    }

    // Prepare transaction analysis data
    const transactionSummary = analyzeTransactions(recentTransactions);
    console.log('Transaction analysis completed');
    
    const prompt = `
    You are a financial advisor analyzing a user's spending patterns from the last 3 months. Based on the real transaction data below, provide personalized financial suggestions.

    User Profile:
    - Name: ${userProfile.name}
    - Monthly Income: ${userProfile.monthlyIncome ? `₹${userProfile.monthlyIncome.toLocaleString()}` : 'Not specified'}

    Transaction Analysis (Last 3 Months):
    ${transactionSummary}

    IMPORTANT: Respond ONLY with a valid JSON array. Do not include any markdown, code blocks, or extra text. Just the JSON array.

    Provide 3-5 personalized financial suggestions in this exact JSON format:
    [
      {
        "category": "Spending Optimization",
        "priority": "high",
        "suggestion": "Based on your actual spending data, I notice you spent ₹X on Y category. Here's how to optimize it...",
        "potentialSavings": "₹X-Y/month",
        "actionItems": ["Specific action 1", "Specific action 2", "Specific action 3"]
      }
    ]

    Categories to use: "Spending Optimization", "Savings Strategy", "Budget Management", "Investment Advice", "Expense Reduction", "Financial Planning"
    Priority levels: "high", "medium", "low"

    Focus on:
    1. Specific spending categories from the user's actual data
    2. Actual amounts and percentages from their transactions
    3. Realistic savings amounts based on their spending
    4. Actionable steps specific to their financial patterns
    5. Areas where they're overspending compared to recommended budgets

    Make every suggestion based on the ACTUAL transaction data provided above.
    `;

    console.log('Sending prompt to Gemini AI...');
    
    // First, get available models from Google's API
    console.log('Checking available models...');
    const availableModels = await listAvailableModels();
    
    // Extract actual model names from the API response
    let modelNamesToTry: string[] = [];
    if (availableModels && Array.isArray(availableModels)) {
      modelNamesToTry = availableModels
        .map((model: any) => model.name)
        .filter((name: string) => name && name.includes('gemini'))
        .slice(0, 5); // Try first 5 Gemini models
      
      console.log('Extracted available Gemini models to try:', modelNamesToTry);
    }
    
    // Fallback to hardcoded list if no models found
    if (modelNamesToTry.length === 0) {
      modelNamesToTry = MODEL_NAMES;
      console.log('Using fallback model names:', modelNamesToTry);
    }
    
    // Try different models if the first one fails
    let result;
    let response;
    let text: string | undefined;
    
    if (!genAI) {
      throw new Error('Google Generative AI not initialized');
    }
    
    for (const fullModelName of modelNamesToTry) {
      // Extract just the model name (remove 'models/' prefix if present)
      const modelName = fullModelName.startsWith('models/') 
        ? fullModelName.replace('models/', '') 
        : fullModelName;
      let currentModelName = modelName; // For use in catch block
      
      try {
        console.log(`Trying model: ${modelName} (from: ${fullModelName})`);
        const currentModel = genAI.getGenerativeModel({ model: modelName });
        result = await currentModel.generateContent(prompt);
        response = await result.response;
        text = response.text();
        console.log(`Successfully used model: ${modelName}`);
        break; // Success, exit the loop
      } catch (error: any) {
        console.log(`Model ${currentModelName} failed:`, error.message);
        const currentIndex = modelNamesToTry.indexOf(fullModelName);
        if (currentIndex === modelNamesToTry.length - 1) {
          // This was the last model to try
          throw error;
        }
        // Continue to next model
        continue;
      }
    }
    
    if (!text) {
      throw new Error('No successful response from any model');
    }
    
    console.log('Raw Gemini response:', text);
    
    // Parse JSON response
    try {
      // Clean the response text
      let cleanText = text.trim();
      
      // Remove markdown code blocks if present
      cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '');
      
      // Extract JSON array
      const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        console.log('Extracted JSON:', jsonMatch[0]);
        const suggestions = JSON.parse(jsonMatch[0]);
        console.log('Parsed suggestions:', suggestions);
        return suggestions;
      } else {
        // Try parsing the entire clean text
        const suggestions = JSON.parse(cleanText);
        console.log('Parsed full response as JSON:', suggestions);
        return suggestions;
      }
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      console.error('Response text was:', text);
    }
    
    // Fallback to static suggestions if parsing fails
    console.log('Falling back to static suggestions due to parsing error');
    return getStaticFallbackSuggestions();
    
  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    return getStaticFallbackSuggestions();
  }
};

const analyzeTransactions = (transactions: Transaction[]): string => {
  const totalSpent = transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalEarned = transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  // Group by spending categories (based on description patterns)
  const categories = groupTransactionsByCategory(transactions.filter(t => t.type === 'debit'));
  
  // Find highest spending categories
  const topCategories = Object.entries(categories)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5);

  // Analyze spending frequency
  const regularExpenses = transactions.filter(t => t.type === 'debit' && t.frequency === 'regular');
  const irregularExpenses = transactions.filter(t => t.type === 'debit' && t.frequency === 'irregular');

  const averageMonthlyExpenses = totalSpent / 3;
  const averageMonthlyIncome = totalEarned / 3;
  
  return `
FINANCIAL OVERVIEW (Last 3 Months):
• Total Income: ₹${totalEarned.toLocaleString()}
• Total Expenses: ₹${totalSpent.toLocaleString()}
• Net Savings: ₹${(totalEarned - totalSpent).toLocaleString()}
• Savings Rate: ${totalEarned > 0 ? ((totalEarned - totalSpent) / totalEarned * 100).toFixed(1) : 0}%
• Average Monthly Income: ₹${averageMonthlyIncome.toLocaleString()}
• Average Monthly Expenses: ₹${averageMonthlyExpenses.toLocaleString()}

TOP SPENDING CATEGORIES:
${topCategories.map(([category, data]) => 
  `• ${category}: ₹${data.total.toLocaleString()} (${data.count} transactions, avg: ₹${(data.total/data.count).toFixed(0)} per transaction)`
).join('\n')}

EXPENSE BREAKDOWN:
• Regular/Recurring Expenses: ₹${regularExpenses.reduce((sum, t) => sum + t.amount, 0).toLocaleString()} (${regularExpenses.length} transactions)
• Irregular/One-time Expenses: ₹${irregularExpenses.reduce((sum, t) => sum + t.amount, 0).toLocaleString()} (${irregularExpenses.length} transactions)

RECENT TRANSACTION SAMPLES (Last 10):
${transactions.slice(0, 10).map(t => 
  `• ${t.date}: ${t.description} - ₹${t.amount.toLocaleString()} (${t.type})`
).join('\n')}

SPENDING PATTERNS:
• Highest single expense: ₹${Math.max(...transactions.filter(t => t.type === 'debit').map(t => t.amount)).toLocaleString()}
• Most frequent expense category: ${topCategories[0] ? topCategories[0][0] : 'N/A'}
• Total number of transactions: ${transactions.length}
  `;
};

const groupTransactionsByCategory = (transactions: Transaction[]) => {
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
  
  if (desc.includes('food') || desc.includes('restaurant') || desc.includes('zomato') || desc.includes('swiggy')) {
    return 'Food & Dining';
  }
  if (desc.includes('uber') || desc.includes('ola') || desc.includes('transport') || desc.includes('metro') || desc.includes('bus')) {
    return 'Transportation';
  }
  if (desc.includes('shopping') || desc.includes('amazon') || desc.includes('flipkart') || desc.includes('myntra')) {
    return 'Shopping';
  }
  if (desc.includes('electricity') || desc.includes('gas') || desc.includes('water') || desc.includes('rent') || desc.includes('emi')) {
    return 'Bills & Utilities';
  }
  if (desc.includes('medical') || desc.includes('doctor') || desc.includes('pharmacy') || desc.includes('hospital')) {
    return 'Healthcare';
  }
  if (desc.includes('movie') || desc.includes('entertainment') || desc.includes('netflix') || desc.includes('spotify')) {
    return 'Entertainment';
  }
  if (desc.includes('grocery') || desc.includes('supermarket') || desc.includes('market')) {
    return 'Groceries';
  }
  return 'Others';
};

const getStaticFallbackSuggestions = (): GeminiSuggestion[] => {
  return [
    {
      category: 'Spending Optimization',
      priority: 'high',
      suggestion: 'Review your subscription services and cancel unused ones to save money monthly.',
      potentialSavings: '₹500-2000/month',
      actionItems: [
        'List all active subscriptions',
        'Cancel unused services',
        'Negotiate better rates for essential services'
      ]
    },
    {
      category: 'Budget Management',
      priority: 'medium',
      suggestion: 'Implement the 50/30/20 rule: 50% for needs, 30% for wants, 20% for savings.',
      actionItems: [
        'Calculate your monthly take-home income',
        'Allocate expenses according to the rule',
        'Track spending weekly'
      ]
    },
    {
      category: 'Savings Strategy',
      priority: 'high',
      suggestion: 'Set up automatic transfers to a separate savings account for emergency fund.',
      potentialSavings: '₹5000-10000/month',
      actionItems: [
        'Open a high-yield savings account',
        'Set up automatic transfers',
        'Build 3-6 months of expenses as emergency fund'
      ]
    }
  ];
};

export default {
  generatePersonalizedSuggestions
};