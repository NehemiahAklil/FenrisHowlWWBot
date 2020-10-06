import telegraf from 'telegraf';
const { Extra, Markup } = telegraf;
import replies from '../replies.js';
import {
  sendError,
  findPlayerInfo,
  sendFindPlayerReplyMessage,
  checkIfReplyToMessageExists,
  getPackMemberAndPoints,
  getBothRolePoints,
} from '../actions.js';
import { getIconsForTopHowlers } from '../utils/helpers.js';
//import mongoose models schemas
import Packs from '../models/Packs.js';
import Players from '../models/Players.js';
import Points from '../models/Points.js';

//Handles on bot start message or '/start' command
export const startBotCommand = async (ctx) => {
  try {
    //gets reply from replies file
    if (ctx.startPayload === 'help')
      return ctx.replyWithHTML(replies.help.message);
    return ctx.replyWithHTML(replies.start);
  } catch (err) {
    console.log(err);
    await sendError(err, ctx);
  }
};
//Handles on help message or '/help' command
export const helpCommand = async (ctx) => {
  try {
    //send help message if in private if not send a redirect message using inline button
    if (ctx.chat.type === 'private')
      return ctx.replyWithHTML(replies.help.message);
    else
      return await ctx.replyWithMarkdown(
        replies.help.redirectToPrivateMsg,
        Extra.markup(
          Markup.inlineKeyboard([
            [
              Markup.urlButton(
                replies.help.buttonMsg,
                'https://t.me/FenrisHowlWWBot?start=help'
              ),
            ],
          ])
        )
      );
  } catch (err) {
    console.log(err);
    await sendError(err, ctx);
  }
};
// Handles finding users by id or username to display their howl points
export const findPlayerByIdCommand = async (playerId, ctx) => {
  try {
    const queryPlayer = await Players.findOne({
      TelegramId: playerId,
    });
    if (queryPlayer) {
      const playerStatus = await findPlayerInfo(queryPlayer);
      if (playerStatus.message) return ctx.reply(playerStatus.message);
      const { TelegramId, firstName } = queryPlayer;
      return await sendFindPlayerReplyMessage(
        ctx,
        TelegramId,
        firstName,
        playerStatus.points,
        playerStatus.pack
      );
    }
    return ctx.reply(replies.findPlayer.idNotFound(playerId));
  } catch (err) {
    console.log(err);
    await sendError(err, ctx);
  }
};
export const findPlayerByUsernameCommand = async (playerUserName, ctx) => {
  try {
    const queryPlayer = await Players.findOne({
      userName: playerUserName.toLowerCase(),
    });
    if (queryPlayer) {
      const playerStatus = await findPlayerInfo(queryPlayer);
      if (playerStatus.message) return ctx.reply(playerStatus.message);
      const { TelegramId, firstName } = queryPlayer;
      return await sendFindPlayerReplyMessage(
        ctx,
        TelegramId,
        firstName,
        playerStatus.points,
        playerStatus.pack
      );
    }
    console.log(playerUserName);
    return ctx.reply(replies.findPlayer.userNameNotFound(playerUserName));
  } catch (err) {
    console.log(err);
    await sendError(err, ctx);
  }
};
//Handles checking the players current status in the event
export const checkHowlsCommand = async (ctx) => {
  try {
    const replyToMessage = await checkIfReplyToMessageExists(ctx);
    if (!replyToMessage) return;
    const replyUserId = replyToMessage.from.id;
    const queryPlayer = await Players.findOne({
      TelegramId: replyUserId,
    });
    if (queryPlayer) {
      const playerStatus = await findPlayerInfo(queryPlayer);
      const { TelegramId, firstName } = queryPlayer;
      return await sendFindPlayerReplyMessage(
        ctx,
        TelegramId,
        firstName,
        playerStatus.points,
        playerStatus.pack
      );
    } else {
      ctx.reply(replies.player.notFound);
    }
  } catch (err) {
    console.log(err);
  }
};
// Handles the return of the mightiest player with the best howl points in
export const loudestHowlsCommand = async (ctx) => {
  try {
    const points = await Points.find().sort({ howlPoints: -1 }).limit(15);
    let promises = [];
    let playerPoints = new Set();
    let tenthPlayerPoint = null;
    points.forEach((point, idx) => {
      if (idx === 9) {
        tenthPlayerPoint = point.howlPoints;
      }
      if (tenthPlayerPoint) {
        if (tenthPlayerPoint !== point.howlPoints) {
          return;
        }
      }
      playerPoints.add(point.howlPoints);
      if (playerPoints.size <= 5) {
        promises.push(Players.findById(point.playerId));
      }
    });
    playerPoints = Array.from(playerPoints);
    const players = await Promise.all(promises);
    let replyMs = replies.loudestHowls.title;
    promises = [];
    let loudestPlayers = new Map();
    players.forEach((player) => {
      if (player.pack) {
        loudestPlayers.set(promises.length, player);
        promises.push(
          Packs.findById(player.pack).select({
            _id: 1,
            name: 1,
            emblem: 1,
            member: 1,
          })
        );
        return;
      }
      loudestPlayers.set(player._id, player);
    });
    const affiliatedPack = await Promise.all(promises);
    let idx = 0;
    loudestPlayers.forEach((player, playerId) => {
      let ranking = playerPoints.indexOf(points[idx].howlPoints) + 1;
      ranking = getIconsForTopHowlers(ranking);
      if (typeof playerId === 'number') {
        // console.log("I am special", playerId);
        replyMs += replies.loudestHowls.affiliatedHowlerMsg(
          ranking,
          player.firstName,
          points[idx].howlPoints,
          affiliatedPack[playerId]
        );
        idx++;
        return;
      }
      console.log(playerId);
      replyMs += `${ranking} ${player.firstName} with ${points[idx].howlPoints} points\n`;
      idx++;
    });
    return ctx.replyWithHTML(replyMs);
  } catch (err) {
    console.log(err);
    await sendError(err, ctx);
  }
};
// Handles the return of the mightiest packs with the best howlers
export const listPacksCommand = async (ctx) => {
  const packs = await Packs.find();
  let promises = [];
  packs.forEach((pack) => {
    promises.push(getPackMemberAndPoints(pack._id));
  });
  let packsInfo = await Promise.all(promises);
  if (packsInfo.length === 0) {
    return ctx.reply(replies.listPacks.noPacks);
  }
  packsInfo.sort((a, b) => {
    return b.point - a.point;
  });
  console.log(packsInfo);
  let replyMsg = replies.listPacks.title;
  packsInfo.forEach((pack, idx) => {
    if (pack.alphas.length > 0) {
      replyMsg += replies.listPacks.packInfo(pack);
      replyMsg += replies.listPacks.alphaTitle;
      pack.alphas.forEach((alpha) => {
        replyMsg += replies.listPacks.alphaInfo(alpha);
      });
      if (pack.betas.length > 0) {
        replyMsg += replies.listPacks.betaTitle;
        pack.betas.forEach((beta) => {
          replyMsg += replies.listPacks.betaInfo(beta);
        });
      }
      if (pack.members.length === 0) {
        return (replyMsg += replies.listPacks.noMember);
      }
      replyMsg += replies.listPacks.memberTitle;
      pack.members.forEach((member) => {
        replyMsg += replies.listPacks.memberInfo(member);
      });
    }
  });
  ctx.replyWithHTML(replyMsg);
};
export const rolePointsCommand = async (ctx) => {
  return ctx.reply(
    `Role Points:
   ━━━ Villagers ━━━
 🍵 Alchemist: ${(await getBothRolePoints('Alchemist')).points}
 🙇 Apprentice Seer: ${(await getBothRolePoints('Apprentice Seer')).points}
 👁 Beholder: ${(await getBothRolePoints('Beholder')).points}
 💅 Beauty: ${(await getBothRolePoints('Beauty')).points}
 ⚒ Blacksmith: ${(await getBothRolePoints('Blacksmith')).points}
 🤕 Clumsy Guy: ${(await getBothRolePoints('Clumsy Guy')).points}
 💂 Cultist Hunter: ${(await getBothRolePoints('Cultist Hunter')).points}
 🏹 Cupid: ${(await getBothRolePoints('Cupid')).points}
 😾 Cursed: ${(await getBothRolePoints('Cursed')).points}
 🕵️ Detective: ${(await getBothRolePoints('Detective')).points}
 🍻 Drunk: ${(await getBothRolePoints('Drunk')).points}
 🃏 Fool: ${(await getBothRolePoints('Fool')).points}
 👼 Guardian Angel: ${(await getBothRolePoints('Guardian Angel')).points}
 🔫 Gunner: ${(await getBothRolePoints('Gunner')).points}
 💋 Harlot: ${(await getBothRolePoints('Harlot')).points}
 🔰 Martyr: ${(await getBothRolePoints('Martyr')).points}
 👷 Mason: ${(await getBothRolePoints('Mason')).points}
 🎖 Mayor: ${(await getBothRolePoints('Mayor')).points}
 👑 Monarch: ${(await getBothRolePoints('Monarch')).points}
 🌀 Oracle: ${(await getBothRolePoints('Oracle')).points}
 ☮ Pacifist: ${(await getBothRolePoints('Pacifist')).points}
 💍 Prince: ${(await getBothRolePoints('Prince')).points}
 💤 Sandman: ${(await getBothRolePoints('Sandman')).points}
 👳 Seer: ${(await getBothRolePoints('Seer')).points}
 🛡 Squire: ${(await getBothRolePoints('Squire')).points}
 🌩 Storm Bringer: ${(await getBothRolePoints('Storm Bringer')).points}
 🖕 Traitor: ${(await getBothRolePoints('Traitor')).points}
 👱‍♂ Villager: ${(await getBothRolePoints('Villager')).points}
 👶 Wild Child: ${(await getBothRolePoints('Wild Child')).points}
 📚 Wise Elder: ${(await getBothRolePoints('Wise Elder')).points}
 👨🌚 WolfMan: ${(await getBothRolePoints('WolfMan')).points}

 ━━━ Wolves ━━━
 ⚡ Alpha Wolf: ${(await getBothRolePoints('Alpha Wolf')).points}
 🐺🌝 Lycan: ${(await getBothRolePoints('Lycan')).points}
 👼🐺 Fallen Angel: ${(await getBothRolePoints('Fallen Angel')).points}
 ☄ Mystic: ${(await getBothRolePoints('Mystic')).points}
 🦉 Prowler: ${(await getBothRolePoints('Prowler')).points}
 🔮 Sorcerer: ${(await getBothRolePoints('Sorcerer')).points}
 🐑 Trickster Wolf: ${(await getBothRolePoints('Trickster Wolf')).points}
 🐺 Werewolf: ${(await getBothRolePoints('Werewolf')).points}
 🐶 Wolf Cub: ${(await getBothRolePoints('Wolf Cub')).points}

 ━━━ Other Roles ━━━
 🔥 Arsonist: ${(await getBothRolePoints('Arsonist')).points}
 🐺🌑 Black Wolf: ${(await getBothRolePoints('Black Wolf')).points}
 👤 Cultist: ${(await getBothRolePoints('Cultist')).points}
 🎭 Doppelgänger: ${(await getBothRolePoints('Doppelgänger')).points}
 ⚰ Necromancer: ${(await getBothRolePoints('Necromancer')).points}
 🕴 Puppet Master: ${(await getBothRolePoints('Puppet Master')).points}
 🔪 Serial Killer: ${(await getBothRolePoints('Serial Killer')).points}
 😈 Thief: ${(await getBothRolePoints('Thief')).points}`,
    Extra.inReplyTo(ctx.message.message_id).HTML()
  );
};
