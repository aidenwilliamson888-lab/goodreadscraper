export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const key = body.key;
    const keywords = body.keywords;
    const limit = body.limit || 100;

    if (!key || !keywords) {
      return Response.json({ error: 'Missing params' }, { status: 400 });
    }

    const HARD_LIMIT = 1000; // 👉 ganti 2000 kalau mau
    const SAFE_LIMIT = Math.min(limit, HARD_LIMIT);
    const MAX_PAGE = Math.ceil(SAFE_LIMIT / 10);

    let page = 1;
    let results = [];

    while (results.length < SAFE_LIMIT && page <= MAX_PAGE) {
      const url =
        `https://www.goodreads.com/search/index.xml` +
        `?key=${key}&q=${encodeURIComponent(keywords)}&page=${page}`;

      const res = await fetch(url);
      const xml = await res.text();

      const works = xml.match(/<work>[\s\S]*?<\/work>/g) || [];
      if (works.length === 0) break;

      for (const w of works) {
        if (results.length >= SAFE_LIMIT) break;

        const bookId =
          (w.match(/<best_book>[\s\S]*?<id>(\d+)<\/id>/) || [])[1] || '';

        const title =
          (w.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';

        const author =
          (w.match(/<name>([\s\S]*?)<\/name>/) || [])[1] || '';

        results.push({
          id: bookId,
          title,
          author,
          url: bookId
            ? `https://www.goodreads.com/book/show/${bookId}`
            : ''
        });
      }

      page++;
    }

    return Response.json({
      total: results.length,
      limit: SAFE_LIMIT,
      data: results
    });

  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
