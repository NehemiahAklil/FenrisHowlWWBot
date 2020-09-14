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
} = require('./actions');
const { parseChangeModeRegex } = require('./utils/helpers');
const Telegraf = require('telegraf');
//import mongoose models schemas
const Packs = require('./models/Packs');
const Players = require('./models/Players');

//Get sensitive files from config
const config = require('config');
const Points = require('./models/Points');
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
      const userInfo = ctx.message.reply_to_message.from.id;
      // ctx.reply(chatInfo);
      const user = await telegram.getChatMember(chatInfo, userInfo);
      if (['creator', 'administrator'].includes(user.status)) {
        return ctx.reply('Behold ' + user.status);
      } else {
        ctx.reply(user.status);
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
  },
  createPackCommand: async (ctx) => {
    const { isAdmin } = await checkUserRole(ctx);
    if (!isAdmin) {
      return ctx.reply(replies.admin.onlyAdminsAllowedMsg);
    }
    const matchPackRegex = /(?<=\/+(create_pack))(.*[a-zA-z])/;
    const packName = ctx.message.text.match(matchPackRegex)[0].trim();
    const packExits = await Packs.findOne({ name: packName });
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
        userName: ctx.message.from.username,
      });
    }
    if (alphaPlayer.pack) {
      await Packs.updateMany({
        $pull: { alphas: alphaPlayer._id },
      });
    }
    const newPack = await Packs.create({
      name: packName,
      alphas: [alphaPlayer._id],
    });

    await Players.findByIdAndUpdate(
      alphaPlayer._id,
      {
        pack: newPack._id,
      },
      { new: true }
    );
    return ctx.reply(`created pack ${newPack.name}`);
  },
  deletePackCommand: async (ctx) => {
    const { isAdmin } = await checkUserRole(ctx);
    if (!isAdmin) {
      return ctx.reply(replies.admin.onlyAdminsAllowedMsg);
    }
  },
  //
  howlPointsCommand: async (ctx) => {
    try {
      const { isAdmin } = await checkUserRole(ctx);
      if (!isAdmin) {
        return ctx.reply(replies.admin.onlyAdminsAllowedMsg);
      }
      const repliedToMessage = ctx.message.reply_to_message || false;
      if (!repliedToMessage) {
        ctx.reply(
          "The message doesn't contain a proper reply message \nMake sure the replied message isn't forwarded"
        );
        throw new Error("reply_to_message doesn't exist");
      }
      const updatedUser = await updateGamePlayersInfo(repliedToMessage);
      // ctx.reply(updatedUser);
      ctx.reply('User Infos Updated');
      const { userInfo, gameInfo } = await parseGameMessage(repliedToMessage);
      const { playersAlive, totalPlayers, numberOfWinners } = gameInfo;
      ctx.reply(
        `The game had ${totalPlayers} players out this players ${playersAlive} were alive and also ${numberOfWinners} won the game`
      );
      let replyMessage = '';
      userInfo.forEach((singleMessage) => {
        const {
          name,
          lifeStatus,
          winningStatus,
          role,
          gainedPoints,
          totalPoints,
        } = singleMessage;
        replyMessage += `${name} got ${gainedPoints} points and now has ${totalPoints}points with the role ${role}\n`;
      });
      return ctx.reply(`Game Results: \n ${replyMessage}`);
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
    const points = await Points.remove();
    ctx.reply('I will silence all thee howls of this miserable wolfs');
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
    ctx.reply(
      'These are the mightiest of all the other wolfs. Leading the fray with their breathtaking howls of power.'
    );
    const points = await Points.find().sort({ howlPoints: -1 }).limit(10);
    let promises = [];
    points.forEach(async (point) => {
      await promises.push(Players.findById(point.playerId));
    });
    const players = await Promise.all(promises);
    console.log('Down Below Players');
    console.log(players);
    console.log(points);
    console.log('up above Points');
    let replyMs = '';
    players.forEach((player, idx) => {
      replyMs += `${idx + 1} ${player.firstName} with ${
        points[idx].howlPoints
      }\n `;
    });
    return ctx.reply(replyMs);
  },
  claimPackMemberCommand: async (ctx) => {
    try {
      const { isAdmin } = await checkUserRole(ctx);
      if (!isAdmin) {
        return ctx.reply(replies.admin.onlyAdminsAllowedMsg);
      }
      const chatId = ctx.chat.id;
      const userId = ctx.message.from.id;
      const repliedUserId = ctx.message.reply_to_message.from.id;
      const repliedUser = await telegram.getChatMember(chatId, repliedUserId);
      const checkAlpha = await checkIfPackAlpha(userId);
      if (checkAlpha.isAlpha) {
        const { id, first_name, username } = repliedUser.user;
        let newInitiate = await Players.findOne({
          TelegramId: repliedUserId,
        });
        //? if user is already in a pack add functionality to send an inline button to make sure they want the change
        if (!newInitiate) {
          const newMember = await Players.create({
            TelegramId: id,
            firstName: first_name,
            userName: username,
            pack: checkAlpha.packId,
          });
          const pack = await Packs.findById(checkAlpha.packId);
          pack.members.push(newMember._id);
          await pack.save();
        } else {
          const updatedPlayer = await Players.findOneAndUpdate(
            {
              TelegramId: repliedUserId,
            },
            {
              $set: {
                firstName: first_name,
                userName: username,
                pack: checkAlpha.packId,
              },
            },
            { new: true }
          );
          const pack = await Packs.findById(checkAlpha.packId);
          if (pack.members.includes(updatedPlayer._id))
            return ctx.reply(replies.player.alreadyInPack(pack.name));
          pack.members.push(updatedPlayer._id);
          await pack.save();
          ctx.reply(updatedPlayer);
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
        //? if user is already in a pack add functionality to send an inline button to make sure they want the change
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
                userName: username,
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
          // if (pack.members.includes(banishPlayer._id))
          // return ctx.reply(replies.player.alreadyInPack(pack.name));
          // pack.members.push(banishPlayer._id);
          // await pack.save();
          ctx.reply(banishPlayer);
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
};
