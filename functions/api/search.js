export async function onRequestPost({ request }) {
  try {
    const { key, keywords, limit = 100 } = await request.json();

    if (!key || !keywords) {
      return Response.json({ error: 'Missing params' }, { status: 400 });
    }

    const HARD_LIMIT = 1000;
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

        const extract = (regex) =>
          (w.match(regex) || [])[1] || '';

        const bookId = extract(/<best_book>[\s\S]*?<id>(\d+)<\/id>/);
        const title = extract(/<best_book>[\s\S]*?<title>([\s\S]*?)<\/title>/);
        const author = extract(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>/);
        const cover = extract(/<best_book>[\s\S]*?<image_url>([\s\S]*?)<\/image_url>/);

        const rating = extract(/<average_rating>([\s\S]*?)<\/average_rating>/);
        const reviews = extract(/<ratings_count>([\s\S]*?)<\/ratings_count>/);

        results.push({
          id: bookId,
          title,
          author,
          rating,
          reviews,
          cover,
          url: bookId
            ? `https://www.goodreads.com/book/show/${bookId}`
            : ''
        });
      }

      page++;
    }

    return Response.json({
      total: results.length,
      data: results
    });

  } catch (err) {
    return Response.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
