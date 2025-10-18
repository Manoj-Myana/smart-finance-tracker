/**
 * AI Suggestions Service
 * Handles API calls for managing AI suggestions with database storage
 */

export interface ApiSuggestion {
  id: string;
  timestamp: string;
  suggestions: string[];
  transactionCount: number;
  userProfile: {
    name: string;
    monthlyIncome: number;
  };
}

export interface SaveSuggestionRequest {
  user_id: number;
  suggestions: string[];
  transaction_count: number;
  user_profile: {
    name: string;
    monthlyIncome: number;
  };
}

class AiSuggestionsService {
  private baseUrl = 'http://localhost:5000/api';

  private getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  private getAuthHeaders(): HeadersInit {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  /**
   * Get AI suggestions for a user
   */
  async getSuggestions(userId: number, limit: number = 10): Promise<ApiSuggestion[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/ai-suggestions/${userId}?limit=${limit}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        if (response.status === 403) {
          throw new Error('Access denied');
        }
        throw new Error(`Failed to fetch suggestions: ${response.statusText}`);
      }

      const data = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.error('Error fetching AI suggestions:', error);
      throw error;
    }
  }

  /**
   * Save new AI suggestions
   */
  async saveSuggestions(request: SaveSuggestionRequest): Promise<ApiSuggestion> {
    try {
      const response = await fetch(`${this.baseUrl}/ai-suggestions`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        if (response.status === 403) {
          throw new Error('Access denied');
        }
        if (response.status === 400) {
          const error = await response.json();
          throw new Error(error.message || 'Invalid request data');
        }
        throw new Error(`Failed to save suggestions: ${response.statusText}`);
      }

      const data = await response.json();
      return data.suggestion;
    } catch (error) {
      console.error('Error saving AI suggestions:', error);
      throw error;
    }
  }

  /**
   * Delete a specific AI suggestion
   */
  async deleteSuggestion(suggestionId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/ai-suggestions/${suggestionId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        if (response.status === 403) {
          throw new Error('Access denied');
        }
        if (response.status === 404) {
          throw new Error('Suggestion not found');
        }
        throw new Error(`Failed to delete suggestion: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting AI suggestion:', error);
      throw error;
    }
  }

  /**
   * Test authentication
   */
  async testAuth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/test-auth`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      return response.ok;
    } catch (error) {
      console.error('Auth test failed:', error);
      return false;
    }
  }
}

export const aiSuggestionsService = new AiSuggestionsService();