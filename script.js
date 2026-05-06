const yearNode = document.querySelector("#year");
const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");
const welcomeBanner = document.querySelector("#welcome-banner");
const welcomeClose = document.querySelector("#welcome-close");
const videoModal = document.querySelector("#video-modal");
const videoFrame = document.querySelector("#video-frame");
const videoClose = document.querySelector("#video-modal-close");
const moreProjectsToggle = document.querySelector("#more-projects-toggle");
const moreProjects = document.querySelector("#more-projects");
const moreTimelineToggle = document.querySelector("#more-timeline-toggle");
const moreTimeline = document.querySelector("#more-timeline");
const toTopButton = document.querySelector("#to-top-button");
const visitorCounter = document.querySelector("#visitor-counter");
const visitorCounterLabel = document.querySelector("#visitor-counter-label");
const visitorCounterValue = document.querySelector("#visitor-counter-value");
let welcomeTimer;

document.body.classList.remove("no-js");

if (yearNode) {
  yearNode.textContent = new Date().getFullYear();
}

const dismissWelcome = () => {
  if (!welcomeBanner) {
    return;
  }
  if (welcomeTimer) {
    window.clearTimeout(welcomeTimer);
  }
  welcomeBanner.classList.add("is-hidden");
  document.body.classList.remove("welcome-active");
  const audio = document.getElementById("bgAudio");
  if (audio) {
    audio.play().catch(e => console.log("Audio autoplay was prevented by the browser (requires user interaction first).", e));
  }
};

if (welcomeBanner) {
  document.body.classList.add("welcome-active");
  welcomeBanner.classList.remove("is-hidden");
  welcomeTimer = window.setTimeout(() => {
    dismissWelcome();
  }, 5000);
}

if (welcomeClose) {
  welcomeClose.addEventListener("click", dismissWelcome);
}

if (menuToggle && siteNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    siteNav.classList.toggle("is-open", !isOpen);
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      // Don't close menu if they just clicked the audio toggle
      if (link.id !== "audio-toggle") {
        menuToggle.setAttribute("aria-expanded", "false");
        siteNav.classList.remove("is-open");
      }
    });
  });
}

const audioToggle = document.getElementById("audio-toggle");
const bgAudio = document.getElementById("bgAudio");

if (audioToggle && bgAudio) {
  const iconPlay = document.getElementById("icon-play");
  const iconPause = document.getElementById("icon-pause");

  const setAudioState = (isPlaying) => {
    if (iconPlay && iconPause) {
      iconPlay.style.display = isPlaying ? "none" : "block";
      iconPause.style.display = isPlaying ? "block" : "none";
    }
    audioToggle.title = isPlaying ? "Pause Music" : "Play Music";
  };

  audioToggle.addEventListener("click", (e) => {
    e.preventDefault();
    if (bgAudio.paused) {
      bgAudio.play().catch(err => console.log("Audio play prevented:", err));
    } else {
      bgAudio.pause();
    }
  });

  bgAudio.addEventListener("play", () => setAudioState(true));
  bgAudio.addEventListener("pause", () => setAudioState(false));
}

if (moreProjectsToggle && moreProjects) {
  moreProjectsToggle.addEventListener("click", () => {
    const isExpanded = moreProjectsToggle.getAttribute("aria-expanded") === "true";
    moreProjectsToggle.setAttribute("aria-expanded", String(!isExpanded));
    moreProjects.classList.toggle("is-hidden", isExpanded);
    moreProjectsToggle.textContent = isExpanded ? "More" : "Less";

    if (!isExpanded) {
      moreProjects.querySelectorAll(".reveal").forEach((node) => {
        node.classList.add("is-visible");
      });
    }
  });
}

if (moreTimelineToggle && moreTimeline) {
  moreTimeline.hidden = true;
  moreTimeline.style.display = "none";
  moreTimeline.classList.add("is-hidden");
  moreTimelineToggle.setAttribute("aria-expanded", "false");

  moreTimelineToggle.addEventListener("click", () => {
    const shouldOpen = moreTimeline.hidden;

    moreTimeline.hidden = !shouldOpen ? true : false;
    moreTimeline.style.display = shouldOpen ? "grid" : "none";
    moreTimeline.classList.toggle("is-hidden", !shouldOpen);
    moreTimelineToggle.setAttribute("aria-expanded", String(shouldOpen));
    moreTimelineToggle.textContent = shouldOpen ? "Collapse" : "Expand";

    if (shouldOpen) {
      moreTimeline.querySelectorAll(".reveal").forEach((node) => {
        node.classList.add("is-visible");
      });
    }
  });
}

if (toTopButton) {
  toTopButton.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
}

