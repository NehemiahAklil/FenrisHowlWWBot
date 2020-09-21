const config = require('config');
const devId = config.get('devId');
const groupId = config.get('groupId');
module.exports = {
  help: {
    redirectToPrivateMsg: 'Press the button below and then send /help',
    buttonMsg: "Go to Fenris' Howl Bot🐺",
    message: `    
          <b>Help For Fenris' Howl Bot</b>
     ✒ Admin Only Commands
     /howl_points Reply to black werewolf game end message to save howl points
     /silence_points ⚠ Be cautious when using this command it deletes all howl points collected in server⚠
    
     ***** <b>Admins with pack alpha privileges command</b> ******
     /initiate and /claim Reply to any group member message to add to your pack(Player must be unaffiliated to any pack for command to work)
     /banish Reply to a pack members message to remove them from pack
     /create_pack Creates a new pack by sending a name and also add emblem emoji after name
     /delete_pack Deletes admins current pack  
     /make_alpha makes player a pack alpha
    
     ***** <b>Under Development Admin Commands</b> *****
     /changeMode adapts candy corn bots single player 'loneWolf' mode or pack event mode 'packWars' mode 
     /delete_game Send with number to delete a specific game
     /delete_last_game Deletes the last game saved to database
    
     🖊 Normal Commands
     /loudest_howls Sends the Top 5 Event Best Howlers of the event    
     /find Followed by @username or telegram id of a player to see event their status
     ***** <b>Functionality Commands(not related to event but helpful for event)</b> ****
     /check Sends group members status and id from reply message()
     
     
For any bug reports or additional ideas for the bot contact me the developer <a href="tg://user?id=${devId}">Nehemiah Aklil</a> or any of the <a href="https://t.me/Ethiowerewolf">Ethio Werewolf - The Origin</a> Admins
     `,
  },
  gameMode: {
    noGameMode: 'No Game Mode Chosen',
    changeGameMode: 'Game Mode has been set to',
  },
  findPlayer: {
    inputError:
      "<b>Input isn't a Username or UserId</b> try to add @ before usernames and use proper userId",
    userNameNotFound: (playerUserName) => {
      return `Player with username @${playerUserName} not found`;
    },
    idNotFound: (playerId) => {
      return `Player with id of ${playerId} not found`;
    },
    zeroHowlResponseMsg: (userId, firstName) => {
      return `<a href="tg://user?id=${userId}">${firstName}</a> wishfully stares at the dazzling moon light✨ yet to put a mark in the starry night`;
    },
    responseMessage: (userId, firstName, points) => {
      return `<a href="tg://user?id=${userId}">${firstName}</a>'s thundering howls echoed through the night for <b>${points} times</b> in the dazzling radiance of the moon light✨`;
    },
    withPackResponseAddOn: (pack) => {
      return ` accompanied by their brethren <i>${pack.name} ${pack.emblem}</i> pack members harmony`;
    },
  },
  admin: {
    onlyAdminsAllowedMsg: 'This Command is for admins only🌚',
    claimedMember: (claimedPlayer, pack, alphaPlayer) =>
      `${claimedPlayer.firstName} has been chosen by ${alphaPlayer.firstName} to join the infamous ${pack.name} ${pack.emblem} pack`,
    banishedMember: (banishedPlayer, pack, alphaPlayer) =>
      `${banishedPlayer.firstName} has been banished from pack ${pack.name} ${pack.emblem} by ${alphaPlayer.firstName}`,
  },
  player: {
    leavePack: (user, pack) =>
      `Howls of sorrow are heard across miles as <a href="tg://user?id=${user.TelegramId}">${user.firstName}</a> removes ${pack.name} ${pack.emblem}'s pack emblem`,
    checkNormalPlayer: (userInfo) => {
      const { user } = userInfo;
      if (user.is_bot) {
        return `<a href="tg://user?id=${user.id}">${user.first_name}</a> [<code>${user.id}</code>] is a bot ${userInfo.status}`;
      }
      return `<a href="tg://user?id=${user.id}">${user.first_name}</a> [<code>${user.id}</code>] is a ${userInfo.status}`;
    },
    checkAdminPlayer: (userInfo) => {
      const { user } = userInfo;
      const adminTypeMsg =
        userInfo.status === 'creator'
          ? 'in the audience of'
          : 'in the presence of';

      if (user.is_bot)
        return `<a href="tg://user?id=${user.id}">${user.first_name}</a> [<code>${user.id}</code>] is a bot ${userInfo.status}`;
      return `Behold for thy is ${adminTypeMsg} <a href="tg://user?id=${user.id}">${user.first_name}</a>[<code>${user.id}</code>] thee ${userInfo.status}`;
    },
    notFound: "Player couldn't be found on db",
    unAffiliated: 'Not Affiliated with any Pack',
    packNotFound: 'Belongs to a non-existing Pack',
    notAlphaOfPack: 'Player is not Alpha of afflicted Pack',
    madeAlpha: (alphaPlayer, pack) =>
      `<b>${alphaPlayer.firstName}</b> has joined the rank of alpha in <i>${pack.name} ${pack.emblem}</i>`,
    alreadyInPack: (packName) =>
      `Player is Already a member of the ${packName} pack`,
  },
  repliedMessage: {
    notFound:
      "The message doesn't contain a proper reply message \nMake sure this bot can access messages as admin",
    invalidMessage:
      'The message you replied to is not a werewolf game end message',
  },
  changeGameMode: {
    errorMsg:
      "Invalid Mode type in message Try to use either 'loneWolf' or 'packWars' mode",
    loneWolfMode: 'Game Mode <b>Lone Wolf 🐺</b> is Under Development',
    packWarsMode: 'Game mode set to <b>Pack Wars ⚔</b>',
  },
  loudestHowls: {
    title: `  <b>🎉🎉PACK WARS EVENTS LEADERSBOARD🎉🎉</b>\n
        <b>Top 5 Howlers of the Pack Wars Event🐺</b>\n`,
    AltMsg:
      'These are the mightiest of all the other wolfs. Leading the fray with their breathtaking howls of power.',
    affiliatedHowlerMsg: (ranking, playerName, howlPoints, pack) =>
      `${ranking} <b>${playerName}</b> with <b>${howlPoints} points</b> from <i>${pack.name} ${pack.emblem}</i>\n`,
  },
  listPacks: {
    title: '<b>WEREWOLF PACK WARS PARTICIPATING PACKS LIST</b>\n',
    packInfo: (pack) =>
      `\n<b>${pack.name} ${pack.emblem} pack with <i>${pack.point} points</i></b>\n`,
    alphaTitle: '<b><i>Pack Alphas</i></b>\n',
    alphaInfo: (alpha) =>
      ` 🎖<a href="tg://user?id=${alpha.TelegramId}">${alpha.firstName}</a>\n`,
    noMember: 'The alpha has not recruited yet',
    memberTitle: '<b><i>Pack Members</i></b>\n',
    memberInfo: (member) =>
      ` 🎗<a href="tg://user?id=${member.TelegramId}">${member.firstName}</a>\n`,
  },
};
