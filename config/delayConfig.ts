// export const DELAYS = {
//   minBeforeChecking: 60000,      // 1 min
//   maxBeforeChecking: 420000,     // 7 mins
//   minProcessing: 5000,           // 5 secs
//   maxProcessing: 12000,          // 12 secs
//   minBetweenMessages: 3000,      // 3 secs
//   maxBetweenMessages: 6000,      // 6 secs
//   minDownload: 2000,             // 2 secs
//   maxDownload: 4000,             // 4 secs
// };

//DEMO DELAYS
export const DELAYS = {
  minBeforeChecking: 2000,      // 2 secs
  maxBeforeChecking: 3000,      // 3 secs  
  minProcessing: 1000,          // 1 sec
  maxProcessing: 2000,          // 2 secs
  minBetweenMessages: 500,      
  maxBetweenMessages: 1000,     
  minDownload: 500,             
  maxDownload: 1000,            
};

export const delay = async (min: number, max?: number) => {
  const time = max ? Math.floor(Math.random() * (max - min + 1)) + min : min;
  return new Promise((resolve) => setTimeout(resolve, time));
};