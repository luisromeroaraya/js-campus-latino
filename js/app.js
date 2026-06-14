(function () {
  "use strict";

  /* ===== State ===== */
  var state = {
    episodes: [],
    filterText: "",
  };

  /* ===== API ===== */
  function getEpisodes(url, episodes) {
    return fetch(url)
      .then(function (res) {
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
        if (json.paging.next) {
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
    return h + "h" + m + "m";
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
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
        '<div class="col-12 text-center"><p>No se encontraron episodios.</p></div>';
      return;
    }

    container.innerHTML = filtered
      .map(function (ep) {
        return (
          '<a href="#/player/' +
          escapeHtml(ep.slug) +
          '" class="text-decoration-none" style="display:block; max-width:540px; margin:0 auto">' +
          '<div class="card mb-3">' +
          '<div class="row g-0">' +
          '<div class="col-md-4">' +
          '<img src="' +
          escapeHtml(ep.pictures.large) +
          '" alt="' +
          escapeHtml(ep.name) +
          '" class="img-fluid">' +
          "</div>" +
          '<div class="col-md-8">' +
          '<div class="card-body">' +
          '<h5 class="card-title">' +
          escapeHtml(ep.name) +
          "</h5>" +
          '<p class="card-text">' +
          '<i class="bi bi-play"></i> Reproducciones: ' +
          ep.play_count +
          "<br>" +
          '<i class="bi bi-clock"></i> Duraci&oacute;n: ' +
          formatDuration(ep.audio_length) +
          "</p>" +
          '<p class="card-text">' +
          '<small class="text-muted">Fecha de subida: ' +
          formatDate(ep.updated_time) +
          "</small>" +
          "</p>" +
          "</div>" +
          "</div>" +
          "</div>" +
          "</div>" +
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
      '<div class="card my-2" style="max-width: 800px; margin: auto">' +
      '<div class="row g-0">' +
      '<div class="col">' +
      '<div class="card-body">' +
      '<h5 class="card-title">' +
      '<iframe src="https://www.mixcloud.com/widget/iframe/?feed=https://www.mixcloud.com/radiocampusbruxelles/' +
      escapeHtml(data.slug) +
      '/&hide_cover=1" style="border: 0; width: 100%; height: 120px" allowfullscreen scrolling="no" allow="encrypted-media"></iframe>' +
      "</h5>" +
      '<p class="card-text"><i class="bi bi-play"></i> Reproducciones: ' +
      (data.play_count || 0) +
      "</p>" +
      '<p class="card-text">' +
      (data.description || "") +
      "</p>" +
      '<p class="card-text"><small class="text-muted">Fecha de subida: ' +
      formatDate(data.updated_time) +
      "</small></p>" +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>" +
      '<p class="text-center"><a href="#/episodes">Volver Atr&aacute;s</a></p>';
  }

  /* ===== Page loaders ===== */
  function loadEpisodes() {
    if (state.episodes.length === 0) {
      var container = document.getElementById("episode-list");
      if (container) {
        container.innerHTML =
          '<div class="col-12 text-center"><p>Cargando episodios...</p></div>';
      }
      fetchAllEpisodes().then(function (eps) {
        state.episodes = eps;
        renderEpisodes();
      });
    } else {
      renderEpisodes();
    }
  }

  function loadPlayer(slug) {
    var container = document.getElementById("player-content");
    if (container) {
      container.innerHTML =
        '<p class="text-center">Cargando...</p>';
    }
    fetchData(slug).then(function (data) {
      renderPlayer(data);
    });
  }

  /* ===== Router ===== */
  function navigate(page, params) {
    document.querySelectorAll(".page").forEach(function (el) {
      el.style.display = "none";
    });

    var target = document.getElementById("page-" + page);
    if (target) {
      target.style.display = "block";
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

  /* ===== Event listeners ===== */
  function setupNav() {
    document.querySelectorAll(".nav-link[data-page]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        navigate(el.getAttribute("data-page"));
      });
    });
  }

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

  window.addEventListener("popstate", function () {
    parseHash();
  });

  /* ===== Init ===== */
  document.addEventListener("DOMContentLoaded", function () {
    setupNav();
    setupFilter();
    parseHash();
  });
})();
