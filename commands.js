import { Extra, Markup } from "telegraf";
import * as replies from "./replies";
import * as actions from './actions';
import {getPackNameAndEmblemFromMessage,getIconsForTopHowlers } from "./utils/helpers";
import Telegraf from "telegraf";
//import mongoose models schemas
import Packs from "./models/Packs.js";
import Players from "./models/Players.js";
import Points from "./models/Points.js";
//Get sensitive files from config
import config from "config";
const devId = config.get("devId");
const chats = config.get("chats");
const botToken = config.get("botToken");
const { telegram } = new Telegraf(botToken);

//Handles on bot start message or '/start' command
export const startBotCommand = async (ctx) => {
  try {
    //gets reply from replies file
    if (ctx.startPayload === "help")
      return ctx.replyWithHTML(replies.help.message);
    return ctx.replyWithHTML(replies.start);
  } catch (err) {
    console.log(err);
    await sendError(err, ctx);
  }
}
//Handles on help message or '/help' command
export const helpCommand = async (ctx) => {
  try {
    //send help message if in private if not send a redirect message using inline button
    if (ctx.chat.type === "private")
      return ctx.replyWithHTML(replies.help.message);
    else
      return await ctx.replyWithMarkdown(
        replies.help.redirectToPrivateMsg,
        Extra.markup(
          Markup.inlineKeyboard([
            [
              Markup.urlButton(
                replies.help.buttonMsg,
                "https://t.me/FenrisHowlWWBot?start=help"
              ),
            ],
          ])
        )
      );
  } catch (err) {
    console.log(err);
    await sendError(err, ctx);
  }
}
// Handles updating users howl points if called by admin in reply to a game end message
export const howlPointsCommand = async (ctx) => {
  try {
    if (await checkConds(ctx, true)) return;
    const repliedToMessage = ctx.message.reply_to_message;
    const messageValidity = await checkGameMessageValidity(repliedToMessage);
    if (!messageValidity)
      return ctx.reply(replies.repliedMessage.invalidMessage);
    await updateGamePlayersInfo(repliedToMessage);
    ctx.reply("User Infos Updated");
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
    let replyMessage = "";
    const unAffiliatedUsers = userInfo.filter((user) => {
      if (!user.packInfo) {
        return user;
      }
    });
    console.log("My Packs", packs);
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
    await sendError(err, ctx);
  }
},
// Handles deleting the points of all players
silenceHowlsCommand: async (ctx) => {
  try {
    //check if the user is an Admin and then use inline button to make sure this is their decision
    if (await checkConds(ctx, false)) return;
    await deletionWarningMessage(ctx, "Silence Howls", "silence howls");
  } catch (err) {
    console.log(err);
    await sendError(err, ctx);
  }
},
// Handles creating a new pack with ownership right to the admin
createPackCommand: async (ctx) => {
  //check if the user is an Admin
  if (await checkConds(ctx, false)) return;
  const { packName, packEmblem, isProper } = getPackNameAndEmblemFromMessage(
    ctx.message.text,
    "create_pack"
  );
  if (!isProper) return ctx.reply(replies.pack.invalidName);
  //check if a pack with name or emblem given exists
  const packExits = await Packs.findOne({
    $or: [
      { name: { $regex: new RegExp(`${packName}`, "i") } },
      { emblem: packEmblem },
    ],
  });
  if (packExits)
    return ctx.reply(
      replies.pack.alreadyExists(packName, packEmblem),
      Extra.inReplyTo(ctx.message.message_id).HTML()
    );
  //check if user exists in db
  let packOwner = await Players.findOne({
    TelegramId: ctx.message.from.id,
  });
  if (!packOwner)
    packOwner = await Players.create({
      TelegramId: ctx.message.from.id,
      firstName: ctx.message.from.first_name,
      userName: ctx.message.from.username
        ? ctx.message.from.username.toLowerCase()
        : null,
    });
  // if users is the owner of a pack and stop creating pack if they are
  if (packOwner.pack) {
    const playerIsOwner = await Packs.findOne({
      owner: packOwner._id,
    });
    if (playerIsOwner)
      return ctx.reply(replies.admin.adminIsAlreadyOwner(playerIsOwner));
    await Packs.updateMany({
      $pull: { alphas: packOwner._id, members: packOwner._id },
    });
  }
  //create pack and add admin as owner and alpha also add pack id to points and admins player info in db
  const newPack = await Packs.create({
    name: packName,
    emblem: packEmblem,
    owner: packOwner._id,
    alphas: [packOwner._id],
  });
  await Points.findOneAndUpdate(
    { playerId: packOwner._id },
    {
      packId: newPack._id,
    }
  );
  await Players.findByIdAndUpdate(packOwner._id, {
    pack: newPack._id,
  });
  return ctx.reply(replies.admin.createdPack(packOwner, newPack));
},

