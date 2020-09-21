// // repliedMessage(`Players Alive: 6 / 16
// // Kirubel 🥇: 💀 Dead - the Seer 👳 Won
// // Mista 🥉: 💀 Dead - a Werewolf 🐺 Lost
// // Sarina👼🏽 🥇: 💀 Dead - The Prowler 🦉 Lost
// // Lauv 😍: 💀 Dead - a Cultist 👤 Lost
// // Maymay🥀: 💀 Dead - the Lycan 🐺🌝 Lost
// // Tad 🥇: 💀 Dead - the Beauty 💅 Won
// // Jasmin 🍀🌻: 💀 Dead - a Cultist 👤 Lost
// // Lyght 🥈: 💀 Dead - Arsonist 🔥❤️ Won
// // Kiya 🥇: 💀 Dead - Cupid 🏹❤️ Won
// // godamongmen🦍 🥉: 💀 Dead - a Cultist 👤 Lost
// // Aymen 🥇: 🙂 Alive - the Cultist Hunter 💂 Won
// // Brook 🥇: 🙂 Alive - the Wise Elder 📚 Won
// // Imran [愛] 🥉: 🙂 Alive - the Oracle 🌀 Won
// // Rich🦋 🥇: 🙂 Alive - Storm Bringer 🌩 Won
// // Åmâñ😎 🥇: 🙂 Alive - the Alchemist 🍵 Won
// // _kenny_ 🥇: 🙂 Alive - the Seer 👳 Won

// // Game Length: 00:16:19`);

// //import mongoose models schemas
const Packs = require('./models/Packs');
const Players = require('./models/Players');
const mongoose = require('mongoose');
const replies = require('./replies');
const Points = require('./models/Points');
// // const { getIconsForTopHowlers } = require('./utils/helpers');

// // const { sendError, checkIfPackAlpha } = require('./actions');
mongoose
  .connect('mongodb://localhost/FenrisWW', {
    useUnifiedTopology: true,
    useNewUrlParser: true,
  })
  .then((result) => console.log('Connected to FenrisWWDB'));

// const getPackInfo = async (packId) => {
//   try {
//     const pack = await Packs.findById(packId);
//     // console.log(pack);
//     const points = await Points.find({ packId: packId });
//     console.log(points);
//     if (points && pack) {
//       let packPoints = 0;
//       points.forEach((point) => {
//         packPoints += point.howlPoints;
//       });
//       return {
//         isAPack: true,
//         name: pack.name,
//         emblem: pack.emblem,
//         points: packPoints,
//       };
//     } else {
//       return { isAPack: false };
//     }
//   } catch (err) {
//     console.log(err);
//     return { isAPack: false };
//   }
// };
// getPackInfo('5f5d52e28573fd548476a34a').then((packPoint) => {
//   if (packPoint.isAPack) {
//     console.log('Pack Info:\n', packPoint);
//   } else {
//     console.log(packPoint);
//   }
// });

// // const loudestHowls = async () => {
// //   const points = await Points.find().sort({ howlPoints: -1 }).limit(15);
// //   let promises = [];
// //   let playerPoints = new Set();
// //   let tenthPlayerPoint = null;
// //   let checkSave = true;
// //   points.forEach(async (point, idx) => {
// //     if (idx == 9) {
// //       tenthPlayerPoint = point.howlPoints;
// //     }
// //     if (tenthPlayerPoint) {
// //       if (tenthPlayerPoint !== point.howlPoints) {
// //         return;
// //       }
// //     }
// //     playerPoints.add(point.howlPoints);
// //     await promises.push(Players.findById(point.playerId));
// //   });
// //   playerPoints = Array.from(playerPoints);
// //   const players = await Promise.all(promises);
// //   // console.log('Down Below Players');
// //   // console.log(players);
// //   // console.log(points);
// //   // console.log('up above Points');
// //   let replyMs = replies.loudestHowlsMsg;
// //   promises = [];
// //   let loudestPlayers = new Map();
// //   players.forEach(async (player) => {
// //     if (player.pack) {
// //       loudestPlayers.set(promises.length, player);
// //       await promises.push(
// //         Packs.findById(player.pack).select({ _id: 1, name: 1, member: 1 })
// //       );
// //       return;
// //     }
// //     loudestPlayers.set(player._id, player);
// //   });
// //   const affiliatedPack = await Promise.all(promises);
// //   console.log('affiliatedPack', affiliatedPack);
// //   let idx = 0;
// //   loudestPlayers.forEach((player, playerId) => {
// //     let ranking = playerPoints.indexOf(points[idx].howlPoints) + 1;
// //     ranking = getIconsForTopHowlers(ranking);
// //     if (typeof playerId === 'number') {
// //       console.log('I am special', playerId);
// //       replyMs += `${ranking} ${player.firstName} with ${points[idx].howlPoints} points from ${affiliatedPack[playerId].name}\n`;
// //       idx++;
// //       return;
// //     }
// //     console.log(playerId);
// //     replyMs += `${ranking} ${player.firstName} with ${points[idx].howlPoints} points\n `;
// //     idx++;
// //   });
// //   console.log(replyMs);
// // };

// // const checkIfPackAlpha = async (userId) => {
// //   try {
// //     const player = await Players.findOne({ TelegramId: userId });
// //     if (!player) {
// //       return { isAlpha: false, message: "Player couldn't be found on db" };
// //     } else if (!player.pack) {
// //       return { isAlpha: false, message: 'Not Affiliated with any Pack' };
// //     }
// //     const usersPack = await Packs.findById(player.pack);
// //     if (usersPack == null) {
// //       return { isAlpha: false, message: 'Belongs to a non-existing Pack' };
// //     }
// //     if (usersPack.alphas.includes(player._id)) {
// //       return { isAlpha: true };
// //     } else
// //       return {
// //         isAlpha: false,
// //         message: 'Player is not Alpha of afflicted Pack',
// //       };
// //   } catch (err) {
// //     console.log(err);
// //     // sendError(err, ctx);
// //   }
// // };
// // checkIfPackAlpha(528744128).then((result) => console.log(result));

let packs = [{ name: 'Wolf', emblem: '4', points: 12 }];

// const addNewPack = () => {
//   const newPack = { name: 'Dragon', emblem: '2', points: 7 };
//   const updatePack = { name: 'Wolf', emblem: '4', points: 7 };
//   const updatePack1 = { name: 'Wolf', emblem: '4', points: 7 };
//   if (!packs.some((e) => e.name === newPack.name)) {
//     packs.push(newPack);
//   }
//   if (packs.some((e) => e.name === updatePack.name)) {
//     packs = packs.map((pack) => {
//       return { ...pack, points: pack.points + updatePack.points };
//     });
//   }
//   if (packs.some((e) => e.name === updatePack1.name)) {
//     packs = packs.map((pack) => {
//       return { ...pack, points: pack.points + updatePack1.points };
//     });
//   }
//   console.log(packs);
// };
// const getPackMembers = async (packId) => {
//   const pack = await Packs.findById(packId);
//   let promises = [];
//   pack.alphas.forEach(async (alphaId) => {
//     promises.push(Players.findById(alphaId));
//   });
//   let packAlphas = await Promise.all(promises);
//   promises = [];
//   pack.members.forEach(async (memberId) => {
//     promises.push(Players.findById(memberId));
//   });
//   let packMembers = await Promise.all(promises);
//   return { packMembers, packAlphas };
// };
