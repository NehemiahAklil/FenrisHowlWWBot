// repliedMessage(`Players Alive: 6 / 16
// Kirubel 🥇: 💀 Dead - the Seer 👳 Won
// Mista 🥉: 💀 Dead - a Werewolf 🐺 Lost
// Sarina👼🏽 🥇: 💀 Dead - The Prowler 🦉 Lost
// Lauv 😍: 💀 Dead - a Cultist 👤 Lost
// Maymay🥀: 💀 Dead - the Lycan 🐺🌝 Lost
// Tad 🥇: 💀 Dead - the Beauty 💅 Won
// Jasmin 🍀🌻: 💀 Dead - a Cultist 👤 Lost
// Lyght 🥈: 💀 Dead - Arsonist 🔥❤️ Won
// Kiya 🥇: 💀 Dead - Cupid 🏹❤️ Won
// godamongmen🦍 🥉: 💀 Dead - a Cultist 👤 Lost
// Aymen 🥇: 🙂 Alive - the Cultist Hunter 💂 Won
// Brook 🥇: 🙂 Alive - the Wise Elder 📚 Won
// Imran [愛] 🥉: 🙂 Alive - the Oracle 🌀 Won
// Rich🦋 🥇: 🙂 Alive - Storm Bringer 🌩 Won
// Åmâñ😎 🥇: 🙂 Alive - the Alchemist 🍵 Won
// _kenny_ 🥇: 🙂 Alive - the Seer 👳 Won

// Game Length: 00:16:19`);

//import mongoose models schemas
const Packs = require('./models/Packs');
const Players = require('./models/Players');
const mongoose = require('mongoose');
const { sendError, checkIfPackAlpha } = require('./actions');
mongoose
  .connect('mongodb://localhost/FenrisWW', {
    useUnifiedTopology: true,
    useNewUrlParser: true,
  })
  .then((result) => console.log('Connected to FenrisWWDB'));

// const checkIfPackAlpha = async (userId) => {
//   try {
//     const player = await Players.findOne({ TelegramId: userId });
//     if (!player) {
//       return { isAlpha: false, message: "Player couldn't be found on db" };
//     } else if (!player.pack) {
//       return { isAlpha: false, message: 'Not Affiliated with any Pack' };
//     }
//     const usersPack = await Packs.findById(player.pack);
//     if (usersPack == null) {
//       return { isAlpha: false, message: 'Belongs to a non-existing Pack' };
//     }
//     if (usersPack.alphas.includes(player._id)) {
//       return { isAlpha: true };
//     } else
//       return {
//         isAlpha: false,
//         message: 'Player is not Alpha of afflicted Pack',
//       };
//   } catch (err) {
//     console.log(err);
//     // sendError(err, ctx);
//   }
// };
checkIfPackAlpha(528744128).then((result) => console.log(result));
