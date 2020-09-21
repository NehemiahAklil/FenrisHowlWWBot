const { Extra, Markup } = require('telegraf');
const replies = require('./replies');
const {
  parseGameMessage,
  checkUserRole,
  sendError,
  checkIfPackAlpha,
  findPlayerInfo,
  sendFindPlayerReplyMessage,
  updateGamePlayersInfo,
  deletionWarningMessage,
  checkIfReplyToMessageExists,
  getPackMemberAndPoints,
  checkGameMessageValidity,
  deleteAlphaLessPack,
} = require('./actions');
const {
  parseChangeModeRegex,
  getIconsForTopHowlers,
} = require('./utils/helpers');
const Telegraf = require('telegraf');
//import mongoose models schemas
const Packs = require('./models/Packs');
const Players = require('./models/Players');
const Points = require('./models/Points');

//Get sensitive files from config
const config = require('config');
const botToken = config.get('botToken');
const { telegram } = new Telegraf(botToken);

module.exports = {
  // help players command
  helpCommand: async (ctx) => {
    try {
      if (ctx.chat.type === 'private') {
        ctx.reply(replies.help.message, Extra.HTML());
      } else {
        await ctx.reply(
          replies.help.redirectToPrivateMsg,
          Extra.markup(
            Markup.inlineKeyboard([
              [
                Markup.urlButton(
                  replies.help.buttonMsg,
                  'https://t.me/FenrisHowlWWBot'
                ),
              ],
            ])
          ).HTML()
        );
      }
    } catch (err) {
      console.log(err);
    }
  },

  // on bot start message command
  startBotCommand: async (ctx) => {
    ctx.reply("Welcome to Fenris' Howl Bot");
  },

  //checks the players status in group
  checkPlayerCommand: async (ctx) => {
    try {
      const chatInfo = ctx.chat.id;
      console.log(ctx.message);
      const replyToMessage = await checkIfReplyToMessageExists(ctx);
      if (!replyToMessage) return;
      const userInfo = replyToMessage.from.id;
      const user = await telegram.getChatMember(chatInfo, userInfo);
      if (['creator', 'administrator'].includes(user.status)) {
        return ctx.reply(replies.player.checkAdminPlayer(user), Extra.HTML());
      } else {
        return ctx.reply(replies.player.checkNormalPlayer(user), Extra.HTML());
      }
    } catch (err) {
      console.log(err);
    }
  },

  changeModeCommand: async (ctx) => {
    const { modeType, errorMsg } = await parseChangeModeRegex(ctx.message.text);
    if (modeType) {
      switch (modeType) {
        case 'loneWolf':
          return ctx.reply(replies.changeGameMode.loneWolfMode, Extra.HTML());
        case 'packWars':
          return ctx.reply(replies.changeGameMode.packWarsMode, Extra.HTML());
      }
    } else {
      ctx.reply(errorMsg);
    }
  },
  makeAlphaCommand: async (ctx) => {
    const { isAdmin } = await checkUserRole(ctx);
    if (!isAdmin) {
      return ctx.reply(replies.admin.onlyAdminsAllowedMsg);
    }
    const replyToMessage = await checkIfReplyToMessageExists(ctx);
    if (!replyToMessage) return;
    const userId = ctx.message.from.id;
    const repliedUserId = ctx.message.reply_to_message.from.id;
    const repliedUser = await telegram.getChatMember(
      ctx.chat.id,
      repliedUserId
    );
    const checkAlpha = await checkIfPackAlpha(userId);
    const findPack = await Packs.findById(checkAlpha.packId);
    if (checkAlpha.isAlpha) {
      const { id, first_name, username } = repliedUser.user;
      let newAlphaPlayer = await Players.findOne({
        TelegramId: repliedUserId,
      });
      if (
        findPack.members.includes(newAlphaPlayer._id) &&
        findPack.alphas.includes(newAlphaPlayer._id)
      )
        return ctx.reply(replies.player.alreadyInPack(findPack.name));
      if (!newAlphaPlayer) {
        const createNewAlpha = await Players.create({
          TelegramId: id,
          firstName: first_name,
          userName: username.toLowerCase(),
          pack: checkAlpha.packId,
        });

        const pack = await Packs.findByIdAndUpdate(
          checkAlpha.packId,
          {
            $push: {
              alphas: createNewAlpha._id,
            },
          },
          { new: true }
        );
        return ctx.reply(
          replies.player.madeAlpha(createNewAlpha, pack),
          Extra.HTML()
        );
      } else {
        if (newAlphaPlayer.pack) {
          await Packs.updateMany({
            $pull: { alphas: newAlphaPlayer._id },
          });
        }
        const updateAlphaPlayer = await Players.findOneAndUpdate(
          {
            TelegramId: repliedUserId,
          },
          {
            $set: {
              firstName: first_name,
              userName: username.toLowerCase(),
              pack: checkAlpha.packId,
            },
          },
          { new: true }
        );
        const pack = await Packs.findById(checkAlpha.packId);
        if (pack.alphas.includes(updateAlphaPlayer._id))
          return ctx.reply(replies.player.alreadyInPack(pack.name));
        pack.alphas.push(updateAlphaPlayer._id);
        await pack.save();
        ctx.reply(
          replies.player.madeAlpha(updateAlphaPlayer, pack),
          Extra.HTML()
        );
      }
    }
  },
  createPackCommand: async (ctx) => {
    const { isAdmin } = await checkUserRole(ctx);
    if (!isAdmin) {
      return ctx.reply(replies.admin.onlyAdminsAllowedMsg);
    }
    const matchPackNameRegex = /(?<=\/+(create_pack))(.*[a-zA-z])/;
    const matchPackRegex = /(?<=\/+(create_pack))(.*)/;
    const matchPackNameAndEmblem = ctx.message.text
      .match(matchPackRegex)[0]
      .split(' ');
    const packName = ctx.message.text.match(matchPackNameRegex)[0].trim();
    const packEmblem = matchPackNameAndEmblem[
      matchPackNameAndEmblem.length - 1
    ].trim();
    const packExits = await Packs.findOne({
      $or: [{ name: packName }, { emblem: packEmblem }],
    });
    if (packExits) {
      return ctx.reply('Pack already Exits');
    }
    let alphaPlayer = await Players.findOne({
      TelegramId: ctx.message.from.id,
    });
    if (!alphaPlayer) {
      alphaPlayer = await Players.create({
        TelegramId: ctx.message.from.id,
        firstName: ctx.message.from.first_name,
        userName: ctx.message.from.username.toLowerCase(),
      });
    }
    if (alphaPlayer.pack) {
      await Packs.updateMany({
        $pull: { alphas: alphaPlayer._id },
      });
    }
    const newPack = await Packs.create({
      name: packName,
      emblem: packEmblem,
      alphas: [alphaPlayer._id],
    });

    await Players.findByIdAndUpdate(
      alphaPlayer._id,
      {
        pack: newPack._id,
      },
      { new: true }
    );
    return ctx.reply(`created pack ${newPack.name} ${newPack.emblem}`);
  },
  deletePackCommand: async (ctx) => {
    const { isAdmin } = await checkUserRole(ctx);
    if (!isAdmin) {
      return ctx.reply(replies.admin.onlyAdminsAllowedMsg);
    }
    const chatId = ctx.chat.id;
    const userId = ctx.message.from.id;
    const checkAlpha = await checkIfPackAlpha(userId);
    let pack;
    if (checkAlpha.isAlpha) {
      const formerAlpha = await Players.updateMany(
        {
          pack: checkAlpha.packId,
        },
        {
          $unset: {
            pack: 1,
          },
        }
      );
      pack = await Packs.findByIdAndDelete(checkAlpha.packId);
    } else {
      ctx.reply(checkAlpha.message);
    }
    return ctx.reply(`Deleted Pack ${pack.name} ${pack.emblem}`);
  },
  //
  howlPointsCommand: async (ctx) => {
    try {
      const { isAdmin } = await checkUserRole(ctx);
      if (!isAdmin) {
        return ctx.reply(replies.admin.onlyAdminsAllowedMsg);
      }
      const repliedToMessage = await checkIfReplyToMessageExists(ctx);
      if (!repliedToMessage) return;
      const messageValidity = await checkGameMessageValidity(repliedToMessage);
      if (!messageValidity)
        return ctx.reply(replies.repliedMessage.invalidMessage);
      await updateGamePlayersInfo(repliedToMessage);
      ctx.reply('User Infos Updated');
      const {
        userInfo,
        gameInfo,
        packs,
        invalidMessage,
      } = await parseGameMessage(repliedToMessage);
      if (invalidMessage) return ctx.reply(invalidMessage);
      const { playersAlive, totalPlayers, numberOfWinners } = gameInfo;
      ctx.reply(
        `The game had ${totalPlayers} players out this players ${playersAlive} were alive and also ${numberOfWinners} won the game`
      );
      let replyMessage = '';
      const unAffiliatedUsers = userInfo.filter((user) => {
        if (!user.packInfo) {
          return user;
        }
      });
      console.log('My Packs', packs);
      packs.forEach((pack) => {
        const { name, emblem, points, gainedPoints } = pack;
        replyMessage += `\n<b>${emblem} ${name} pack</b> got ${gainedPoints} points (now has ${
          points + gainedPoints
        } points)\n`;
        userInfo.forEach((packMember) => {
          if (packMember.packInfo) {
            if (packMember.packInfo.name === name) {
              replyMessage += ` ${packMember.name} the ${packMember.role} got ${packMember.gainedPoints} points (now has ${packMember.totalPoints} points) ${packMember.packInfo.emblem}\n`;
            }
          }
        });
      });
      if (unAffiliatedUsers.length > 0) {
        replyMessage += `\n✌<b>Non-Affiliated Players</b>\n`;
        unAffiliatedUsers.forEach((lonePlayer) => {
          lonePlayer
            ? (replyMessage += `${lonePlayer.name} the ${lonePlayer.role} got ${lonePlayer.gainedPoints} points (now has ${lonePlayer.totalPoints})\n`)
            : null;
        });
      }
      return ctx.reply(`<b>Game Results:</b> \n ${replyMessage}`, Extra.HTML());
    } catch (err) {
      console.log(err);
      sendError(err, ctx);
    }
  },

  //delete howl points
  silenceHowlsCommand: async (ctx) => {
    const { isAdmin } = await checkUserRole(ctx);
    if (!isAdmin) {
      return ctx.reply(replies.admin.onlyAdminsAllowedMsg);
    }
    await deletionWarningMessage(ctx, 'Silence Howls', 'silence howls');
  },
  listPacksCommand: async (ctx) => {
    const packs = await Packs.find();
    let promises = [];
    packs.forEach((pack) => {
      promises.push(getPackMemberAndPoints(pack._id));
    });
    let packsInfo = await Promise.all(promises);
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
        if (pack.members.length == 0) {
          return (replyMsg += replies.listPacks.noMember);
        }
        replyMsg += replies.listPacks.memberTitle;
        pack.members.forEach((member) => {
          replyMsg += replies.listPacks.memberInfo(member);
        });
      }
    });
    ctx.reply(replyMsg, Extra.HTML());
  },
  leavePackCommand: async (ctx) => {
    try {
      const userId = ctx.message.from.id;
      const { first_name, username } = ctx.message.from;
      let memberPlayer = await Players.findOne({
        TelegramId: userId,
      });
      console.log();
      if (!memberPlayer) {
        return ctx.reply(replies.player.notFound);
      } else {
        const retiringMember = await Players.findOneAndUpdate(
          {
            TelegramId: userId,
          },
          {
            $set: {
              firstName: first_name,
              userName: username.toLowerCase(),
            },
            $unset: {
              pack: 1,
            },
          },
          { new: true }
        );
        const pack = await Packs.findByIdAndUpdate(memberPlayer.pack, {
          $pull: {
            members: retiringMember._id,
            alphas: retiringMember._id,
          },
        });
        ctx.reply(replies.player.leavePack(retiringMember, pack), Extra.HTML());
      }
    } catch (err) {
      console.log(err);
    }
  },
  //methods to find player and send back players info
  findPlayerByIdCommand: async (playerId, ctx) => {
    try {
      const queryPlayer = await Players.findOne({
        TelegramId: playerId,
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
      }
      return ctx.reply(replies.findPlayer.idNotFound(playerId));
    } catch (err) {
      console.log(err);
      // sendError(err, ctx);
    }
  },
  findPlayerByUsernameCommand: async (playerUserName, ctx) => {
    try {
      const queryPlayer = await Players.findOne({
        userName: playerUserName.toLowerCase(),
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
      }
      console.log(playerUserName);
      return ctx.reply(replies.findPlayer.userNameNotFound(playerUserName));
    } catch (err) {
      console.log(err);
      // sendError(err, ctx);
    }
  },
  // the best howl point collectors
  loudestHowlsCommand: async (ctx) => {
    const points = await Points.find().sort({ howlPoints: -1 }).limit(15);
    let promises = [];
    let playerPoints = new Set();
    let tenthPlayerPoint = null;
    points.forEach(async (point, idx) => {
      if (idx == 9) {
        tenthPlayerPoint = point.howlPoints;
      }
      if (tenthPlayerPoint) {
        if (tenthPlayerPoint !== point.howlPoints) {
          return;
        }
      }
      playerPoints.add(point.howlPoints);
      if (playerPoints.size <= 5) {
        await promises.push(Players.findById(point.playerId));
      }
    });
    playerPoints = Array.from(playerPoints);
    const players = await Promise.all(promises);
    let replyMs = replies.loudestHowls.title;
    promises = [];
    let loudestPlayers = new Map();
    players.forEach(async (player) => {
      if (player.pack) {
        loudestPlayers.set(promises.length, player);
        await promises.push(
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
        console.log('I am special', playerId);
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
    return ctx.reply(replyMs, Extra.HTML());
  },
  claimPackMemberCommand: async (ctx) => {
    try {
      const { isAdmin } = await checkUserRole(ctx);
      if (!isAdmin) {
        return ctx.reply(replies.admin.onlyAdminsAllowedMsg);
      }
      const repliedToMessage = await checkIfReplyToMessageExists(ctx);
      if (!repliedToMessage) return;
      const chatId = ctx.chat.id;
      const userId = ctx.message.from.id;
      console.log(ctx.message);
      const repliedUserId = ctx.message.reply_to_message.from.id;
      const repliedUser = await telegram.getChatMember(chatId, repliedUserId);
      const checkAlpha = await checkIfPackAlpha(userId);
      if (checkAlpha.isAlpha) {
        const { id, first_name, username } = repliedUser.user;
        let newInitiate = await Players.findOne({
          TelegramId: repliedUserId,
        });
        let pack = await Packs.findById(checkAlpha.packId);
        //? if user is already in a pack add functionality to send an inline button to make sure they want the change
        if (!newInitiate) {
          const newMember = await Players.create({
            TelegramId: id,
            firstName: first_name,
            userName: username ? username.toLowerCase() : null,
            pack: checkAlpha.packId,
          });

          pack.members.push(newMember._id);
          pack = await pack.save();
          ctx.reply(
            replies.admin.claimedMember(newMember, pack, checkAlpha.alpha)
          );
        } else if (newInitiate.pack) {
          const affiliatedPack = await Packs.findById(newInitiate.pack);
          if (affiliatedPack) {
            return ctx.reply(replies.player.alreadyInPack(affiliatedPack.name));
          }
        } else {
          const updatedPlayer = await Players.findOneAndUpdate(
            {
              TelegramId: repliedUserId,
            },
            {
              $set: {
                firstName: first_name,
                userName: username.toLowerCase(),
                pack: checkAlpha.packId,
              },
            },
            { new: true }
          );
          if (pack.members.includes(updatedPlayer._id))
            return ctx.reply(replies.player.alreadyInPack(pack.name));
          pack.members.push(updatedPlayer._id);
          pack = await pack.save();
          console.log(updatedPlayer);
          ctx.reply(
            replies.admin.claimedMember(updatedPlayer, pack, checkAlpha.alpha)
          );
        }
      } else {
        ctx.reply(checkAlpha.message);
      }
    } catch (err) {
      console.log(err);
    }
  },
  banishPackMemberCommand: async (ctx) => {
    try {
      const { isAdmin } = await checkUserRole(ctx);
      if (!isAdmin) {
        return ctx.reply(replies.admin.onlyAdminsAllowedMsg);
      }
      const repliedToMessage = await checkIfReplyToMessageExists(ctx);
      if (!repliedToMessage) return;
      const chatId = ctx.chat.id;
      const userId = ctx.message.from.id;
      const repliedUserId = ctx.message.reply_to_message.from.id;
      const repliedUser = await telegram.getChatMember(chatId, repliedUserId);
      const checkAlpha = await checkIfPackAlpha(userId);
      if (checkAlpha.isAlpha) {
        const { id, first_name, username } = repliedUser.user;
        let memberPlayer = await Players.findOne({
          TelegramId: repliedUserId,
        });
        if (!memberPlayer) {
          return ctx.reply(replies.player.notFound);
        } else {
          const banishPlayer = await Players.findOneAndUpdate(
            {
              TelegramId: repliedUserId,
            },
            {
              $set: {
                firstName: first_name,
                userName: username.toLowerCase(),
              },
              $unset: {
                pack: 1,
              },
            },
            { new: true }
          );
          const pack = await Packs.findByIdAndUpdate(checkAlpha.packId, {
            $pull: { members: banishPlayer._id },
          });
          ctx.reply(
            replies.admin.banishedMember(banishPlayer, pack, checkAlpha.alpha)
          );
        }
      } else {
        ctx.reply(checkAlpha.message);
      }
    } catch (err) {
      console.log(err);
    }
  },
  deleteGameCommand: async (ctx) => {},
  deleteLastGameCommand: async (ctx) => {},
  cancelAction: async (ctx) => {
    try {
      const { isAdmin } = await checkUserRole(ctx);
      if (!isAdmin) {
        return ctx.reply(replies.admin.onlyAdminsAllowedMsg);
      }
      ctx.editMessageText(
        `<i>Command has been canceled\nHave a nice day 😊</i>`,
        Extra.HTML()
      );
      return console.log(ctx.match[0]);
    } catch (err) {
      console.log(err);
      sendError(err, ctx);
    }
  },
  silenceHowlsAction: async (ctx) => {
    try {
      const { isAdmin } = await checkUserRole(ctx);
      if (!isAdmin) {
        return ctx.reply(replies.admin.onlyAdminsAllowedMsg);
      }
      await Points.remove({});
      return ctx.editMessageText(
        '<i>I have silenced the howls of thy miserable wolves</i>',
        Extra.HTML()
      );
    } catch (err) {
      console.log(err);
      sendError(err, ctx);
    }
  },
};
