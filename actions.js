import Telegraf from 'telegraf';
const { Extra, Markup } = Telegraf;
import { removeFirstAndTwoOfLast, getRolePoints } from './utils/helpers.js';
import replies from './replies.js';
//import mongoose models schemas
import Packs from './models/Packs.js';
import Players from './models/Players.js';
import Points from './models/Points.js';
//Get sensitive files from config
import config from 'config';
const botToken = config.get('botToken');
const devId = config.get('devId');
const chats = config.get('chats');
const { telegram } = new Telegraf(botToken);

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
const checkConds = async (ctx, isInReply) => {
  const { isAdmin } = await checkUserRole(ctx);
  if (!isAdmin) {
    ctx.reply(replies.admin.onlyAdminsAllowedMsg);
    return true;
  }
  if (!chats.includes(ctx.chat.id)) {
    ctx.reply(replies.chat.denyAccess(ctx.chat.title));
    await ctx.leaveChat(ctx.chat.id);
    return true;
  }
  if (isInReply) {
    const repliedToMessage = await checkIfReplyToMessageExists(ctx, false);
    if (!repliedToMessage) return true;
  } else {
    return false;
  }
};
const checkIfReplyToMessageExists = async (ctx, isABot) => {
  try {
    const repliedToMessage = ctx.message.reply_to_message || false;
    if (!repliedToMessage) {
      ctx.reply(replies.repliedMessage.notFound);
      return false;
    }
    if (!isABot) {
      const isBot = ctx.message.reply_to_message.from.is_bot;
      if (isBot) {
        ctx.reply(replies.player.isBot);
        return false;
      }
    }
    return repliedToMessage;
  } catch (err) {
    console.log(err.message);
    // sendError(err, ctx);
  }
};
const checkUserRole = async (ctx) => {
  try {
    const chatInfo = ctx.chat.id;
    const userInfo = ctx.from.id;
    const chatAdmins = ctx.getChatAdministrators(chatInfo);
    console.log(chatAdmins);
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
const deleteAlphaLessPack = async (pack, packId) => {
  try {
    let checkPack = pack ? pack : await Packs.findById(packId);
    if (checkPack) {
      if (checkPack.alphas.length < 1)
        return await Packs.findByIdAndDelete(checkPack._id);
    }
    return;
  } catch (err) {
    console.log(err);
    await sendError(err);
  }
};
const deletionWarningMessage = async (ctx, deletionType, deletionCallback) => {
  return ctx.reply(
    `Are you sure you want to ${deletionType}`,
    Markup.inlineKeyboard([
      Markup.callbackButton(`⚠️ Yes, ${deletionType}`, deletionCallback),
      Markup.callbackButton(
        `❌ No, Cancel ${deletionType}`,
        `cancel ${deletionType}`
      ),
    ]).extra()
  );
};
const findPlayerInfo = async (playerInfo) => {
  let packInfo = false;
  const points = await Points.findOne({ playerId: playerInfo._id });
  if (playerInfo.pack) {
    const affiliatedPack = await Packs.findById(playerInfo.pack);
    if (!affiliatedPack) return { message: replies.player.packNotFound };
    const isAlpha = affiliatedPack.alphas.includes(playerInfo._id);
    packInfo = {
      name: affiliatedPack.name,
      emblem: affiliatedPack.emblem,
      isAlpha,
    };
  }
  if (points) return { pack: packInfo, points: points.howlPoints };
  return { pack: packInfo, points: 0 };
};
const getBothRolePoints = async (role) => {
  const { points: alivePoints } = await getRolePoints(role, 'Alive');
  const { points: deadPoints } = await getRolePoints(role, 'Dead');
  const points =
    alivePoints === deadPoints
      ? `${alivePoints}`
      : `  <b>${alivePoints} Alive</b>  <b>${deadPoints} dead</b>`;
  console.log(role + 'gets ' + points);
  return { points };
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
    responseMsg = replies.findPlayer.responseMessage(
      TelegramId,
      firstName,
      points,
      pack
    );
    if (pack) {
      responseMsg += replies.findPlayer.withPackResponseAddOn(pack);
    }
  } else {
    responseMsg = replies.findPlayer.zeroHowlResponseMsg(TelegramId, firstName);
    if (pack) {
      responseMsg += replies.findPlayer.zeroHowlWithPackResponseAddOn(pack);
    }
  }
  return ctx.replyWithHTML(responseMsg);
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
      return {
        isAlpha: true,
        packId: player.pack,
        alpha: player,
        pack: usersPack,
      };
    } else
      return {
        isAlpha: false,
        message: replies.player.notAlphaOfPack,
      };
  } catch (err) {
    console.log(err);
  }
};
const checkPackAdmin = async (userId) => {
  try {
    const checkAlpha = await checkIfPackAlpha(userId);
    if (checkAlpha.isAlpha) return { ...checkAlpha, isPackAdmin: true };
    const checkBeta = await checkIfPackBeta(userId);
    if (checkBeta.isBeta) return { ...checkBeta, isPackAdmin: true };
    return { isPackAdmin: false, message: replies.player.notAlphaOrBetaOfPack };
  } catch (err) {
    console.log(err);
  }
};
const checkIfPackAdmin = async (userId) => {
  try {
    const checkAlpha = await checkIfPackAlpha(userId);
    if (checkAlpha.isAlpha) return false;
    const checkBeta = await checkIfPackBeta(userId);
    return !checkBeta.isBeta;
  } catch (err) {
    console.log(err);
    await sendError(err);
  }
};
const checkIfPackBeta = async (userId) => {
  try {
    const player = await Players.findOne({ TelegramId: userId });
    if (!player) {
      return { isBeta: false, message: replies.player.notFound };
    } else if (!player.pack) {
      return { isBeta: false, message: replies.player.unAffiliated };
    }
    const usersPack = await Packs.findById(player.pack);
    if (!usersPack) {
      return { isBeta: false, message: replies.player.packNotFound };
    }
    if (usersPack.betas.includes(player._id)) {
      return {
        isBeta: true,
        packId: player.pack,
        beta: player,
        pack: usersPack,
      };
    } else
      return {
        isBeta: false,
        message: replies.player.notAlphaOfPack,
      };
  } catch (err) {
    console.log(err);
  }
};
const checkIfPackOwner = async (userId) => {
  try {
    const player = await Players.findOne({ TelegramId: userId });
    if (!player) {
      return { isOwner: false, message: replies.player.notFound };
    } else if (!player.pack) {
      return { isOwner: false, message: replies.player.unAffiliated };
    }
    const usersPack = await Packs.findById(player.pack);
    console.log(usersPack._doc);
    if (!usersPack) {
      return { isOwner: false, message: replies.player.packNotFound };
    }
    if (usersPack.owner.toString() === player._id.toString()) {
      return {
        isOwner: true,
        packId: player.pack,
        owner: player,
        pack: usersPack,
      };
    } else
      return {
        isOwner: false,
        message: replies.player.notOwnerOfPack,
      };
  } catch (err) {
    console.log(err);
  }
};

