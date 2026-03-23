(function () {
  const baseConfig = window.prototypeReviewConfig || {};
  const storage = baseConfig.storage || {};
  if (!storage.supabaseUrl || !storage.supabaseAnonKey) {
    throw new Error("Supabase storage config is required.");
  }

  const supabase = window.supabase.createClient(storage.supabaseUrl, storage.supabaseAnonKey);
  const statusNode = document.getElementById("builderStatus");
  const titleInput = document.getElementById("reviewTitle");
  const fileInput = document.getElementById("reviewImages");
  const screenList = document.getElementById("builderScreenList");
  const previewImage = document.getElementById("builderPreviewImage");
  const preview = document.getElementById("builderPreview");
  const hotspot = document.getElementById("builderHotspot");
  const hotspotHandle = document.getElementById("builderHotspotHandle");
  const pageLabel = document.getElementById("builderPageLabel");
  const productCommentInput = document.getElementById("builderProductComment");
  const saveReviewButton = document.getElementById("saveReviewButton");
  const shareBox = document.getElementById("shareBox");
  const shareLink = document.getElementById("shareLink");

  const screens = [];
  let currentIndex = -1;
  let dragState = null;
  let draggedScreenIndex = null;
  const defaultHotspot = { left: 72, top: 12, width: 10, height: 4 };

  function setStatus(message) { statusNode.textContent = message; }
  function slugify(value) {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  }
  function clamp(value, min, max) { return Math.max(min, Math.min(value, max)); }

  titleInput.addEventListener("input", () => {
    renderList();
  });

  function normalizeHotspotsByOrder() {
    const lastIndex = screens.length - 1;
    screens.forEach((screen, index) => {
      if (index === lastIndex) {
        screen.hotspot = null;
      } else if (!screen.hotspot) {
        screen.hotspot = { ...defaultHotspot };
      }
    });
  }

  function renderList() {
    screenList.innerHTML = "";
    screens.forEach((screen, index) => {
      screen.title = "Step " + (index + 1);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "builder-screen" + (index === currentIndex ? " active" : "");
      button.draggable = true;
      button.dataset.index = String(index);
      button.addEventListener("click", () => {
        currentIndex = index;
        renderList();
        renderPreview();
      });
      button.addEventListener("dragstart", () => {
        draggedScreenIndex = index;
      });
      button.addEventListener("dragover", (event) => {
        event.preventDefault();
      });
      button.addEventListener("drop", (event) => {
        event.preventDefault();
        if (draggedScreenIndex === null || draggedScreenIndex === index) {
          return;
        }

        const moved = screens.splice(draggedScreenIndex, 1)[0];
        screens.splice(index, 0, moved);

        if (currentIndex === draggedScreenIndex) {
          currentIndex = index;
        } else if (draggedScreenIndex < currentIndex && index >= currentIndex) {
          currentIndex -= 1;
        } else if (draggedScreenIndex > currentIndex && index <= currentIndex) {
          currentIndex += 1;
        }

        draggedScreenIndex = null;
        normalizeHotspotsByOrder();
        renderList();
        renderPreview();
      });
      button.addEventListener("dragend", () => {
        draggedScreenIndex = null;
      });

      const image = document.createElement("img");
      image.src = screen.url;
      image.alt = screen.title;

      const body = document.createElement("div");
      const title = document.createElement("p");
      title.className = "builder-screen-title";
      title.textContent = screen.title;
      const copy = document.createElement("p");
      copy.className = "builder-screen-copy";
      copy.textContent = screen.hotspot
        ? "Click area set"
        : "No click area set";

      body.appendChild(title);
      body.appendChild(copy);
      button.appendChild(image);
      button.appendChild(body);
      screenList.appendChild(button);
    });
  }

  function updateHotspot() {
    const screen = screens[currentIndex];
    if (!screen || !screen.hotspot) {
      hotspot.hidden = true;
      hotspotHandle.hidden = true;
      return;
    }
    hotspot.hidden = false;
    hotspot.style.left = screen.hotspot.left + "%";
    hotspot.style.top = screen.hotspot.top + "%";
    hotspot.style.width = screen.hotspot.width + "%";
    hotspot.style.height = screen.hotspot.height + "%";
    hotspotHandle.hidden = false;
    hotspotHandle.style.left = "calc(" + (screen.hotspot.left + screen.hotspot.width) + "% - 7px)";
    hotspotHandle.style.top = "calc(" + (screen.hotspot.top + screen.hotspot.height) + "% - 7px)";
  }

  function renderPreview() {
    const screen = screens[currentIndex];
    if (!screen) {
      previewImage.removeAttribute("src");
      pageLabel.textContent = "Select a screen";
      productCommentInput.value = "";
      updateHotspot();
      return;
    }
    previewImage.src = screen.url;
    previewImage.alt = screen.title;
    pageLabel.textContent = screen.title;
    productCommentInput.value = screen.productComment || "";
    updateHotspot();
  }

  function getRelativePosition(event) {
    const rect = preview.getBoundingClientRect();
    return {
      xPercent: ((event.clientX - rect.left) / rect.width) * 100,
      yPercent: ((event.clientY - rect.top) / rect.height) * 100
    };
  }

  function beginDrag(mode, event) {
    const screen = screens[currentIndex];
    if (!screen) return;
    event.preventDefault();
    if (!screen.hotspot) screen.hotspot = { left: 10, top: 10, width: 10, height: 10 };
    dragState = {
      mode,
      startPointer: getRelativePosition(event),
      startHotspot: { ...screen.hotspot }
    };
  }

  function onPointerMove(event) {
    if (!dragState) return;
    const screen = screens[currentIndex];
    const pointer = getRelativePosition(event);
    const dx = pointer.xPercent - dragState.startPointer.xPercent;
    const dy = pointer.yPercent - dragState.startPointer.yPercent;
    const next = { ...dragState.startHotspot };
    if (dragState.mode === "move") {
      next.left = clamp(next.left + dx, 0, 100 - next.width);
      next.top = clamp(next.top + dy, 0, 100 - next.height);
    } else {
      next.width = clamp(next.width + dx, 2, 100 - next.left);
      next.height = clamp(next.height + dy, 2, 100 - next.top);
    }
    screen.hotspot = next;
    updateHotspot();
    renderList();
  }

  function uploadPath(reviewSlug, file) {
    return reviewSlug + "/" + Date.now() + "-" + file.name.replace(/\s+/g, "-");
  }

  async function uploadFile(reviewSlug, file) {
    const path = uploadPath(reviewSlug, file);
    const { error } = await supabase.storage.from("review-assets").upload(path, file, {
      cacheControl: "3600",
      upsert: true
    });
    if (error) throw error;
    const { data } = supabase.storage.from("review-assets").getPublicUrl(path);
    return data.publicUrl;
  }

  fileInput.addEventListener("change", async () => {
    const reviewSlug = slugify(titleInput.value);
    if (!reviewSlug) {
      setStatus("Enter a review title before uploading screens.");
      return;
    }
    setStatus("Uploading screens...");
    const files = Array.from(fileInput.files || []);
    for (const file of files) {
      const localUrl = URL.createObjectURL(file);
      const screen = {
        title: "Step " + (screens.length + 1),
        url: localUrl,
        uploadedUrl: null,
        hotspot: { ...defaultHotspot },
        productComment: ""
      };
      screens.push(screen);
      if (currentIndex === -1 && screens.length) currentIndex = 0;
      renderList();
      renderPreview();

      const uploadedUrl = await uploadFile(reviewSlug, file);
      screen.uploadedUrl = uploadedUrl;
    }
    const lastIndex = screens.length - 1;
    screens.forEach((screen, index) => {
      if (index === lastIndex) {
        screen.hotspot = null;
      } else if (!screen.hotspot) {
        screen.hotspot = { ...defaultHotspot };
      }
    });
    renderList();
    renderPreview();
    setStatus("Screens uploaded. Double-click the preview to create a click area, then drag it.");
  });

  productCommentInput.addEventListener("input", () => {
    const screen = screens[currentIndex];
    if (!screen) return;
    screen.productComment = productCommentInput.value;
  });

  async function saveReview() {
    const title = titleInput.value.trim();
    const reviewSlug = slugify(titleInput.value);
    if (!title || !reviewSlug) {
      setStatus("Add a review title first.");
      return;
    }
    if (!screens.length) {
      setStatus("Upload at least one screen before generating a link.");
      return;
    }

    const totalPages = screens.length + 2;
    const reviewScreens = [{
      title: "Intro",
      subtitle: "Page 1 of " + totalPages,
      type: "intro",
      image: screens[0].uploadedUrl || screens[0].url,
      hotspot: null
    }];

    screens.forEach((screen, index) => {
      reviewScreens.push({
        title: screen.title,
        subtitle: "Page " + (index + 2) + " of " + totalPages,
        image: screen.uploadedUrl || screen.url,
        hotspot: screen.hotspot,
        productComment: screen.productComment || ""
      });
    });

    reviewScreens.push({
      title: "Submit",
      subtitle: "Page " + totalPages + " of " + totalPages,
      type: "submit",
      image: screens[screens.length - 1].uploadedUrl || screens[screens.length - 1].url,
      hotspot: null
    });

    const payload = {
      review_slug: reviewSlug,
      title,
      screens: reviewScreens,
      updated_at: new Date().toISOString()
    };

    setStatus("Saving review...");
    const { error } = await supabase.from("prototype_review_configs").upsert(payload, { onConflict: "review_slug" });
    if (error) {
      setStatus("Could not save review config.");
      return;
    }

    const { error: resetError } = await supabase
      .from("prototype_reviews")
      .delete()
      .eq("review_slug", reviewSlug);

    if (resetError) {
      setStatus("Review saved, but old feedback state could not be reset.");
      return;
    }

    const shareUrl = new URL(window.location.origin + "/review.html");
    shareUrl.searchParams.set("review", reviewSlug);
    shareLink.href = shareUrl.toString();
    shareLink.textContent = shareUrl.toString();
    shareBox.hidden = false;
    setStatus("Review saved. Share the generated link with the client.");
  }

  saveReviewButton.addEventListener("click", saveReview);
  hotspot.addEventListener("pointerdown", (event) => beginDrag("move", event));
  hotspotHandle.addEventListener("pointerdown", (event) => beginDrag("resize", event));
  preview.addEventListener("dblclick", (event) => {
    if (currentIndex === -1) return;
    const point = getRelativePosition(event);
    screens[currentIndex].hotspot = {
      left: clamp(point.xPercent - 5, 0, 90),
      top: clamp(point.yPercent - 5, 0, 90),
      width: 10,
      height: 10
    };
    updateHotspot();
    renderList();
  });
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", () => { dragState = null; });
})();
