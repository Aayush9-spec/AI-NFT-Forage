import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { prompt, imageUrl } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Generating metadata for prompt:', prompt);

    // Generate metadata using OpenAI's chat completion
    const metadataResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        max_completion_tokens: 500,
        messages: [
          {
            role: 'system',
            content: `You are an expert NFT metadata generator. Create compelling NFT metadata based on the user's prompt. Return ONLY a valid JSON object with the following structure:
{
  "name": "Creative NFT Title (max 50 chars)",
  "description": "Detailed description (max 200 chars)",
  "attributes": [
    {"trait_type": "Style", "value": "..."},
    {"trait_type": "Color Palette", "value": "..."},
    {"trait_type": "Mood", "value": "..."},
    {"trait_type": "Rarity", "value": "Common|Rare|Epic|Legendary"},
    {"trait_type": "Theme", "value": "..."}
  ]
}

Make it creative and engaging for NFT collectors. The name should be catchy and the description should be detailed but concise.`
          },
          {
            role: 'user',
            content: `Generate NFT metadata for this prompt: "${prompt}"`
          }
        ],
      }),
    });

    if (!metadataResponse.ok) {
      const errorData = await metadataResponse.json();
      console.error('OpenAI metadata generation error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to generate metadata');
    }

    const metadataResult = await metadataResponse.json();
    console.log('Metadata generation successful');

    let metadata;
    try {
      metadata = JSON.parse(metadataResult.choices[0].message.content);
    } catch (parseError) {
      console.error('Failed to parse metadata JSON:', parseError);
      // Fallback metadata
      metadata = {
        name: `AI Generated Art`,
        description: `Created with AI from the prompt: ${prompt}`,
        attributes: [
          { trait_type: "Style", value: "AI Generated" },
          { trait_type: "Rarity", value: "Common" },
          { trait_type: "Theme", value: "Digital Art" }
        ]
      };
    }

    // Generate AI price suggestion
    const priceResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        max_completion_tokens: 200,
        messages: [
          {
            role: 'system',
            content: `You are an NFT pricing expert. Analyze the metadata and suggest pricing in MATIC for Polygon network. Return ONLY a JSON object:
{
  "min": 0.01,
  "mid": 0.05,
  "max": 0.1,
  "currency": "MATIC"
}
Base prices on rarity, style, and theme. Common: 0.01-0.05, Rare: 0.05-0.2, Epic: 0.2-0.5, Legendary: 0.5-2.0`
          },
          {
            role: 'user',
            content: `Price this NFT: ${JSON.stringify(metadata)}`
          }
        ],
      }),
    });

    let priceSuggestion = {
      min: 0.01,
      mid: 0.05,
      max: 0.1,
      currency: 'MATIC'
    };

    if (priceResponse.ok) {
      try {
        const priceResult = await priceResponse.json();
        priceSuggestion = JSON.parse(priceResult.choices[0].message.content);
      } catch (error) {
        console.log('Using fallback pricing');
      }
    }

    return new Response(
      JSON.stringify({ 
        ...metadata,
        price_suggestion: priceSuggestion
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generate-ai-metadata function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate metadata',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});