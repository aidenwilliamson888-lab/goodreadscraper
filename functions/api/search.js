export async function onRequestPost({ request }) {
  try {
    const { key, keywords, limit = 10 } = await request.json();

    if (!key || !keywords) {
      return Response.json({ error: 'Missing params' }, { status: 400 });
    }

    const url =
      `https://www.goodreads.com/search/index.xml` +
      `?key=${key}&q=${encodeURIComponent(keywords)}`;

    const res = await fetch(url);
    const xml = await res.text();

    // Ambil <work>...</work>
    const works = xml.match(/<work>[\s\S]*?<\/work>/g) || [];

    const data = works.slice(0, limit).map(w => {
      const get = (tag) =>
        (w.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`)) || [])[1] || '';

      const getAttr = (tag, attr) =>
        (w.match(new RegExp(`<${tag}[^>]*${attr}="([^"]+)"`)) || [])[1] || '';

      return {
        id: get('id'),
        title: get('title'),
        author: get('name'),
        rating: get('average_rating'),
        reviews: get('ratings_count'),
        cover: getAttr('image_url', ''),
        url: `https://www.goodreads.com/book/show/${get('id')}`
      };
    });

    return Response.json(data);

  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