// Handles transferring ownership to the admin in reply
transferOwnershipCommand: async (ctx) => {
  try {
    //check if the user is an Admin and it contains a reply message
    if (await checkConds(ctx, true)) return;
    const userId = ctx.message.from.id;
    // check if the admin transferring rights is an owner of affiliated pack
    const checkOwner = await checkIfPackOwner(userId);
    if (!checkOwner.isOwner) return ctx.reply(checkOwner.message);
    // check if the user replied to is a pack alpha
    const checkAlpha = await checkIfPackAlpha(
      ctx.message.reply_to_message.from.id
    );
    if (!checkAlpha.isAlpha) return ctx.reply(checkAlpha.message);
    const alphaPlayer = checkAlpha.alpha;
    // check if the replied user which is an alpha is a member of the admin transferring rights pack
    if (checkAlpha.packId !== checkOwner.packId)
      return ctx.reply(replies.player.alphaNotInOwnersPack);
    const pack = await Packs.findByIdAndUpdate(
      checkOwner.packId,
      {
        owner: alphaPlayer._id,
      },
      { new: true }
    );
    return ctx.replyWithHTML(
      replies.admin.transferOwnership(pack, alphaPlayer, checkOwner.owner)
    );
  } catch (err) {
    console.log(err);
    await sendError(err, ctx);
  }
},
// Handles deleting owners pack
deletePackCommand: async (ctx) => {
  try {
    //check if the user is an Admin
    if (await checkConds(ctx, false)) return;
    await deletionWarningMessage(ctx, "Delete Pack", "delete pack");
  } catch (err) {
    console.log(err);
    await sendError(err, ctx);
  }
},
//Handles removing alphas from pack
removeAlphaCommand: async (ctx) => {
  try {
    //check if the user is an Admin and it contains a reply message
    if (await checkConds(ctx, true)) return;
    const mainUserId = ctx.message.from.id;
    // check if the admin transferring rights is an owner of affiliated pack
    const checkOwner = await checkIfPackOwner(mainUserId);
    if (!checkOwner.isOwner) return ctx.reply(checkOwner.message);
    const userId = ctx.message.reply_to_message.from.id;
    const { first_name, username } = ctx.message.reply_to_message.from;
    const memberPlayer = await Players.findOne({ TelegramId: userId });
    // check if user exists in db
    if (!memberPlayer) return ctx.reply(replies.player.notFound);
    // check if user is in a pack
    if (!memberPlayer.pack) return ctx.reply(replies.player.unAffiliated);
    const checkAlpha = await checkIfPackAlpha(userId);
    if (!checkAlpha.isAlpha) return ctx.reply(checkAlpha.message);
    console.log(checkAlpha.packId);
    console.log(checkOwner.packId);
    if (checkAlpha.packId.toString() !== checkOwner.packId.toString())
      return ctx.reply(replies.player.playerNotInAlphasPack);
    //update user info,remove from pack and pull pack info from players and points
    const retiringMember = await Players.findOneAndUpdate(
      {
        TelegramId: userId,
      },
      {
        $set: {
          firstName: first_name,
          userName: username ? username.toLowerCase() : null,
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
    await Points.findOneAndUpdate(
      {
        playerId: retiringMember._id,
      },
      {
        $unset: {
          packId: 1,
        },
      },
      { new: true }
    );
    return ctx.replyWithHTML(replies.player.leavePack(retiringMember, pack));
  } catch (err) {
    console.log(err);
    await sendError(err, ctx);
  }
},
// Handles initiating or claiming  a player to a pack
claimPackMemberCommand: async (ctx) => {
  try {
    const userId = ctx.message.from.id;
    //check if the user is an Admin and it contains a reply message
    if (await checkIfPackAdmin(userId))
      return ctx.reply(replies.player.notAlphaOrBetaOfPack);
    if (!(await checkIfReplyToMessageExists(ctx))) return;
    //check if replied user is a member of chat and get user info
    const repliedUserTId = ctx.message.reply_to_message.from.id;
    const repliedUser = await telegram.getChatMember(
      ctx.chat.id,
      repliedUserTId
    );
    //check if the admin using the command is alpha
    const checkPackAdminInfo = await checkPackAdmin(userId);
    if (!checkPackAdminInfo.isPackAdmin)
      return ctx.reply(checkPackAdminInfo.message);
    let packAdminPlayer;
    if (checkPackAdminInfo.isAlpha)
      packAdminPlayer = checkPackAdminInfo.alpha;
    else packAdminPlayer = checkPackAdminInfo.beta;
    const packAdminsPackId = checkPackAdminInfo.packId;
    // destructure replied user info and check if user is in db
    const { first_name, username } = repliedUser.user;
    let newInitiate = await Players.findOne({
      TelegramId: repliedUserTId,
    });
    // if user doesn't exist create user
    if (!newInitiate)
      newInitiate = await Players.create({
        TelegramId: repliedUserTId,
        firstName: first_name,
        userName: username ? username.toLowerCase() : null,
        pack: packAdminsPackId,
      });
    else if (newInitiate) {
      //if a user is in a pack stop the calming
      if (newInitiate.pack) {
        const affiliatedPack = await Packs.findById(newInitiate.pack);
        if (affiliatedPack)
          return ctx.reply(replies.player.alreadyInPack(affiliatedPack.name));
      }
      // update user info before adding to pack
      newInitiate = await Players.findOneAndUpdate(
        { TelegramId: repliedUserTId },
        {
          $set: {
            firstName: first_name,
            userName: username ? username.toLowerCase() : null,
            pack: packAdminsPackId,
          },
        },
        { new: true }
      );
    }
    //Add user to pack and update their points
    const pack = await Packs.findByIdAndUpdate(
      packAdminsPackId,
      {
        $push: { members: newInitiate._id },
      },
      { new: true }
    );
    await Points.findOneAndUpdate(
      {
        playerId: newInitiate._id,
      },
      {
        packId: pack._id,
      }
    );
    return ctx.reply(
      replies.admin.claimedMember(newInitiate, pack, packAdminPlayer)
    );
  } catch (err) {
    console.log(err);
    await sendError(err, ctx);
  }
},
// Handles kicking a player from a pack
banishPackMemberCommand: async (ctx) => {
  try {
    const userId = ctx.message.from.id;
    //check if the user is an Admin and it contains a reply message
    if (await checkIfPackAdmin(userId))
      return ctx.reply(replies.player.notAlphaOrBetaOfPack);
    // console.log(ctx.message);
    if (!(await checkIfReplyToMessageExists(ctx))) return;
    //check if replied user is a member of chat and get user info
    const repliedUser = await telegram.getChatMember(
      ctx.chat.id,
      ctx.message.reply_to_message.from.id
    );
    //check if the admin using the command is alpha
    const checkPackAdminInfo = await checkPackAdmin(userId);
    console.log(checkPackAdminInfo);
    if (!checkPackAdminInfo.isPackAdmin)
      return ctx.reply(checkPackAdminInfo.message);
    let packAdminPlayer;
    if (checkPackAdminInfo.isAlpha)
      packAdminPlayer = checkPackAdminInfo.alpha;
    else packAdminPlayer = checkPackAdminInfo.beta;
    const packAdminPackId = checkPackAdminInfo.packId;
    // destructure replied user info and check if user is in db
    const { id: repliedUserTId, first_name, username } = repliedUser.user;
    const memberPlayer = await Players.findOne({
      TelegramId: repliedUserTId,
    });
    if (!memberPlayer) {
      return ctx.reply(replies.player.notFound);
    } else if (!memberPlayer.pack) {
      return ctx.reply(replies.player.unAffiliated);
    } else {
      if (packAdminPackId.toString() !== memberPlayer.pack.toString())
        return ctx.reply(replies.player.playerNotInAlphasPack);
      if (checkPackAdminInfo.isBeta) {
        if (!(await checkIfPackAdmin(repliedUserTId)))
          return ctx.reply(replies.player.cantBanishAlphaOrBeta);
      }

      const banishedPlayer = await Players.findOneAndUpdate(
        {
          TelegramId: repliedUserTId,
        },
        {
          $set: {
            firstName: first_name,
            userName: username ? username.toLowerCase() : null,
          },
          $unset: {
            pack: 1,
          },
        },
        { new: true }
      );
      const pack = await Packs.findByIdAndUpdate(packAdminPackId, {
        $pull: { members: banishedPlayer._id, betas: banishedPlayer._id },
      });
      await Points.findOneAndUpdate(
        {
          playerId: banishedPlayer._id,
        },
        {
          $unset: {
            packId: 1,
          },
        },
        { new: true }
      );
      ctx.reply(
        replies.admin.banishedMember(banishedPlayer, pack, packAdminPlayer)
      );
    }
  } catch (err) {
    console.log(err);
    await sendError(err, ctx);
  }
},
// Handles finding users by id or username to display their howl points
renamePackCommand: async (ctx) => {
  try {
    const userId = ctx.message.from.id;
    //check if the user is an Admin and it contains a reply message
    if (await checkIfPackAdmin(userId))
      return ctx.reply(replies.player.notAlphaOrBetaOfPack);
    // console.log(ctx.message);
    if (!(await checkIfReplyToMessageExists(ctx))) return;
    const {
      packName,
      packEmblem,
      isProper,
    } = getPackNameAndEmblemFromMessage(ctx.message.text, "rename_pack");
    if (!isProper) return ctx.reply(replies.pack.invalidName);
    //check if the admin using the command is alpha
    const checkAlpha = await checkIfPackAlpha(ctx.message.from.id);
    if (!checkAlpha.isAlpha) return ctx.reply(checkAlpha.message);
    const alphasPackId = checkAlpha.packId;
    const alphasOldPack = checkAlpha.pack;
    //check if emblem matches any other packs
    const checkEmblem = await Packs.findOne({ emblem: packEmblem });
    if (checkEmblem) {
      if (checkEmblem._id.toString() !== alphasPackId.toString())
        return ctx.reply(
          replies.pack.withEmblemAlreadyExists(packEmblem),
          Extra.inReplyTo(ctx.message.message_id).HTML()
        );
    }
    //check if a pack with name or emblem given exists
    const packExits = await Packs.findOne({
      $or: [
        { name: { $regex: new RegExp(`${packName}`, "i") } },
        { emblem: packEmblem },
      ],
    });
    if (!packExits || packExits._id.toString() === alphasPackId.toString()) {
      if (
        alphasOldPack.name === packName &&
        alphasOldPack.emblem === packEmblem
      )
        return ctx.reply(
          replies.pack.sameNameAsBefore(alphasOldPack),
          Extra.inReplyTo(ctx.message.message_id).HTML()
        );
      const updatePack = await Packs.findByIdAndUpdate(
        alphasPackId,
        {
          $set: { name: packName, emblem: packEmblem },
        },
        { new: true }
      );
      return ctx.reply(
        replies.pack.renamedPack(alphasOldPack, updatePack),
        Extra.inReplyTo(ctx.message.message_id).HTML()
      );
    } else if (packExits)
      return ctx.reply(
        replies.pack.withNameAlreadyExists(packName),
        Extra.inReplyTo(ctx.message.message_id).HTML()
      );
  } catch (err) {
    console.log(err);
    await sendError(err, ctx);
  }
},

// Handles pack alpha abandoning their pack
leavePackCommand: async (ctx) => {
  try {
    //check if the user is an Admin
    if (await checkConds(ctx, false)) return;
    // get user info from db
    const userId = ctx.message.from.id;
    const { first_name, username } = ctx.message.from;
    const memberPlayer = await Players.findOne({ TelegramId: userId });
    // check if user exists in db
    if (!memberPlayer) return ctx.reply(replies.player.notFound);
    // check if user is in a pack
    if (!memberPlayer.pack) return ctx.reply(replies.player.unAffiliated);
    // if user is pack owner stop them from leaving
    const checkOwner = await checkIfPackOwner(userId);
    if (checkOwner.isOwner)
      return ctx.reply(replies.admin.adminOwnerCantLeave(checkOwner.pack));
    //update user info,remove from pack and pull pack info from players and points
    const retiringMember = await Players.findOneAndUpdate(
      {
        TelegramId: userId,
      },
      {
        $set: {
          firstName: first_name,
          userName: username ? username.toLowerCase() : null,
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
    await Points.findOneAndUpdate(
      {
        playerId: retiringMember._id,
      },
      {
        $unset: {
          packId: 1,
        },
      },
      { new: true }
    );
    return ctx.replyWithHTML(replies.player.leavePack(retiringMember, pack));
  } catch (err) {
    console.log(err);
    await sendError(err, ctx);
  }
},
// Handles making an admin a pack alpha
makeAlphaCommand: async (ctx) => {
  try {
    //check if the user is an Admin and it contains a reply message
    if (await checkConds(ctx, true)) return;
    //check if replied user is a member of chat and get user info
    const chatId = ctx.chat.id;
    let repliedUserId = ctx.message.reply_to_message.from.id;
    const repliedUser = await telegram.getChatMember(chatId, repliedUserId);
    // check if the admin using the command is alpha
    const userId = ctx.message.from.id;
    const checkAlpha = await checkIfPackAlpha(userId);
    if (!checkAlpha.isAlpha) return ctx.reply(checkAlpha.message);
    const alphasPackId = checkAlpha.packId;
    //find alphas pack and new alpha from db
    const { first_name, username } = repliedUser.user;
    const findPack = await Packs.findById(alphasPackId);
    let newAlphaPlayer = await Players.findOne({
      TelegramId: repliedUserId,
    });
    // if the replied to user is already an alpha of the same pack
    if (!newAlphaPlayer) {
      newAlphaPlayer = await Players.create({
        TelegramId: repliedUserId,
        firstName: first_name,
        userName: username ? username.toLowerCase() : null,
        pack: alphasPackId,
      });
    } else if (newAlphaPlayer) {
      if (findPack.alphas.includes(newAlphaPlayer._id))
        return ctx.reply(replies.player.alreadyAnAlphaInPack(findPack.name));
      // if the replied to user is a member of another pack stop claiming
      if (newAlphaPlayer.pack) {
        const otherPack = await Packs.findById(newAlphaPlayer.pack);
        if (otherPack._id.toString() !== alphasPackId.toString())
          return ctx.reply(replies.player.alreadyInPack(otherPack.name));
      }
      // update user info add pack id
      newAlphaPlayer = await Players.findOneAndUpdate(
        {
          TelegramId: repliedUserId,
        },
        {
          $set: {
            firstName: first_name,
            userName: username ? username.toLowerCase() : null,
            pack: alphasPackId,
          },
        },
        { new: true }
      );
    }
    const pack = await Packs.findByIdAndUpdate(alphasPackId, {
      $pull: { members: newAlphaPlayer._id },
      $push: {
        alphas: newAlphaPlayer._id,
      },
    });
    await Points.findOneAndUpdate(
      {
        playerId: newAlphaPlayer._id,
      },
      {
        packId: pack._id,
      },
      { new: true }
    );
    return ctx.replyWithHTML(replies.player.madeAlpha(newAlphaPlayer, pack));
  } catch (err) {
    console.log(err);
    await sendError(err, ctx);
  }
},
makeBetaCommand: async (ctx) => {
  try {
    //check if the user is an Admin and it contains a reply message
    if (await checkConds(ctx, true)) return;
    //check if replied user is a member of chat and get user info
    const chatId = ctx.chat.id;
    let repliedUserId = ctx.message.reply_to_message.from.id;
    const repliedUser = await telegram.getChatMember(chatId, repliedUserId);
    // check if the admin using the command is alpha
    const userId = ctx.message.from.id;
    const checkAlpha = await checkIfPackAlpha(userId);
    if (!checkAlpha.isAlpha) return ctx.reply(checkAlpha.message);
    const alphasPackId = checkAlpha.packId;
    //find alphas pack and new alpha from db
    const { first_name, username } = repliedUser.user;
    const findPack = await Packs.findById(alphasPackId);
    let newBetaPlayer = await Players.findOne({
      TelegramId: repliedUserId,
    });
    let isAMember = false;
    if (!newBetaPlayer) {
      newBetaPlayer = await Players.create({
        TelegramId: repliedUserId,
        firstName: first_name,
        userName: username ? username.toLowerCase() : null,
        pack: alphasPackId,
      });
    } else if (newBetaPlayer) {
      // if the replied to user is already an beta of the same pack
      if (findPack.betas.includes(newBetaPlayer._id))
        return ctx.reply(replies.player.alreadyAnBetaInPack(findPack.name));
      // if the replied to user is a member of another pack stop claiming
      if (newBetaPlayer.pack) {
        const otherPack = await Packs.findById(newBetaPlayer.pack);
        if (otherPack._id.toString() !== alphasPackId.toString())
          return ctx.reply(replies.player.alreadyInPack(otherPack.name));
      }
      // update user info add pack id
      newBetaPlayer = await Players.findOneAndUpdate(
        {
          TelegramId: repliedUserId,
        },
        {
          $set: {
            firstName: first_name,
            userName: username ? username.toLowerCase() : null,
            pack: alphasPackId,
          },
        },
        { new: true }
      );
    }
    const pack = await Packs.findByIdAndUpdate(alphasPackId, {
      $push: {
        betas: newBetaPlayer._id,
      },
    });

    await Points.findOneAndUpdate(
      {
        playerId: newBetaPlayer._id,
      },
      {
        packId: pack._id,
      },
      { new: true }
    );
    return ctx.replyWithHTML(replies.player.madeBeta(newBetaPlayer, pack));
  } catch (err) {
    console.log(err);
    await sendError(err, ctx);
  }
},

// Handles finding users by id or username to display their howl points
findPlayerByIdCommand: async (playerId, ctx) => {
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
},
findPlayerByUsernameCommand: async (playerUserName, ctx) => {
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
},
//Handles checking the players current status in the event
checkHowlsCommand: async (ctx) => {
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
},
// Handles the return of the mightiest player with the best howl points in
loudestHowlsCommand: async (ctx) => {
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
      if (typeof playerId === "number") {
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
},
// Handles the return of the mightiest packs with the best howlers
listPacksCommand: async (ctx) => {
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
},
rolePointsCommand: async (ctx) => {
  return ctx.reply(
    `Role Points:
    ━━━ Villagers ━━━
  🍵 Alchemist: ${(await getBothRolePoints("Alchemist")).points}
  🙇 Apprentice Seer: ${(await getBothRolePoints("Apprentice Seer")).points}
  👁 Beholder: ${(await getBothRolePoints("Beholder")).points}
  💅 Beauty: ${(await getBothRolePoints("Beauty")).points}
  ⚒ Blacksmith: ${(await getBothRolePoints("Blacksmith")).points}
  🤕 Clumsy Guy: ${(await getBothRolePoints("Clumsy Guy")).points}
  💂 Cultist Hunter: ${(await getBothRolePoints("Cultist Hunter")).points}
  🏹 Cupid: ${(await getBothRolePoints("Cupid")).points}
  😾 Cursed: ${(await getBothRolePoints("Cursed")).points}
  🕵️ Detective: ${(await getBothRolePoints("Detective")).points}
  🍻 Drunk: ${(await getBothRolePoints("Drunk")).points}
  🃏 Fool: ${(await getBothRolePoints("Fool")).points}
  👼 Guardian Angel: ${(await getBothRolePoints("Guardian Angel")).points}
  🔫 Gunner: ${(await getBothRolePoints("Gunner")).points}
  💋 Harlot: ${(await getBothRolePoints("Harlot")).points}
  🔰 Martyr: ${(await getBothRolePoints("Martyr")).points}
  👷 Mason: ${(await getBothRolePoints("Mason")).points}
  🎖 Mayor: ${(await getBothRolePoints("Mayor")).points}
  👑 Monarch: ${(await getBothRolePoints("Monarch")).points}
  🌀 Oracle: ${(await getBothRolePoints("Oracle")).points}
  ☮ Pacifist: ${(await getBothRolePoints("Pacifist")).points}
  💍 Prince: ${(await getBothRolePoints("Prince")).points}
  💤 Sandman: ${(await getBothRolePoints("Sandman")).points}
  👳 Seer: ${(await getBothRolePoints("Seer")).points}
  🛡 Squire: ${(await getBothRolePoints("Squire")).points}
  🌩 Storm Bringer: ${(await getBothRolePoints("Storm Bringer")).points}
  🖕 Traitor: ${(await getBothRolePoints("Traitor")).points}
  👱‍♂ Villager: ${(await getBothRolePoints("Villager")).points}
  👶 Wild Child: ${(await getBothRolePoints("Wild Child")).points}
  📚 Wise Elder: ${(await getBothRolePoints("Wise Elder")).points}
  👨🌚 WolfMan: ${(await getBothRolePoints("WolfMan")).points}

  ━━━ Wolves ━━━
  ⚡ Alpha Wolf: ${(await getBothRolePoints("Alpha Wolf")).points}
  🐺🌝 Lycan: ${(await getBothRolePoints("Lycan")).points}
  👼🐺 Fallen Angel: ${(await getBothRolePoints("Fallen Angel")).points}
  ☄ Mystic: ${(await getBothRolePoints("Mystic")).points}
  🦉 Prowler: ${(await getBothRolePoints("Prowler")).points}
  🔮 Sorcerer: ${(await getBothRolePoints("Sorcerer")).points}
  🐑 Trickster Wolf: ${(await getBothRolePoints("Trickster Wolf")).points}
  🐺 Werewolf: ${(await getBothRolePoints("Werewolf")).points}
  🐶 Wolf Cub: ${(await getBothRolePoints("Wolf Cub")).points}

  ━━━ Other Roles ━━━
  🔥 Arsonist: ${(await getBothRolePoints("Arsonist")).points}
  🐺🌑 Black Wolf: ${(await getBothRolePoints("Black Wolf")).points}
  👤 Cultist: ${(await getBothRolePoints("Cultist")).points}
  🎭 Doppelgänger: ${(await getBothRolePoints("Doppelgänger")).points}
  ⚰ Necromancer: ${(await getBothRolePoints("Necromancer")).points}
  🕴 Puppet Master: ${(await getBothRolePoints("Puppet Master")).points}
  🔪 Serial Killer: ${(await getBothRolePoints("Serial Killer")).points}
  😈 Thief: ${(await getBothRolePoints("Thief")).points}`,
    Extra.inReplyTo(ctx.message.message_id).HTML()
  );
},
//Handles checking the user status in the group
checkPlayerCommand: async (ctx) => {
  try {
    const chatInfo = ctx.chat.id;
    console.log(ctx.message);
    const replyToMessage = await checkIfReplyToMessageExists(ctx);
    if (!replyToMessage) return;
    const replyUserId = replyToMessage.from.id;
    const user = await telegram.getChatMember(chatInfo, replyUserId);
    if (["creator", "administrator"].includes(user.status))
      ctx.reply(
        replies.player.checkAdminPlayer(user),
        Extra.inReplyTo(ctx.message.message_id).HTML()
      );
    else
      await ctx.reply(
        replies.player.checkNormalPlayer(user),
        Extra.inReplyTo(ctx.message.message_id).HTML()
      );
  } catch (err) {
    console.log(err);
  }
},
//Handles sending back group info
checkGroupCommand: async (ctx) => {
  try {
    const { title, id } = ctx.chat;
    if (chats.includes(id)) {
      return ctx.reply(
        replies.chat.isWhiteListed(id, title),
        Extra.inReplyTo(ctx.message.message_id).HTML()
      );
    } else {
      return ctx.reply(
        replies.chat.notWhiteListed(id, title),
        Extra.inReplyTo(ctx.message.message_id).HTML()
      );
    }
  } catch (err) {
    console.log(err);
  }
},



