exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const API_TOKEN = process.env.REPLICATE_API_TOKEN;

  try {
    const { image } = JSON.parse(event.body);

    const startRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: 'f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa',
        input: { image: image, scale: 4, face_enhance: false }
      })
    });

    const prediction = await startRes.json();

    if (!prediction.id) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to start prediction' })
      };
    }

    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 2000));

      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { 'Authorization': `Bearer ${API_TOKEN}` }
      });

      const data = await pollRes.json();

      if (data.status === 'succeeded') {
        const output = Array.isArray(data.output) ? data.output[0] : data.output;
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ output })
        };
      }

      if (data.status === 'failed') {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Enhancement failed' })
        };
      }
    }

    return { statusCode: 500, body: JSON.stringify({ error: 'Timeout' }) };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
