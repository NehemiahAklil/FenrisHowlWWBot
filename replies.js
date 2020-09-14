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
     /howl_points Reply to black werewolf game end message to store howl points
     /silence_points ⚠ Be cautious when using this command it deletes all howl points collected in server
    
     ***** <b>Admins with pack alpha privileges command</b> ******
     /initiate and /claim Reply to group members message to add the player to pack
     /banish Reply to a pack members message to remove them from pack
    
     ***** <b>Under Development Admin Commands</b> *****
     /changeMode adapts candy corn bots single player 'loneWolf' mode or pack event mode 'packWars' mode 
     /make_alpha makes player a pack admin
     /create_pack Creates a new pack by name
     /delete_pack Deletes pack by name 
     /delete_game Send with number to delete a specific game
     /delete_last_game Deletes the last game saved to database
    
     🖊 Normal Commands
     /loudest_howls Sends the Top Howling Points ranked form 1 till 10 
     /find enter @username or telegram id of a player to see their status
     
     ***** <b>Under Development Functionality Commands</b> ****
     /check to check Players status from reply message
     
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
    withPackResponseAddOn: (packName) => {
      return ` accompanied by their brethren <i>${packName}</i> pack members harmony`;
    },
  },
  admin: {
    onlyAdminsAllowedMsg: 'This Command is for admins only🌚',
  },
  player: {
    notFound: "Player couldn't be found on db",
    unAffiliated: 'Not Affiliated with any Pack',
    packNotFound: 'Belongs to a non-existing Pack',
    notAlphaOfPack: 'Player is not Alpha of afflicted Pack',
    alreadyInPack: (packName) =>
      `Player is Already a member of the ${packName} pack`,
  },
  changeGameMode: {
    errorMsg:
      "Invalid Mode type in message Try to use either 'loneWolf' or 'packWars' mode",
    loneWolfMode: 'Game Mode <b>Lone Wolf 🐺</b> is Under Development',
    packWarsMode: 'Game mode set to <b>Pack Wars ⚔</b>',
  },
};
