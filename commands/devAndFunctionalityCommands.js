import telegraf from 'telegraf';
const { Extra } = telegraf;
import replies from '../replies.js';
import { sendError, checkIfReplyToMessageExists } from '../actions.js';
import { getPackNameAndEmblemFromMessage } from '../utils/helpers.js';
//import mongoose models schemas
import Packs from '../models/Packs.js';
import Players from '../models/Players.js';
import Points from '../models/Points.js';
//Get sensitive files from config
import config from 'config';
const devId = config.get('devId');
const chats = config.get('chats');

export const randomBetaCommand = async (ctx) => {
  try {
    let betaArray = [
      'Summer',
      'Nathan',
      'Malia',
      'Olami',
      'Mike',
      'Serene',
      'Aymen',
      'saturn',
    ];
    let ctr = betaArray.length;
    let temp;
    let index;

    // While there are elements in the array
    while (ctr > 0) {
      // Pick a random index
      index = Math.floor(Math.random() * ctr);
      // Decrease ctr by 1
      ctr--;
      // And swap the last element with it
      temp = betaArray[ctr];
      betaArray[ctr] = betaArray[index];
      betaArray[index] = temp;
    }
    let betaList = 'Team a\n';
    const betaLength = betaArray.length / 2;
    betaArray.forEach((beta, idx) => {
      if (!(idx++ === betaLength)) {
        betaList += `${idx} ${beta}\n`;
      } else {
        betaList += '\nTeam b\n';
        betaList += `${idx} ${beta}\n`;
      }
    });
    return ctx.reply(`${betaList}`);
  } catch (err) {
    console.log(err);
  }
};
//Handles under development commands
export const underDevelopmentCommand = async (ctx) => {
  return ctx.replyWithHTML(replies.underDevelopment);
};
//Handles checking the user status in the group
export const checkPlayerCommand = async (ctx) => {
  try {
    // Check if in reply to message exists
    const replyToMessage = await checkIfReplyToMessageExists(ctx);
    if (!replyToMessage) return;
    // check users status from group
    const replyUserId = replyToMessage.from.id;
    const user = await ctx.getChatMember(ctx.chat.id, replyUserId);
    if (['creator', 'administrator'].includes(user.status)) {
      return ctx.reply(
        replies.player.checkAdminPlayer(user),
        Extra.inReplyTo(ctx.message.message_id).HTML()
      );
    }
    return ctx.reply(
      replies.player.checkNormalPlayer(user),
      Extra.inReplyTo(ctx.message.message_id).HTML()
    );
  } catch (err) {
    console.log(err);
    await sendError(err, ctx);
  }
};
//Handles sending back group info
export const checkGroupCommand = async (ctx) => {
  try {
    const { title, id } = ctx.chat;
    if (chats.includes(id)) {
      return ctx.reply(
        replies.chat.isWhiteListed(id, title),
        Extra.inReplyTo(ctx.message.message_id).HTML()
      );
    }
    const group = ctx.db;
    console.log(group);
    return ctx.reply(
      replies.chat.notWhiteListed(id, title),
      Extra.inReplyTo(ctx.message.message_id).HTML()
    );
  } catch (err) {
    console.log(err);
    await sendError(err, ctx);
  }
};

export const pingCommand = async (ctx) => {
  try {
    const time = new Date();
    ctx.reply(
      `Pong!\nReply time : ${time - ctx.state.time}%ms `,
      Extra.inReplyTo(ctx.message.message_id)
    );
  } catch (err) {
    console.log(err);
    await sendError(err, ctx);
  }
};

//Handles special commands for bot maker
export const devDisbandPackCommand = async (ctx) => {
  if (ctx.message.from.id !== devId) {
    return ctx.reply(replies.dev.denyAccess);
  }
  const { packName, packEmblem } = getPackNameAndEmblemFromMessage(
    ctx.message.text,
    'devDisband'
  );
  const packExits = await Packs.findOne({
    $or: [
      { name: { $regex: new RegExp(`${packName}`, 'i') } },
      { emblem: packEmblem },
    ],
  });
  if (!packExits) {
    return ctx.reply(
      replies.pack.notFound(packName, packEmblem),
      Extra.inReplyTo(ctx.message.message_id).HTML()
    );
  }
  await Players.updateMany(
    {
      pack: packExits._id,
    },
    {
      $unset: {
        pack: 1,
      },
    }
  );
  await Points.updateMany(
    { packId: packExits._id },
    {
      $unset: {
        packId: 1,
      },
    }
  );
  await packExits.delete();
  return ctx.reply(
    replies.dev.deletedPack(packExits),
    Extra.inReplyTo(ctx.message.message_id)
  );
};
export const devDeletePlayerCommand = async (ctx) => {
  try {
    const userId = ctx.message.from.id;
    const repliedMessage = await checkIfReplyToMessageExists(ctx, false);
    if (userId !== devId) {
      return ctx.reply("lousy human I won't obey thee");
    }
    const findPlayer = await Players.findOne({
      TelegramId: repliedMessage.from.id,
    });
    if (!findPlayer) {
      return ctx.reply(replies.player.notFound);
    } else if (findPlayer.pack) {
      await Packs.findByIdAndUpdate(
        {
          pack: findPlayer.pack,
        },
        {
          $pull: {
            members: findPlayer._id,
            alphas: findPlayer._id,
            betas: findPlayer._id,
          },
        }
      );
    }
    await Points.findOneAndDelete({ playerId: findPlayer._id });
    await findPlayer.delete();
    return ctx.replyWithHTML(replies.dev.removedPlayer(findPlayer));
  } catch (err) {
    console.log(err);
    sendError(err, ctx);
  }
};