const updateGamePlayersInfo = async (repliedMessage) => {
  const userInfo = repliedMessage.entities.filter(
    (entity) => entity !== undefined && entity.type === 'text_mention'
  );
  let promises = [];
  console.log('Started updatePlayersInfo');
  userInfo.forEach((entity) => {
    const { id, first_name, username } = entity.user;
    promises.push(
      Players.findOneAndUpdate(
        {
          TelegramId: id,
        },
        {
          firstName: first_name,
          userName: username.toLowerCase(),
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
const checkGameMessageValidity = async (repliedMessage) => {
  let splitMessage = repliedMessage.text.split('\n');
  let lastIndex = splitMessage.length - 1;
  return ~splitMessage[lastIndex].indexOf('Game Length:');
};
const parseGameMessage = async (repliedMessage) => {
  try {
    let userInfo = [];
    let packs = [];
    let splitMessage = repliedMessage.text.split('\n');
    const totalPlayers = parseInt(splitMessage[0].match(/(?<=\/)(.*)/g));
    const playersAlive = parseInt(splitMessage[0].match(/(?<=:)(.*)(?=\/)/g));
    splitMessage = await removeFirstAndTwoOfLast(splitMessage);

    splitMessage.forEach((line) => {
      // Parse Life Status
      const lifeStatus = line.match(/\b(Dead|Alive)\b/)[0].trim();
      // Parse Players Name
      let name = line.match(/🥉|🥇|🥈/)
        ? line.match(/(.*)(?=(🥉|🥇|🥈)+:)/)[0].trim()
        : line.match(/(.*)(?=(|🥉|🥇|🥈)+:)/)[0].trim();
      // Parse Player role
      let lineRole = line.match(/(?<=-)(.*)(?=(Lost|Won))/)[0].trim();
      let role = '';
      if (/(\b(a|the)\b)/.test(lineRole.toLowerCase().trim())) {
        role = lineRole.match(/(?<=(the|a))(.*[a-zA-z])/i)[0].trim();
      } else {
        role = lineRole.match(/(?<=).*[a-zA-z]/)[0].trim();
      }
      // Parse Player Winning Status
      const winningStatus = line.match(/\b(Won|Lost)\b/)[0].trim();
      userInfo.push({ name, role, lifeStatus, winningStatus });
    });
    let promises = [];
    userInfo.forEach((user, idx) => {
      const nameInfo = repliedMessage.entities.filter(
        (entity) => entity !== undefined && entity.type === 'text_mention'
      );
      const userInfos = nameInfo.filter((entInfo) => entInfo);

      if (userInfos.length > 0 && userInfos[idx] !== undefined) {
        const { username, id, first_name } = userInfos[idx].user;
        const { lifeStatus, role, winningStatus } = user;
        if (winningStatus === 'Won') {
          promises.push(
            savePlayerPoints({
              username,
              id,
              first_name,
              role,
              winningStatus,
              lifeStatus,
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
      if (user.winningStatus === 'Won') {
        winnerCount++;
        const { gainedPoints, totalPoints, packInfo } = savedWinners;
        if (packInfo.name) {
          if (packs.some((pack) => pack.name === packInfo.name)) {
            packs = packs.map((pack) => {
              return {
                ...pack,
                gainedPoints: pack.gainedPoints + packInfo.gainedPoints,
              };
            });
          } else {
            packs.push(packInfo);
          }
          return {
            ...user,
            gainedPoints,
            totalPoints,
            packInfo,
          };
        }
        return {
          ...user,
          gainedPoints,
          totalPoints,
        };
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

    return { userInfo, gameInfo, packs };
  } catch (err) {
    console.log(err);
    await sendError(err);
  }
};
const savePlayerPoints = async (playerInfo) => {
  try {
    console.log('Player Info:', playerInfo);
    const {
      username,
      id,
      first_name,
      role,
      winningStatus,
      lifeStatus,
    } = playerInfo;
    let scoredPoints;
    let packInfo;
    if (winningStatus === 'Won') {
      const findPlayer = await Players.findOne({ TelegramId: id });
      const { points } = await getRolePoints(role, lifeStatus);
      if (findPlayer) {
        if (findPlayer.pack) {
          console.log(`${findPlayer.firstName} is in pack ${findPlayer.pack}`);
          packInfo = await getPackInfo(findPlayer.pack);
        }
        const userHasPoints = await Points.findOne({
          playerId: findPlayer._id,
        });
        if (userHasPoints) {
          scoredPoints = await Points.findOneAndUpdate(
            { playerId: findPlayer._id },
            {
              howlPoints: userHasPoints.howlPoints + points,
              packId: findPlayer.pack,
            },
            { new: true }
          );
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
        // const { points } = await getRolePoints(role);
        scoredPoints = await Points.create({
          playerId: newPlayer._id,
          howlPoints: points,
        });
      }
      return {
        gainedPoints: points,
        totalPoints: scoredPoints.howlPoints,
        name: first_name,
        packInfo: packInfo
          ? { ...packInfo, gainedPoints: points }
          : { ...packInfo },
      };
    }
  } catch (err) {
    console.log(err.message);
  }
};
const getPackInfo = async (packId) => {
  try {
    const pack = await Packs.findById(packId);
    // console.log(pack);
    const points = await Points.find({ packId: packId });
    console.log(points);
    if (points && pack) {
      let packPoints = 0;
      points.forEach((point) => {
        packPoints += point.howlPoints;
      });
      return {
        isAPack: true,
        name: pack.name,
        emblem: pack.emblem,
        points: packPoints,
      };
    } else {
      return { isAPack: false };
    }
  } catch (err) {
    console.log(err);
    return { isAPack: false };
  }
};
const getPackMemberAndPoints = async (packId) => {
  const pack = await Packs.findById(packId);
  await deleteAlphaLessPack(false, pack._id);
  let promises = [];
  let packPoints = 0;
  const points = await Points.find({ packId: packId });
  if (points) {
    points.forEach((point) => {
      packPoints += point.howlPoints;
    });
  }
  pack.alphas.forEach((alphaId) => {
    promises.push(Players.findById(alphaId));
  });
  let packAlphas = await Promise.all(promises);
  promises = [];
  pack.betas.forEach((betaId) => {
    promises.push(Players.findById(betaId));
  });
  let packBetas = await Promise.all(promises);
  promises = [];
  pack.members.forEach((memberId) => {
    promises.push(Players.findById(memberId));
  });
  let packMembers = await Promise.all(promises);
  return {
    name: pack.name,
    emblem: pack.emblem,
    members: packMembers,
    alphas: packAlphas,
    betas: packBetas,
    point: packPoints,
  };
};
const sendError = async (err, ctx) => {
  try {
    console.log(err);
    const preText = ctx
      ? `User <a href="tg://user?id=${ctx.from.id}">${ctx.from.first_name}</a> Experienced an Error:\n`
      : `<b>Error:</b>`;

    return await telegram.sendMessage(
      devId,
      `${preText} <code>${err.message}.</code> \n\n<b>Full error:</b> \n${err}`,
      Extra.HTML()
    );
  } catch (err) {
    console.log(err);
  }
};

export {
  checkPackAdmin,
  deleteAlphaLessPack,
  checkGameMessageValidity,
  checkIfReplyToMessageExists,
  getPackMemberAndPoints,
  getPackInfo,
  checkGameMode,
  checkUserRole,
  checkIfPackAlpha,
  parseGameMessage,
  savePlayerPoints,
  updateGamePlayersInfo,
  sendError,
  sendFindPlayerReplyMessage,
  findPlayerInfo,
  deletionWarningMessage,
  checkIfPackOwner,
  checkConds,
  getBothRolePoints,
  checkIfPackAdmin,
  checkIfPackBeta,
};
