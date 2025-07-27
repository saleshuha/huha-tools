import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InventoryItem {
  id: string;
  identifier: string;
  table_name: string;
  date_added: string;
  date_sold: string | null;
  last_restock_date: string | null;
  quantity: number;
  restock_quantity: number | null;
  status: string;
}

interface ForecastResult {
  item_id: string;
  identifier: string;
  current_stock: number;
  predicted_days_until_stockout: number;
  recommended_reorder_point: number;
  seasonal_trend: string;
  confidence_score: number;
  insights: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { country, itemType = 'all', analysisDepth = 'standard' } = await req.json();

    console.log('Starting AI forecast analysis for:', { country, itemType, analysisDepth });

    // Fetch inventory data
    const [asinData, skuData] = await Promise.all([
      supabase
        .from('asin_inventory')
        .select('*')
        .eq('country', country)
        .order('date_added', { ascending: false })
        .limit(200),
      supabase
        .from('sku_inventory')
        .select('*')
        .eq('country', country)
        .order('date_added', { ascending: false })
        .limit(200)
    ]);

    if (asinData.error) throw asinData.error;
    if (skuData.error) throw skuData.error;

    // Prepare inventory data for analysis
    const inventoryItems: InventoryItem[] = [
      ...(asinData.data || []).map(item => ({
        id: item.id,
        identifier: `${item.asin} (${item.serial_number})`,
        table_name: 'asin_inventory',
        date_added: item.date_added,
        date_sold: item.date_sold,
        last_restock_date: item.last_restock_date,
        quantity: item.quantity,
        restock_quantity: item.restock_quantity,
        status: item.status
      })),
      ...(skuData.data || []).map(item => ({
        id: item.id,
        identifier: `${item.sku_number} (${item.bin_serial_number})`,
        table_name: 'sku_inventory',
        date_added: item.date_added,
        date_sold: item.date_sold,
        last_restock_date: item.last_restock_date,
        quantity: item.quantity,
        restock_quantity: item.restock_quantity,
        status: item.status
      }))
    ];

    // Filter by item type if specified
    const filteredItems = itemType === 'all' ? inventoryItems : 
      inventoryItems.filter(item => 
        itemType === 'asin' ? item.table_name === 'asin_inventory' : item.table_name === 'sku_inventory'
      );

    console.log(`Analyzing ${filteredItems.length} inventory items`);

