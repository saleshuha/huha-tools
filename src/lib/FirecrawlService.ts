import FirecrawlApp from '@mendable/firecrawl-js';

interface ErrorResponse {
  success: false;
  error: string;
}

interface ScrapeResponse {
  success: true;
  data?: any;
  [key: string]: any;
}

export class FirecrawlService {
  private static API_KEY_STORAGE_KEY = 'firecrawl_api_key';
  private static firecrawlApp: FirecrawlApp | null = null;

  static saveApiKey(apiKey: string): void {
    localStorage.setItem(this.API_KEY_STORAGE_KEY, apiKey);
    this.firecrawlApp = new FirecrawlApp({ apiKey });
    console.log('API key saved successfully');
  }

  static getApiKey(): string | null {
    return localStorage.getItem(this.API_KEY_STORAGE_KEY);
  }

  static async testApiKey(apiKey: string): Promise<boolean> {
    try {
      console.log('Testing API key with Firecrawl API');
      this.firecrawlApp = new FirecrawlApp({ apiKey });
      // A simple test scrape to verify the API key
      const testResponse = await this.firecrawlApp.scrapeUrl('https://example.com');
      return testResponse.success;
    } catch (error) {
      console.error('Error testing API key:', error);
      return false;
    }
  }

  static async scrapeProduct(url: string): Promise<{ success: boolean; error?: string; data?: any }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { success: false, error: 'API key not found' };
    }

    try {
      console.log('Making scrape request to Firecrawl API');
      if (!this.firecrawlApp) {
        this.firecrawlApp = new FirecrawlApp({ apiKey });
      }

      const scrapeResponse = await this.firecrawlApp.scrapeUrl(url, {
        formats: ['markdown', 'html'],
        includeTags: ['title', 'meta', 'h1', 'h2', 'h3', 'price', 'img'],
        excludeTags: ['script', 'style', 'nav', 'footer']
      }) as any;

      console.log('Full Firecrawl response:', scrapeResponse);

      // Check if the response indicates success
      if (!scrapeResponse || !scrapeResponse.success) {
        const errorMsg = scrapeResponse?.error || 'Unknown error occurred';
        console.error('Scrape failed:', errorMsg);
        return { 
          success: false, 
          error: errorMsg
        };
      }

      // Handle the actual response structure from Firecrawl
      const responseData = scrapeResponse.data || scrapeResponse;
      
      // Check if we have meaningful data
      if (!responseData || (responseData._type === "undefined" && responseData.value === "undefined")) {
        console.error('Invalid response data:', responseData);
        return { 
          success: false, 
          error: 'No valid content could be extracted from this URL. The page might be protected or have unusual structure.' 
        };
      }

      console.log('Scrape successful with data:', responseData);
      return { 
        success: true,
        data: responseData 
      };
    } catch (error) {
      console.error('Error during scrape:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to connect to Firecrawl API' 
      };
    }
  }
}