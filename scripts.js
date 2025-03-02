// Global variables
let videoClosing = false; // Flag to block image interactions immediately after closing a video
let audioPlayers = {};
let youtubeTimeout, youtubePlayer, youtubeContainer, openYouTubeButton;
let localVideo, videoContainer, popupOverlay, popup, warningOverlay;

// Loading screen
const loadingScreen = document.getElementById("loading-screen");
const startButton = document.getElementById("start-button");
const loadingContainer = document.getElementById("loading-container");
const loadingAudio = new Audio("audio/lorerings.mp3");

startButton.addEventListener("click", () => {
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
      videoClosing = true; // Set flag so that this same click does not trigger image interaction
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
    const baseWidth = 1500, baseHeight = 1792;
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
    popup.innerHTML = "";
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "row";
    container.style.alignItems = "center";
    container.style.justifyContent = "center";
    const imgContainer = document.createElement("div");
    imgContainer.style.flex = "0 0 auto";
    imgContainer.style.marginRight = "20px";
    const refImg = document.createElement("img");
    refImg.src = action.popupImage ? `images/${action.popupImage}` : clickedImg.src;
    refImg.style.width = "150px";
    refImg.style.height = "auto";
    refImg.style.objectFit = "contain";
    imgContainer.appendChild(refImg);
    container.appendChild(imgContainer);
    const textContainer = document.createElement("div");
    textContainer.style.flex = "1";
    textContainer.style.textAlign = "center";
    if (action.popupTitle) {
      const titleElem = document.createElement("h2");
      titleElem.innerText = action.popupTitle;
      if (action.popupTitleFont) titleElem.style.fontFamily = action.popupTitleFont;
      if (action.popupTitleSize) titleElem.style.fontSize = action.popupTitleSize;
      titleElem.style.margin = "0 0 10px 0";
      textContainer.appendChild(titleElem);
    }
    if (action.popupBody) {
      const bodyElem = document.createElement("p");
      bodyElem.innerHTML = action.popupBody;
      if (action.popupBodyFont) bodyElem.style.fontFamily = action.popupBodyFont;
      if (action.popupBodySize) bodyElem.style.fontSize = action.popupBodySize;
      bodyElem.style.margin = "0";
      textContainer.appendChild(bodyElem);
    }
    if (!action.popupTitle && !action.popupBody) {
      const fallbackElem = document.createElement("div");
      fallbackElem.innerHTML = action.popupMessage ? action.popupMessage : action.content;
      textContainer.appendChild(fallbackElem);
    }
    container.appendChild(textContainer);
    popup.appendChild(container);
    popupOverlay.style.display = "flex";
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
  } else if (action.type === "circle") {
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
  } else if (action.type === "walk") {
    if (clickedImg._walkActive) {
      clickedImg._walkActive.cancel();
      delete clickedImg._walkActive;
      return;
    }
    const audio = new Audio(`audio/${action.file}`);
    const originalTransform = clickedImg.style.transform || "";
    const animDuration = 6000;
    const frameElem = document.getElementById("frame");
    const frameWidth = frameElem.clientWidth;
    const frameRect = frameElem.getBoundingClientRect();
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
        clickedImg.style.transform = originalTransform;
        delete clickedImg._walkActive;
      }
    }
    clickedImg._walkActive = {
      id: requestAnimationFrame(animateWalk),
      cancel: function() {
        cancelled = true;
        cancelAnimationFrame(this.id);
        clickedImg.style.transform = originalTransform;
        audio.pause();
      }
    };
    audio.play();
  } else if (action.type === "centerCircle") {
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
  } else if (action.type === "alarm") {
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
  } else if (action.type === "warningRedirect") {
    warningOverlay.innerHTML = "";
    const warningContainer = document.createElement("div");
    warningContainer.style.background = "white";
    warningContainer.style.color = "black";
    warningContainer.style.border = "2px solid red";
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
  } else if (action.type === "growCenter") {
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
  } else if (action.type === "shrinkCenter") {
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
  } else if (action.type === "centerFire") {
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
  }
}

// Handle image interactions
function handleInteraction(image, clickedImg) {
    if (!image.interaction) return;
    let actions = Array.isArray(image.interaction.actions) ? image.interaction.actions : [image.interaction];
    actions.forEach(action => processAction(action, clickedImg));
  }

  