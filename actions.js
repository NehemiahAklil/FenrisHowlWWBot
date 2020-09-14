const Telegraf = require('telegraf');
const Extra = require('telegraf/extra');
const config = require('config');
const botToken = config.get('botToken');
const devId = config.get('devId');
const { telegram } = new Telegraf(botToken);
const { removeFirstAndTwoOfLast, getRolePoints } = require('./utils/helpers');
const replies = require('./replies');
const Packs = require('./models/Packs');
const Players = require('./models/Players');
const Points = require('./models/Points');

const checkGameMode = async (db) => {
  switch (db.gameMode) {
    case 'loneWolfMode':
      return db.gameMode;
    case 'packWarMode':
      return db.gameMode;
    default:
      return 'NoMode';
  }
};
const checkUserRole = async (ctx) => {
  try {
    const chatInfo = ctx.chat.id;
    const userInfo = ctx.from.id;
    // console.log(ctx.from.id);
    // ctx.reply(chatInfo);
    const user = await telegram.getChatMember(chatInfo, userInfo);
    if (['creator', 'administrator'].includes(user.status)) {
      return { isAdmin: true, role: user.status };
    } else {
      return { isAdmin: false, role: user.status };
    }
  } catch (err) {
    console.log(err);
  }
};
const findPlayerInfo = async (playerInfo) => {
  let packInfo = {};
  console.log(playerInfo._id);
  console.log(playerInfo.pack);
  const points = await Points.findOne({ playerId: playerInfo._id });
  if (playerInfo.pack) {
    const affiliatedPack = await Packs.findById(playerInfo.pack);
    console.log(affiliatedPack.name);
    packInfo = { pack: affiliatedPack.name };
  }
  if (points) {
    console.log(packInfo);
    return { ...packInfo, points: points.howlPoints };
  } else {
    return { ...packInfo, points: 0 };
  }
};
const sendFindPlayerReplyMessage = async (
  ctx,
  TelegramId,
  firstName,
  points,
  pack
) => {
  let responseMsg = '';
  if (points > 0) {
    // responseMsg = `<a href="tg://user?id=${queryPlayer.TelegramId}">${queryPlayer.firstName}</a>'s thundering howls echoed through the night for <b>${playerStatus.points} times</b> in the dazzling radiance of the moon light✨`;
    responseMsg = replies.findPlayer.responseMessage(
      TelegramId,
      firstName,
      points
    );
  } else {
    // responseMsg = `<a href="tg://user?id=${queryPlayer.TelegramId}">${queryPlayer.firstName}</a> wishfully stares at the dazzling moon light✨ yet to put a mark in the starry night`;
    responseMsg = replies.findPlayer.zeroHowlResponseMsg(TelegramId, firstName);
  }
  if (pack) {
    // responseMsg += ` accompanied by their brethren <i>${playerStatus.pack}</i> pack members harmony`;
    responseMsg += replies.findPlayer.withPackResponseAddOn(pack);
  }
  return ctx.reply(responseMsg, Extra.HTML());
};
const checkIfPackAlpha = async (userId) => {
  try {
    const player = await Players.findOne({ TelegramId: userId });
    if (!player) {
      return { isAlpha: false, message: replies.player.notFound };
    } else if (!player.pack) {
      return { isAlpha: false, message: replies.player.unAffiliated };
    }
    const usersPack = await Packs.findById(player.pack);
    if (usersPack == null) {
      return { isAlpha: false, message: replies.player.packNotFound };
    }
    if (usersPack.alphas.includes(player._id)) {
      return { isAlpha: true, packId: player.pack };
    } else
      return {
        isAlpha: false,
        message: replies.player.notAlphaOfPack,
      };
  } catch (err) {
    console.log(err);
    sendError(err, ctx);
  }
};

