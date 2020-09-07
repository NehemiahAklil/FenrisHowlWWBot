const Telegraf = require('telegraf');
const { Extra, Markup } = require('telegraf');
const fs = require('fs');
const replies = require('./replies');
const config = require('config');
const botToken = config.get('botToken');
const bot = new Telegraf(botToken);
const { telegram } = bot;
const { parseGameMessage, checkUserRole, sendError } = require('./actions');

bot.use(async (ctx, next) => {
  const start = new Date();
  await next();
  const ms = new Date() - start;
  console.log('Response time: %sms', ms);
});
//Handles on start message or '/start' command
bot.start((ctx) => ctx.reply("Welcome to Fenris' Howl Bot"));
//Handles on help message or '/help' command
bot.help(async (ctx) => {
  try {
    if (ctx.chat.type === 'private') {
      ctx.reply('');
    } else {
      await ctx.reply(
        replies.helpButton,
        Extra.markup(
          Markup.inlineKeyboard([
            [
              Markup.urlButton(
                "Go to Fenris' Howl Bot🐺",
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
});
bot.on('sticker', (ctx) => ctx.reply('👍'));

// Handles finding users by Id or userName from db to display their howl points
bot.command('find', async (ctx) => {
  try {
    const chatInfo = ctx.chat.id;
    const userInfo = ctx.from.id;

    console.log(ctx.from.id);
    // ctx.reply(chatInfo);
    const user = await telegram.getChatMember(ctx.chat.id, ctx.from.id);
    if (['creator', 'administrator'].includes(user.status)) {
      return ctx.reply('Behold ' + user.status);
    } else {
      ctx.reply(user.status);
    }
  } catch (err) {
    console.log(err);
  }
});

// Handles updating users howl points if called by admin in reply to a game end message
bot.command('howl_points', async (ctx) => {
  try {
    const repliedToMessage = ctx.message.reply_to_message || null;
    if (!repliedToMessage) {
      ctx.reply(
        "The message doesn't contain a proper reply message \nMake sure the replied message isn't forwarded"
      );
      throw new Error("reply_to_message doesn't exist");
    }
    // ctx.reply(repliedToMessage.text);
    // fs.writeFileSync('./word.txt', repliedToMessage);
    const { userInfo, gameInfo } = await parseGameMessage(
      repliedToMessage.text
    );
    // console.log(repliedToMessage);
    const { playersAlive, totalPlayers, numberOfWinners } = gameInfo;
    ctx.reply(
      `The game had ${totalPlayers} players out this players ${playersAlive} were alive and also ${numberOfWinners} won the game`
    );
    let replyMessage = [];
    userInfo.forEach((singleMessage) => {
      const { name, lifeStatus, winningStatus, role } = singleMessage;
      replyMessage.push(
        `${name} was ${lifeStatus} and ${winningStatus} with the role ${role}`
      );
    });
    replyMessage = JSON.stringify(replyMessage, (key, value) => value, '\n');
    console.log(replyMessage);
    return ctx.reply(replyMessage);
  } catch (err) {
    console.log(err);
    sendError(err, ctx);
  }
});
bot.command(
  'silence_howls',
  Telegraf.reply('I will silence all thee howls of this miserable wolfs')
);
bot.command(
  'loudest_howls',
  Telegraf.reply(
    'These are the mightiest of all the other wolfs. Leading the fray with their harmonies howls of power.'
  )
);
bot.hears('hi', (ctx) => ctx.reply('Hey there'));
bot.launch();
