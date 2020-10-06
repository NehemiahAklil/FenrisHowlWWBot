import telegraf from 'telegraf';
const { Extra } = telegraf;
import replies from '../replies.js';
import { checkConds, checkIfPackOwner } from '../actions.js';

//import mongoose models schemas
import Packs from '../models/Packs.js';
import Players from '../models/Players.js';
import Points from '../models/Points.js';

//Actions to make sure if admins want to silenceHowls or not
export const cancelAction = async (ctx) => {
  try {
    if (await checkConds(ctx, false)) return;
    await ctx.editMessageText(replies.actions.cancelled, Extra.HTML());
    return console.log(ctx.match[0]);
  } catch (err) {
    console.log(err);
    await sendError(err, ctx);
  }
};
export const silenceHowlsAction = async (ctx) => {
  try {
    if (await checkConds(ctx, false)) return;
    await Points.remove({});
    return ctx.editMessageText(replies.actions.silencedHowls, Extra.HTML());
  } catch (err) {
    console.log(err);
    await sendError(err, ctx);
  }
};
export const deletePackAction = async (ctx) => {
  try {
    if (await checkConds(ctx, false)) return;
    const userId = ctx.from.id;
    // check if the admin is a pack owner
    const checkOwner = await checkIfPackOwner(userId);
    if (!checkOwner.isOwner) {
      return ctx.editMessageText(checkOwner.message);
    }
    const ownersPackId = checkOwner.packId;
    // remove pack info from players and points then finally delete the pack itself
    await Players.updateMany(
      {
        pack: ownersPackId,
      },
      {
        $unset: {
          pack: 1,
        },
      }
    );
    await Points.updateMany(
      {
        packId: ownersPackId,
      },
      {
        $unset: {
          packId: 1,
        },
      }
    );
    const pack = await Packs.findByIdAndDelete(checkOwner.packId);
    return ctx.editMessageText(replies.pack.deletePack(pack), Extra.HTML());
  } catch (err) {
    console.log(err);
    await sendError(err, ctx);
  }
};