const updateGamePlayersInfo = async (repliedMessage) => {
  const userInfo = repliedMessage.entities.filter(
    (entity) => entity !== undefined && entity.type === 'text_mention'
  );
  let promises = [];
  console.log('Started updatePlayersInfo');
  userInfo.forEach(async (entity) => {
    const { id, first_name, username } = entity.user;
    await promises.push(
      Players.findOneAndUpdate(
        {
          TelegramId: id,
        },
        {
          firstName: first_name,
          userName: username,
        },
        { new: true }
      )
    );
  });
  const outputs = await Promise.all(promises);
  console.log(outputs);
  console.log('Ended updatePlayersInfo');
  return userInfo;
};
const parseGameMessage = async (repliedMessage) => {
  try {
    let userInfo = [];
    let splitMessage = repliedMessage.text.split('\n');
    const totalPlayers = parseInt(splitMessage[0].match(/(?<=\/)(.*)/g));
    const playersAlive = parseInt(splitMessage[0].match(/(?<=:)(.*)(?=\/)/g));
    splitMessage = await removeFirstAndTwoOfLast(splitMessage);

    await splitMessage.forEach(async (line, index) => {
      const lifeStatus = line.match(/\b(Dead|Alive)\b/)[0].trim();
      let name = line.match(/🥉|🥇|🥈/)
        ? line.match(/(.*)(?=(🥉|🥇|🥈)+:)/)[0].trim()
        : line.match(/(.*)(?=(|🥉|🥇|🥈)+:)/)[0].trim();
      let lineRole = line.match(/(?<=-)(.*)(?=(Lost|Won))/)[0].trim();
      let role = '';
      if (/(\b(a|the)\b)/.test(lineRole.toLowerCase().trim())) {
        role = lineRole.match(/(?<=(the|a))(.*[a-zA-z])/i)[0].trim();
      } else {
        role = lineRole.match(/(?<=).*[a-zA-z]/)[0].trim();
      }
      const winningStatus = line.match(/\b(Won|Lost)\b/)[0].trim();
      // const nameInfo = repliedMessage.entities.filter(
      //   (entity) =>
      //     entity !== undefined &&
      //     entity.type === 'text_mention' &&
      //     entity.user.first_name == name
      // );
      // if (nameInfo.length > 0) {
      //   const { username, id } = nameInfo[0].user;
      //   if (winningStatus === 'Won') {
      //     const { points } = Promise.all(
      //       savePlayerPoints({
      //         username,
      //         id,
      //         name,
      //         role,
      //         winningStatus,
      //       })
      //     );
      userInfo.push({ name, role, lifeStatus, winningStatus });
      // }
      // }
    });
    let promises = [];
    userInfo.forEach(async (user, idx) => {
      const nameInfo = repliedMessage.entities.filter(
        (entity) => entity !== undefined && entity.type === 'text_mention'
      );
      const userInfos = nameInfo.filter((entInfo) => entInfo);

      if (userInfos.length > 0 && userInfos[idx] !== undefined) {
        // console.log(userInfos[idx]);
        const { username, id, first_name } = userInfos[idx].user;
        const { name, role, winningStatus } = user;
        if (winningStatus === 'Won') {
          await promises.push(
            savePlayerPoints({
              username,
              id,
              first_name,
              role,
              winningStatus,
            })
          );
        }
      }
    });
    const savedWinner = await Promise.all(promises);
    console.log(savedWinner);
    let winnerCount = 0;
    userInfo = userInfo.map((user, idx) => {
      const savedWinnersLength = savedWinner.length;
      const savedWinners = savedWinner[winnerCount];
      if (user.winningStatus == 'Won') {
        winnerCount++;
        const { gainedPoints, totalPoints } = savedWinners;
        return { ...user, gainedPoints, totalPoints };
      } else return { ...user };
    });
    userInfo = userInfo.filter((user) => user.winningStatus == 'Won');
    console.log('Users found info', userInfo);
    const gameInfo = {
      playersAlive,
      totalPlayers,
      numberOfWinners: userInfo.filter((user) => user.winningStatus === 'Won')
        .length,
    };
    return { userInfo, gameInfo };
  } catch (err) {
    console.log(err);
    sendError(err);
  }
};
const savePlayerPoints = async (playerInfo) => {
  try {
    const { username, id, first_name, role, winningStatus } = playerInfo;
    let scoredPoints;
    if (winningStatus === 'Won') {
      const findPlayer = await Players.findOne({ TelegramId: id });
      const { points } = await getRolePoints(role);
      // console.log(findPlayer);
      if (findPlayer) {
        const userHasPoints = await Points.findOne({
          playerId: findPlayer._id,
        });
        if (userHasPoints) {
          // console.log(userHasPoints);
          if (findPlayer.pack) {
            console.log(
              `${findPlayer.firstName} is in pack ${findPlayer.pack}`
            );
            scoredPoints = await Points.findOneAndUpdate(
              { playerId: findPlayer._id },
              {
                howlPoints: userHasPoints.howlPoints + points,
                packId: findPlayer.pack,
              },
              { new: true }
            );
            // pack = findPlayer.pack;
          } else {
            scoredPoints = await Points.findOneAndUpdate(
              { playerId: findPlayer._id },
              {
                howlPoints: userHasPoints.howlPoints + points,
              },
              { new: true }
            );
          }
        } else {
          console.log('Creating new points');
          scoredPoints = await Points.create({
            playerId: findPlayer._id,
            packId: findPlayer.pack,
            howlPoints: points,
          });
        }
      } else {
        const newPlayer = await Players.create({
          TelegramId: id,
          firstName: first_name,
          userName: username ? username.toLowerCase() : null,
        });
        // console.log(newPlayer);
        const { points } = await getRolePoints(role);
        scoredPoints = await Points.create({
          playerId: newPlayer._id,
          howlPoints: points,
        });
      }
      // console.log(scoredPoints);
      return {
        gainedPoints: points,
        totalPoints: scoredPoints.howlPoints,
        name: first_name,
      };
    }
  } catch (err) {
    console.log(err.message);
  }
};
const sendError = async (err, ctx) => {
  try {
    console.log(err);
    const preText = ctx
      ? `User <a href="tg://user?id=${ctx.from.id}">${ctx.from.first_name}</a> Experienced an Error:\n`
      : `<b>Error:</b>`;

    await telegram.sendMessage(
      devId,
      `${preText} <code>${err.message}.</code> \n\n<b>Full error:</b> \n${err}`,
      Extra.HTML()
    );
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  checkGameMode,
  checkUserRole,
  checkIfPackAlpha,
  parseGameMessage,
  savePlayerPoints,
  updateGamePlayersInfo,
  sendError,
  sendFindPlayerReplyMessage,
  findPlayerInfo,
};
