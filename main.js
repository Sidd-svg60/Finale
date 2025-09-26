import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, get, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Your Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyB4BAOLryVquqH_tqYPHUi4RypwOvWqrLo",
  authDomain: "iiiiiiii-1b65f.firebaseapp.com",
  databaseURL: "https://iiiiiiii-1b65f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "iiiiiiii-1b65f",
  storageBucket: "iiiiiiii-1b65f.firebasestorage.app",
  messagingSenderId: "351966581285",
  appId: "1:351966581285:web:a9c36086e659fd6048a5cc",
  measurementId: "G-LC4HKZZDG2"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// HTML Elements
const lobbyScreen = document.getElementById("lobbyScreen");
const gameScreen = document.getElementById("gameScreen");
const playerNameInput = document.getElementById("playerName");
const createGameBtn = document.getElementById("createGameBtn");
const joinGameBtn = document.getElementById("joinGameBtn");
const roomCodeInput = document.getElementById("roomCodeInput");
const roomCodeDisplay = document.getElementById("roomCodeDisplay");
const statusText = document.getElementById("status");
const scoreBoard = document.getElementById("scoreBoard");
const moveButtons = document.querySelectorAll(".moveBtn");

let playerName = "";
let playerRole = ""; // "player1" or "player2"
let roomId = "";

// Generate random room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

// Create Game
createGameBtn.addEventListener("click", () => {
  playerName = playerNameInput.value.trim();
  if (!playerName) return alert("Enter your name first!");

  roomId = generateRoomCode();
  playerRole = "player1";

  // Create room in Firebase
  set(ref(db, "games/" + roomId), {
    player1: { name: playerName, score: 0 },
    turn: "player1"
  });

  roomCodeDisplay.innerText = "Share this Room Code: " + roomId;
  startGame();
});

// Join Game
joinGameBtn.addEventListener("click", async () => {
  playerName = playerNameInput.value.trim();
  if (!playerName) return alert("Enter your name first!");

  roomId = roomCodeInput.value.trim().toUpperCase();
  if (!roomId) return alert("Enter a Room Code!");

  const gameRef = ref(db, "games/" + roomId);
  const snapshot = await get(gameRef);

  if (!snapshot.exists()) {
    alert("Room not found!");
    return;
  }

  playerRole = "player2";

  // Add player2 to Firebase
  set(ref(db, "games/" + roomId + "/player2"), {
    name: playerName,
    score: 0
  });

  startGame();
});

// Start Game Screen
function startGame() {
  lobbyScreen.style.display = "none";
  gameScreen.style.display = "block";

  listenForUpdates();
}

// Listen for Firebase changes
function listenForUpdates() {
  const gameRef = ref(db, "games/" + roomId);

  onValue(gameRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    let scoreText = "";
    if (data.player1) scoreText += `${data.player1.name}: ${data.player1.score} | `;
    if (data.player2) scoreText += `${data.player2.name}: ${data.player2.score}`;
    scoreBoard.innerText = scoreText;

    statusText.innerText = `Turn: ${data.turn}`;
  });
}

// Make a move
moveButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const move = parseInt(btn.dataset.move);

    const turnRef = ref(db, "games/" + roomId + "/turn");
    get(turnRef).then((snapshot) => {
      const currentTurn = snapshot.val();

      if (currentTurn === playerRole) {
        const scoreRef = ref(db, "games/" + roomId + "/" + playerRole + "/score");
        get(scoreRef).then((snap) => {
          let currentScore = snap.val() || 0;
          set(scoreRef, currentScore + move);

          // Switch turn
          const nextTurn = playerRole === "player1" ? "player2" : "player1";
          set(turnRef, nextTurn);
        });
      } else {
        alert("Wait for your turn!");
      }
    });
  });
});