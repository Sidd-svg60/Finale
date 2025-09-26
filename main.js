import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, set, get, onValue, update } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Elements
const lobbyScreen = document.getElementById("lobbyScreen");
const gameScreen = document.getElementById("gameScreen");
const createGameBtn = document.getElementById("createGameBtn");
const joinGameBtn = document.getElementById("joinGameBtn");
const playerNameInput = document.getElementById("playerName");
const roomCodeInput = document.getElementById("roomCodeInput");
const statusText = document.getElementById("status");
const scoreBoard = document.getElementById("scoreBoard");
const roomInfo = document.getElementById("roomInfo");
const roomCodeBox = document.getElementById("roomCodeBox");
const roomCodeDisplay = document.getElementById("roomCodeDisplay");
const copyCodeBtn = document.getElementById("copyCodeBtn");

let playerName = "";
let playerRole = "";
let roomId = "";

// Utility
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

// Create Game
createGameBtn.addEventListener("click", () => {
  playerName = playerNameInput.value.trim();
  if (!playerName) return alert("Enter your name!");

  roomId = generateRoomCode();
  playerRole = "player1";

  set(ref(db, "games/" + roomId), {
    player1: { name: playerName, score: 0 },
    player2: { name: null, score: 0 },
    inning: 1,
    batting: "player1",
    bowling: "player2",
    moves: {},
    roomCode: roomId
  });

  roomCodeBox.style.display = "block";
  roomCodeDisplay.value = roomId;

  startListening();
});

// Copy Room Code
copyCodeBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(roomCodeDisplay.value);
  alert("Room code copied: " + roomCodeDisplay.value);
});

// Join Game
joinGameBtn.addEventListener("click", async () => {
  playerName = playerNameInput.value.trim();
  if (!playerName) return alert("Enter your name!");

  roomId = roomCodeInput.value.trim().toUpperCase();
  if (!roomId) return alert("Enter valid room code");

  const snapshot = await get(ref(db, "games/" + roomId));
  if (!snapshot.exists()) return alert("Room not found!");

  playerRole = "player2";
  update(ref(db, "games/" + roomId + "/player2"), { name: playerName, score: 0 });

  startListening();
});

// Start listening for game updates
function startListening() {
  lobbyScreen.style.display = "none";
  gameScreen.style.display = "block";
  roomInfo.innerText = "Room: " + roomId;

  const gameRef = ref(db, "games/" + roomId);

  onValue(gameRef, (snapshot) => {
    const data = snapshot.val();
    if (!data || !data.player1.name || !data.player2.name) {
      statusText.innerText = "Waiting for both players to join...";
      return;
    }

    // Display batting/bowling info
    const battingName = data[data.batting]?.name;
    const bowlingName = data[data.bowling]?.name;
    statusText.innerHTML = `Inning ${data.inning}: <br>${battingName} is Batting, ${bowlingName} is Bowling`;

    // Display scores
    scoreBoard.innerHTML = `${data.player1.name}: ${data.player1.score} runs<br>${data.player2.name}: ${data.player2.score} runs`;

    // Check if both moves submitted
    if (Object.keys(data.moves).length === 2) {
      const batterRole = data.batting;
      const bowlerRole = data.bowling;
      const batterMove = data.moves[batterRole];
      const bowlerMove = data.moves[bowlerRole];

      if (batterMove === bowlerMove) {
        alert(`${data[batterRole].name} is OUT!`);

        if (data.inning === 1) {
          // Switch innings
          update(ref(db, "games/" + roomId), {
            inning: 2,
            batting: data.bowling,
            bowling: data.batting,
            moves: {}
          });
        } else {
          // End game
          const player1Score = data.player1.score;
          const player2Score = data.player2.score;
          let winner = "Draw!";
          if (player1Score > player2Score) winner = `${data.player1.name} wins!`;
          else if (player2Score > player1Score) winner = `${data.player2.name} wins!`;
          alert(`Game Over! ${winner}`);
          // Reset moves to allow replay
          update(ref(db, "games/" + roomId), { moves: {} });
        }
      } else {
        // Add runs to batter
        const newScore = data[batterRole].score + batterMove;
        update(ref(db, `games/${roomId}/${batterRole}`), { score: newScore });
        update(ref(db, `games/${roomId}/moves`), {}); // reset moves
      }
    }
  });
}

// Handle move buttons
document.querySelectorAll(".moveBtn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const move = parseInt(btn.dataset.move);
    const moveRef = ref(db, `games/${roomId}/moves/${playerRole}`);
    await set(moveRef, move);
  });
});