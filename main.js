function startListening() {
  lobbyScreen.style.display = "none";
  gameScreen.style.display = "block";
  roomInfo.innerText = "Room: " + roomId;

  const gameRef = ref(db, "games/" + roomId);

  onValue(gameRef, async (snapshot) => {
    const data = snapshot.val();
    if (!data || !data.player1.name || !data.player2.name) {
      statusText.innerText = "Waiting for both players to join...";
      return;
    }

    // Show who is batting/bowling
    const battingName = data[data.batting]?.name;
    const bowlingName = data[data.bowling]?.name;
    statusText.innerHTML = `Inning ${data.inning}: <br>${battingName} is Batting, ${bowlingName} is Bowling`;

    // Show scores
    scoreBoard.innerHTML = `${data.player1.name}: ${data.player1.score} runs<br>${data.player2.name}: ${data.player2.score} runs`;

    // Process moves only if both players have submitted
    const moves = data.moves || {};
    if (moves.player1 != null && moves.player2 != null) {
      const batterRole = data.batting;
      const bowlerRole = data.bowling;
      const batterMove = parseInt(moves[batterRole]);
      const bowlerMove = parseInt(moves[bowlerRole]);

      if (batterMove === bowlerMove) {
        // Player is OUT
        alert(`${data[batterRole].name} is OUT!`);

        if (data.inning === 1) {
          // Switch innings
          await update(ref(db, "games/" + roomId), {
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
          // Reset moves
          await update(ref(db, "games/" + roomId), { moves: {} });
        }
      } else {
        // Add runs to batter
        const newScore = data[batterRole].score + batterMove;
        await update(ref(db, `games/${roomId}/${batterRole}`), { score: newScore });
        await update(ref(db, `games/${roomId}/moves`), {}); // reset moves
      }
    }
  });
}

// Handle player move buttons
document.querySelectorAll(".moveBtn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const move = parseInt(btn.dataset.move); // ensure number
    if (!roomId || !playerRole) return alert("Join a game first!");
    const moveRef = ref(db, `games/${roomId}/moves/${playerRole}`);
    await set(moveRef, move);
  });
});