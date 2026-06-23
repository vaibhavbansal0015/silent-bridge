const video = document.getElementById("camera");
const canvas = document.getElementById("output");
const ctx = canvas.getContext("2d");

const result = document.getElementById("result");
const gestureDescription = document.getElementById("gestureDescription");
const startBtn = document.getElementById("startBtn");
const voiceToggleBtn = document.getElementById("voiceToggleBtn");
const phraseList = document.getElementById("phraseList");
const queryInput = document.getElementById("queryInput");
const askBtn = document.getElementById("askBtn");
const assistantResponse = document.getElementById("assistantResponse");
const categoryButtons = document.querySelectorAll(".phrase-category");
const hospitalModeBtn = document.getElementById("hospitalModeBtn");
const hospitalModePanel = document.getElementById("hospitalModePanel");
const hospitalPhraseButtons = document.getElementById("hospitalPhraseButtons");
const startListeningBtn = document.getElementById("startListeningBtn");
const stopListeningBtn = document.getElementById("stopListeningBtn");
const speakBtn = document.getElementById("speakBtn");
const customTextInput = document.getElementById("customTextInput");
const speechTranscript = document.getElementById("speechTranscript");
const speechStatus = document.getElementById("speechStatus");
const historyLog = document.getElementById("historyLog");

let hands;
let cameraStream;
let speechRecognizer;
let lastGesture = "";
let stableGesture = "";
let gestureHoldStart = 0;
let lastSpeakTime = 0;
let voiceEnabled = true;
let activeCategory = "Hospital";
let hospitalModeEnabled = false;

const hospitalPhrases = [
    "🆘 I need help.",
    "🤕 I am in pain.",
    "💊 I need medicine.",
    "🤧 I feel sick.",
    "❤️ I have chest pain.",
    "🫁 I cannot breathe properly.",
    "💧 I need water.",
    "🚻 I need the restroom.",
    "📞 Please call my family.",
    "🚑 Call emergency services."
];

const phraseLibrary = [
    {
        category: "Hospital",
        phrase: "I need a doctor immediately.",
        assistText: "Speak this phrase if you require urgent medical attention.",
        speakText: "I need a doctor immediately.",
        keywords: ["doctor", "medical", "clinic", "immediately"]
    },
    {
        category: "Hospital",
        phrase: "Please call a nurse right away.",
        assistText: "A clear request for nursing help at the bedside.",
        speakText: "Please call a nurse right away.",
        keywords: ["nurse", "help", "staff", "right away"]
    },
    {
        category: "Hospital",
        phrase: "I am in pain and need help.",
        assistText: "Use if you need pain relief or immediate care.",
        speakText: "I am in pain and need help.",
        keywords: ["pain", "hurt", "injury", "help"]
    },
    {
        category: "Hospital",
        phrase: "This is an emergency, please help.",
        assistText: "A high-priority phrase for urgent situations and emergencies.",
        speakText: "This is an emergency, please help.",
        keywords: ["emergency", "urgent", "critical"]
    },
    {
        category: "Hospital",
        phrase: "I need my medicine now.",
        assistText: "Use when you require medication or prescription assistance.",
        speakText: "I need my medicine now.",
        keywords: ["medicine", "medication", "pill", "prescription"]
    },
    {
        category: "Public Services",
        phrase: "Where is the restroom located?",
        assistText: "Ask for directions to the nearest public bathroom.",
        speakText: "Where is the restroom located?",
        keywords: ["restroom", "bathroom", "toilet", "where"]
    },
    {
        category: "Public Services",
        phrase: "I am deaf and need visual communication.",
        assistText: "Make others aware that you need clear visual support.",
        speakText: "I am deaf and need visual communication.",
        keywords: ["deaf", "hearing", "visual", "communication"]
    },
    {
        category: "Public Services",
        phrase: "I need assistance with directions.",
        assistText: "Use this phrase at service counters, stations, or public buildings.",
        speakText: "I need assistance with directions.",
        keywords: ["assistance", "help", "directions", "support"]
    },
    {
        category: "Public Services",
        phrase: "Please give me some water.",
        assistText: "Ask for drinking water in waiting areas, hospitals, or public spaces.",
        speakText: "Please give me some water.",
        keywords: ["water", "drink", "thirst", "please"]
    },
    {
        category: "Public Services",
        phrase: "Please wait here while I check.",
        assistText: "A polite phrase for busy service counters and waiting rooms.",
        speakText: "Please wait here while I check.",
        keywords: ["wait", "waiting", "please", "here"]
    }
];

const gestureMap = {
    YES: {
        phrase: "Yes",
        description: "Thumbs up is a simple agreement sign in many contexts."
    },
    HELLO: {
        phrase: "Hello",
        description: "An open-handed greeting for starting a conversation."
    },
    HELP: {
        phrase: "Help",
        description: "A classic request for assistance in emergency and public spaces."
    },
    THANK_YOU: {
        phrase: "Thank you",
        description: "A polite phrase to show gratitude after support."
    },
    PLEASE: {
        phrase: "Please",
        description: "A respectful phrase to soften requests in hospitals and public services."
    }
};

