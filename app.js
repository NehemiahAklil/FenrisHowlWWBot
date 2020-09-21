const Telegraf = require('telegraf');
const mongoose = require('mongoose');
const config = require('config');
const botToken = config.get('botToken');
const bot = new Telegraf(botToken);
const replyMsg = require('./replies');
const { Extra, Markup } = require('telegraf');

const {
  helpCommand,
  startBotCommand,
  howlPointsCommand,
  silenceHowlsCommand,
  checkPlayerCommand,
  changeModeCommand,
  findPlayerByIdCommand,
  findPlayerByUsernameCommand,
  loudestHowlsCommand,
  claimPackMemberCommand,
  banishPackMemberCommand,
  deleteGameCommand,
  deleteLastGameCommand,
  makeAlphaCommand,
  createPackCommand,
  deletePackCommand,
  cancelAction,
  silenceHowlsAction,
  listPacksCommand,
  leavePackCommand,
} = require('./commands');
const { checkGameMode, sendError } = require('./actions');
const { checkFindPlayerRegex } = require('./utils/helpers');
bot.use(async (ctx, next) => {
  const start = new Date();
  await next();
  const ms = new Date() - start;
  console.log('Response time: %sms', ms);
});
bot.catch((err, ctx) => {
  console.log(`Ooops, encountered an error for ${ctx.updateType}`, err);
});
mongoose
  .connect('mongodb://localhost/FenrisWW', {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useFindAndModify: false,
    useCreateIndex: true,
    dbName: 'FenrisWW',
  })
  .then(() => {
    console.log('Connected to FenrisWW');
    // bot.startPolling();
  })
  .catch((err) => console.log(err));
mongoose.Promise = global.Promise;
//Handles on start message or '/start' command
bot.start(async (ctx) => await startBotCommand(ctx));
//Handles on help message or '/help' command
bot.help(async (ctx) => await helpCommand(ctx));
// bot.on('sticker', (ctx) => ctx.reply('👍'));

// Handles finding users by Id or userName from db to display their howl points
bot.command('find', async (ctx) => {
  try {
    const { type, parsedRegex, errorMsg } = await checkFindPlayerRegex(
      ctx.message.text
    );
    switch (type) {
      case 'findById':
        return await findPlayerByIdCommand(parsedRegex, ctx);
      case 'findByUsername':
        return await findPlayerByUsernameCommand(parsedRegex, ctx);
      default:
        return ctx.reply(errorMsg);
    }
  } catch (err) {
    sendError(err, ctx);
    return console.log(err);
  }
});
bot.command('make_alpha', async (ctx) => await makeAlphaCommand(ctx));
bot.command('create_pack', async (ctx) => await createPackCommand(ctx));
bot.command('delete_pack', async (ctx) => await deletePackCommand(ctx));
bot.command('changeMode', async (ctx) => await changeModeCommand(ctx));
bot.command('check', async (ctx) => await checkPlayerCommand(ctx));
// Handles updating users howl points if called by admin in reply to a game end message
bot.command('howl_points', async (ctx) => await howlPointsCommand(ctx));
//Handles deleting part of the db's collections
bot.command('silence_howls', async (ctx) => await silenceHowlsCommand(ctx));
// Handles the return of the mightiest player with the best howl points in packWar or loneWolf mode
bot.command('loudest_howls', async (ctx) => await loudestHowlsCommand(ctx));
// Handles the return of the mightiest packs with the best howlers
bot.command('list_packs', async (ctx) => await listPacksCommand(ctx));
bot.command('leave_pack', async (ctx) => await leavePackCommand(ctx));
// Handles initiate or claim players to a pack
bot.command('initiate', async (ctx) => await claimPackMemberCommand(ctx));
bot.command('claim', async (ctx) => await claimPackMemberCommand(ctx));
// Handles dropping player from a clan
bot.command('banish', async (ctx) => await banishPackMemberCommand(ctx));
// Handles deleting a game when given an id
bot.command('delete_game', async (ctx) => await deleteGameCommand(ctx));
// Handles deleting the last game played from db
bot.command(
  'delete_last_game',
  async (ctx) => await deleteLastGameCommand(ctx)
);
bot.action(/(?=cancel)(.*)/i, async (ctx) => await cancelAction(ctx));
bot.action('silence howls', async (ctx) => await silenceHowlsAction(ctx));
bot.launch();
