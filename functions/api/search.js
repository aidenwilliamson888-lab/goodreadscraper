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

      for (const work of works) {
        if (results.length >= SAFE_LIMIT) break;

        const bestBook =
          (work.match(/<best_book>[\s\S]*?<\/best_book>/) || [])[0];

        if (!bestBook) continue;

        const extract = (src, regex) =>
          (src.match(regex) || [])[1] || '';

        const id = extract(bestBook, /<id>(\d+)<\/id>/);
        const title = extract(bestBook, /<title>([\s\S]*?)<\/title>/);
        const author = extract(bestBook, /<name>([\s\S]*?)<\/name>/);
        const cover = extract(bestBook, /<image_url>([\s\S]*?)<\/image_url>/);

        const rating = extract(work, /<average_rating>([\s\S]*?)<\/average_rating>/);
        const reviews = extract(work, /<ratings_count>([\s\S]*?)<\/ratings_count>/);

        results.push({
          id,
          title,
          author,
          rating,
          reviews,
          cover,
          url: id ? `https://www.goodreads.com/book/show/${id}` : ''
        });
      }

      page++;
    }

    return Response.json({
      total: results.length,
      data: results
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
