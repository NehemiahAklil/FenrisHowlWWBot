const { sendError, checkGameMode } = require('../actions');
const replyMsg = require('../replies');
const rolePoints = require('../rolePoints.json');
module.exports = {
  getIconsForTopHowlers: (ranking) => {
    switch (ranking) {
      case 1:
        return String.fromCodePoint(0x1f947);
      case 2:
        return String.fromCodePoint(0x1f948);
      case 3:
        return String.fromCodePoint(0x1f949);
      case 4:
        return String.fromCodePoint(0x1f3c5);
      case 5:
        return String.fromCodePoint(0x1f396, 0xfe0f);
      default:
        return ranking;
    }
  },
  removeFirstAndTwoOfLast: async (array) => {
    try {
      const arrayLength = array.length;
      return array.filter((el, idx) => idx > 0 && idx < arrayLength - 2);
    } catch (err) {
      console.log(err);
      sendError(err);
      return err;
    }
  },
  checkFindPlayerRegex: async (inputString) => {
    try {
      const find = /^\/find \@(.*)|([0-9]{5,12})/i;
      const findById = /(\d{5,12})/i;
      const findByUsername = /\@(.*)/i;
      if (find.test(inputString)) {
        if (findByUsername.test(inputString)) {
          const result = findByUsername.exec(inputString)[1];
          console.log('Found by Username', result);
          return { type: 'findByUsername', parsedRegex: result };
        } else if (findById.test(inputString)) {
          const result = findById.exec(inputString)[1];
          console.log('Found by UserId', result);
          return { type: 'findById', parsedRegex: result };
        } else {
          console.log('This is a miracle Error');
          return {
            errorMsg: replyMsg.findPlayer.inputError,
          };
        }
      } else {
        console.log("Input String Doesn't Match Shit");
        return {
          errorMsg:
            "Input isn't a Username or UserId try to add @ before usernames and use proper userId",
        };
      }
    } catch (err) {
      console.log(err);
      sendError(err);
      return { errorMsg: err.message };
    }
  },
  parseChangeModeRegex: async (commandMsg) => {
    const changeModeRegex = /^\/changeMode [a-zA-z]{0,12}/;
    const loneWolfModeRegex = /(loneWolf)/i;
    const packWarModeRegex = /(packWar)/i;
    if (changeModeRegex.test(commandMsg)) {
      if (loneWolfModeRegex.test(commandMsg)) {
        return { modeType: 'loneWolf' };
      } else if (packWarModeRegex.test(commandMsg)) {
        return { modeType: 'packWars' };
      } else {
        return { errorMsg: replyMsg.changeGameMode.errorMsg };
      }
    }
  },
  getRolePoints: async (role) => {
    for (const roleName in rolePoints) {
      if (rolePoints.hasOwnProperty(roleName)) {
        if (roleName.toLowerCase() === role.toLowerCase()) {
          return { points: rolePoints[roleName], name: roleName };
        }
      }
    }
  },
};
