import Telegraf from 'telegraf';
const { Composer } = Telegraf;
import mongoose from 'mongoose';
import config from 'config';
import * as commands from './commands/exportCommands.js';
import { sendError } from './actions.js';
import { checkFindPlayerRegex } from './utils/helpers.js';

const botToken = config.get('botToken');
const mongoUrl = config.get('mongoUrl');
const bot = new Composer();

bot.use(async (ctx, next) => {
  const start = new Date();
  ctx.state.time = start;
  let chatId = ctx.chat.id;
  await next();
  const ms = new Date() - start;
  ctx.state.time = ms;
  console.log(`Response time: %sms ${ms} in ${chatId}`);
});
bot.catch((err, ctx) =>
  console.log(`Ooops, encountered an error for ${ctx.updateType}`, err)
);

// connect with mongoose database
(async () => {
  try {
    const dbConfigs = {
      useUnifiedTopology: true,
      useNewUrlParser: true,
      useFindAndModify: false,
      useCreateIndex: true,
    };
    const db = await mongoose.connect(mongoUrl, dbConfigs);
    console.log(`Connected to ${db.connection.name}`);
  } catch (err) {
    console.log(err);
    await sendError(err);
  }
})();

bot.start(async (ctx) => await commands.startBotCommand(ctx));
bot.help(async (ctx) => await commands.helpCommand(ctx));

/*    Admin Commands   */
bot.command(
  'howl_points',
  async (ctx) => await commands.howlPointsCommand(ctx)
);
bot.command(
  'silence_howls',
  async (ctx) => await commands.silenceHowlsCommand(ctx)
);
bot.command(
  'create_pack',
  async (ctx) => await commands.createPackCommand(ctx)
);
/*   Under development Admin commands */
bot.command(
  'changeMode',
  async (ctx) => await commands.underDevelopmentCommand(ctx)
);
bot.command(
  'delete_last_game',
  async (ctx) => await commands.underDevelopmentCommand(ctx)
);
bot.command(
  'delete_game',
  async (ctx) => await commands.underDevelopmentCommand(ctx)
);
/* Pack Owner Commands */
bot.command(
  'transfer_ownership',
  async (ctx) => await commands.transferOwnershipCommand(ctx)
);
bot.command(
  'delete_pack',
  async (ctx) => await commands.deletePackCommand(ctx)
);
bot.command(
  'remove_alpha',
  async (ctx) => await commands.removeAlphaCommand(ctx)
);
/* Pack Alpha Commands */
bot.command('leave_pack', async (ctx) => await commands.leavePackCommand(ctx));
bot.command('make_alpha', async (ctx) => await commands.makeAlphaCommand(ctx));
bot.command('make_beta', async (ctx) => await commands.makeBetaCommand(ctx));

/* Pack Betas Commands */
bot.command('claim', async (ctx) => await commands.claimPackMemberCommand(ctx));
bot.command(
  'initiate',
  async (ctx) => await commands.claimPackMemberCommand(ctx)
);
bot.command(
  'banish',
  async (ctx) => await commands.banishPackMemberCommand(ctx)
);
bot.command(
  'rename_pack',
  async (ctx) => await commands.renamePackCommand(ctx)
);

/* Normal Players Commands */
bot.command('find', async (ctx) => {
  try {
    const { type, parsedRegex, errorMsg } = await checkFindPlayerRegex(
      ctx.message.text
    );
    switch (type) {
      case 'findById':
        return await commands.findPlayerByIdCommand(parsedRegex, ctx);
      case 'findByUsername':
        return await commands.findPlayerByUsernameCommand(parsedRegex, ctx);
      default:
        return ctx.reply(errorMsg);
    }
  } catch (err) {
    await sendError(err, ctx);
    return console.log(err);
  }
});
bot.command(
  'check_howls',
  async (ctx) => await commands.checkHowlsCommand(ctx)
);
bot.command(
  'loudest_howls',
  async (ctx) => await commands.loudestHowlsCommand(ctx)
);
bot.command('list_packs', async (ctx) => await commands.listPacksCommand(ctx));
bot.command(
  'role_points',
  async (ctx) => await commands.rolePointsCommand(ctx)
);

/*  Functionality Commands */
bot.command('check', async (ctx) => await commands.checkPlayerCommand(ctx));
bot.command('ping', async (ctx) => await commands.pingCommand(ctx));
bot.command('group_info', async (ctx) => await commands.checkGroupCommand(ctx));
bot.command(
  'reorder_beta',
  async (ctx) => await commands.randomBetaCommand(ctx)
);
/* Bot Creator Commands */
bot.command(
  'devDisband',
  async (ctx) => await commands.devDisbandPackCommand(ctx)
);
bot.command(
  'devKill',
  async (ctx) => await commands.devDeletePlayerCommand(ctx)
);
/*    Actions  */
bot.action(/(?=cancel)(.*)/i, async (ctx) => await commands.cancelAction(ctx));
bot.action(
  'silence howls',
  async (ctx) => await commands.silenceHowlsAction(ctx)
);
bot.action('delete pack', async (ctx) => await commands.deletePackAction(ctx));

// bot.launch().then(() => console.log("Fenris' Howl Bot Launched"));

module.exports = bot;

// immense-gorge-11240
// https://immense-gorge-11240.herokuapp.com/
