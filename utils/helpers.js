import { sendError } from '../actions.js';
import replyMsg from '../replies.js';
import rolePoints from '../commands/rolePoints.json';

export const getPackNameAndEmblemFromMessage = (message, command) => {
  const packNameRegex = new RegExp(`(?<=\\/+(${command}))(.*[a-zA-z0-9])`, 'g');
  const packRegex = new RegExp(`(?<=\\/+(${command}))(.*)`, 'i');
  // console.log("message :", message);
  let isProper = true;
  const packNameAndEmblem = message.match(packRegex)[0].split(' ');
  const packName = message.match(packNameRegex)[0].trim();
  const indexOfEmblem = packNameAndEmblem.length - 1;
  const packEmblemRough = packNameAndEmblem[indexOfEmblem].trim();
  const checkIfEmblemRegex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|[\ud83c[\ude50\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;
  if (!checkIfEmblemRegex.test(packEmblemRough)) isProper = false;
  const packEmblem = isProper
    ? packEmblemRough.match(checkIfEmblemRegex)[0]
    : null;
  return { packName, packEmblem, isProper };
};

export const getIconsForTopHowlers = (ranking) => {
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
};
export const removeFirstAndTwoOfLast = async (array) => {
  try {
    const arrayLength = array.length;
    return array.filter((el, idx) => idx > 0 && idx < arrayLength - 2);
  } catch (err) {
    console.log(err);
    await sendError(err);
    return err;
  }
};
export const checkFindPlayerRegex = async (inputString) => {
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
    await sendError(err);
    return { errorMsg: err.message };
  }
};
export const parseChangeModeRegex = async (commandMsg) => {
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
};
export const getRolePoints = async (role, lifeStatus) => {
  for (const roleName in rolePoints) {
    if (rolePoints.hasOwnProperty(roleName))
      if (roleName.toLowerCase() === role.toLowerCase())
        if (lifeStatus === 'Alive')
          return { points: rolePoints[roleName][0], name: roleName };
        else return { points: rolePoints[roleName][1], name: roleName };
  }
};
