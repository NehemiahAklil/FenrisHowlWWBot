import telegraf from 'telegraf';
const { Extra } = telegraf;
import replies from '../replies.js';
import * as actions from '../actions.js';
import { getPackNameAndEmblemFromMessage } from '../utils/helpers.js';
//import mongoose models schemas
import Packs from '../models/Packs.js';
import Players from '../models/Players.js';
import Points from '../models/Points.js';

// Handles updating users howl points if called by admin in reply to a game end message
export const howlPointsCommand = async (ctx) => {
  try {
    //check if it has reply message is user is admin
    if (await actions.checkConds(ctx, false)) return;
    const repliedToMessage = await actions.checkIfReplyToMessageExists(
      ctx,
      true
    );
    //check if replied to message is a werewolf game end message
    const messageValidity = await actions.checkGameMessageValidity(
      repliedToMessage
    );
    if (!messageValidity) {
      return ctx.reply(replies.repliedMessage.invalidMessage);
    }
    //update players info before adding their points
    await actions.updateGamePlayersInfo(repliedToMessage);
    ctx.reply(replies.howlPoints.updatedUserInfo);

    //parse game message and save points then get results to display
    const {
      userInfo,
      gameInfo,
      packs,
      invalidMessage,
    } = await actions.parseGameMessage(repliedToMessage);
    if (invalidMessage) return ctx.reply(invalidMessage);

    //send game info
    ctx.reply(replies.howlPoints.gameInfo(gameInfo));

    //send players and packs point updates
    let replyMessage = '';
    //get players with out packs
    const unAffiliatedPlayers = userInfo.filter((user) => {
      if (!user.packInfo) {
        return user;
      }
    });
    console.log('My Packs', packs);
    /*Add to reply message by iterating through packs and then iterating through their members inside the function */
    packs.forEach((pack) => {
      replyMessage += replies.howlPoints.packPoints(pack);
      userInfo.forEach((packMember) => {
        if (packMember.packInfo) {
          replyMessage +=
            packMember.packInfo.name === pack.name
              ? replies.howlPoints.packMemberPoints(packMember)
              : '';
        }
      });
    });
    //if their are unaffiliated players add them to reply message
    if (unAffiliatedPlayers.length > 0) {
      replyMessage += replies.howlPoints.unAffiliatedPlayersTitle;
      unAffiliatedPlayers.forEach((lonePlayer) => {
        if (lonePlayer) {
          replyMessage += replies.howlPoints.lonePlayerPoints(lonePlayer);
        }
      });
    }
    return ctx.replyWithHTML(replies.howlPoints.mainTitle(replyMessage));
  } catch (err) {
    console.log(err);
    await actions.sendError(err, ctx);
  }
};
// Handles deleting the points of all players
export const silenceHowlsCommand = async (ctx) => {
  try {
    //check if the user is an Admin and then use inline button to make sure this is their decision
    if (await actions.checkConds(ctx, false)) return;
    await actions.deletionWarningMessage(ctx, 'Silence Howls', 'silence howls');
  } catch (err) {
    console.log(err);
    await actions.sendError(err, ctx);
  }
};
// Handles creating a new pack with ownership right to the admin
export const createPackCommand = async (ctx) => {
  //check if the user is an Admin
  if (await actions.checkConds(ctx, false)) return;
  const { packName, packEmblem, isProper } = getPackNameAndEmblemFromMessage(
    ctx.message.text,
    'create_pack'
  );
  if (!isProper) return ctx.reply(replies.pack.invalidName);
  //check if a pack with name or emblem given exists
  const packExits = await Packs.findOne({
    $or: [
      { name: { $regex: new RegExp(`${packName}`, 'i') } },
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
};

// Handles transferring ownership to the admin in reply
export const transferOwnershipCommand = async (ctx) => {
  try {
    //check if the user is an Admin and it contains a reply message
    if (await actions.checkConds(ctx, true)) return;
    const userId = ctx.message.from.id;
    // check if the admin transferring rights is an owner of affiliated pack
    const checkOwner = await actions.checkIfPackOwner(userId);
    if (!checkOwner.isOwner) return ctx.reply(checkOwner.message);
    // check if the user replied to is a pack alpha
    const checkAlpha = await actions.checkIfPackAlpha(
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
    await actions.sendError(err, ctx);
  }
};
// Handles deleting owners pack
export const deletePackCommand = async (ctx) => {
  try {
    //check if the user is an Admin
    if (await actions.checkConds(ctx, false)) return;
    await actions.deletionWarningMessage(ctx, 'Delete Pack', 'delete pack');
  } catch (err) {
    console.log(err);
    await actions.sendError(err, ctx);
  }
};
//Handles removing alphas from pack
export const removeAlphaCommand = async (ctx) => {
  try {
    //check if the user is an Admin and it contains a reply message
    if (await actions.checkConds(ctx, true)) return;
    const mainUserId = ctx.message.from.id;
    // check if the admin transferring rights is an owner of affiliated pack
    const checkOwner = await actions.checkIfPackOwner(mainUserId);
    if (!checkOwner.isOwner) return ctx.reply(checkOwner.message);
    const userId = ctx.message.reply_to_message.from.id;
    const { first_name, username } = ctx.message.reply_to_message.from;
    const memberPlayer = await Players.findOne({ TelegramId: userId });
    // check if user exists in db
    if (!memberPlayer) return ctx.reply(replies.player.notFound);
    // check if user is in a pack
    if (!memberPlayer.pack) return ctx.reply(replies.player.unAffiliated);
    const checkAlpha = await actions.checkIfPackAlpha(userId);
    if (!checkAlpha.isAlpha) return ctx.reply(checkAlpha.message);
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
    await actions.sendError(err, ctx);
  }
};
// Handles initiating or claiming  a player to a pack
export const claimPackMemberCommand = async (ctx) => {
  try {
    const userId = ctx.message.from.id;
    //check if the user is an Admin and it contains a reply message
    if (await actions.checkIfPackAdmin(userId))
      return ctx.reply(replies.player.notAlphaOrBetaOfPack);
    if (!(await actions.checkIfReplyToMessageExists(ctx))) return;
    //check if replied user is a member of chat and get user info
    const repliedUserTId = ctx.message.reply_to_message.from.id;
    const repliedUser = await ctx.getChatMember(ctx.chat.id, repliedUserTId);
    //check if the admin using the command is alpha
    const checkPackAdminInfo = await actions.checkPackAdmin(userId);
    if (!checkPackAdminInfo.isPackAdmin) {
      return ctx.reply(checkPackAdminInfo.message);
    }
    let packAdminPlayer;
    if (checkPackAdminInfo.isAlpha) {
      packAdminPlayer = checkPackAdminInfo.alpha;
    } else packAdminPlayer = checkPackAdminInfo.beta;

    const packAdminsPackId = checkPackAdminInfo.packId;
    // destructure replied user info and check if user is in db
    const { first_name, username } = repliedUser.user;
    let newInitiate = await Players.findOne({
      TelegramId: repliedUserTId,
    });
    // if user doesn't exist create user
    if (!newInitiate) {
      newInitiate = await Players.create({
        TelegramId: repliedUserTId,
        firstName: first_name,
        userName: username ? username.toLowerCase() : null,
        pack: packAdminsPackId,
      });
    } else if (newInitiate) {
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
    await actions.sendError(err, ctx);
  }
};
// Handles kicking a player from a pack
export const banishPackMemberCommand = async (ctx) => {
  try {
    const userId = ctx.message.from.id;
    //check if the user is an Admin and it contains a reply message
    if (await actions.checkIfPackAdmin(userId))
      return ctx.reply(replies.player.notAlphaOrBetaOfPack);
    // console.log(ctx.message);
    if (!(await actions.checkIfReplyToMessageExists(ctx))) return;
    //check if replied user is a member of chat and get user info
    const repliedUser = await ctx.getChatMember(
      ctx.chat.id,
      ctx.message.reply_to_message.from.id
    );
    //check if the admin using the command is alpha
    const checkPackAdminInfo = await actions.checkPackAdmin(userId);
    console.log(checkPackAdminInfo);
    if (!checkPackAdminInfo.isPackAdmin) {
      return ctx.reply(checkPackAdminInfo.message);
    }

    let packAdminPlayer;
    if (checkPackAdminInfo.isAlpha) {
      packAdminPlayer = checkPackAdminInfo.alpha;
    } else packAdminPlayer = checkPackAdminInfo.beta;
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
        if (!(await actions.checkIfPackAdmin(repliedUserTId)))
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
    await actions.sendError(err, ctx);
  }
};
// Handles finding users by id or username to display their howl points
export const renamePackCommand = async (ctx) => {
  try {
    const userId = ctx.message.from.id;
    //check if the user is an Admin and it contains a reply message
    if (await actions.checkIfPackAdmin(userId))
      return ctx.reply(replies.player.notAlphaOrBetaOfPack);
    // console.log(ctx.message);
    if (!(await actions.checkIfReplyToMessageExists(ctx))) return;
    const { packName, packEmblem, isProper } = getPackNameAndEmblemFromMessage(
      ctx.message.text,
      'rename_pack'
    );
    if (!isProper) return ctx.reply(replies.pack.invalidName);
    //check if the admin using the command is alpha
    const checkAlpha = await actions.checkIfPackAlpha(ctx.message.from.id);
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
        { name: { $regex: new RegExp(`${packName}`, 'i') } },
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
    await actions.sendError(err, ctx);
  }
};

// Handles pack alpha abandoning their pack
export const leavePackCommand = async (ctx) => {
  try {
    //check if the user is an Admin
    if (await actions.checkConds(ctx, false)) return;
    // get user info from db
    const userId = ctx.message.from.id;
    const { first_name, username } = ctx.message.from;
    const memberPlayer = await Players.findOne({ TelegramId: userId });
    // check if user exists in db
    if (!memberPlayer) return ctx.reply(replies.player.notFound);
    // check if user is in a pack
    if (!memberPlayer.pack) return ctx.reply(replies.player.unAffiliated);
    // if user is pack owner stop them from leaving
    const checkOwner = await actions.checkIfPackOwner(userId);
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
    await actions.sendError(err, ctx);
  }
};
// Handles making an admin a pack alpha
export const makeAlphaCommand = async (ctx) => {
  try {
    //check if the user is an Admin and it contains a reply message
    if (await actions.checkConds(ctx, true)) return;
    //check if replied user is a member of chat and get user info
    const chatId = ctx.chat.id;
    let repliedUserId = ctx.message.reply_to_message.from.id;
    const repliedUser = await ctx.getChatMember(chatId, repliedUserId);
    // check if the admin using the command is alpha
    const userId = ctx.message.from.id;
    const checkAlpha = await actions.checkIfPackAlpha(userId);
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
    await actions.sendError(err, ctx);
  }
};
export const makeBetaCommand = async (ctx) => {
  try {
    //check if the user is an Admin and it contains a reply message
    if (await actions.checkConds(ctx, true)) return;
    //check if replied user is a member of chat and get user info
    const chatId = ctx.chat.id;
    let repliedUserId = ctx.message.reply_to_message.from.id;
    const repliedUser = await ctx.getChatMember(chatId, repliedUserId);
    // check if the admin using the command is alpha
    const userId = ctx.message.from.id;
    const checkAlpha = await actions.checkIfPackAlpha(userId);
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
    await actions.sendError(err, ctx);
  }
};
