// Global variables
let videoClosing = false; // Flag to block image interactions immediately after closing a video
let audioPlayers = {};
let youtubeTimeout, youtubePlayer, youtubeContainer, openYouTubeButton;
let localVideo, videoContainer, popupOverlay, popup, warningOverlay;

document.addEventListener("DOMContentLoaded", () => {
  // Loading screen elements
  const loadingScreen = document.getElementById("loading-screen");
  const startButton = document.getElementById("start-button");
  const loadingContainer = document.getElementById("loading-container");
  const loadingAudio = new Audio("audio/lorerings.mp3");

  // Fade in background and start button if a background image exists
  const loadingBg = document.getElementById("loading-bg");
  if (loadingBg) {
    requestAnimationFrame(() => {
      loadingBg.style.opacity = 1;
    });
    setTimeout(() => {
      startButton.style.opacity = 1;
    }, 1000);
  }

  startButton.addEventListener("click", () => {
    // Fade the background image to black immediately
    if (loadingBg) {
      loadingBg.style.transition = "opacity 0.5s ease";
      loadingBg.style.opacity = 0;
    }
    startButton.style.display = "none";
    loadingContainer.style.display = "flex";
    loadingAudio.play().catch(e => console.log("Audio play error:", e));
  });

  loadingAudio.addEventListener("ended", () => {
    loadingScreen.classList.add("fade-out");
    setTimeout(() => {
      if (loadingScreen.parentNode) loadingScreen.parentNode.removeChild(loadingScreen);
    }, 1000);
  });
});


// Utility: Check transparent pixel
function isTransparent(e, img) {
  if (!img.complete || img.naturalWidth === 0) return false;
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const rect = img.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (img.naturalWidth / rect.width);
  const y = (e.clientY - rect.top) * (img.naturalHeight / rect.height);
  const pixel = ctx.getImageData(x, y, 1, 1).data;
  return pixel[3] === 0;
}

