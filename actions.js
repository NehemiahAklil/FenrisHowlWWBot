const fs = require('fs');
const Telegraf = require('telegraf');
const Extra = require('telegraf/extra');
const config = require('config');
const botToken = config.get('botToken');
const devId = config.get('devId');
const { telegram } = new Telegraf(botToken);

module.exports = {
  checkUserRole: async (ctx, telegram) => {
    try {
      const chatInfo = ctx.chat.id;
      const userInfo = ctx.from.id;
      const user = await telegram.getChatMember(ctx.chat.id, ctx.from.id);
      if (['creator', 'administrator'].includes(user.status)) {
        return true;
      } else {
        return false;
      }
    } catch (err) {
      console.log(err);
    }
  },
  parseGameMessage: async (repliedMessage) => {
    let lifeCount = [],
      nameCount = [],
      roleCount = [],
      winningsCount = [],
      userInfo = [];
    let unFilteredMessage = repliedMessage.split('\n');
    const numOfPlayers = unFilteredMessage[0].split(':')[1].split('/');
    unFilteredMessage.pop();
    unFilteredMessage.shift();
    unFilteredMessage.pop();
    unFilteredMessage.forEach((line, index) => {
      const lifeStatus = line.match(/\b(Dead|Alive)\b/)[0];
      lifeCount.push(lifeStatus);
      let name = line.split(' ')[0];
      if (name.includes(':')) {
        const lastIndex = name.indexOf(':');
        name = name.substring(0, lastIndex);
      }
      nameCount.push(name);
      const lineRole = line.toLowerCase().split('-')[1].split(' ');
      const roleIndex = lineRole.length - 3;
      const role = lineRole[roleIndex];
      roleCount.push(role);
      const WinningStatus = line.match(/\b(Won|Lost)\b/)[0];
      winningsCount.push(WinningStatus);
      // console.log(
      //   `${name} was ${lifeStatus} and ${WinningStatus} with the role ${role}`
      // );
    });
    for (let i = 0; i < winningsCount.length; i++) {
      userInfo.push({
        name: nameCount[i],
        role: roleCount[i],
        winningStatus: winningsCount[i],
        lifeStatus: lifeCount[i],
      });
    }
    const gameInfo = {
      playersAlive: parseInt(numOfPlayers[0]),
      totalPlayers: parseInt(numOfPlayers[1]),
      numberOfWinners: winningsCount.filter((status) => status == 'Won').length,
    };
    console.log(gameInfo);
    console.log(userInfo);
    return { userInfo, gameInfo };
  },
  sendError: async (err, ctx) => {
    try {
      console.log(err);
      const preText = ctx
        ? `User <a href="tg://user?id=${ctx.from.id}">${ctx.from.first_name}</a> Experienced an Error:\n`
        : `<b>Error while connecting to DB:</b>`;

      await telegram.sendMessage(
        devId,
        `${preText} <code>${err.message}.</code> \n\n<b>Full error:</b> \n${err}`,
        Extra.HTML()
      );
    } catch (err) {
      console.log(err);
    }
  },
};
