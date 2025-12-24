export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { age, gender, interests, budget, relationship } = req.body;

  if (!age || !gender || !interests || !budget || !relationship) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Using Hugging Face Inference API (free tier)
    const prompt = `Generate 5 creative Christmas gift recommendations based on these details:
- Age: ${age}
- Gender: ${gender}
- Interests: ${interests}
- Budget: ${budget}
- Relationship: ${relationship}

Return ONLY a JSON array with exactly 5 gift objects. Each object must have: name, description, price, category.
Example format:
[{"name":"Gift Name","description":"Why this gift is perfect","price":"$XX-XX","category":"Category"}]`;

    const response = await fetch(
      'https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // No API key needed for free tier (rate limited)
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 1000,
            temperature: 0.7,
            return_full_text: false
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error('AI service unavailable');
    }

    const data = await response.json();
    let generatedText = data[0]?.generated_text || '';
    
    // Try to extract JSON from the response
    let gifts = [];
    try {
      const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        gifts = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Fallback to curated recommendations
      gifts = getCuratedGifts(age, interests, budget);
    }

    // Ensure we have valid gifts
    if (!Array.isArray(gifts) || gifts.length === 0) {
      gifts = getCuratedGifts(age, interests, budget);
    }

    return res.status(200).json({ gifts: gifts.slice(0, 5) });
  } catch (error) {
    console.error('Error:', error);
    // Fallback to curated recommendations
    const gifts = getCuratedGifts(age, interests, budget);
    return res.status(200).json({ gifts });
  }
}

function getCuratedGifts(age, interests, budget) {
  const interestsLower = interests.toLowerCase();
  const gifts = [];

  // Tech gifts
  if (interestsLower.includes('gaming') || interestsLower.includes('tech')) {
    gifts.push({
      name: 'Wireless Gaming Headset',
      description: 'High-quality audio and comfortable design perfect for long gaming sessions',
      price: getBudgetRange(budget),
      category: 'Technology'
    });
  }

  // Reading gifts
  if (interestsLower.includes('reading') || interestsLower.includes('books')) {
    gifts.push({
      name: 'Kindle E-Reader',
      description: 'Thousands of books at your fingertips with a paperwhite display',
      price: getBudgetRange(budget),
      category: 'Books & Reading'
    });
  }

  // Cooking gifts
  if (interestsLower.includes('cooking') || interestsLower.includes('food')) {
    gifts.push({
      name: 'Premium Chef Knife Set',
      description: 'Professional-grade knives for the passionate home cook',
      price: getBudgetRange(budget),
      category: 'Kitchen & Cooking'
    });
  }

  // Fitness gifts
  if (interestsLower.includes('fitness') || interestsLower.includes('exercise')) {
    gifts.push({
      name: 'Fitness Tracker Watch',
      description: 'Track workouts, heart rate, and daily activity goals',
      price: getBudgetRange(budget),
      category: 'Fitness & Health'
    });
  }

  // Photography gifts
  if (interestsLower.includes('photography') || interestsLower.includes('camera')) {
    gifts.push({
      name: 'Camera Lens Kit',
      description: 'Expand creative possibilities with versatile lens options',
      price: getBudgetRange(budget),
      category: 'Photography'
    });
  }

  // Generic gifts if not enough matches
  while (gifts.length < 5) {
    const generic = [
      { name: 'Cozy Blanket Set', description: 'Ultra-soft and warm for winter nights', category: 'Home & Comfort' },
      { name: 'Artisan Coffee Set', description: 'Premium coffee beans and brewing equipment', category: 'Food & Beverage' },
      { name: 'Personalized Journal', description: 'High-quality leather journal for thoughts and memories', category: 'Stationery' },
      { name: 'Scented Candle Collection', description: 'Luxurious fragrances for home ambiance', category: 'Home Decor' },
      { name: 'Board Game Collection', description: 'Fun games for quality time with loved ones', category: 'Entertainment' }
    ];
    const gift = generic[gifts.length % generic.length];
    gifts.push({ ...gift, price: getBudgetRange(budget) });
  }

  return gifts.slice(0, 5);
}

function getBudgetRange(budget) {
  const ranges = {
    'under-25': '$15-$25',
    '25-50': '$25-$50',
    '50-100': '$50-$100',
    '100-200': '$100-$200',
    'over-200': '$200+'
  };
  return ranges[budget] || '$50-$100';
}
