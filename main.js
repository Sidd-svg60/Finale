import { database, ref, set, onValue } from './firebase.js';

let playerName = "";

// Wait until DOM is loaded
window.addEventListener("DOMContentLoaded", () => {

    const startButton = document.getElementById("startButton");
    startButton.addEventListener("click", () => {
        const input = document.getElementById("playerNameInput").value.trim();
        if (input === "") return alert("Please enter a name!");

        playerName = input;

        // Hide login, show game
        document.getElementById("login").style.display = "none";
        document.getElementById("game").style.display = "block";

        startGame();
    });

});

function startGame() {
    const gameRef = ref(database, 'handcricket/game');

    let playerScore = 0;
    let opponentScore = 0;

    // Register the player
    onValue(gameRef, (snapshot) => {
        const data = snapshot.val() || {};

        if (!data.player1) {
            set(ref(database, 'handcricket/game/player1'), { name: playerName, score: 0 });
            set(ref(database, 'handcricket/game/turn'), playerName);
        } else if (!data.player2 && data.player1.name !== playerName) {
            set(ref(database, 'handcricket/game/player2'), { name: playerName, score: 0 });
        }
    });

    // Listen for game updates
    onValue(gameRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        const turn = data.turn || '';
        const player1 = data.player1 || {};
        const player2 = data.player2 || {};

        if (playerName === player1.name) {
            playerScore = player1.score;
            opponentScore = player2.score || 0;
        } else if (playerName === player2.name) {
            playerScore = player2.score;
            opponentScore = player1.score || 0;
        }

        document.getElementById("playerScore").innerText = playerScore;
        document.getElementById("opponentScore").innerText = opponentScore;
        document.getElementById("turn").innerText = turn;

        const buttons = document.querySelectorAll('#buttons button');
        buttons.forEach(btn => btn.disabled = (turn !== playerName));
    });

    window.playRun = function(run) {
        onValue(gameRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            const turn = data.turn;
            if (turn !== playerName) return;

            const player1 = data.player1 || {};
            const player2 = data.player2 || {};

            const opponent = (playerName === player1.name) ? player2 : player1;
            const opponentLastRun = opponent.lastRun || Math.floor(Math.random()*6)+1;

            if (run === opponentLastRun) {
                alert("Out! Turn switched.");
                set(ref(database, 'handcricket/game/turn'), opponent.name);
            } else {
                playerScore += run;

                if (playerName === player1.name) {
                    set(ref(database, 'handcricket/game/player1'), { name: playerName, score: playerScore, lastRun: run });
                } else {
                    set(ref(database, 'handcricket/game/player2'), { name: playerName, score: playerScore, lastRun: run });
                }

                set(ref(database, 'handcricket/game/turn'), opponent.name);
            }
        }, { onlyOnce: true });
    };
}