startBtn.addEventListener("click", startApp);
voiceToggleBtn.addEventListener("click", toggleVoice);
askBtn.addEventListener("click", handleAsk);
hospitalModeBtn.addEventListener("click", toggleHospitalMode);
startListeningBtn.addEventListener("click", startSpeechRecognition);
stopListeningBtn.addEventListener("click", stopSpeechRecognition);
speakBtn.addEventListener("click", speakCustomText);
customTextInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        speakCustomText();
    }
});
categoryButtons.forEach((button) => button.addEventListener("click", handleCategorySelection));

renderPhraseList(activeCategory);
renderHospitalPhraseButtons();

function renderPhraseList(category) {
    phraseList.innerHTML = "";
    const items = phraseLibrary.filter((item) => item.category === category);

    if (items.length === 0) {
        phraseList.innerHTML = "<p>No phrases found.</p>";
        return;
    }

    for (const phrase of items) {
        const card = document.createElement("button");
        card.className = "phrase-card";
        card.type = "button";
        card.innerHTML = `
            <h4>${phrase.phrase}</h4>
            <p>${phrase.assistText}</p>
        `;
        card.addEventListener("click", () => selectPhrase(phrase));
        phraseList.appendChild(card);
    }
}

function renderHospitalPhraseButtons() {
    hospitalPhraseButtons.innerHTML = "";

    for (const phrase of hospitalPhrases) {
        const card = document.createElement("button");
        card.className = "quick-button";
        card.type = "button";
        card.textContent = phrase;
        card.addEventListener("click", () => {
            displayMessage(phrase, "Button");
            speakText(stripEmoji(phrase));
        });
        hospitalPhraseButtons.appendChild(card);
    }
}

function stripEmoji(text) {
    return text.replace(/^[^\w\s]+\s*/, "");
}

function displayMessage(message, source) {
    result.innerText = message;
    gestureDescription.innerText = `${source} selected this message.`;
    addHistoryItem(source, message);
}

function addHistoryItem(source, message) {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `
        <strong>${timestamp} • ${source}</strong>
        <span>${message}</span>
    `;
    historyLog.prepend(item);
}

function toggleHospitalMode() {
    hospitalModeEnabled = !hospitalModeEnabled;
    hospitalModePanel.classList.toggle("hidden", !hospitalModeEnabled);
    hospitalModeBtn.textContent = hospitalModeEnabled ? "🏥 Hospital Mode: On" : "🏥 Hospital Mode";
}

function handleCategorySelection(event) {
    const clicked = event.currentTarget;
    activeCategory = clicked.dataset.category;
    categoryButtons.forEach((button) => button.classList.toggle("active", button === clicked));
    renderPhraseList(activeCategory);
}

function selectPhrase(phrase) {
    result.innerText = phrase.phrase;
    gestureDescription.innerText = phrase.assistText;
    speakText(phrase.speakText);
}

function handleAsk() {
    const query = queryInput.value.trim();
    const response = getAssistantResponse(query);
    assistantResponse.innerText = response;
    if (query) {
        addHistoryItem('User Input', query);
    }
    if (voiceEnabled) {
        speakText(response.replace(/^Suggested phrase:\s*/i, ""));
    }
}

function speakCustomText() {
    const text = customTextInput.value.trim();
    if (!text) {
        speechStatus.innerText = 'Type a message first to speak it aloud.';
        return;
    }
    speakText(text, { force: true });
    speechStatus.innerText = 'Spoken aloud.';
    addHistoryItem('User Input', text);
}

function speakText(text, { force = false } = {}) {
    if ((!voiceEnabled && !force) || !window.speechSynthesis) {
        return;
    }
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 1;
    msg.lang = "en-US";
    window.speechSynthesis.speak(msg);
}

function getAssistantResponse(query) {
    if (!query) {
        return "Please type your need or select a common phrase to get quick support.";
    }

    const normalized = query.toLowerCase();
    const matches = phraseLibrary.filter((item) =>
        item.keywords.some((keyword) => normalized.includes(keyword)) ||
        item.phrase.toLowerCase().includes(normalized)
    );

    if (matches.length > 0) {
        const best = matches[0];
        return `Suggested phrase: "${best.phrase}". ${best.assistText}`;
    }

    if (normalized.includes("yes") || normalized.includes("agree")) {
        return "Try the gesture for yes or say 'Yes' to confirm a request.";
    }

    if (normalized.includes("no") || normalized.includes("not")) {
        return "Try a clear negative response, or use a caregiver to confirm your meaning.";
    }

    if (normalized.includes("hello") || normalized.includes("hi")) {
        return "You can use the hello sign or say 'Hello' to begin communication.";
    }

    return "I’m here to help. Use a phrase like 'I need a doctor', 'Where is the restroom?', or select a hospital/public service request above.";
}