// DOMContentLoaded: Initialize interactions
document.addEventListener("DOMContentLoaded", async () => {
  const collage = document.getElementById("collage");
  popupOverlay = document.getElementById("popup-overlay");
  popup = document.getElementById("popup");
  warningOverlay = document.getElementById("warning-overlay");
  youtubeContainer = document.getElementById("youtube-container");
  youtubePlayer = document.getElementById("youtube-player");
  openYouTubeButton = document.getElementById("open-youtube");
  videoContainer = document.getElementById("video-container");
  localVideo = document.getElementById("local-video");

  document.addEventListener("click", (e) => {
    if (
      (youtubeContainer.style.display === "block" || videoContainer.style.display === "block") &&
      !youtubeContainer.contains(e.target) &&
      !videoContainer.contains(e.target)
    ) {
      youtubeContainer.style.display = "none";
      youtubePlayer.src = "";
      clearTimeout(youtubeTimeout);
      videoContainer.style.display = "none";
      localVideo.pause();
      localVideo.src = "";
      videoClosing = true;
      setTimeout(() => {
        videoClosing = false;
      }, 500); // blocks for 500ms (0.5 seconds) // Set flag so that this same click does not trigger image interaction
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);
  popupOverlay.addEventListener("click", (e) => {
    if (e.target === popupOverlay) {
      popupOverlay.style.display = "none";
      popup.innerHTML = "";
    }
  });
  document.getElementById("close-youtube").addEventListener("click", () => {
    youtubeContainer.style.display = "none";
    youtubePlayer.src = "";
    clearTimeout(youtubeTimeout);
  });
  document.getElementById("close-video").addEventListener("click", () => {
    videoContainer.style.display = "none";
    localVideo.pause();
    localVideo.src = "";
  });
  openYouTubeButton.addEventListener("click", () => {
    window.open(openYouTubeButton.dataset.url, "_blank");
  });

  // Load images
  try {
    const response = await fetch("images.json");
    const images = await response.json();
    const baseWidth = 1600, baseHeight = 2000;
    images.forEach(image => {
      const img = document.createElement("img");
      img.src = `images/${image.filename}`;
      img.classList.add("layer");
      img.style.left = (image.x / baseWidth) * 100 + "%";
      img.style.top = (image.y / baseHeight) * 100 + "%";
      img.style.width = (image.width / baseWidth) * 100 + "%";
      img.style.height = (image.height / baseHeight) * 100 + "%";
      if (image.opacity !== undefined) img.style.opacity = image.opacity;
      if (image.visible === false) img.style.display = "none";
      if (image.id) img.id = image.id; // Set the id from JSON
      img.myData = image;
      collage.appendChild(img);
    });
  } catch (error) {
    console.error("Error loading images:", error);
  }

  // Collage click event
  collage.addEventListener("click", (e) => {
    if (videoClosing) {
      videoClosing = false; // reset the flag and ignore this click for image interaction
      return;
    }
    const elems = document.elementsFromPoint(e.clientX, e.clientY);
    for (let elem of elems) {
      if (elem.tagName.toLowerCase() === "img" && elem.classList.contains("layer")) {
        if (!isTransparent(e, elem)) {
          const data = elem.myData;
          if (data) {
            if (data.zoom) {
              document.querySelectorAll(".layer").forEach(i => i.classList.remove("focused"));
              elem.classList.add("focused");
            }
            handleInteraction(data, elem);
          }
          break;
        }
      }
    }
  });
});

// Utility: Convert a time string to seconds
function convertToSeconds(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(timeStr);
}

// Process actions (full code from original)
function processAction(action, clickedImg) {
  if (action.type === "text") {
    // Clear previous popup content
    popup.innerHTML = "";
  
    // Main flex container for the image + text
    const container = document.createElement("div");
    container.classList.add("popup-content");
  
    // Image container
    const imgContainer = document.createElement("div");
    imgContainer.classList.add("popup-img-container");
  
    // Actual popup image
    const refImg = document.createElement("img");
    refImg.classList.add("popup-img");
    // Use popupImage if provided; otherwise, fallback to clicked image.
    refImg.src = action.popupImage ? `images/${action.popupImage}` : clickedImg.src;
  
    // If the action specifies enlargement, add a click handler to refImg:
    if (action.enlargePopupImage) {
      refImg.style.cursor = "pointer"; // indicate it's clickable
      refImg.addEventListener("click", () => {
        // Hide the current popup overlay.
        popupOverlay.style.display = "none";
  
        // Create a new overlay for the enlarged image.
        const enlargedOverlay = document.createElement("div");
        enlargedOverlay.style.position = "fixed";
        enlargedOverlay.style.top = 0;
        enlargedOverlay.style.left = 0;
        enlargedOverlay.style.width = "100vw";
        enlargedOverlay.style.height = "100vh";
        enlargedOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
        enlargedOverlay.style.display = "flex";
        enlargedOverlay.style.alignItems = "center";
        enlargedOverlay.style.justifyContent = "center";
        enlargedOverlay.style.zIndex = "9999";
  
        // Create the enlarged image.
        const enlargedImg = document.createElement("img");
        enlargedImg.src = refImg.src;
        // Allow the image to show at its natural size up to a max.
        enlargedImg.style.maxWidth = "90%";
        enlargedImg.style.maxHeight = "90%";
        //enlargedImg.style.boxShadow = "0 0 20px rgba(0,255,255,0.8)"; // example glowing effect
        // (If you need a keyframe-based glow on the transparent edges, you can add that via CSS as well.)
        
        enlargedOverlay.appendChild(enlargedImg);
        document.body.appendChild(enlargedOverlay);
  
        // Clicking outside the enlarged image (on the overlay) will remove the enlarged overlay and show the popup again.
        enlargedOverlay.addEventListener("click", (e) => {
          if (e.target === enlargedOverlay) {
            document.body.removeChild(enlargedOverlay);
            popupOverlay.style.display = "flex";
          }
        });
      });
    }
  
    imgContainer.appendChild(refImg);
    container.appendChild(imgContainer);
  
    // Text container
    const textContainer = document.createElement("div");
    textContainer.classList.add("popup-text-container");
  
    // Optional popup title
    if (action.popupTitle) {
      const titleElem = document.createElement("h2");
      titleElem.innerText = action.popupTitle;
      if (action.popupTitleFont) titleElem.style.fontFamily = action.popupTitleFont;
      if (action.popupTitleSize) titleElem.style.fontSize = action.popupTitleSize;
      textContainer.appendChild(titleElem);
    }
  
    // Optional popup body
    if (action.popupBody) {
      const bodyElem = document.createElement("p");
      bodyElem.innerHTML = action.popupBody;
      if (action.popupBodyFont) bodyElem.style.fontFamily = action.popupBodyFont;
      if (action.popupBodySize) bodyElem.style.fontSize = action.popupBodySize;
      textContainer.appendChild(bodyElem);
    }
  
    // Fallback if no title/body specified
    if (!action.popupTitle && !action.popupBody) {
      const fallbackElem = document.createElement("div");
      fallbackElem.innerHTML = action.popupMessage ? action.popupMessage : action.content;
      textContainer.appendChild(fallbackElem);
    }
  
    container.appendChild(textContainer);
    popup.appendChild(container);
  
    // Finally, show the popup overlay.
    popupOverlay.style.display = "flex";
  
    // When clicking outside the popup content, close the popup (as before).
    popupOverlay.addEventListener("click", (e) => {
      if (e.target === popupOverlay) {
        popupOverlay.style.display = "none";
        popup.innerHTML = "";
      }
    });
  }else if (action.type === "audio") {
    if (!audioPlayers[action.file]) audioPlayers[action.file] = new Audio(`audio/${action.file}`);
    const audio = audioPlayers[action.file];
    if (!audio.paused) { audio.pause(); audio.currentTime = 0; }
    else { audio.play(); }
  }else if (action.type === "youtube") {
    const startSec = convertToSeconds(action.startTime);
    youtubePlayer.src = `https://www.youtube.com/embed/${action.videoId}?start=${startSec}&autoplay=1&enablejsapi=1`;
    youtubeContainer.style.display = "block";
    if (action.endTime) {
      const duration = (convertToSeconds(action.endTime) - startSec) * 1000;
      youtubeTimeout = setTimeout(() => {
        youtubeContainer.style.display = "none";
        youtubePlayer.src = "";
      }, duration);
    }
  }else if (action.type === "video") {
    localVideo.src = `videos/${action.file}`;
    videoContainer.style.display = "block";
    localVideo.play();
  }else if (action.type === "redirect") {
    window.open(action.url, "_blank");
  }else if (action.type === "blackout") {
    const collageElem = document.getElementById("collage");
    const audio = new Audio(`audio/${action.file}`);
    let startTimeAnim = Date.now();
    let state = false;
    if (clickedImg._blackoutActive) {
      clickedImg._blackoutActive.cancel();
      delete clickedImg._blackoutActive;
      return;
    }
    let cancelled = false;
    function flicker() {
      if (cancelled) return;
      let elapsed = Date.now() - startTimeAnim;
      if (elapsed >= 5000) {
        collageElem.style.filter = "brightness(0.3)";
        setTimeout(() => { collageElem.style.filter = "brightness(1)"; }, 4000);
        delete clickedImg._blackoutActive;
        return;
      }
      let delay = 200 - (150 * (elapsed / 5000));
      state = !state;
      collageElem.style.filter = state ? "brightness(0.3)" : "brightness(1)";
      clickedImg._blackoutActive.timer = setTimeout(flicker, delay);
    }
    clickedImg._blackoutActive = {
      timer: null,
      cancel: function() {
        clearTimeout(this.timer);
        collageElem.style.filter = "";
        audio.pause();
      }
    };
    flicker();
    audio.play();
  }else if (action.type === "circle") {
    if (clickedImg._circleActive) {
      clickedImg._circleActive.cancel();
      delete clickedImg._circleActive;
      return;
    }
    const audio = new Audio(`audio/${action.file}`);
    const originalTransform = clickedImg.style.transform || "";
    const radius = 400, animDuration = 5000, rotations = 4;
    const startAnim = performance.now();
    let cancelled = false;
    function animateCircle(timestamp) {
      if (cancelled) return;
      let progress = (timestamp - startAnim) / animDuration;
      if (progress > 1) progress = 1;
      const angle = progress * rotations * 2 * Math.PI;
      const offsetX = radius * Math.cos(angle);
      const offsetY = radius * Math.sin(angle);
      clickedImg.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
      if (progress < 1) {
        clickedImg._circleActive.id = requestAnimationFrame(animateCircle);
      } else {
        clickedImg.style.transform = originalTransform;
        delete clickedImg._circleActive;
      }
    }
    clickedImg._circleActive = {
      id: requestAnimationFrame(animateCircle),
      cancel: function() {
        cancelled = true;
        cancelAnimationFrame(this.id);
        clickedImg.style.transform = originalTransform;
        audio.pause();
      }
    };
    audio.play();
  }else if (action.type === "walk") {
    if (clickedImg._walkActive) {
      clickedImg._walkActive.cancel();
      delete clickedImg._walkActive;
      return;
    }
    const audio = new Audio(`audio/${action.file}`);
    const originalTransform = clickedImg.style.transform || "";
    const originalZ = clickedImg.style.zIndex || "";
    // Bring image to the top layer for the duration of the walk
    clickedImg.style.zIndex = "10000";
    const animDuration = 6000;
    const frameElem = document.getElementById("frame");
    const frameRect = frameElem.getBoundingClientRect();
    const frameWidth = frameElem.clientWidth;
    const imgRect = clickedImg.getBoundingClientRect();
    const currentLeft = imgRect.left - frameRect.left;
    const distance = frameWidth - currentLeft + 100;
    const startAnim = performance.now();
    let cancelled = false;
    
    function animateWalk(timestamp) {
      if (cancelled) return;
      let progress = (timestamp - startAnim) / animDuration;
      if (progress > 1) progress = 1;
      const translateX = progress * distance;
      const wobbleY = 30 * Math.sin(progress * 8 * Math.PI);
      clickedImg.style.transform = `translate(${translateX}px, ${wobbleY}px)`;
      if (progress < 1) {
        clickedImg._walkActive.id = requestAnimationFrame(animateWalk);
      } else {
        // Animation complete: restore original transform and z-index
        clickedImg.style.transform = originalTransform;
        clickedImg.style.zIndex = originalZ;
        delete clickedImg._walkActive;
      }
    }
    
    clickedImg._walkActive = {
      id: requestAnimationFrame(animateWalk),
      cancel: function() {
        cancelled = true;
        cancelAnimationFrame(this.id);
        clickedImg.style.transform = originalTransform;
        clickedImg.style.zIndex = originalZ;
        audio.pause();
      }
    };
    
    audio.play();
  }else if (action.type === "centerCircle") {
    if (clickedImg._centerCircleActive) {
      clickedImg._centerCircleActive.cancel();
      delete clickedImg._centerCircleActive;
      return;
    }
    const audio = action.file ? new Audio(`audio/${action.file}`) : null;
    const originalTransform = clickedImg.style.transform || "";
    const originalZ = clickedImg.style.zIndex || "";
    clickedImg.style.zIndex = 1000;
    const collageElem = document.getElementById("collage");
    const collageRect = collageElem.getBoundingClientRect();
    const imgRect = clickedImg.getBoundingClientRect();
    const imageCenterX = imgRect.left + imgRect.width / 2;
    const imageCenterY = imgRect.top + imgRect.height / 2;
    const collageCenterX = collageRect.left + collageRect.width / 2;
    const collageCenterY = collageRect.top + collageRect.height / 2;
    const dx = collageCenterX - imageCenterX;
    const dy = collageCenterY - imageCenterY;
    let cancelled = false;
    function animateTranslation(startX, startY, endX, endY, duration, callback) {
      const startTime = performance.now();
      function step(timestamp) {
        if (cancelled) return;
        let progress = (timestamp - startTime) / duration;
        if (progress > 1) progress = 1;
        const currentX = startX + (endX - startX) * progress;
        const currentY = startY + (endY - startY) * progress;
        clickedImg.style.transform = `translate(${currentX}px, ${currentY}px)`;
        if (progress < 1) requestAnimationFrame(step);
        else callback();
      }
      requestAnimationFrame(step);
    }
    function animateCircle(radius, duration, callback) {
      const startTime = performance.now();
      function step(timestamp) {
        if (cancelled) return;
        let progress = (timestamp - startTime) / duration;
        if (progress > 1) progress = 1;
        const angle = progress * 2 * Math.PI;
        const offsetX = dx + radius * Math.cos(angle);
        const offsetY = dy + radius * Math.sin(angle);
        clickedImg.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        if (progress < 1) requestAnimationFrame(step);
        else callback();
      }
      requestAnimationFrame(step);
    }
    clickedImg._centerCircleActive = {
      cancel: function() {
        cancelled = true;
        clickedImg.style.transform = originalTransform;
        clickedImg.style.zIndex = originalZ;
        if (audio) audio.pause();
      }
    };
    animateTranslation(0, 0, dx, dy, 1000, () => {
      animateCircle(150, 2000, () => {
        animateTranslation(dx, dy, 0, 0, 1000, () => {
          clickedImg.style.zIndex = originalZ;
          delete clickedImg._centerCircleActive;
        });
      });
    });
    if (audio) audio.play();
  }else if (action.type === "alarm") {
    const collageElem = document.getElementById("collage");
    const audio = new Audio(`audio/${action.file}`);
    let startTimeAnim = Date.now();
    if (clickedImg._alarmActive) {
      clickedImg._alarmActive.cancel();
      delete clickedImg._alarmActive;
      return;
    }
    let cancelled = false;
    function flashAlarm() {
      if (cancelled) return;
      let elapsed = Date.now() - startTimeAnim;
      if (elapsed >= 6026) {
        collageElem.style.filter = "";
        delete clickedImg._alarmActive;
        return;
      }
      let toggle = Math.floor(elapsed / 100) % 2 === 0;
      collageElem.style.filter = toggle ? "brightness(0.7) sepia(1) saturate(20) hue-rotate(-10deg)" : "";
      clickedImg._alarmActive.timer = setTimeout(flashAlarm, 100);
    }
    clickedImg._alarmActive = {
      timer: null,
      cancel: function() {
        clearTimeout(this.timer);
        collageElem.style.filter = "";
        audio.pause();
      }
    };
    flashAlarm();
    audio.play();
  }else if (action.type === "warningRedirect") {
    warningOverlay.innerHTML = "";
    const warningContainer = document.createElement("div");
    warningContainer.style.background = "white";
    warningContainer.style.color = "black";
    warningContainer.style.border = "4px solid red";
    warningContainer.style.padding = "20px";
    warningContainer.style.borderRadius = "10px";
    warningContainer.style.textAlign = "center";
    if (action.warningTitle) {
      const titleElem = document.createElement("h2");
      titleElem.innerText = action.warningTitle;
      if (action.warningTitleFont) titleElem.style.fontFamily = action.warningTitleFont;
      if (action.warningTitleSize) titleElem.style.fontSize = action.warningTitleSize;
      warningContainer.appendChild(titleElem);
    }
    const bodyElem = document.createElement("p");
    let bodyText = action.warningBody ? action.warningBody : "You will be redirected in";
    bodyElem.innerHTML = bodyText;
    if (action.warningBodyFont) bodyElem.style.fontFamily = action.warningBodyFont;
    if (action.warningBodySize) bodyElem.style.fontSize = action.warningBodySize;
    const countdownSpan = document.createElement("span");
    let countdown = 10;
    countdownSpan.innerText = " " + countdown;
    bodyElem.appendChild(countdownSpan);
    bodyElem.appendChild(document.createTextNode(" segundos."));
    warningContainer.appendChild(bodyElem);
    warningOverlay.appendChild(warningContainer);
    warningOverlay.style.display = "flex";
    function cancelRedirect(e) {
      if (e.target === warningOverlay) {
        clearInterval(warningOverlay._warningTimer);
        warningOverlay.style.display = "none";
        warningOverlay.innerHTML = "";
        warningOverlay.removeEventListener("pointerdown", cancelRedirect);
      }
    }
    warningOverlay.addEventListener("pointerdown", cancelRedirect);
    const audio = action.file ? new Audio(`audio/${action.file}`) : null;
    if (audio) audio.play();
    warningOverlay._warningTimer = setInterval(() => {
      countdown--;
      countdownSpan.innerText = " " + countdown;
      if (countdown <= 0) {
        clearInterval(warningOverlay._warningTimer);
        window.open(action.redirectUrl ? action.redirectUrl : "https://default.url", "_blank");
        warningOverlay.style.display = "none";
        warningOverlay.innerHTML = "";
      }
    }, 1000);
  }else if (action.type === "growCenter") {
    if (clickedImg._growCenterActive) {
      clickedImg._growCenterActive.cancel();
      delete clickedImg._growCenterActive;
      return;
    }
    const originalTransform = clickedImg.style.transform || "";
    const originalZ = clickedImg.style.zIndex || "";
    clickedImg.style.zIndex = 1000;
    const totalDuration = action.duration ? Number(action.duration) : 10000;
    const halfDuration = totalDuration / 2;
    const maxScale = action.maxScale ? Number(action.maxScale) : 2;
    let cancelled = false;
    function animateGrow(startTime, callback) {
      function step(timestamp) {
        if (cancelled) return;
        let progress = (timestamp - startTime) / halfDuration;
        if (progress > 1) progress = 1;
        let scale = 1 + (maxScale - 1) * progress;
        clickedImg.style.transform = `scale(${scale})`;
        if (progress < 1) requestAnimationFrame(step);
        else callback();
      }
      requestAnimationFrame(step);
    }
    function animateShrink(startTime, callback) {
      function step(timestamp) {
        if (cancelled) return;
        let progress = (timestamp - startTime) / halfDuration;
        if (progress > 1) progress = 1;
        let scale = maxScale - (maxScale - 1) * progress;
        clickedImg.style.transform = `scale(${scale})`;
        if (progress < 1) requestAnimationFrame(step);
        else callback();
      }
      requestAnimationFrame(step);
    }
    clickedImg._growCenterActive = {
      cancel: function() {
        cancelled = true;
        clickedImg.style.transform = originalTransform;
        clickedImg.style.zIndex = originalZ;
      }
    };
    const growStart = performance.now();
    animateGrow(growStart, () => {
      const shrinkStart = performance.now();
      animateShrink(shrinkStart, () => {
        clickedImg.style.zIndex = originalZ;
        delete clickedImg._growCenterActive;
      });
    });
    if (action.file) {
      const audio = new Audio(`audio/${action.file}`);
      audio.play();
    }
  }else if (action.type === "shrinkCenter") {
    if (clickedImg._shrinkCenterActive) {
      clickedImg._shrinkCenterActive.cancel();
      delete clickedImg._shrinkCenterActive;
      return;
    }
    const originalTransform = clickedImg.style.transform || "";
    const originalZ = clickedImg.style.zIndex || "";
    clickedImg.style.zIndex = 1000;
    const totalDuration = action.duration ? Number(action.duration) : 10000;
    const halfDuration = totalDuration / 2;
    const minScale = action.minScale ? Number(action.minScale) : 0.5;
    let cancelled = false;
    function animateShrink(startTime, callback) {
      function step(timestamp) {
        if (cancelled) return;
        let progress = (timestamp - startTime) / halfDuration;
        if (progress > 1) progress = 1;
        let scale = 1 - (1 - minScale) * progress;
        clickedImg.style.transform = `scale(${scale})`;
        if (progress < 1) requestAnimationFrame(step);
        else callback();
      }
      requestAnimationFrame(step);
    }
    function animateReturn(startTime, callback) {
      function step(timestamp) {
        if (cancelled) return;
        let progress = (timestamp - startTime) / halfDuration;
        if (progress > 1) progress = 1;
        let scale = minScale + (1 - minScale) * progress;
        clickedImg.style.transform = `scale(${scale})`;
        if (progress < 1) requestAnimationFrame(step);
        else callback();
      }
      requestAnimationFrame(step);
    }
    clickedImg._shrinkCenterActive = {
      cancel: function() {
        cancelled = true;
        clickedImg.style.transform = originalTransform;
        clickedImg.style.zIndex = originalZ;
      }
    };
    const shrinkStart = performance.now();
    animateShrink(shrinkStart, () => {
      const returnStart = performance.now();
      animateReturn(returnStart, () => {
        clickedImg.style.zIndex = originalZ;
        delete clickedImg._shrinkCenterActive;
      });
    });
    if (action.file) {
      const audio = new Audio(`audio/${action.file}`);
      audio.play();
    }
  }else if (action.type === "centerFire") {
    if (clickedImg._centerFireActive) {
      clickedImg._centerFireActive.cancel();
      delete clickedImg._centerFireActive;
      return;
    }
    const collageElem = document.getElementById("collage");
    const computedStyle = window.getComputedStyle(clickedImg);
    const originalTransform = computedStyle.transform === "none" ? "" : computedStyle.transform;
    const originalZ = clickedImg.style.zIndex || "";
    clickedImg.style.zIndex = 1100;
    const collageRect = collageElem.getBoundingClientRect();
    const imgRect = clickedImg.getBoundingClientRect();
    const collageCenterX = collageRect.left + collageRect.width / 2;
    const collageCenterY = collageRect.top + collageRect.height / 2;
    const imgCenterX = imgRect.left + imgRect.width / 2;
    const imgCenterY = imgRect.top + imgRect.height / 2;
    const dx = collageCenterX - imgCenterX;
    const dy = collageCenterY - imgCenterY;
    const moveDuration = action.moveDuration ? Number(action.moveDuration) : 2000;
    const stayDuration = action.stayDuration ? Number(action.stayDuration) : 5000;
    const rotationDuration = action.rotationDuration ? Number(action.rotationDuration) : 1000;
    const targetRotation = action.rotationDegree ? Number(action.rotationDegree) : 15;
    let cancelled = false;
    const moveStart = performance.now();
    function animateToCenter(timestamp) {
      if (cancelled) return;
      let progress = (timestamp - moveStart) / moveDuration;
      if (progress > 1) progress = 1;
      const currentX = dx * progress;
      const currentY = dy * progress;
      clickedImg.style.transform = `translate(${currentX}px, ${currentY}px)`;
      if (progress < 1) requestAnimationFrame(animateToCenter);
      else {
        clickedImg.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(() => {
          const rotationStart = performance.now();
          function animateRotation(ts) {
            if (cancelled) return;
            let rProgress = (ts - rotationStart) / rotationDuration;
            if (rProgress > 1) rProgress = 1;
            const angle = rProgress * targetRotation;
            clickedImg.style.transform = `translate(${dx}px, ${dy}px) rotate(${angle}deg)`;
            if (rProgress < 1) requestAnimationFrame(animateRotation);
          }
          requestAnimationFrame(animateRotation);
        });
        const darkOverlay = document.createElement("div");
        darkOverlay.style.cssText =
          "position:absolute;top:0;left:0;width:100%;height:100%;background-color:black;opacity:0;z-index:900;transition:opacity 1s ease-in-out;";
        collageElem.appendChild(darkOverlay);
        setTimeout(() => { darkOverlay.style.opacity = "0.8"; }, 50);
        const fireGif = document.createElement("img");
        fireGif.src = action.gif;
        fireGif.className = "center-fire-gif";
        fireGif.style.cssText = "position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); opacity: 0; transition: opacity 1s ease-in-out; z-index: 1050;"
        collageElem.appendChild(fireGif);
        setTimeout(() => { fireGif.style.opacity = "1"; }, 50);
        let fireAudio;
        if (action.file) {
          fireAudio = new Audio(`audio/${action.file}`);
          fireAudio.play();
        }
        const stayTimer = setTimeout(() => {
          darkOverlay.style.opacity = "0";
          fireGif.style.opacity = "0";
          clickedImg.style.transition = "transform 0.5s ease-in-out";
          clickedImg.style.transform = originalTransform;
          setTimeout(() => {
            if (darkOverlay.parentElement) darkOverlay.parentElement.removeChild(darkOverlay);
            if (fireGif.parentElement) fireGif.parentElement.removeChild(fireGif);
            clickedImg.style.transition = "";
            clickedImg.style.zIndex = originalZ;
            if (fireAudio) fireAudio.pause();
            delete clickedImg._centerFireActive;
          }, 500);
        }, stayDuration);
        clickedImg._centerFireActive = {
          cancel: function() {
            cancelled = true;
            clearTimeout(stayTimer);
            if (darkOverlay.parentElement) darkOverlay.parentElement.removeChild(darkOverlay);
            if (fireGif.parentElement) fireGif.parentElement.removeChild(fireGif);
            clickedImg.style.transition = "";
            clickedImg.style.transform = originalTransform;
            clickedImg.style.zIndex = originalZ;
            if (fireAudio) fireAudio.pause();
          }
        };
      }
    }
    requestAnimationFrame(animateToCenter);
  }else if (action.type === "fall") {
    // Save current z-index and transform
    const originalZ = clickedImg.style.zIndex || "";
    const originalTransform = clickedImg.style.transform || "";
  
    // Bring the image to the top layer
    clickedImg.style.zIndex = 10000;
  
    // Get the height of the frame so we know how far to fall
    const frame = document.getElementById("frame");
    const frameHeight = frame.clientHeight;
  
    // Duration of the fall in milliseconds
    const animDuration = 3000; // 3 seconds
    const startTime = performance.now();
  
    // Play the audio associated with the fall action
    const fallAudio = new Audio(`audio/${action.file}`);
    fallAudio.play();
  
    // Animate the fall using requestAnimationFrame
    function animateFall(timestamp) {
      let progress = (timestamp - startTime) / animDuration;
      if (progress > 1) progress = 1;
  
      // Move the image downward.
      // We add the original transform (if any) plus a translateY that moves it out of frame.
      // We use the frame's height plus the image's height so it completely goes out.
      clickedImg.style.transform = `${originalTransform} translateY(${progress * (frameHeight + clickedImg.clientHeight)}px)`;
  
      if (progress < 1) {
        requestAnimationFrame(animateFall);
      } else {
        // Once the fall animation completes, wait for the audio to finish.
        fallAudio.addEventListener("ended", () => {
          // Reset the image to its original position and z-index.
          clickedImg.style.transform = originalTransform;
          clickedImg.style.zIndex = originalZ;
        });
      }
    }
    requestAnimationFrame(animateFall);
  }else if (action.type === "overlayFade") {
    const collageElem = document.getElementById("collage");
    const frameElem = document.getElementById("frame");
  
    // Dim the entire collage to 50%
    collageElem.style.transition = "filter 0.5s ease";
    collageElem.style.filter = "brightness(50%)";
  
    // Create the overlay image element
    const overlayImg = document.createElement("img");
    overlayImg.src = action.overlayImage ? `images/${action.overlayImage}` : clickedImg.src;
    overlayImg.style.position = "absolute";
    overlayImg.style.top = "50%";
    overlayImg.style.left = "50%";
    overlayImg.style.width = "150%";
    overlayImg.style.height = "auto";
    overlayImg.style.opacity = "0"; // start invisible
    overlayImg.style.zIndex = "9999";
    overlayImg.style.transform = "translate(-50%, -50%)";
    overlayImg.style.transition = "opacity 1s ease";
  
    frameElem.appendChild(overlayImg);
  
    // Trigger fade in on next frame
    requestAnimationFrame(() => {
      overlayImg.style.opacity = "0.5";
    });
  
    // Play the audio associated with this action
    const audio = new Audio(`audio/${action.file}`);
    audio.play();
  
    // Define a function to cancel the overlay interaction
    function cancelOverlay() {
      document.removeEventListener("click", cancelOverlay);
      audio.pause();
      audio.currentTime = 0;
      overlayImg.style.opacity = "0";
      overlayImg.addEventListener("transitionend", () => {
        collageElem.style.filter = "";
        if (overlayImg.parentElement) {
          overlayImg.parentElement.removeChild(overlayImg);
        }
      }, { once: true });
    }
  
    // Delay adding the document-level click listener (e.g., 100ms) so the triggering click isn't caught.
    setTimeout(() => {
      document.addEventListener("click", cancelOverlay, { once: true });
    }, 100);
  
    // Also cancel the interaction when the audio ends
    audio.addEventListener("ended", cancelOverlay);
  
    
  }else if (action.type === "liftTop") {
    const collageElem = document.getElementById("collage");
  
    // Hide the original image
    clickedImg.style.visibility = "hidden";
  
    // Create a clone for the top overlay
    const liftImg = clickedImg.cloneNode(true);
    // Ensure the clone is visible even though the original is hidden
    liftImg.style.visibility = "visible";
    liftImg.style.position = "absolute";
    liftImg.style.top = "0";
    liftImg.style.left = "0";
    liftImg.style.width = "100%";
    liftImg.style.height = "auto";
    liftImg.style.zIndex = "10000";
    // Start with opacity 0 for a fade-in effect
    liftImg.style.opacity = "0";
    liftImg.style.transition = "opacity 0.5s ease";
  
    // Append the clone to the collage
    collageElem.appendChild(liftImg);
  
    // Trigger the fade in on the next frame
    requestAnimationFrame(() => {
      liftImg.style.opacity = "1";
    });
  
    // Play the associated audio
    const audio = new Audio(`audio/${action.file}`);
    audio.play();
  
    // Define a function to end the lift interaction
    function endLift() {
      // Fade out the overlay
      liftImg.style.opacity = "0";
      // After the fade-out, remove the overlay and restore the original image
      setTimeout(() => {
        if (liftImg.parentNode) {
          liftImg.parentNode.removeChild(liftImg);
        }
        clickedImg.style.visibility = "visible";
      }, 500);
    }
  
    // Allow cancellation by clicking on the lifted image
    liftImg.addEventListener("click", () => {
      audio.pause();
      audio.currentTime = 0;
      endLift();
    });
  
    // When the audio ends, finish the interaction
    audio.addEventListener("ended", endLift);
  }else if (action.type === "flyingSaucer") {
    // Hide the original image.
    clickedImg.style.visibility = "hidden";
    
    // Get the clicked image's bounding rectangle and compute its center.
    const rect = clickedImg.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Create a new image element using action.flyingImage if provided; otherwise, fallback to clickedImg.src.
    const flyingImg = document.createElement("img");
    flyingImg.src = action.flyingImage ? `images/${action.flyingImage}` : clickedImg.src;
    flyingImg.style.position = "fixed";
    flyingImg.style.zIndex = "10000";
    flyingImg.style.visibility = "visible";
    flyingImg.style.transform = "";
    
    // Append it to the document body so it isn't clipped by any container.
    document.body.appendChild(flyingImg);
    
    // When the replacement image loads, set its size.
    flyingImg.onload = function() {
      // Use custom dimensions if provided; otherwise, use natural size.
      const repWidth = action.flyingWidth ? action.flyingWidth : flyingImg.naturalWidth;
      const repHeight = action.flyingHeight ? action.flyingHeight : flyingImg.naturalHeight;
      flyingImg.style.width = repWidth + "px";
      flyingImg.style.height = repHeight + "px";
      
      // Center the replacement image at the clicked image's center.
      flyingImg.style.left = (centerX - repWidth / 2) + "px";
      flyingImg.style.top  = (centerY - repHeight / 2) + "px";
      
      // Calculate distance: move left until the right edge is off-screen.
      const currentLeft = centerX - repWidth / 2;
      const distance = currentLeft + repWidth + 50; // extra 50px clearance
  
      const animDuration = 7000; 
      const startTime = performance.now();
      let cancelled = false;
      
      function animateFlying(timestamp) {
        if (cancelled) return;
        let progress = (timestamp - startTime) / animDuration;
        if (progress > 1) progress = 1;
        
        // Move left (negative translateX) and add vertical wobble.
        const translateX = -progress * distance;
        const wobbleY = 20 * Math.sin(progress * 2 * Math.PI * 3);
        flyingImg.style.transform = `translate(${translateX}px, ${wobbleY}px)`;
        
        if (progress < 1) {
          flyingImg._flyingSaucer = { id: requestAnimationFrame(animateFlying), cancel: cancelFlying };
        } else {
          delete flyingImg._flyingSaucer;
        }
      }
      
      function cancelFlying() {
        cancelled = true;
        cancelAnimationFrame(flyingImg._flyingSaucer.id);
        flyingImg.style.transform = "";
        if (flyingImg.parentNode) {
          document.body.removeChild(flyingImg);
        }
        clickedImg.style.visibility = "visible";
        audio.pause();
        audio.currentTime = 0;
      }
      
      flyingImg._flyingSaucer = { id: requestAnimationFrame(animateFlying), cancel: cancelFlying };
      
      // Play the audio.
      const audio = new Audio(`audio/${action.file}`);
      audio.play();
      
      // Allow cancellation by clicking on the replacement image.
      flyingImg.addEventListener("click", function cancelHandler(e) {
        if (flyingImg._flyingSaucer) {
          flyingImg._flyingSaucer.cancel();
          flyingImg.removeEventListener("click", cancelHandler);
        }
      });
      
      // When the audio ends, remove the replacement image and restore the original.
      audio.addEventListener("ended", () => {
        if (flyingImg.parentNode) {
          document.body.removeChild(flyingImg);
        }
        clickedImg.style.visibility = "visible";
      });
    };
  }else if (action.type === "stackSwitch") {
    // Retrieve the secondary and tertiary images by ID (these must be defined in images.json)
    const secondaryImg = document.getElementById(action.secondaryImageId);
    const tertiaryImg = document.getElementById(action.tertiaryImageId);

    if (!secondaryImg) {
      console.error("Secondary image not found for id:", action.secondaryImageId);
    }
    if (!tertiaryImg) {
      console.error("Tertiary image not found for id:", action.tertiaryImageId);
    }
    
    // Save current visibility states (assume primary is clickedImg, visible by default)
    const originalPrimaryVis = clickedImg.style.visibility || "visible";
    const originalSecondaryVis = secondaryImg ? secondaryImg.style.visibility : "";
    const originalTertiaryVis = tertiaryImg ? tertiaryImg.style.visibility : "";
    
    // Define a function to restore the initial state.
    function revertStack() {
      audio.pause();
      audio.currentTime = 0;
      clearTimeout(timeoutSwitch);
      clickedImg.style.visibility = "visible";
      if (secondaryImg) secondaryImg.style.visibility = "hidden";
      if (tertiaryImg) tertiaryImg.style.visibility = "hidden";
      // Remove cancellation listeners from all three.
      clickedImg.removeEventListener("click", cancelHandler);
      if (secondaryImg) secondaryImg.removeEventListener("click", cancelHandler);
      if (tertiaryImg) tertiaryImg.removeEventListener("click", cancelHandler);
    }
    
    // Define a cancellation handler.
    function cancelHandler(e) {
      revertStack();
    }
    
    // Add click listeners to all three images so that clicking any cancels the interaction.
    clickedImg.addEventListener("click", cancelHandler);
    if (secondaryImg) secondaryImg.addEventListener("click", cancelHandler);
    if (tertiaryImg) tertiaryImg.addEventListener("click", cancelHandler);
    
    // Create and play the audio.
    const audio = new Audio(`audio/${action.file}`);
    audio.play();
    
    // Start the sequence:
    // Immediately hide primary and show secondary.
    clickedImg.style.visibility = "hidden";
    if (secondaryImg) secondaryImg.style.visibility = "visible";
    
    // After a delay (default 3000ms), hide secondary and show tertiary.
    const timeoutSwitch = setTimeout(() => {
      if (secondaryImg) secondaryImg.style.visibility = "hidden";
      if (tertiaryImg) tertiaryImg.style.visibility = "visible";
    }, action.switchDelay || 3000);
    
    // When the audio ends, revert all images.
    audio.addEventListener("ended", () => {
      revertStack();
    });
  }else if (action.type === "hoverGlowStack") {
    // Hide the primary image.
    clickedImg.style.visibility = "hidden";
    
    // Get the collage container (assumed to be #frame) and its dimensions.
    const frame = document.getElementById("frame");
    const frameWidth = frame.clientWidth;
    const frameHeight = frame.clientHeight;
    const baseFrameWidth = 1600;
    const scaleFactor = frameWidth / baseFrameWidth;
    const centerX = frameWidth / 2;
    const centerY = frameHeight / 2;
    
    // ------------- Create the Hover Image -------------
    const hoverImg = document.createElement("img");
    hoverImg.src = action.hoverImage ? `images/${action.hoverImage}` : clickedImg.src;
    hoverImg.style.position = "absolute";
    // Use scaled hover dimensions.
    const hoverW = (action.hoverWidth || 300) * scaleFactor;
    const hoverH = (action.hoverHeight || 225) * scaleFactor;
    hoverImg.style.width = hoverW + "px";
    hoverImg.style.height = hoverH + "px";
    // Vertical offset (scaled) - how far above center the hover image appears.
    const hoverOffset = (action.hoverOffset !== undefined ? action.hoverOffset : 100) * scaleFactor;
    hoverImg.style.left = (centerX - hoverW / 2) + "px";
    hoverImg.style.top = (centerY - hoverOffset - hoverH) + "px";
    hoverImg.style.zIndex = "100"; // Higher than under overlays.
    // Start hidden; fade in.
    hoverImg.style.opacity = "0";
    hoverImg.style.transition = "opacity 1s ease";
    // Apply floating and glowing animations (make sure keyframes exist in your CSS).
    hoverImg.style.animation = "hoverFloat 3s ease-in-out infinite, glowPulse 2s ease-in-out infinite";
    frame.appendChild(hoverImg);
    requestAnimationFrame(() => { hoverImg.style.opacity = "1"; });
      
    // ------------- Under Overlays -------------
    // All under overlays will appear at the center of the collage.
    const underW = (action.underWidth || hoverW) * scaleFactor;
    const underH = (action.underHeight || hoverH) * scaleFactor;
    const underX = centerX - underW / 2;
    const underY = centerY - underH / 2;
    
    // Utility: Create an under overlay image with fade in once loaded.
    function createUnderOverlay(src) {
      const img = document.createElement("img");
      img.src = src ? `images/${src}` : "";
      img.style.position = "absolute";
      img.style.width = underW + "px";
      img.style.height = underH + "px";
      img.style.left = underX + "px";
      img.style.top = underY + "px";
      img.style.zIndex = "90"; // beneath hover image
      img.style.opacity = "0";
      img.style.transition = "opacity 1s ease";
      // When the image loads, fade it in.
      img.onload = () => {
        requestAnimationFrame(() => { img.style.opacity = "1"; });
      };
      // Add cancellation handler.
      img.addEventListener("click", cancelInteraction);
      frame.appendChild(img);
      return img;
    }
    
    // Create under1 (appears immediately beneath hoverImg).
    let under1 = createUnderOverlay(action.underImage1);
    // After 4 seconds, fade out under1 and replace with under2.
    const t2 = setTimeout(() => {
      under1.style.opacity = "0";
      setTimeout(() => {
        if (under1.parentNode) {
          frame.removeChild(under1);
        }
        under1 = null;
        var under2 = createUnderOverlay(action.underImage2);
        // under2 will fade in on load.
        // After 3 seconds, replace under2 with under3.
        const t3 = setTimeout(() => {
          under2.style.opacity = "0";
          setTimeout(() => {
            if (under2.parentNode) {
              frame.removeChild(under2);
            }
            under2 = null;
            var under3 = createUnderOverlay(action.underImage3);
            // under3 remains until end.
            currentUnder = under3;
          }, 1000);
        }, 5000);
        currentUnder = under2;
        underTimer = t3;
      }, 1000);
    }, 6000);
    let underTimer; // timer for under2->under3 transition
    let currentUnder = under1; // track current under overlay
    
    // ------------- Audio & Reversion -------------
    const totalDuration = action.totalDuration || 15000;
    const tRevert = setTimeout(() => {
      // Fade out the current under overlay.
      if (currentUnder) {
        currentUnder.style.opacity = "0";
        setTimeout(() => { if (currentUnder.parentNode) frame.removeChild(currentUnder); }, 1000);
      }
      // Fade out hover image.
      hoverImg.style.opacity = "0";
      setTimeout(() => {
        if (hoverImg.parentNode) frame.removeChild(hoverImg);
        clickedImg.style.visibility = "visible";
      }, 1000);
      audio.pause();
      audio.currentTime = 0;
    }, totalDuration);
    
    // Create and play the audio (use action.audioFile if provided).
    const audioSrc = action.audioFile ? action.audioFile : action.file;
    const audio = new Audio(`audio/${audioSrc}`);
    audio.play();
    
    // ------------- Cancellation -------------
    function cancelInteraction() {
      clearTimeout(t2);
      clearTimeout(underTimer);
      clearTimeout(tRevert);
      audio.pause();
      audio.currentTime = 0;
      // Remove hover image and any under overlay.
      if (hoverImg.parentNode) frame.removeChild(hoverImg);
      if (under1 && under1.parentNode) frame.removeChild(under1);
      if (currentUnder && currentUnder.parentNode) frame.removeChild(currentUnder);
      clickedImg.style.visibility = "visible";
    }
    
    // Add cancellation event listeners to hoverImg and under overlays.
    hoverImg.addEventListener("click", cancelInteraction);
    // The createUnderOverlay function already adds a click listener to each under overlay.
    
    // Also cancel if audio ends prematurely.
    audio.addEventListener("ended", cancelInteraction);
  }else if (action.type === "sharpSwitch") {
    // Hide the primary image immediately (sharp swap).
    clickedImg.style.display = "none";
    
    // Get the collage container (assumed to be the element with id "collage").
    const collage = document.getElementById("collage");
    
    // Create the under image element.
    const underImg = document.createElement("img");
    underImg.src = action.underImage ? `images/${action.underImage}` : clickedImg.src;
    
    // Set its position and size exactly equal to the primary image.
    // (This assumes the primary image already has left, top, width, and height set.)
    underImg.style.position = "absolute";
    underImg.style.left = clickedImg.style.left;
    underImg.style.top = clickedImg.style.top;
    underImg.style.width = clickedImg.style.width;
    underImg.style.height = clickedImg.style.height;
    
    // Insert the under image into the collage before the primary image.
    collage.insertBefore(underImg, clickedImg);
    
    // Set its opacity to 1 (sharp display, no transition).
    underImg.style.opacity = "1";
    
    // Create and play the audio.
    const audioSrc = action.audioFile ? action.audioFile : action.file;
    const audio = new Audio(`audio/${audioSrc}`);
    audio.play();
    
    // Define a revert function to restore the original state.
    function revertSharpSwitch() {
      audio.pause();
      audio.currentTime = 0;
      if (underImg.parentNode) {
        collage.removeChild(underImg);
      }
      clickedImg.style.display = "";
    }
    
    // When the audio ends, revert automatically.
    audio.addEventListener("ended", revertSharpSwitch);
    
    // Cancellation: clicking on the under image (or optionally the collage area) reverts the interaction.
    underImg.addEventListener("click", revertSharpSwitch);
    
    // Optionally, you can add a click handler on the collage to cancel if the user clicks outside.
    collage.addEventListener("click", function cancelHandler(e) {
      revertSharpSwitch();
      collage.removeEventListener("click", cancelHandler);
    });
  }  
}

// Handle image interactions
function handleInteraction(image, clickedImg) {
    if (!image.interaction) return;
    let actions = Array.isArray(image.interaction.actions) ? image.interaction.actions : [image.interaction];
    actions.forEach(action => processAction(action, clickedImg));
  }

  