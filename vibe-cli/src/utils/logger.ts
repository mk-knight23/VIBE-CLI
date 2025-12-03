import pc from 'picocolors';

export const logger = {
  info: (msg: string) => console.log(pc.blue('ℹ'), msg),
  success: (msg: string) => console.log(pc.green('✓'), msg),
  error: (msg: string) => console.error(pc.red('✗'), msg),
  warn: (msg: string) => console.warn(pc.yellow('⚠'), msg),
  debug: (msg: string) => process.env.DEBUG && console.log(pc.gray('⚙'), msg),
  
  box: (title: string, content: string) => {
    const width = 60;
    const line = '─'.repeat(width);
    console.log(pc.cyan(`┌${line}┐`));
    console.log(pc.cyan('│') + pc.bold(` ${title.padEnd(width - 1)}`) + pc.cyan('│'));
    console.log(pc.cyan(`├${line}┤`));
    content.split('\n').forEach(l => {
      console.log(pc.cyan('│') + ` ${l.padEnd(width - 1)}` + pc.cyan('│'));
    });
    console.log(pc.cyan(`└${line}┘`));
  }
};
