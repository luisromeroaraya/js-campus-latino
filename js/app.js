(function () {
  "use strict";

  /* ===== State ===== */
  var state = {
    episodes: [],
    filterText: "",
    isLoading: false,
    hasError: false,
    currentSlug: null,
  };

  /* ===== API ===== */
  /* Mixcloud search returns ALL Radio Campus shows. We paginate through
     all results and keep only episodes whose key contains "campus-latino-".
     Results are sorted descending by name (which contains the date). */
  function getEpisodes(url, episodes) {
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("Error al conectar con Mixcloud");
        return res.json();
      })
      .then(function (json) {
        json.data.forEach(function (element) {
          if (
            element.key.indexOf("/radiocampusbruxelles/campus-latino-") !== -1
          ) {
            episodes.push(element);
          }
        });
        episodes.sort(function (a, b) {
          return a.name > b.name ? -1 : 1;
        });
        if (json.paging && json.paging.next) {
          return getEpisodes(json.paging.next, episodes);
        }
      });
  }

  function fetchAllEpisodes() {
    var episodes = [];
    var url =
      "https://api.mixcloud.com/search/?limit=100&offset=0&q=campuslatino&type=cloudcast";
    return getEpisodes(url, episodes).then(function () {
      return episodes;
    });
  }

  function fetchData(slug) {
    return fetch(
      "https://api.mixcloud.com/radiocampusbruxelles/" + slug + "/"
    ).then(function (res) {
      if (!res.ok) throw new Error("Episodio no encontrado");
      return res.json();
    });
  }

  /* ===== Helpers ===== */
  function formatDate(value) {
    if (!value) return "";
    var d = new Date(value);
    var day = String(d.getDate()).padStart(2, "0");
    var month = String(d.getMonth() + 1).padStart(2, "0");
    var year = d.getFullYear();
    return day + "/" + month + "/" + year;
  }

  function formatDuration(seconds) {
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    return h + "h " + m + "m";
  }

  function escapeHtml(str) {
    if (typeof str !== "string") return String(str || "");
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* ===== Dark Mode ===== */
  function setupDarkMode() {
    var btn = document.getElementById("dark-toggle");
    var icon = btn.querySelector("i");
    if (localStorage.getItem("cl-theme") === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      icon.className = "bi bi-sun";
    }
    btn.addEventListener("click", function () {
      var isDark = document.documentElement.hasAttribute("data-theme");
      if (isDark) {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("cl-theme", "light");
        icon.className = "bi bi-moon-stars";
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("cl-theme", "dark");
        icon.className = "bi bi-sun";
      }
    });
  }

  /* ===== Toast ===== */
  function showToast(msg) {
    var el = document.getElementById("toast-msg");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._timer);
    el._timer = setTimeout(function () {
      el.classList.remove("show");
    }, 2000);
  }

  /* ===== Description extract ===== */
  function extractDescription(html) {
    if (!html) return "";
    var div = document.createElement("div");
    div.innerHTML = html;
    var text = div.textContent || div.innerText || "";
    text = text.replace(/\s+/g, " ").trim();
    if (text.length > 120) {
      text = text.substring(0, 117) + "...";
    }
    return text;
  }

  /* ===== Share ===== */
  function shareEpisode(slug) {
    var url = "https://www.mixcloud.com/radiocampusbruxelles/" + slug + "/";
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(function () {
        showToast("Enlace copiado al portapapeles");
      });
    } else {
      showToast(url);
    }
  }

  /* ===== Render: Skeleton ===== */
  function renderSkeletons(count) {
    count = count || 6;
    var html = "";
    for (var i = 0; i < count; i++) {
      html +=
        '<div class="skeleton-card">' +
        '<div class="skeleton-img"></div>' +
        '<div class="skeleton-body">' +
        '<div class="skeleton-line"></div>' +
        '<div class="skeleton-line"></div>' +
        '<div class="skeleton-line"></div>' +
        "</div>" +
        "</div>";
    }
    return html;
  }

  /* ===== Scroll fade-in ===== */
  function observeFadeIn() {
    var els = document.querySelectorAll(".fade-in");
    if (!els.length || !window.IntersectionObserver) {
      els.forEach(function (el) { el.classList.add("visible"); });
      return;
    }
    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach(function (el) { obs.observe(el); });
  }

  /* ===== Render: Error ===== */
  function renderError(message) {
    return (
      '<div class="error-state">' +
      '<i class="bi bi-exclamation-circle"></i>' +
      "<p>" +
      escapeHtml(message) +
      "</p>" +
      '<button class="error-btn">Reintentar</button>' +
      "</div>"
    );
  }

  /* ===== Render: Episodes ===== */
  /* Filters state.episodes by search text / year,
     then builds horizontal card HTML and triggers scroll fade-in. */
  function renderEpisodes() {
    var container = document.getElementById("episode-list");
    if (!container) return;

    var filtered = state.episodes;
    var filter = new RegExp(state.filterText, "i");
    filtered = filtered.filter(function (el) {
      return el.name.match(filter);
    });
    if (filtered.length === 0) {
      container.innerHTML =
        '<div class="error-state"><p>No se encontraron episodios.</p></div>';
      return;
    }

    var html = filtered
      .map(function (ep) {
        var isPlaying = ep.slug === state.currentSlug;
        var desc = extractDescription(ep.description);
        return (
          '<div class="episode-card-link' +
          (isPlaying ? " playing" : "") +
          '" data-slug="' +
          escapeHtml(ep.slug) +
          '">' +
          '<article class="episode-card fade-in">' +
          '<div class="episode-img">' +
          '<img src="' +
          escapeHtml(ep.pictures.large) +
          '" alt="' +
          escapeHtml(ep.name) +
          '" loading="lazy">' +
          (isPlaying
            ? '<span class="now-playing">Reproduciendo</span>'
            : "") +
          '<button class="play-overlay" aria-label="Reproducir">' +
          '<i class="bi bi-play-fill"></i>' +
          "</button>" +
          "</div>" +
          '<div class="episode-body">' +
          "<h5>" +
          escapeHtml(ep.name) +
          "</h5>" +
          (desc
            ? '<p class="episode-desc">' + escapeHtml(desc) + "</p>"
            : "") +
          '<div class="episode-meta">' +
          "<span>" +
          '<i class="bi bi-calendar3"></i> ' +
          formatDate(ep.updated_time) +
          "</span>" +
          "<span>" +
          '<i class="bi bi-play-fill"></i> ' +
          (ep.play_count || 0) +
          "</span>" +
          "<span>" +
          '<i class="bi bi-clock"></i> ' +
          formatDuration(ep.audio_length) +
          "</span>" +
          "</div>" +
          '<div class="episode-actions">' +
          '<button class="card-btn--share" data-slug="' +
          escapeHtml(ep.slug) +
          '" aria-label="Compartir">' +
          '<i class="bi bi-share"></i> Compartir' +
          "</button>" +
          "</div>" +
          "</div>" +
          "</article>" +
          "</div>"
        );
      })
      .join("");
    container.innerHTML = html;
    observeFadeIn();
  }

  /* ===== Player Sheet ===== */
  /* Slides up the player sheet, finds episode data from state,
     sets thumbnail/title, embeds Mixcloud iframe for playback.
     The sheet stays visible across page navigations. */
  function openPlayer(slug) {
    var sheet = document.getElementById("player-sheet");
    var embed = document.getElementById("sheet-embed");
    var thumb = document.getElementById("sheet-thumb");
    var title = document.getElementById("sheet-title");

    var ep = null;
    for (var i = 0; i < state.episodes.length; i++) {
      if (state.episodes[i].slug === slug) {
        ep = state.episodes[i];
        break;
      }
    }

    if (ep) {
      thumb.src = ep.pictures.large;
      thumb.alt = ep.name;
      title.textContent = ep.name;
    } else {
      thumb.src = "";
      thumb.alt = "";
      title.textContent = "Cargando...";
    }

    embed.innerHTML =
      '<iframe src="https://www.mixcloud.com/widget/iframe/?feed=https://www.mixcloud.com/radiocampusbruxelles/' +
      slug +
      '/&hide_cover=1" allowfullscreen scrolling="no" allow="encrypted-media"></iframe>';

    state.currentSlug = slug;
    sheet.classList.add("open");
    renderEpisodes();
  }

  /* Slides the sheet back down, clears the iframe (stops playback),
     resets state, and re-renders to remove the "now playing" indicator. */
  function closePlayer() {
    var sheet = document.getElementById("player-sheet");
    var embed = document.getElementById("sheet-embed");
    sheet.classList.remove("open");
    embed.innerHTML = "";
    state.currentSlug = null;
    renderEpisodes();
  }

  function setupPlayerSheet() {
    document.getElementById("sheet-close").addEventListener("click", closePlayer);
  }

  /* ===== Page loaders ===== */
  /* Called when navigating to #/episodes. Shows skeletons on first load,
     fetches data via API, or shows cached data / error state. */
  function loadEpisodes() {
    var container = document.getElementById("episode-list");
    if (!container) return;

    if (state.isLoading) {
      container.innerHTML = renderSkeletons(6);
      return;
    }

    if (state.episodes.length === 0 && !state.hasError) {
      state.isLoading = true;
      container.innerHTML = renderSkeletons(6);

      fetchAllEpisodes()
        .then(function (eps) {
          state.episodes = eps;
          state.isLoading = false;
          state.hasError = false;
          renderEpisodes();
        })
        .catch(function () {
          state.isLoading = false;
          state.hasError = true;
          container.innerHTML = renderError(
            "No pudimos cargar los episodios. Verifica tu conexi&oacute;n."
          );
        });
    } else if (state.hasError) {
      container.innerHTML = renderError(
        "No pudimos cargar los episodios. Verifica tu conexi&oacute;n."
      );
    } else {
      renderEpisodes();
    }
  }

  /* ===== Mobile Nav ===== */
  function closeMobileNav() {
    var menu = document.getElementById("nav-menu");
    var toggle = document.getElementById("nav-toggle");
    if (menu) menu.classList.remove("open");
    if (toggle) toggle.classList.remove("open");
  }

  function setupMobileNav() {
    var toggle = document.getElementById("nav-toggle");
    var menu = document.getElementById("nav-menu");
    if (!toggle || !menu) return;
    toggle.addEventListener("click", function () {
      menu.classList.toggle("open");
      toggle.classList.toggle("open");
    });
    menu.querySelectorAll(".nav-link").forEach(function (link) {
      link.addEventListener("click", function () {
        closeMobileNav();
      });
    });
  }

  /* ===== Router ===== */
  /* Hash-based SPA routing. Switches the visible page, updates the nav
     active state, pushes to history, and triggers data loading. */
  function navigate(page, params) {
    var prevPage = document.querySelector(".page.visible");
    if (prevPage) {
      prevPage.classList.remove("visible");
    }

    var target = document.getElementById("page-" + page);
    if (target) {
      target.classList.add("visible");
    }

    closeMobileNav();

    document.querySelectorAll(".nav-link[data-page]").forEach(function (el) {
      el.classList.remove("active");
    });
    var navLink = document.querySelector(
      '.nav-link[data-page="' + page + '"]'
    );
    if (navLink) navLink.classList.add("active");

    var hash = page === "home" ? "" : "/" + page;
    history.pushState({ page: page, params: params }, "", "#" + hash);

    if (page === "episodes") {
      loadEpisodes();
    }
  }

  /* ===== Hash parsing ===== */
  /* Reads window.location.hash and routes to the matching page.
     Called on initial load and on popstate (back/forward). */
  function parseHash() {
    var hash = window.location.hash.replace("#", "");
    if (!hash || hash === "/") {
      navigate("home");
      return;
    }
    var parts = hash.split("/").filter(Boolean);
    var page = parts[0];
    if (["about", "episodes", "contact", "home"].indexOf(page) !== -1) {
      navigate(page);
    } else {
      navigate("home");
    }
  }

  /* ===== Event: Nav ===== */
  function setupNav() {
    document.querySelectorAll(".nav-link[data-page]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        navigate(el.getAttribute("data-page"));
      });
    });
  }

  /* ===== Event: Filter ===== */
  function setupFilter() {
    var searchInput = document.getElementById("filter-search");
    var yearSelect = document.getElementById("filter-year");

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        state.filterText = searchInput.value;
        if (yearSelect) yearSelect.value = "";
        renderEpisodes();
      });
    }
    if (yearSelect) {
      yearSelect.addEventListener("change", function () {
        state.filterText = yearSelect.value;
        if (searchInput) searchInput.value = "";
        renderEpisodes();
      });
    }
  }

  /* ===== Event: Episode clicks ===== */
  function setupEpisodeClicks() {
    var grid = document.getElementById("episode-list");
    if (!grid) return;

    grid.addEventListener("click", function (e) {
      var shareBtn = e.target.closest(".card-btn--share");
      var retryBtn = e.target.closest(".error-btn");
      var card = e.target.closest(".episode-card-link");

      if (shareBtn) {
        e.preventDefault();
        shareEpisode(shareBtn.dataset.slug);
        return;
      }
      if (retryBtn) {
        e.preventDefault();
        location.reload();
        return;
      }
      if (card) {
        e.preventDefault();
        openPlayer(card.dataset.slug);
      }
    });
  }



  /* ===== Event: Live Bar ===== */
  function setupLiveBar() {
    var btn = document.getElementById("live-toggle");
    var audio = document.getElementById("live-audio");
    var heroBtn = document.getElementById("hero-live-btn");

    function togglePlay() {
      if (audio.paused) {
        audio.play().catch(function () {});
        btn.innerHTML = '<i class="bi bi-pause-fill"></i>';
        btn.classList.add("playing");
      } else {
        audio.pause();
        btn.innerHTML = '<i class="bi bi-play-fill"></i>';
        btn.classList.remove("playing");
      }
    }

    btn.addEventListener("click", togglePlay);

    audio.addEventListener("ended", function () {
      btn.innerHTML = '<i class="bi bi-play-fill"></i>';
      btn.classList.remove("playing");
    });

    if (heroBtn) {
      heroBtn.addEventListener("click", function () {
        togglePlay();
      });
    }
  }

  /* ===== Event: Scroll-to-top ===== */
  function setupScrollTop() {
    var btn = document.getElementById("scroll-top");
    if (!btn) return;

    window.addEventListener("scroll", function () {
      if (window.scrollY > 300) {
        btn.classList.add("show");
      } else {
        btn.classList.remove("show");
      }
    });

    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ===== Popstate ===== */
  window.addEventListener("popstate", function () {
    parseHash();
  });

  /* ===== Init ===== */
  /* Sets up all event handlers and triggers the initial route.
     Order matters: nav and filter must be ready before parseHash. */
  document.addEventListener("DOMContentLoaded", function () {
    setupNav();
    setupMobileNav();
    setupFilter();
    setupEpisodeClicks();
    setupPlayerSheet();
    setupLiveBar();
    setupScrollTop();
    setupDarkMode();
    parseHash();
  });
})();
