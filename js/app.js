(function () {
  "use strict";

  /* ===== State ===== */
  var state = {
    episodes: [],
    filterText: "",
    isLoading: false,
    hasError: false,
  };

  /* ===== API ===== */
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

  /* ===== Render: Skeleton for Episodes ===== */
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

  /* ===== Render: Error State ===== */
  function renderError(message, retryFn) {
    return (
      '<div class="error-state">' +
      '<i class="bi bi-exclamation-circle"></i>' +
      "<p>" +
      escapeHtml(message) +
      "</p>" +
      (retryFn
        ? '<button class="btn btn-outline-primary btn-sm retry-btn">Reintentar</button>'
        : "") +
      "</div>"
    );
  }

  /* ===== Render: Episodes ===== */
  function renderEpisodes() {
    var container = document.getElementById("episode-list");
    if (!container) return;

    var filter = new RegExp(state.filterText, "i");
    var filtered = state.episodes.filter(function (el) {
      return el.name.match(filter);
    });

    if (filtered.length === 0) {
      container.innerHTML =
        '<div class="error-state" style="grid-column:1/-1">' +
        "<p>No se encontraron episodios.</p>" +
        "</div>";
      return;
    }

    container.innerHTML = filtered
      .map(function (ep) {
        return (
          '<a href="#/player/' +
          escapeHtml(ep.slug) +
          '" class="episode-card-link">' +
          '<article class="episode-card">' +
          '<div class="episode-card-img">' +
          '<img src="' +
          escapeHtml(ep.pictures.large) +
          '" alt="' +
          escapeHtml(ep.name) +
          '" loading="lazy">' +
          "</div>" +
          '<div class="episode-card-body">' +
          "<h5>" +
          escapeHtml(ep.name) +
          "</h5>" +
          '<div class="episode-card-meta">' +
          "<span>" +
          '<i class="bi bi-play-fill"></i> ' +
          (ep.play_count || 0) +
          "</span>" +
          "<span>" +
          '<i class="bi bi-clock"></i> ' +
          formatDuration(ep.audio_length) +
          "</span>" +
          "</div>" +
          '<div class="episode-card-date">' +
          '<i class="bi bi-calendar3"></i> ' +
          formatDate(ep.updated_time) +
          "</div>" +
          "</div>" +
          "</article>" +
          "</a>"
        );
      })
      .join("");
  }

  /* ===== Render: Player ===== */
  function renderPlayer(data) {
    var container = document.getElementById("player-content");
    if (!container) return;

    container.innerHTML =
      '<div class="player-hero">' +
      '<img src="' +
      (data.pictures ? escapeHtml(data.pictures.large) : "") +
      '" alt="' +
      escapeHtml(data.name) +
      '" class="player-hero-img">' +
      "<h3>" +
      escapeHtml(data.name) +
      "</h3>" +
      "</div>" +
      '<div class="player-embed">' +
      '<iframe src="https://www.mixcloud.com/widget/iframe/?feed=https://www.mixcloud.com/radiocampusbruxelles/' +
      escapeHtml(data.slug) +
      '/&hide_cover=1" style="border:0;width:100%;height:120px" allowfullscreen scrolling="no" allow="encrypted-media"></iframe>' +
      "</div>" +
      '<div class="player-info">' +
      '<div class="player-meta">' +
      '<div class="player-meta-item">' +
      '<i class="bi bi-play-fill"></i> Reproducciones: ' +
      (data.play_count || 0) +
      "</div>" +
      '<div class="player-meta-item">' +
      '<i class="bi bi-clock"></i> Duraci&oacute;n: ' +
      formatDuration(data.audio_length) +
      "</div>" +
      '<div class="player-meta-item">' +
      '<i class="bi bi-calendar3"></i> ' +
      formatDate(data.updated_time) +
      "</div>" +
      "</div>" +
      (data.description
        ? "<p>" + escapeHtml(data.description) + "</p>"
        : "") +
      "</div>" +
      '<div class="player-back">' +
      '<a href="#/episodes"><i class="bi bi-arrow-left"></i> Volver a episodios</a>' +
      "</div>";
  }

  /* ===== Page loaders ===== */
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
            "No pudimos cargar los episodios. Verifica tu conexi&oacute;n.",
            function () {
              state.hasError = false;
              loadEpisodes();
            }
          );
          attachRetry(container);
        });
    } else if (state.hasError) {
      container.innerHTML = renderError(
        "No pudimos cargar los episodios. Verifica tu conexi&oacute;n.",
        function () {
          state.hasError = false;
          loadEpisodes();
        }
      );
      attachRetry(container);
    } else {
      renderEpisodes();
    }
  }

  function attachRetry(container) {
    var btn = container.querySelector(".retry-btn");
    if (btn) {
      btn.addEventListener("click", function () {
        state.hasError = false;
        loadEpisodes();
      });
    }
  }

  function loadPlayer(slug) {
    var container = document.getElementById("player-content");
    if (!container) return;

    container.innerHTML =
      '<div class="text-center py-5">' +
      '<div class="spinner-border text-primary" role="status">' +
      '<span class="visually-hidden">Cargando...</span>' +
      "</div>" +
      "</div>";

    fetchData(slug)
      .then(function (data) {
        renderPlayer(data);
      })
      .catch(function () {
        container.innerHTML =
          '<div class="error-state">' +
          '<i class="bi bi-exclamation-circle"></i>' +
          "<p>No se pudo cargar este episodio.</p>" +
          '<a href="#/episodes" class="btn btn-outline-primary btn-sm">Volver a episodios</a>' +
          "</div>";
      });
  }

  /* ===== Router ===== */
  function navigate(page, params) {
    var prevPage = document.querySelector(".page.visible");
    if (prevPage) {
      prevPage.classList.remove("visible");
    }

    var target = document.getElementById("page-" + page);
    if (target) {
      target.classList.add("visible");
    }

    // collapse mobile nav
    var navCollapse = document.getElementById("navbarCollapse");
    if (navCollapse && navCollapse.classList.contains("show")) {
      var toggler = document.querySelector(".navbar-toggler");
      if (toggler) toggler.click();
    }

    document.querySelectorAll(".nav-link[data-page]").forEach(function (el) {
      el.classList.remove("active");
    });
    var navLink = document.querySelector(
      '.nav-link[data-page="' + page + '"]'
    );
    if (navLink) navLink.classList.add("active");

    var hash = page === "home" ? "" : "/" + page;
    if (page === "player" && params && params.slug) {
      hash = "/player/" + params.slug;
    }
    history.pushState({ page: page, params: params }, "", "#" + hash);

    if (page === "episodes") {
      loadEpisodes();
    } else if (page === "player" && params && params.slug) {
      loadPlayer(params.slug);
    }
  }

  /* ===== Hash parsing ===== */
  function parseHash() {
    var hash = window.location.hash.replace("#", "");
    if (!hash || hash === "/") {
      navigate("home");
      return;
    }
    var parts = hash.split("/").filter(Boolean);
    var page = parts[0];
    if (page === "player" && parts[1]) {
      navigate("player", { slug: parts[1] });
    } else if (["about", "episodes", "contact"].indexOf(page) !== -1) {
      navigate(page);
    } else {
      navigate("home");
    }
  }

  /* ===== Nav click handling ===== */
  function setupNav() {
    document.querySelectorAll(".nav-link[data-page]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        navigate(el.getAttribute("data-page"));
      });
    });
  }

  /* ===== Filter ===== */
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

  /* ===== Live Bar ===== */
  function setupLiveBar() {
    var btn = document.getElementById("live-toggle");
    var audio = document.getElementById("live-audio");
    var heroBtn = document.getElementById("hero-live-btn");

    function togglePlay() {
      if (audio.paused) {
        audio.play().catch(function () {
          // autoplay may be blocked
        });
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

  /* ===== Scroll-to-top ===== */
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
  document.addEventListener("DOMContentLoaded", function () {
    setupNav();
    setupFilter();
    setupLiveBar();
    setupScrollTop();
    parseHash();
  });
})();
