const logInfo = (context, message) => {
  const time = new Date().toLocaleTimeString('vi-VN');
  console.log(`[${time}] [${context}] ${message}`);
};

const logError = (context, message) => {
  const time = new Date().toLocaleTimeString('vi-VN');
  console.error(`[${time}] [${context}] ❌ ${message}`);
};

const logWarn = (context, message) => {
  const time = new Date().toLocaleTimeString('vi-VN');
  console.warn(`[${time}] [${context}] ⚠️  ${message}`);
};

module.exports = { logInfo, logError, logWarn };
