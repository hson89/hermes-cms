const pino = () => ({
  info: () => {},
  error: () => {},
  warn: () => {},
  debug: () => {},
  child: () => pino(),
})
pino.pino = pino
export default pino
export { pino }
