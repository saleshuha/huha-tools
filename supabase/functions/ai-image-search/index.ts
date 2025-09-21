import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { imageUrl, userId } = await req.json();
    
    if (!imageUrl || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing imageUrl or userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing image:', imageUrl);

    // Analyze image with OpenAI Vision
    const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this product image and provide detailed information. Focus on: brand name, product type, model/name, key features, colors, materials, and any identifying text or numbers visible. Be very specific and detailed to help match this with product listings.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 500
      }),
    });

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('OpenAI Vision API error:', errorText);
      throw new Error(`Vision API error: ${errorText}`);
    }

    const visionResult = await visionResponse.json();
    const description = visionResult.choices[0].message.content;

    console.log('Image analysis result:', description);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's product images and inventory
    const { data: productImages, error: imagesError } = await supabase
      .from('product_images')
      .select('*')
      .eq('user_id', userId);

    if (imagesError) {
      console.error('Error fetching product images:', imagesError);
      throw new Error('Failed to fetch product images');
    }

    const { data: inventory, error: inventoryError } = await supabase
      .from('asin_inventory')
      .select('*')
      .eq('user_id', userId);

    if (inventoryError) {
      console.error('Error fetching inventory:', inventoryError);
      throw new Error('Failed to fetch inventory');
    }

    console.log(`Found ${productImages?.length || 0} product images and ${inventory?.length || 0} inventory items`);

    // Find matches using text similarity
    const matches = [];

    // Match against inventory titles and ASINs
    if (inventory) {
      for (const item of inventory) {
        let similarity = 0;
        
        // Check if description contains ASIN
        if (item.asin && description.toLowerCase().includes(item.asin.toLowerCase())) {
          similarity += 0.9;
        }
        
        // Check if description contains SKU
        if (item.sku && description.toLowerCase().includes(item.sku.toLowerCase())) {
          similarity += 0.8;
        }
        
        // Check title similarity using keywords
        if (item.title) {
          const titleWords = item.title.toLowerCase().split(/\s+/).filter(word => word.length > 2);
          const descWords = description.toLowerCase().split(/\s+/);
          
          let matchingWords = 0;
          for (const titleWord of titleWords) {
            if (descWords.some(descWord => descWord.includes(titleWord) || titleWord.includes(descWord))) {
              matchingWords++;
            }
          }
          
          if (titleWords.length > 0) {
            similarity += (matchingWords / titleWords.length) * 0.7;
          }
        }
        
        if (similarity > 0.2) { // Threshold for matches
          const productImage = productImages?.find(img => img.asin === item.asin);
          matches.push({
            type: 'inventory',
            item: {
              id: item.id,
              asin: item.asin,
              sku: item.sku,
              title: item.title,
              quantity: item.quantity,
              status: item.status,
              imageUrl: productImage?.image_url
            },
            similarity: Math.min(similarity, 1.0),
            reasons: [
              ...(item.asin && description.toLowerCase().includes(item.asin.toLowerCase()) ? ['ASIN match'] : []),
              ...(item.sku && description.toLowerCase().includes(item.sku.toLowerCase()) ? ['SKU match'] : []),
              ...(similarity > 0.5 ? ['Strong title similarity'] : similarity > 0.3 ? ['Good title similarity'] : ['Partial title similarity'])
            ]
          });
        }
      }
    }

    // Sort matches by similarity
    matches.sort((a, b) => b.similarity - a.similarity);
    
    // Limit to top 10 matches
    const topMatches = matches.slice(0, 10);

    console.log(`Found ${topMatches.length} matches`);

    return new Response(
      JSON.stringify({
        description,
        matches: topMatches,
        totalMatches: matches.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in ai-image-search function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});