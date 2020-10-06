import config from 'config';
const devId = config.get('devId');

const replies = {
  start: `<b>Welcome to Fenris' Howl Bot</b>
    This bot was made for the pack wars event in the Ethiopian werewolf gaming group <a href="https://t.me/Ethiowerewolf">Ethio Werewolf - The Origin</a>
    For more information use /help command to see how to use the bot`,
  help: {
    redirectToPrivateMsg: 'Press the button below and then send /help',
    buttonMsg: "Go to Fenris' Howl Bot🐺",
    message: `    
          <b>Help For Fenris' Howl Bot</b>\n
  How To use the Bot?     
😎 <b>Admin Only Commands</b> 😎
     /howl_points Reply to black werewolf game end message to save howl points
     /silence_howls ⚠ Be cautious when using this command it deletes all howl points collected in server⚠
     /create_pack Creates a new pack by sending a name and also add emblem emoji after name
     /reorder_beta Sends a list of betas in two groups in random order
     
 🐺 <b>Admins with pack owner privileges command</b> 🐺
     /transfer_ownership transfer your pack ownership to an alpha by replying to them(Note you can only make group admins owners)
     /delete_pack deletes pack owners current pack and removes players and admins form it
     /remove_alpha Removes alpha from the owners pack

 ⚡ <b>Admins with pack alpha privileges command</b> ⚡
     (also includes owner)
     /make_alpha makes player a pack alpha
     /make_beta makes player a pack beta
     /leave_pack retires alpha from current pack
     
 🐶 <b>Admins with pack beta privileges command</b> 🐶
     (also includes alphas and owner)
     /initiate and /claim Reply to any group member message to add to your pack(Player must be unaffiliated to any pack for command to work)
     /banish Reply to a pack members message to remove them from pack
     /rename_pack renames alpha's current pack if sent with a name followed by an emoji for the emblem(Note name and emblem must be different form other packs)
    
  ⚒ <b>Under Development Admin Commands</b> ⚒
     /changeMode adapts candy corn bots single player 'loneWolf' mode or pack event mode 'packWars' mode 
     /delete_game Send with number to delete a specific game
     /delete_last_game Deletes the last game saved to database
    
  🎉 <b>Normal Commands</b> 🎉
     /loudest_howls Sends the Top 5 Event Best Howlers of the event
     /list_packs Sends the ranking of the current participating packs in the event    
     /find Followed by @username or telegram id of a player to see event their status
     /check_howls Reply to a group member message to see their event status
     /role_points Sends a list of black werewolf roles with their respective points a player gets if they win alive or dead
     
    👀 <b>Functionality Commands(Event helpful commands)</b> 👀
     /check Sends group members status and id from reply message()
     /ping Sends pong with response time use it to check if bot is working
     /group_info Sends if group is whitelisted or not with id
     
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
      return `<a href="tg://user?id=${userId}">${firstName}</a> wishfully stares at the dazzling moonlight✨ yet to put a mark in the starry night.`;
    },
    responseMessage: (userId, firstName, points, pack) => {
      if (pack.isAlpha)
        return `<a href="tg://user?id=${userId}">${firstName}</a> leads the fray with thundering howls that echo for <b>${points} times</b> through the night as the moonlight✨ shimmers`;
      return `<a href="tg://user?id=${userId}">${firstName}</a>'s enchanting howls echoed through the night for <b>${points} times</b> in the dazzling radiance of the moonlight✨`;
    },
    zeroHowlWithPackResponseAddOn: (pack) => {
      if (pack.isAlpha) {
        return ` while their <i>${pack.name} ${pack.emblem}</i> pack brethren howl anxiously waiting for their alphas thundering howls`;
      }
      return ` while their <i>${pack.name} ${pack.emblem}</i> pack brethren howl in hope to hear their teammates howls soon`;
    },
    withPackResponseAddOn: (pack) => {
      if (pack.isAlpha) {
        return ` on their rowdy <i>${pack.name} ${pack.emblem}</i> pack brethren who howl in harmony`;
      }
      return ` accompanied by their <i>${pack.name} ${pack.emblem}</i> pack brethren harmony`;
    },
  },
  admin: {
    onlyAdminsAllowedMsg: 'This Command is for admins only🌚',
    transferOwnership: (pack, alpha, owner) =>
      `${owner.firstName} has made ${alpha.firstName} the new owner of ${pack.name} ${pack.emblem} pack`,
    adminIsAlreadyOwner: (ownedPack) =>
      `You are already Owner of ${ownedPack.name} ${ownedPack.emblem}`,
    adminOwnerCantLeave: (ownedPack) =>
      `You are the Owner of the mighty ${ownedPack.name} ${ownedPack.emblem} pack you just can't quit`,
    createdPack: (packOwner, newPack) =>
      `${packOwner.firstName} created pack ${newPack.name} ${newPack.emblem}`,
    claimedMember: (claimedPlayer, pack, alphaPlayer) =>
      `${claimedPlayer.firstName} has been chosen by ${alphaPlayer.firstName} to join the infamous ${pack.name} ${pack.emblem} pack`,
    banishedMember: (banishedPlayer, pack, alphaPlayer) =>
      `${banishedPlayer.firstName} has been banished from pack ${pack.name} ${pack.emblem} by ${alphaPlayer.firstName}`,
  },
  player: {
    isBot: "You're replying to a bot message",
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
    notFound: 'Player has no recorded data on this bot',
    unAffiliated: 'Not Affiliated with any Pack',
    packNotFound: 'Belongs to a non-existing Pack',
    notOwnerOfPack: 'You are not the Owner of your affiliated Pack',
    notAlphaOfPack: 'Player is not Alpha of affiliated Pack',
    cantBanishAlphaOrBeta: "Betas can't banish fellow Betas or their Alphas",
    notAlphaOrBetaOfPack:
      'You must be either an Alpha or a beta to access this command',
    madeAlpha: (alphaPlayer, pack) =>
      `<b>${alphaPlayer.firstName}</b> has joined the rank of alpha in <i>${pack.name} ${pack.emblem}</i>`,
    madeBeta: (betaPlayer, pack) =>
      `<b>${betaPlayer.firstName}</b> has joined the rank of beta in <i>${pack.name} ${pack.emblem}</i>`,
    alreadyInPack: (packName) =>
      `Player is Already a member of the ${packName} pack`,
    alreadyAnAlphaInPack: (packName) =>
      `Player is Already an Alpha of the ${packName} pack`,
    alreadyAnBetaInPack: (packName) =>
      `Player is Already a Beta of the ${packName} pack`,
    playerNotInAlphasPack: 'This Player is not in your pack',
    alphaNotInOwnersPack: 'This Alpha is not in your pack',
  },
  pack: {
    invalidName:
      "The name you entered doesn't contain a valid name or emoji for emblem",
    sameNameAsBefore: (pack) =>
      `Your Input is the same as the current <b>${pack.name} ${pack.emblem}</b> pack name`,
    renamedPack: (oldPack, newPack) =>
      `Changed pack info from <b>${oldPack.name}</b> <b>${oldPack.emblem}</b> to <b>${newPack.name}</b> <b>${newPack.emblem}</b>`,
    notFound: (packName, packEmblem) =>
      ` A pack with the name <b>${packName}</b> or emblem <b>${packEmblem}</b> doesn't exist`,
    withEmblemAlreadyExists: (packEmblem) =>
      ` A pack with the emblem <b>${packEmblem}</b> already exist`,
    alreadyExists: (packName, packEmblem) =>
      ` A pack with the name <b>${packName}</b> or the emblem <b>${packEmblem}</b> already exist`,
    withNameAlreadyExists: (packName) =>
      ` A pack with the name <b>${packName}</b> already exist`,
    deletePack: (pack) => `Deleted Pack <b>${pack.name} ${pack.emblem}</b>`,
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
  howlPoints: {
    mainTitle: (resultMessage) => `<b>Game Results:</b> \n ${resultMessage}`,
    updatedUserInfo: 'User Infos Updated',
    unAffiliatedPlayersTitle: '\n✌<b>Non-Affiliated Players</b>\n',
    gameInfo: (gameInfo) =>
      `The game had ${gameInfo.totalPlayers} players out this players ${gameInfo.playersAlive} were alive and also ${gameInfo.numberOfWinners} won the game`,
    packPoints: (pack) =>
      `\n<b>${pack.emblem} ${pack.name} pack</b> got ${
        pack.gainedPoints
      } points (now has ${pack.points + pack.gainedPoints} points)\n`,
    packMemberPoints: (packMember) =>
      `${packMember.name} the ${packMember.role} got ${packMember.gainedPoints} points (now has ${packMember.totalPoints} points) ${packMember.packInfo.emblem}\n`,
    lonePlayerPoints: (lonePlayer) =>
      `${lonePlayer.name} the ${lonePlayer.role} got ${lonePlayer.gainedPoints} points (now has ${lonePlayer.totalPoints})\n`,
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
    noPacks: 'There seems to be no packs created for the event yet ☹',
    title: '<b>WEREWOLF PACK WARS PARTICIPATING PACKS LIST</b>\n',
    packInfo: (pack) =>
      `\n<b>${pack.name} ${pack.emblem} pack with <i>${pack.point} points</i></b>\n`,
    alphaTitle: '<b><i>Pack Alphas</i></b>\n',
    betaTitle: '<b><i>Pack Betas</i></b>\n',
    alphaInfo: (alpha) =>
      ` 🎖<a href="tg://user?id=${alpha.TelegramId}">${alpha.firstName}</a>\n`,
    betaInfo: (beta) =>
      ` 🏅<a href="tg://user?id=${beta.TelegramId}">${beta.firstName}</a>\n`,
    noMember: 'The alphas have not recruited yet\n',
    memberTitle: '<b><i>Pack Members</i></b>\n',
    memberInfo: (member) =>
      ` 🎗<a href="tg://user?id=${member.TelegramId}">${member.firstName}</a>\n`,
  },
  underDevelopment: '<b> ⚒ Command Under Development ⚒ </b>',
  chat: {
    denyAccess: (title) =>
      `Sorry but your chat ${title} is not whitelisted to use this bot`,
    isWhiteListed: (id, title) =>
      `<b>${title}</b>[<code>${id}</code>] is Approved ✅`,
    notWhiteListed: (id, title) =>
      `Group ${title} <code>${id}</code> is not white listed`,
  },
  dev: {
    denyAccess: "lousy human I won't obey thee",
    deletedPack: (pack) => `Developer deleted ${pack.name} ${pack.emblem} pack`,
    removedPlayer: (player) =>
      `Developer removed ${player.firstName}<code>[ID:${player.TelegramId}]</code>`,
  },
  actions: {
    cancelled: `<i>Command has been canceled\nHave a nice day 😊</i>`,
    silencedHowls: '<i>I have silenced the howls of thy miserable wolves</i>',
  },
};

export default replies;