function toggleVoice() {
    voiceEnabled = !voiceEnabled;
    voiceToggleBtn.innerText = voiceEnabled ? "🔊 Voice: On" : "🔇 Voice: Off";
}

async function startApp() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        cameraStream = stream;
        video.srcObject = stream;
        startBtn.disabled = true;
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            startHandTracking();
        };
    } catch (err) {
        alert("Unable to access camera. Please allow camera permission and try again.");
        console.error(err);
    }
}

function startSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        speechStatus.innerText = 'Microphone unavailable or speech recognition not supported.';
        speechTranscript.innerText = 'Unable to use speech recognition in this browser.';
        return;
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    speechRecognizer = new Recognition();
    speechRecognizer.lang = 'en-US';
    speechRecognizer.interimResults = true;
    speechRecognizer.maxAlternatives = 1;
    speechRecognizer.continuous = true;

    speechRecognizer.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join(' ')
            .trim();
        speechTranscript.innerText = transcript || 'Listening...';
        speechStatus.innerText = 'Transcribing speech...';
        if (event.results[event.results.length - 1].isFinal) {
            addHistoryItem('Speech', transcript);
            speechStatus.innerText = 'Speech recognized.';
        }
    };

    speechRecognizer.onerror = (event) => {
        speechStatus.innerText = `Speech recognition error: ${event.error}`;
        speechTranscript.innerText = 'Microphone error.';
        startListeningBtn.disabled = false;
        stopListeningBtn.disabled = true;
    };

    speechRecognizer.onend = () => {
        startListeningBtn.disabled = false;
        stopListeningBtn.disabled = true;
        speechStatus.innerText = 'Listening stopped.';
    };

    try {
        speechRecognizer.start();
        startListeningBtn.disabled = true;
        stopListeningBtn.disabled = false;
        speechTranscript.innerText = 'Listening...';
        speechStatus.innerText = 'Microphone active.';
    } catch (error) {
        speechStatus.innerText = 'Unable to start microphone. Please check permissions.';
        speechTranscript.innerText = 'Microphone unavailable.';
    }
}

function stopSpeechRecognition() {
    if (speechRecognizer) {
        speechRecognizer.stop();
    }
}

function startHandTracking() {
    hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
    });

    hands.onResults(onResults);

    async function detect() {
        await hands.send({ image: video });
        requestAnimationFrame(detect);
    }

    detect();
}

function detectGesture(landmarks) {
    const thumbUp = landmarks[4].y < landmarks[3].y;
    const indexUp = landmarks[8].y < landmarks[6].y;
    const middleUp = landmarks[12].y < landmarks[10].y;
    const ringUp = landmarks[16].y < landmarks[14].y;
    const pinkyUp = landmarks[20].y < landmarks[18].y;
    const openHand = indexUp && middleUp && ringUp && pinkyUp;
    const twoFingers = indexUp && middleUp && !ringUp && !pinkyUp;
    const threeFingers = indexUp && middleUp && ringUp && !pinkyUp;

    if (thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) {
        return "YES";
    }
    if (openHand) {
        return "HELLO";
    }
    if (indexUp && !middleUp && !ringUp && !pinkyUp) {
        return "HELP";
    }
    if (twoFingers) {
        return "THANK_YOU";
    }
    if (threeFingers) {
        return "PLEASE";
    }
    return "UNKNOWN";
}

function speakText(text) {
    if (!voiceEnabled || !window.speechSynthesis) {
        return;
    }
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 1;
    msg.lang = "en-US";
    window.speechSynthesis.speak(msg);
}

function onResults(results) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        result.innerText = "No hand detected";
        gestureDescription.innerText = "Move your hand into view so the assistant can recognize supported signs.";
        stableGesture = "";
        gestureHoldStart = 0;
        return;
    }

    for (const landmarks of results.multiHandLandmarks) {
        drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: "#00c853", lineWidth: 3 });
        drawLandmarks(ctx, landmarks, { color: "#ff5252", lineWidth: 2 });

        const gesture = detectGesture(landmarks);
        const now = Date.now();

        if (gesture === stableGesture) {
            if (!gestureHoldStart) gestureHoldStart = now;
            if (now - gestureHoldStart > 800) {
                if (gesture !== lastGesture) {
                    lastGesture = gesture;
                    const info = gestureMap[gesture] || { phrase: "Unknown sign", description: "This gesture is not currently mapped to a supported phrase." };
                    result.innerText = info.phrase;
                    gestureDescription.innerText = info.description;
                    if (gesture !== "UNKNOWN") {
                        displayMessage(info.phrase, "Gesture");
                    }
                    if (gesture !== "UNKNOWN" && now - lastSpeakTime > 2500) {
                        speakText(info.phrase);
                        lastSpeakTime = now;
                    }
                }
            }
        } else {
            stableGesture = gesture;
            gestureHoldStart = now;
        }
    }
}


