import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query) {
      return NextResponse.json(
        { error: 'No search query provided' },
        { status: 400 }
      );
    }

    // Use Google Custom Search API or similar
    const searchResults = await performWebSearch(query);
    
    return NextResponse.json({
      success: true,
      query: query,
      results: searchResults
    });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}

async function performWebSearch(query: string) {
  try {
    // Option 1: Use SerpAPI (recommended for production)
    const serpApiKey = process.env.SERP_API_KEY;
    if (serpApiKey) {
      const response = await fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query + ' medicine pharmaceutical')}&api_key=${serpApiKey}`);
      const data = await response.json();
      
      return {
        source: 'serpapi',
        results: data.organic_results?.slice(0, 5) || [],
        total: data.search_information?.total_results || 0
      };
    }

    // Option 2: Use Google Custom Search API
    const googleApiKey = process.env.GOOGLE_API_KEY;
    const googleCseId = process.env.GOOGLE_CSE_ID;
    
    if (googleApiKey && googleCseId) {
      const response = await fetch(`https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCseId}&q=${encodeURIComponent(query + ' medicine pharmaceutical')}`);
      const data = await response.json();
      
      return {
        source: 'google_custom_search',
        results: data.items?.slice(0, 5) || [],
        total: data.searchInformation?.totalResults || 0
      };
    }

    // Fallback: Return mock data for development
    return {
      source: 'mock',
      results: [
        {
          title: `${query} - Medicine Information`,
          snippet: `Information about ${query} medicine, including dosage, side effects, and usage instructions.`,
          link: `https://example.com/${query.replace(/\s+/g, '-').toLowerCase()}`
        }
      ],
      total: 1
    };

  } catch (error) {
    console.error('Web search error:', error);
    return {
      source: 'error',
      results: [],
      total: 0,
      error: error.message
    };
  }
}