    // Prepare data summary for AI analysis (limit to reduce token usage)
    const dataForAnalysis = filteredItems.map(item => {
      const daysInStock = item.date_added ? 
        Math.floor((Date.now() - new Date(item.date_added).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      
      const daysSinceSold = item.date_sold ? 
        Math.floor((Date.now() - new Date(item.date_sold).getTime()) / (1000 * 60 * 60 * 24)) : null;
      
      const daysSinceRestock = item.last_restock_date ? 
        Math.floor((Date.now() - new Date(item.last_restock_date).getTime()) / (1000 * 60 * 60 * 24)) : null;

      return {
        identifier: item.identifier,
        type: item.table_name === 'asin_inventory' ? 'ASIN' : 'SKU',
        current_stock: item.quantity,
        status: item.status,
        days_in_inventory: daysInStock,
        days_since_sold: daysSinceSold,
        days_since_restock: daysSinceRestock,
        restock_quantity: item.restock_quantity || 0
      };
    }).slice(0, 25); // Limit to 25 items to reduce API costs and avoid rate limits

    console.log(`Prepared ${dataForAnalysis.length} items for AI analysis`);

    // Generate fallback analysis first
    const fallbackAnalysis = generateFallbackAnalysis(dataForAnalysis, country);

    let aiAnalysis = null;
    
    // Try AI analysis with retry logic
    try {
      aiAnalysis = await callOpenAIWithRetry(dataForAnalysis, country, itemType, analysisDepth, openaiApiKey);
      console.log('AI analysis completed successfully');
    } catch (error) {
      console.log('AI analysis failed, using fallback:', error.message);
      // Continue with fallback analysis
    }

    // Use AI analysis if available, otherwise use fallback
    const forecastData = aiAnalysis || fallbackAnalysis;

    console.log('Forecast analysis completed');

    return new Response(JSON.stringify({
      success: true,
      country,
      analysis_timestamp: new Date().toISOString(),
      forecasts: forecastData.forecasts || [],
      overall_insights: forecastData.overall_insights || {},
      items_analyzed: dataForAnalysis.length,
      ai_powered: !!aiAnalysis
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI forecast function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Retry logic for OpenAI API calls
async function callOpenAIWithRetry(dataForAnalysis: any[], country: string, itemType: string, analysisDepth: string, apiKey: string, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`OpenAI API attempt ${attempt}/${maxRetries}`);
      
      const prompt = `
You are an AI inventory management expert. Analyze the following inventory data and provide forecasting insights.

Country: ${country}
Analysis Type: ${itemType}
Items: ${dataForAnalysis.length}

Sample Data (${Math.min(dataForAnalysis.length, 10)} items):
${JSON.stringify(dataForAnalysis.slice(0, 10), null, 2)}

Provide concise analysis in this JSON format:
{
  "forecasts": [
    {
      "identifier": "item_identifier",
      "current_stock": number,
      "predicted_days_until_stockout": number,
      "recommended_reorder_point": number,
      "seasonal_trend": "increasing|decreasing|stable",
      "confidence_score": number (60-95),
      "insights": ["brief insight"],
      "risk_level": "low|medium|high|critical"
    }
  ],
  "overall_insights": {
    "total_items_analyzed": ${dataForAnalysis.length},
    "high_risk_items": number,
    "avg_turnover_rate": number,
    "recommendations": ["brief rec1", "brief rec2"]
  }
}

Keep insights brief and actionable. Focus on practical recommendations.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini-2025-04-14', // Use mini model to reduce costs and rate limits
          messages: [
            {
              role: 'system',
              content: 'You are an expert inventory analyst. Respond only with valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1500, // Reduced token limit
        }),
      });

      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Rate limited, waiting ${waitTime}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} - ${await response.text()}`);
      }

      const aiResponse = await response.json();
      const parsedData = JSON.parse(aiResponse.choices[0].message.content);
      console.log('OpenAI analysis successful');
      return parsedData;

    } catch (error) {
      console.log(`Attempt ${attempt} failed:`, error.message);
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry
      const waitTime = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

// Fallback analysis when AI is unavailable
function generateFallbackAnalysis(dataForAnalysis: any[], country: string) {
  console.log('Generating fallback analysis');
  
  const forecasts = dataForAnalysis.map(item => {
    // Simple rule-based analysis
    let riskLevel = 'low';
    let predictedDays = 30;
    let reorderPoint = 5;
    
    if (item.current_stock === 0) {
      riskLevel = 'critical';
      predictedDays = 0;
    } else if (item.current_stock <= 2) {
      riskLevel = 'high';
      predictedDays = 3;
    } else if (item.current_stock <= 5) {
      riskLevel = 'medium';
      predictedDays = 7;
    }
    
    // Estimate based on days since sold
    if (item.days_since_sold && item.days_since_sold < 7) {
      predictedDays = Math.max(predictedDays, item.current_stock * 3);
    }
    
    reorderPoint = Math.max(3, Math.floor(item.current_stock * 0.3));
    
    const insights = [];
    if (item.current_stock === 0) insights.push('Immediate restocking required');
    if (item.days_since_sold && item.days_since_sold < 3) insights.push('Fast-moving item');
    if (!item.days_since_sold) insights.push('No recent sales activity');
    
    return {
      identifier: item.identifier,
      current_stock: item.current_stock,
      predicted_days_until_stockout: predictedDays,
      recommended_reorder_point: reorderPoint,
      seasonal_trend: 'stable',
      confidence_score: 70,
      insights: insights.length > 0 ? insights : ['Standard monitoring recommended'],
      risk_level: riskLevel
    };
  });
  
  const highRiskCount = forecasts.filter(f => ['high', 'critical'].includes(f.risk_level)).length;
  
  return {
    forecasts,
    overall_insights: {
      total_items_analyzed: dataForAnalysis.length,
      high_risk_items: highRiskCount,
      avg_turnover_rate: 15,
      recommendations: [
        `Monitor ${highRiskCount} high-risk items closely`,
        'Consider bulk ordering for critical items',
        'Review sales patterns for optimization'
      ]
    }
  };

}