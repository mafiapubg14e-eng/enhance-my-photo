exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const HF_TOKEN = process.env.HF_API_TOKEN;

  try {
    const { image } = JSON.parse(event.body);

    // Base64 image ko blob mein convert karo
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Hugging Face - Real-ESRGAN model
    const response = await fetch(
      'https://api-inference.huggingface.co/models/eugenesiow/Real-ESRGAN',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/octet-stream',
        },
        body: imageBuffer
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      // Agar model load ho raha ho toh retry karo
      if (response.status === 503) {
        return {
          statusCode: 503,
          body: JSON.stringify({ error: 'Model loading, please try again in 20 seconds' })
        };
      }

      return {
        statusCode: response.status,
        body: JSON.stringify({ error: errorText })
      };
    }

    // Response image buffer mein aayega
    const arrayBuffer = await response.arrayBuffer();
    const outputBase64 = Buffer.from(arrayBuffer).toString('base64');
    const outputImage = `data:image/png;base64,${outputBase64}`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ output: outputImage })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
