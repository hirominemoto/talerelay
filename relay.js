exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  // タイトル生成モード
  if (body.mode === 'title') {
    const prompt = `以下の物語（${body.genre}ジャンル）に合うタイトルを3つ考えてください。
物語の雰囲気や核心をとらえた、詩的で短いタイトルにしてください。
必ずJSON形式のみで返してください（前置き・説明不要）：{"titles": ["タイトル1", "タイトル2", "タイトル3"]}

物語：
${body.story}`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await res.json();
      const raw = data.content[0].text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(raw);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      };
    } catch {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titles: ['物語のかけら', '名もなき夜に', '続きの先へ'] })
      };
    }
  }

  // 物語続き生成モード
  const { history, genre, nearEnd } = body;
  const prompt = `あなたは${genre}物語のバトンリレーの共同創作者です。
以下のルールを厳守してください：
- 必ず一文のみで続きを書く（句点で終わる）
- 前の文章の世界観と登場人物を引き継ぐ
- ${nearEnd ? '物語の締めくくりに向かって自然に収束させる' : '予想外の展開や余韻を大切にしながら物語を前に進める'}
- 説明・前置き・会話は不要。物語の本文一文だけを返す

これまでの物語：
${history}

続きの一文：`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await res.json();
    const text = data.content[0].text.trim();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message })
    };
  }
};