async function loadContent() {
  try {
    const response = await fetch('resources/data.json');
    const data = await response.json();
    renderContent(data);
    initVisitorCounter(data.visitorCount || {});
    initDynamicInteractions();
  } catch (error) {
    console.error("Failed to load content:", error);
  }
  
  try {
    const contribResponse = await fetch('resources/contributions.json');
    const contribData = await contribResponse.json();
    
    let gitlabData = {};
    try {
      const gitlabResponse = await fetch('resources/gitlab-contributions.json');
      if (gitlabResponse.ok) {
        gitlabData = await gitlabResponse.json();
      }
    } catch (e) {
      // Silently ignore if gitlab data isn't present
    }

    renderContributions(contribData, gitlabData);
  } catch (error) {
    console.error("Failed to load contributions:", error);
    // Render empty graph if fetch fails
    renderContributions({ contributions: [] });
  }
}

function initVisitorCounter(config) {
  if (!visitorCounter || !visitorCounterLabel || !visitorCounterValue) {
    return;
  }

  if (config.label) {
    visitorCounterLabel.textContent = config.label;
  }

  if (!config.enabled || !config.endpoint) {
    return;
  }

  const controller = new AbortController();
  const timeoutMs = Number.isFinite(config.timeoutMs) ? config.timeoutMs : 4000;
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: window.location.pathname,
    }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Visitor count request failed with status ${response.status}`);
      }

      return response.json();
    })
    .then((payload) => {
      const count = Number(payload?.count);

      if (!Number.isFinite(count) || count < 0) {
        throw new Error("Visitor count response did not include a valid count");
      }

      visitorCounterValue.textContent = String(count);
      visitorCounter.hidden = false;
    })
    .catch((error) => {
      console.warn("Visitor count unavailable:", error);
    })
    .finally(() => {
      window.clearTimeout(timeoutId);
    });
}

function renderContributions(data, gitlabData = {}) {
  const graphContainer = document.getElementById('contribution-graph');
  if (!graphContainer) return;
  
  // Clear existing
  graphContainer.innerHTML = '';
  
  // Map data by date for quick lookup
  const contribMap = new Map();
  if (data && data.contributions) {
    data.contributions.forEach(item => {
      contribMap.set(item.date, item.count);
    });
  }

  // Merge GitLab contributions
  if (gitlabData) {
    for (const [date, count] of Object.entries(gitlabData)) {
      const existing = contribMap.get(date) || 0;
      contribMap.set(date, existing + count);
    }
  }

  // Generate 365 days (52 weeks * 7 days + 1)
  const today = new Date();
  const days = 365;
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - days);

  for (let i = 0; i <= days; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    
    // Format date as YYYY-MM-DD
    const dateString = currentDate.toISOString().split('T')[0];
    const count = contribMap.get(dateString) || 0;
    
    const cell = document.createElement('div');
    cell.className = 'contribution-cell';
    
    // Determine level (0 to 4)
    let level = 0;
    if (count > 0 && count <= 3) level = 1;
    else if (count > 3 && count <= 6) level = 2;
    else if (count > 6 && count <= 9) level = 3;
    else if (count > 9) level = 4;
    
    cell.classList.add(`level-${level}`);
    
    // Add tooltip
    const displayDate = currentDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const tooltipText = count === 0 ? `No contributions on ${displayDate}` : `${count} contribution${count > 1 ? 's' : ''} on ${displayDate}`;
    cell.setAttribute('data-tooltip', tooltipText);
    
    graphContainer.appendChild(cell);
  }
}

function renderContent(data) {
  if (data.theme) {
    for (const [key, value] of Object.entries(data.theme)) {
      document.documentElement.style.setProperty(key, value);
    }
  }

  document.getElementById('hero-eyebrow').textContent = data.hero.eyebrow;
  document.getElementById('hero-headline').textContent = data.hero.headline;
  document.getElementById('hero-text').textContent = data.hero.text;
  document.getElementById('hero-focus-label').textContent = data.hero.focusLabel;
  
  const focusList = document.getElementById('hero-focus-list');
  data.hero.focusList.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    focusList.appendChild(li);
  });
  
  const metricsContainer = document.getElementById('hero-metrics');
  data.hero.metrics.forEach(metric => {
    const div = document.createElement('div');
    div.innerHTML = `<strong>${metric.value}</strong><span>${metric.label}</span>`;
    metricsContainer.appendChild(div);
  });

  document.getElementById('about-eyebrow').textContent = data.about.eyebrow;
  document.getElementById('about-headline').textContent = data.about.headline;
  
  const aboutParagraphs = document.getElementById('about-paragraphs');
  data.about.paragraphs.forEach(text => {
    const p = document.createElement('p');
    p.textContent = text;
    aboutParagraphs.appendChild(p);
  });
  
  document.getElementById('about-core-strengths-title').textContent = data.about.coreStrengthsTitle;
  const coreStrengths = document.getElementById('about-core-strengths');
  data.about.coreStrengths.forEach(tag => {
    const li = document.createElement('li');
    li.textContent = tag;
    coreStrengths.appendChild(li);
  });

  document.getElementById('projects-eyebrow').textContent = data.projects.eyebrow;
  document.getElementById('projects-headline').textContent = data.projects.headline;
  
  const renderProject = (p, isWide) => {
    const linksHtml = p.links.map(link => {
      if (link.type === 'video') {
        return `<button class="button button-secondary project-link video-trigger" type="button" data-video-url="${link.videoUrl}">${link.text}</button>`;
      }
      return `<a class="button button-secondary project-link" href="${link.url}">${link.text}</a>`;
    }).join('');

    const tagsHtml = p.tags.map(tag => `<li>${tag}</li>`).join('');

    if (isWide) {
      return `
        <article class="project-card project-card-wide reveal">
          <div class="project-card-wide-main">
            <p class="project-index">${p.index}</p>
            <h3>${p.title}</h3>
            <p>${p.description}</p>
          </div>
          <div class="project-card-wide-side">
            <ul class="tag-list">${tagsHtml}</ul>
            <div class="project-links">${linksHtml}</div>
          </div>
        </article>
      `;
    }
    
    return `
      <article class="project-card reveal">
        <p class="project-index">${p.index}</p>
        <h3>${p.title}</h3>
        <p>${p.description}</p>
        <ul class="tag-list">${tagsHtml}</ul>
        <div class="project-links">${linksHtml}</div>
      </article>
    `;
  };

  document.getElementById('projects-featured').innerHTML = data.projects.featured.map(p => renderProject(p, false)).join('');
  document.getElementById('more-projects').innerHTML = data.projects.more.map(p => renderProject(p, true)).join('');

  document.getElementById('experience-eyebrow').textContent = data.experience.eyebrow;
  document.getElementById('experience-headline').textContent = data.experience.headline;
  
  const renderExperience = (exp) => {
    return `
      <article class="timeline-item reveal">
        <p class="timeline-year">${exp.year}</p>
        <div>
          <h3>${exp.title}</h3>
          ${exp.date ? `<p>${exp.date}</p>` : ''}
          <p>${exp.description}</p>
        </div>
      </article>
    `;
  };

  document.getElementById('experience-featured').innerHTML = data.experience.featured.map(renderExperience).join('');
  document.getElementById('more-timeline').innerHTML = data.experience.more.map(renderExperience).join('');

  document.getElementById('contact-eyebrow').textContent = data.contact.eyebrow;
  document.getElementById('contact-headline').textContent = data.contact.headline;
  
  const contactParagraphs = document.getElementById('contact-paragraphs');
  data.contact.paragraphs.forEach(text => {
    const p = document.createElement('p');
    p.textContent = text;
    contactParagraphs.appendChild(p);
  });
  
  const contactLinks = document.getElementById('contact-links');
  data.contact.links.forEach(link => {
    const a = document.createElement('a');
    a.href = link.url;
    if (link.target) a.target = link.target;
    if (link.rel) a.rel = link.rel;
    
    const img = document.createElement('img');
    img.src = link.icon;
    img.alt = link.alt;
    
    a.appendChild(img);
    a.appendChild(document.createTextNode(link.text));
    contactLinks.appendChild(a);
  });
}

function initDynamicInteractions() {
  const videoTriggers = document.querySelectorAll(".video-trigger");
  
  const closeVideoModal = () => {
    if (!videoModal || !videoFrame) return;
    videoModal.classList.add("is-hidden");
    videoModal.setAttribute("aria-hidden", "true");
    videoFrame.src = "";
    document.body.style.overflow = "";
  };

  if (videoModal && videoFrame && videoTriggers.length > 0) {
    videoTriggers.forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const videoUrl = trigger.getAttribute("data-video-url");
        if (!videoUrl) return;

        let embedUrl = videoUrl;
        
        if (videoUrl.includes("youtube.com/watch?v=")) {
          const videoId = new URL(videoUrl).searchParams.get("v");
          embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
        } else if (videoUrl.includes("youtu.be/")) {
          const videoId = videoUrl.split("youtu.be/")[1].split("?")[0];
          embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
        } else if (videoUrl.includes("vimeo.com/")) {
          const videoId = videoUrl.split("vimeo.com/")[1].split("/")[0];
          embedUrl = `https://player.vimeo.com/video/${videoId}?autoplay=1`;
        }

        videoFrame.src = embedUrl;
        videoModal.classList.remove("is-hidden");
        videoModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
      });
    });

    videoModal.addEventListener("click", (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.dataset.closeVideo === "true") {
        closeVideoModal();
      }
    });

    if (videoClose) {
      videoClose.addEventListener("click", closeVideoModal);
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !videoModal.classList.contains("is-hidden")) {
        closeVideoModal();
      }
    });
  }

  const revealNodes = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  revealNodes.forEach((node) => observer.observe(node));
}

loadContent();
