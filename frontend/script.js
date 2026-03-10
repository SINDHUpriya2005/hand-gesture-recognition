// IMPORTANT: Change this to your actual Render backend URL after deployment
const API_URL = "https://your-app-name.onrender.com/predict";  // ← Replace this!

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const captureBtn = document.getElementById("captureBtn");
const resultGesture = document.getElementById("gesture");
const resultConfidence = document.getElementById("confidence");
const errorDiv = document.getElementById("error");

let stream = null;

// Start webcam
async function startVideo() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" } // "environment" for back camera on mobile
    });
    video.srcObject = stream;
  } catch (err) {
    showError("Cannot access camera. Please allow camera permission.");
    console.error(err);
  }
}

// Show error message
function showError(msg) {
  errorDiv.textContent = msg;
  errorDiv.classList.remove("hidden");
}

// Hide error
function hideError() {
  errorDiv.classList.add("hidden");
}

// Capture frame and send to backend
async function captureAndPredict() {
  if (!stream) {
    showError("Camera not started.");
    return;
  }

  hideError();

  // Draw current video frame to canvas
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

  // Get base64 JPEG
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const base64Image = dataUrl.split(",")[1]; // remove "data:image/jpeg;base64,"

  resultGesture.textContent = "Predicting...";
  resultConfidence.textContent = "";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      showError(data.error);
      resultGesture.textContent = "Error";
      return;
    }

    resultGesture.textContent = data.gesture;
    resultConfidence.textContent = `Confidence: ${(data.confidence * 100).toFixed(1)}%`;

    // Optional: color based on confidence
    if (data.confidence > 0.85) {
      resultConfidence.style.color = "#4caf50";
    } else if (data.confidence > 0.6) {
      resultConfidence.style.color = "#ff9800";
    } else {
      resultConfidence.style.color = "#f44336";
    }

  } catch (err) {
    showError("Failed to connect to server. Is the backend running?");
    console.error(err);
  }
}

// Event listeners
captureBtn.addEventListener("click", captureAndPredict);

// Start camera when page loads
window.addEventListener("load", startVideo);

// Stop camera when leaving page (good practice)
window.addEventListener("beforeunload", () => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
});
