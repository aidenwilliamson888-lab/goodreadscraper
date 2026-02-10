export async function onRequest(context) {
  const { request } = context;

  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: cors() });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: cors()
    });
  }

  try {
    const { key, keywords, limit } = await request.json();

    if (!key || !keywords) {
      return new Response(
        JSON.stringify({ error: "API key dan keywords wajib" }),
        { status: 400, headers: cors() }
      );
    }

    const MAX = Number(limit) || 20;
    let results = [];

    const keywordList = keywords
      .split(",")
      .map(k => k.trim())
      .filter(Boolean);

    for (const q of keywordList) {
      let page = 1;

      while (results.length < MAX && page <= 5) {
        const url =
          `https://www.goodreads.com/search/index.xml` +
          `?key=${key}&q=${encodeURIComponent(q)}&page=${page}`;

        const xml = await fetch(url).then(r => r.text());
        const works = [...xml.matchAll(/<work>[\s\S]*?<\/work>/g)];
        if (!works.length) break;

        for (const w of works) {
          if (results.length >= MAX) break;

          const id = w[0].match(/<id>(\d+)<\/id>/)?.[1];
          const title = w[0].match(/<title>([\s\S]*?)<\/title>/)?.[1];
          const author = w[0].match(/<name>([\s\S]*?)<\/name>/)?.[1];
          const ratings = Number(
            w[0].match(/<ratings_count>(\d+)<\/ratings_count>/)?.[1] || 0
          );

          if (id && title && author) {
            results.push({ id, title, author, ratings_count: ratings });
          }
        }

        page++;
      }
    }

    const dedup = Object.values(
      Object.fromEntries(results.map(b => [b.id, b]))
    ).sort((a, b) => b.ratings_count - a.ratings_count);

    return new Response(JSON.stringify(dedup.slice(0, MAX)), {
      headers: { ...cors(), "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: cors() }
    );
  }
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
