import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { country, topN = 20 } = await req.json();
    
    if (!country) {
      return new Response(
        JSON.stringify({ error: 'Country parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: topItems, error: fetchError } = await supabase
      .from('amazon_returns_data')
      .select('*')
      .eq('country', country)
      .eq('user_id', user.id)
      .order('priority_score', { ascending: false })
      .limit(topN);

    if (fetchError) {
      console.error('Error fetching returns data:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch returns data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!topItems || topItems.length === 0) {
      return new Response(
        JSON.stringify({
          overall_insights: 'No returns data available for analysis.',
          high_priority_items: [],
          patterns_detected: [],
          cost_impact: { total_returned_value: 0, estimated_loss: 0 },
          generated_at: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const totalReturned = topItems.reduce((sum, item) => sum + item.returned_units, 0);
    const totalShipped = topItems.reduce((sum, item) => sum + item.shipped_units, 0);
    const avgReturnRatio = topItems.reduce((sum, item) => sum + (item.return_ratio || 0), 0) / topItems.length;
    const highConfidenceIssues = topItems.filter(item => 
      item.return_ratio > 50 && item.confidence_score > 70
    ).length;

    const dataSummary = `
Amazon Returns Analysis for ${country}:
- Total items analyzed: ${topItems.length}
- Total units returned: ${totalReturned}
- Total units shipped: ${totalShipped}
- Average return ratio: ${avgReturnRatio.toFixed(2)}%
- High-confidence issues (>50% return, >70% confidence): ${highConfidenceIssues}

Top ${Math.min(10, topItems.length)} problematic items:
${topItems.slice(0, 10).map((item, idx) => 
  `${idx + 1}. ASIN: ${item.asin}
     Title: ${item.product_title || 'N/A'}
     Return Ratio: ${item.return_ratio?.toFixed(2)}%
     Shipped: ${item.shipped_units}, Returned: ${item.returned_units}
     Confidence Score: ${item.confidence_score?.toFixed(1)}
     Priority Score: ${item.priority_score?.toFixed(1)}`
).join('\n\n')}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert e-commerce analyst specializing in Amazon returns analysis. Analyze return patterns and provide actionable insights. Focus on:
1. Pattern Recognition: Identify common characteristics in high-return products
2. Root Cause Analysis: Determine likely reasons for returns
3. Actionable Recommendations: Provide specific steps to reduce returns
4. Urgency Classification: Mark items as critical/high/medium based on impact

Respond in JSON format with this structure:
{
  "overall_insights": "Executive summary (2-3 sentences)",
  "high_priority_items": [
    {
      "asin": "ASIN code",
      "reason": "Likely reason for high returns",
      "recommendation": "Specific action to take",
      "urgency": "critical|high|medium"
    }
  ],
  "patterns_detected": ["Pattern 1", "Pattern 2", ...],
  "estimated_avg_cost_per_return": 15
}`
          },
          {
            role: 'user',
            content: dataSummary
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    let aiInsights;
    try {
      const content = aiData.choices[0].message.content;
      // Strip markdown code fences if present
      const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      aiInsights = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw content:', aiData.choices[0].message.content);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const enrichedItems = (aiInsights.high_priority_items || []).map((aiItem: any) => {
      const actualItem = topItems.find(item => item.asin === aiItem.asin);
      return {
        ...aiItem,
        product_title: actualItem?.product_title,
        return_ratio: actualItem?.return_ratio,
        shipped_units: actualItem?.shipped_units,
        returned_units: actualItem?.returned_units,
        confidence_score: actualItem?.confidence_score,
        priority_score: actualItem?.priority_score
      };
    });

    const estimatedCostPerReturn = aiInsights.estimated_avg_cost_per_return || 15;
    const totalReturnedValue = totalReturned * estimatedCostPerReturn;
    const estimatedLoss = totalReturnedValue * 0.7;

    const finalInsights = {
      overall_insights: aiInsights.overall_insights,
      high_priority_items: enrichedItems,
      patterns_detected: aiInsights.patterns_detected || [],
      cost_impact: {
        total_returned_value: Math.round(totalReturnedValue),
        estimated_loss: Math.round(estimatedLoss)
      },
      generated_at: new Date().toISOString()
    };

    console.log('AI analysis completed successfully');
    return new Response(
      JSON.stringify(finalInsights),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-amazon-returns:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
