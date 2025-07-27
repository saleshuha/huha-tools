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

    // Prepare data summary for AI analysis
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
    }).slice(0, 50); // Limit to 50 items for API efficiency

    // Call OpenAI for intelligent analysis
    const prompt = `
You are an AI inventory management expert. Analyze the following inventory data and provide forecasting insights.

Country: ${country}
Analysis Type: ${itemType}
Analysis Depth: ${analysisDepth}

Inventory Data:
${JSON.stringify(dataForAnalysis, null, 2)}

For each item, analyze:
1. Stock depletion patterns based on sale history
2. Seasonal trends and demand patterns
3. Optimal reorder points
4. Risk assessment for stockouts
5. Recommended actions

Provide your analysis in the following JSON format:
{
  "forecasts": [
    {
      "identifier": "item_identifier",
      "current_stock": number,
      "predicted_days_until_stockout": number,
      "recommended_reorder_point": number,
      "seasonal_trend": "increasing|decreasing|stable|seasonal",
      "confidence_score": number (0-100),
      "insights": ["insight1", "insight2", "insight3"],
      "risk_level": "low|medium|high|critical"
    }
  ],
  "overall_insights": {
    "total_items_analyzed": number,
    "high_risk_items": number,
    "avg_turnover_rate": number,
    "seasonal_patterns": ["pattern1", "pattern2"],
    "recommendations": ["rec1", "rec2", "rec3"]
  }
}

Focus on practical, actionable insights. Consider factors like:
- Items with 0 stock that sold recently need immediate attention
- Items with high stock but no recent sales may be overstocked
- Seasonal patterns based on sale timing
- Restock patterns and effectiveness
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are an expert inventory management AI that provides accurate, data-driven forecasting insights. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('AI Response received');

    let forecastData;
    try {
      forecastData = JSON.parse(aiResponse.choices[0].message.content);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Fallback analysis if AI response can't be parsed
      forecastData = {
        forecasts: dataForAnalysis.slice(0, 10).map(item => ({
          identifier: item.identifier,
          current_stock: item.current_stock,
          predicted_days_until_stockout: item.current_stock === 0 ? 0 : Math.max(7, item.days_since_sold || 30),
          recommended_reorder_point: Math.max(5, Math.floor(item.restock_quantity * 0.3)),
          seasonal_trend: 'stable',
          confidence_score: 65,
          insights: ['Basic analysis due to AI parsing error'],
          risk_level: item.current_stock === 0 ? 'critical' : item.current_stock < 5 ? 'high' : 'low'
        })),
        overall_insights: {
          total_items_analyzed: dataForAnalysis.length,
          high_risk_items: dataForAnalysis.filter(item => item.current_stock < 5).length,
          avg_turnover_rate: 15,
          seasonal_patterns: ['Stable demand pattern'],
          recommendations: ['Monitor low stock items', 'Review reorder points', 'Analyze sales patterns']
        }
      };
    }

    console.log('Forecast analysis completed');

    return new Response(JSON.stringify({
      success: true,
      country,
      analysis_timestamp: new Date().toISOString(),
      forecasts: forecastData.forecasts || [],
      overall_insights: forecastData.overall_insights || {},
      items_analyzed: dataForAnalysis.length
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