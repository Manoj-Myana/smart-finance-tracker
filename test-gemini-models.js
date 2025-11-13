// Simple script to test which Gemini models are available
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';

async function testModels() {
  console.log('🔍 Testing available Gemini models...');
  console.log('API Key:', API_KEY ? '✅ Found' : '❌ Not found');
  
  if (!API_KEY) {
    console.log('Please set REACT_APP_GEMINI_API_KEY environment variable');
    return;
  }
  
  try {
    // Get available models
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`,
      { method: 'GET' }
    );
    
    const result = await response.json();
    console.log('📊 API Response status:', response.status);
    
    if (result.models && Array.isArray(result.models)) {
      const geminiModels = result.models
        .filter(model => model.name && model.name.includes('gemini'))
        .map(model => ({
          name: model.name,
          displayName: model.displayName,
          supportedMethods: model.supportedGenerationMethods
        }));
      
      console.log('🚀 Available Gemini models:');
      geminiModels.forEach((model, index) => {
        console.log(`${index + 1}. ${model.name}`);
        console.log(`   Display: ${model.displayName}`);
        console.log(`   Methods: ${model.supportedMethods?.join(', ') || 'None'}`);
        console.log('');
      });
      
      // Test the first available model
      if (geminiModels.length > 0) {
        const testModelName = geminiModels[0].name.replace('models/', '');
        console.log(`🧪 Testing model: ${testModelName}`);
        
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: testModelName });
        
        try {
          const result = await model.generateContent('Hello, can you respond with just "SUCCESS"?');
          const response = await result.response;
          const text = response.text();
          console.log('✅ Test successful! Response:', text);
        } catch (error) {
          console.log('❌ Test failed:', error.message);
        }
      }
    } else {
      console.log('❌ No models found in response:', result);
    }
    
  } catch (error) {
    console.error('💥 Error testing models:', error);
  }
}

testModels();