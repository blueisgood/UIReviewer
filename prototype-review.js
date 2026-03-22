(async function () {
  let config = window.prototypeReviewConfig;
  if (!config) {
    throw new Error("prototypeReviewConfig is required.");
  }

  const url = new URL(window.location.href);
  const reviewSlug = url.searchParams.get("review") || config.reviewSlug || "default-review";
  const reviewerName = url.searchParams.get("reviewer") || "";
  const hotspotStorageKey = "prototype-hotspots:" + reviewSlug;
  const isStorageConfigured =
    config.storage &&
    config.storage.provider === "supabase" &&
    config.storage.supabaseUrl &&
    config.storage.supabaseUrl !== "YOUR_SUPABASE_URL" &&
    config.storage.supabaseAnonKey &&
    config.storage.supabaseAnonKey !== "YOUR_SUPABASE_ANON_KEY";

  const thumbList = document.getElementById("thumbList");
  const introTitle = document.getElementById("introTitle");
  const introDescription = document.getElementById("introDescription");
  const screenImage = document.getElementById("screenImage");
  const introScreen = document.getElementById("introScreen");
  const screenShell = document.getElementById("screenShell");
  const submitScreen = document.getElementById("submitScreen");
  const screenSubtitle = document.getElementById("screenSubtitle");
  const prevButton = document.getElementById("prevButton");
  const nextButton = document.getElementById("nextButton");
  const submitReviewButton = document.getElementById("submitReviewButton");
  const hotspot = document.getElementById("hotspot");
  const hotspotHandle = document.getElementById("hotspotHandle");
  const notesBox = document.getElementById("notesBox");
  const productCommentsStatus = document.getElementById("productCommentsStatus");
  const feedbackComment = document.getElementById("feedbackComment");
  const feedbackStatus = document.getElementById("feedbackStatus");
  const hotspotStatus = document.getElementById("hotspotStatus");

  const supabase = isStorageConfigured
    ? window.supabase.createClient(config.storage.supabaseUrl, config.storage.supabaseAnonKey)
    : null;

  async function loadReviewConfig() {
    if (!supabase) {
      return;
    }

    const { data, error } = await supabase
      .from("prototype_review_configs")
      .select("title,screens")
      .eq("review_slug", reviewSlug)
      .maybeSingle();

    if (error || !data || !Array.isArray(data.screens) || data.screens.length === 0) {
      return;
    }

    config = {
      ...config,
      projectLabel: data.title || config.projectLabel,
      screens: data.screens
    };
  }

  await loadReviewConfig();

  if (!Array.isArray(config.screens) || config.screens.length === 0) {
    throw new Error("At least one review screen is required.");
  }

  let currentIndex = 0;
  let saveTimer = null;
  let hasLoadedRemoteState = false;
  let isSubmitted = false;
  let isEditMode = url.searchParams.get("edit") === "1";
  let dragState = null;
  let pageComments = {};
  let pageFeedback = {};

  notesBox.disabled = true;
  notesBox.readOnly = true;

  function getPageKey(index) {
    return "page_" + index;
  }

  function readCurrentPageValues() {
    const key = getPageKey(currentIndex);
    return {
      comments: config.screens[currentIndex].productComment || "",
      feedback: pageFeedback[key] || ""
    };
  }

  function writeCurrentPageValues() {
    const key = getPageKey(currentIndex);
    pageFeedback[key] = feedbackComment.value;
  }

  function parseStoredPageMap(value, fallbackText) {
    if (!value) {
      return {};
    }
    if (typeof value === "object") {
      return value;
    }
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch (error) {
      // legacy string
    }
    return fallbackText ? { [getPageKey(1)]: fallbackText } : {};
  }

  pageFeedback = {};

  function loadSavedHotspots() {
    try {
      const raw = window.localStorage.getItem(hotspotStorageKey);
      if (!raw) {
        return;
      }
      const saved = JSON.parse(raw);
      config.screens.forEach((screen, index) => {
        if (saved[index] && screen.hotspot) {
          screen.hotspot = saved[index];
        }
      });
    } catch (error) {
      // ignore
    }
  }

  function persistHotspots() {
    try {
      const payload = {};
      config.screens.forEach((screen, index) => {
        if (screen.hotspot) {
          payload[index] = screen.hotspot;
        }
      });
      window.localStorage.setItem(hotspotStorageKey, JSON.stringify(payload));
    } catch (error) {
      // ignore
    }
  }

  function renderThumbs() {
    thumbList.innerHTML = "";
    config.screens.forEach((screen, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "thumb" + (index === currentIndex ? " active" : "");
      button.title = screen.title || screen.subtitle || ("Page " + (index + 1));
      button.addEventListener("click", () => goTo(index));

      if (screen.type === "intro" || screen.type === "submit") {
        const label = document.createElement("div");
        label.className = "thumb-label";
        label.textContent = screen.type === "intro" ? (config.projectLabel || "Intro") : "Submit";
        button.appendChild(label);
      } else {
        const image = document.createElement("img");
        image.src = screen.image;
        image.alt = screen.title || ("Page " + (index + 1));
        button.appendChild(image);
      }
      thumbList.appendChild(button);
    });
  }

  function updateHotspotHandle(configHotspot) {
    const current = configHotspot || config.screens[currentIndex].hotspot;
    if (!current || !isEditMode) {
      hotspotHandle.hidden = true;
      return;
    }
    hotspotHandle.hidden = false;
    hotspotHandle.style.left = "calc(" + (current.left + current.width) + "% - 7px)";
    hotspotHandle.style.top = "calc(" + (current.top + current.height) + "% - 7px)";
  }

  function renderHotspot(configHotspot) {
    if (!configHotspot) {
      hotspot.hidden = true;
      hotspotHandle.hidden = true;
      return;
    }
    hotspot.hidden = false;
    hotspot.style.left = configHotspot.left + "%";
    hotspot.style.top = configHotspot.top + "%";
    hotspot.style.width = configHotspot.width + "%";
    hotspot.style.height = configHotspot.height + "%";
    hotspot.classList.toggle("editing", isEditMode);
    updateHotspotHandle(configHotspot);
  }

  function setHotspotStatus(message) {
    hotspotStatus.textContent = message;
  }

  function setFeedbackStatus(message) {
    feedbackStatus.textContent = message;
  }

  function setProductCommentsStatus(message) {
    productCommentsStatus.textContent = message;
  }

  function setLockedState(locked) {
    isSubmitted = locked;
    notesBox.disabled = true;
    notesBox.readOnly = true;
    feedbackComment.disabled = locked;
    submitReviewButton.disabled = locked;
    submitReviewButton.textContent = locked ? "Submitted" : "Submit";
  }

  function formatTimestamp(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function toggleEditMode() {
    isEditMode = !isEditMode;
    if (!isEditMode) {
      dragState = null;
    }
    if (isEditMode) {
      url.searchParams.set("edit", "1");
    } else {
      url.searchParams.delete("edit");
    }
    window.history.replaceState({}, "", url.toString());
    render();
  }

  function render() {
    const screen = config.screens[currentIndex];
    const isIntroPage = screen.type === "intro";
    const isSubmitPage = screen.type === "submit";
    const currentValues = readCurrentPageValues();

    introScreen.hidden = !isIntroPage;
    screenShell.hidden = isSubmitPage || isIntroPage;
    submitScreen.hidden = !isSubmitPage;

    if (!isSubmitPage && !isIntroPage) {
      screenImage.src = screen.image;
      screenImage.alt = screen.title || screen.subtitle || "";
    }

    if (introTitle) {
      introTitle.textContent = config.projectLabel || "Prototype Review";
    }
    if (introDescription) {
      introDescription.textContent = "This prototype shows the " + (config.projectLabel || "current") + " flow for review. Move through the pages, capture comments on the right, and use the final page to submit the review.";
    }

    screenSubtitle.textContent = screen.subtitle || "";
    notesBox.value = currentValues.comments;
    feedbackComment.value = currentValues.feedback;
    notesBox.placeholder = "Product comments for " + (screen.subtitle || ("Page " + (currentIndex + 1)));
    feedbackComment.placeholder = "User feedback for " + (screen.subtitle || ("Page " + (currentIndex + 1)));

    prevButton.disabled = currentIndex === 0;
    nextButton.hidden = isSubmitPage;
    nextButton.disabled = currentIndex === config.screens.length - 1;
    submitReviewButton.hidden = !isSubmitPage;
    submitReviewButton.disabled = isSubmitted;

    renderHotspot(isSubmitPage || isIntroPage ? null : screen.hotspot);
    if (isSubmitPage) {
      setHotspotStatus(isEditMode ? "Edit mode is on, but the submit page has no click area." : "No click area on the submit page.");
    } else if (isIntroPage) {
      setHotspotStatus(isEditMode ? "Edit mode is on, but the intro page has no click area. Go to the next page." : "Hotspot edit mode is off.");
    } else if (screen.hotspot) {
      setHotspotStatus(isEditMode ? "Hotspot edit mode is on. Drag the blue box or resize from the corner." : "Hotspot edit mode is off.");
    } else {
      setHotspotStatus(isEditMode ? "Edit mode is on, but this page has no click area." : "This page has no click area.");
    }
    renderThumbs();
  }

  function goTo(index) {
    writeCurrentPageValues();
    currentIndex = Math.max(0, Math.min(index, config.screens.length - 1));
    render();
  }

  function goNext() {
    if (currentIndex < config.screens.length - 1) {
      goTo(currentIndex + 1);
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      goTo(currentIndex - 1);
    }
  }

  function buildShareLink() {
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set("review", reviewSlug);
    if (reviewerName) {
      shareUrl.searchParams.set("reviewer", reviewerName);
    }
    return shareUrl.toString();
  }

  async function loadRemoteState() {
    if (!supabase) {
      setProductCommentsStatus("Product comments are read-only and come from the review setup.");
      setFeedbackStatus("User feedback is local only. Add Supabase config to enable autosave.");
      return;
    }

    setProductCommentsStatus("Product comments are read-only and come from the review setup.");
    setFeedbackStatus("Loading saved user feedback...");

    const { data, error } = await supabase
      .from("prototype_reviews")
      .select("user_feedback,submitted_at,updated_at")
      .eq("review_slug", reviewSlug)
      .maybeSingle();

    if (error) {
      setProductCommentsStatus("Product comments are read-only and come from the review setup.");
      setFeedbackStatus("Could not load saved user feedback.");
      return;
    }

    if (data) {
      pageFeedback = parseStoredPageMap(data.user_feedback, data.user_feedback || "");
      const savedAt = data.updated_at ? formatTimestamp(data.updated_at) : "previously";
      if (data.submitted_at) {
        const submittedAt = formatTimestamp(data.submitted_at);
        setLockedState(true);
        setProductCommentsStatus("Product comments are read-only and come from the review setup.");
        setFeedbackStatus("User feedback were submitted at " + submittedAt + " and can no longer be edited.");
      } else {
        setProductCommentsStatus("Product comments are read-only and come from the review setup.");
        setFeedbackStatus("User feedback is auto-saved. Last saved at " + savedAt + ".");
      }
    } else {
      setProductCommentsStatus("Product comments are read-only and come from the review setup.");
      setFeedbackStatus("User feedback will auto-save once you start typing.");
    }

    hasLoadedRemoteState = true;
  }

  async function saveRemoteState(submittedAtIso) {
    if (!supabase || !hasLoadedRemoteState || (isSubmitted && !submittedAtIso)) {
      return true;
    }

    writeCurrentPageValues();
    const savingMessage = submittedAtIso ? "Submitting..." : "Auto-saving...";
    setProductCommentsStatus("Product comments are read-only and come from the review setup.");
    setFeedbackStatus("User feedback is " + savingMessage.toLowerCase());

    const now = submittedAtIso || new Date().toISOString();
    const payload = {
      review_slug: reviewSlug,
      reviewer_name: reviewerName || null,
      user_feedback: JSON.stringify(pageFeedback),
      share_url: buildShareLink(),
      submitted_at: submittedAtIso || null,
      updated_at: now
    };

    const { error } = await supabase
      .from("prototype_reviews")
      .upsert(payload, { onConflict: "review_slug" });

    if (error) {
      setProductCommentsStatus("Product comments are read-only and come from the review setup.");
      setFeedbackStatus("User feedback could not be saved. Check the connection and try again.");
      return false;
    }

    const savedAt = formatTimestamp(now);
    if (submittedAtIso) {
      setProductCommentsStatus("Product comments are read-only and come from the review setup.");
      setFeedbackStatus("User feedback were submitted at " + savedAt + " and can no longer be edited.");
    } else {
      setProductCommentsStatus("Product comments are read-only and come from the review setup.");
      setFeedbackStatus("User feedback is auto-saved. Last saved at " + savedAt + ".");
    }
    return true;
  }

  function scheduleSave() {
    if (!supabase || !hasLoadedRemoteState || isSubmitted) {
      return;
    }
    writeCurrentPageValues();
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      saveRemoteState();
    }, 500);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }

  function getRelativePosition(event) {
    const rect = screenShell.getBoundingClientRect();
    return {
      xPercent: ((event.clientX - rect.left) / rect.width) * 100,
      yPercent: ((event.clientY - rect.top) / rect.height) * 100
    };
  }

  function beginDrag(mode, event) {
    if (!isEditMode) {
      return;
    }
    const screen = config.screens[currentIndex];
    if (!screen || !screen.hotspot) {
      return;
    }
    event.preventDefault();
    dragState = {
      mode,
      startPointer: getRelativePosition(event),
      startHotspot: { ...screen.hotspot }
    };
  }

  function applyDrag(event) {
    if (!dragState) {
      return;
    }
    const screen = config.screens[currentIndex];
    const pointer = getRelativePosition(event);
    const dx = pointer.xPercent - dragState.startPointer.xPercent;
    const dy = pointer.yPercent - dragState.startPointer.yPercent;
    const nextHotspot = { ...dragState.startHotspot };

    if (dragState.mode === "move") {
      nextHotspot.left = clamp(dragState.startHotspot.left + dx, 0, 100 - dragState.startHotspot.width);
      nextHotspot.top = clamp(dragState.startHotspot.top + dy, 0, 100 - dragState.startHotspot.height);
    } else {
      nextHotspot.width = clamp(dragState.startHotspot.width + dx, 2, 100 - dragState.startHotspot.left);
      nextHotspot.height = clamp(dragState.startHotspot.height + dy, 2, 100 - dragState.startHotspot.top);
    }

    screen.hotspot = nextHotspot;
    persistHotspots();
    renderHotspot(nextHotspot);
    setHotspotStatus("Hotspot updated: left " + nextHotspot.left.toFixed(1) + "%, top " + nextHotspot.top.toFixed(1) + "%, width " + nextHotspot.width.toFixed(1) + "%, height " + nextHotspot.height.toFixed(1) + "%.");
  }

  nextButton.addEventListener("click", goNext);
  prevButton.addEventListener("click", goPrev);
  hotspot.addEventListener("click", () => {
    if (!isEditMode) {
      goNext();
    }
  });
  hotspot.addEventListener("pointerdown", (event) => beginDrag("move", event));
  hotspotHandle.addEventListener("pointerdown", (event) => beginDrag("resize", event));
  window.addEventListener("pointermove", applyDrag);
  window.addEventListener("pointerup", () => { dragState = null; });
  notesBox.addEventListener("input", scheduleSave);
  feedbackComment.addEventListener("input", scheduleSave);
  screenSubtitle.addEventListener("dblclick", toggleEditMode);

  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") goNext();
    if (event.key === "ArrowLeft") goPrev();
    const code = event.code || "";
    const usesPrimaryShortcut = (event.metaKey || event.ctrlKey) && event.shiftKey && code === "KeyE";
    const usesAlternateShortcut = event.altKey && event.shiftKey && code === "KeyE";
    if (usesPrimaryShortcut || usesAlternateShortcut) {
      event.preventDefault();
      toggleEditMode();
    }
  });

  submitReviewButton.addEventListener("click", async () => {
    const submittedAtIso = new Date().toISOString();
    const ok = await saveRemoteState(submittedAtIso);
    if (!ok) {
      return;
    }
    setLockedState(true);
  });

  loadSavedHotspots();
  render();
  await loadRemoteState();
  render();
})();
