(async function () {
  const config = window.prototypeReviewConfig || {};
  const storage = config.storage || {};
  const statusNode = document.getElementById("reviewsStatus");
  const grid = document.getElementById("reviewsGrid");
  const emptyNode = document.getElementById("reviewsEmpty");

  function setStatus(message) {
    statusNode.textContent = message;
  }

  if (!storage.supabaseUrl || !storage.supabaseAnonKey) {
    setStatus("Supabase config is missing.");
    return;
  }

  const supabase = window.supabase.createClient(storage.supabaseUrl, storage.supabaseAnonKey);

  const { data, error } = await supabase
    .from("prototype_review_configs")
    .select("review_slug,title,updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    setStatus("Could not load saved reviews.");
    return;
  }

  if (!data || !data.length) {
    emptyNode.hidden = false;
    setStatus("No reviews available yet.");
    return;
  }

  grid.innerHTML = "";
  data.forEach((review) => {
    const card = document.createElement("article");
    card.className = "panel review-card";

    const title = document.createElement("h2");
    title.textContent = review.title || review.review_slug;

    const meta = document.createElement("p");
    meta.className = "review-card-meta";
    meta.textContent = "Updated " + new Date(review.updated_at).toLocaleString();

    const slug = document.createElement("p");
    slug.className = "review-card-slug";
    slug.textContent = review.review_slug;

    const actions = document.createElement("div");
    actions.className = "review-card-actions";

    const reviewLink = document.createElement("a");
    reviewLink.className = "control primary reviews-link-button";
    reviewLink.href = "./review.html?review=" + encodeURIComponent(review.review_slug);
    reviewLink.textContent = "Open Review";

    const createLink = document.createElement("a");
    createLink.className = "control secondary reviews-link-button";
    createLink.href = "./create-review.html";
    createLink.textContent = "New Review";

    actions.appendChild(reviewLink);
    actions.appendChild(createLink);

    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(slug);
    card.appendChild(actions);
    grid.appendChild(card);
  });

  setStatus("Loaded " + data.length + " review page" + (data.length === 1 ? "" : "s") + ".");
})();
