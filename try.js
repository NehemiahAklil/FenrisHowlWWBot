const { parseGameMessage, checkUserRole, sendError } = require('./actions');

const repliedMessage = async (gameMessage) => {
  const { userInfo, gameInfo } = await parseGameMessage(gameMessage);
  let replyMessage = [];
  userInfo.forEach((singleMessage) => {
    const { name, lifeStatus, winningStatus, role } = singleMessage;
    replyMessage.push(
      `${name} was ${lifeStatus} and ${winningStatus} with the role ${role}`
    );
  });
  replyMessage = JSON.stringify(replyMessage, (key, value) => value, '\n');
  console.log(replyMessage);
};

repliedMessage(`Players Alive: 6 / 16
Kirubel 🥇: 💀 Dead - the Seer 👳 Won
Mista 🥉: 💀 Dead - a Werewolf 🐺 Lost
Sarina👼🏽 🥇: 💀 Dead - The Prowler 🦉 Lost
Lauv 😍: 💀 Dead - a Cultist 👤 Lost
Maymay🥀: 💀 Dead - the Lycan 🐺🌝 Lost
Tad 🥇: 💀 Dead - the Beauty 💅 Won
Jasmin 🍀🌻: 💀 Dead - a Cultist 👤 Lost
Lyght 🥈: 💀 Dead - Arsonist 🔥❤️ Won
Kiya 🥇: 💀 Dead - Cupid 🏹❤️ Won
godamongmen🦍 🥉: 💀 Dead - a Cultist 👤 Lost
Aymen 🥇: 🙂 Alive - the Cultist Hunter 💂 Won
Brook 🥇: 🙂 Alive - the Wise Elder 📚 Won
Imran [愛] 🥉: 🙂 Alive - the Oracle 🌀 Won
Rich🦋 🥇: 🙂 Alive - Storm Bringer 🌩 Won
Åmâñ😎 🥇: 🙂 Alive - the Alchemist 🍵 Won
_kenny_ 🥇: 🙂 Alive - the Seer 👳 Won

Game Length: 00:16:19`);
