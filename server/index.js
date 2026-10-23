// Servidor local / produção em servidor próprio: API + front compilado.
import express from 'express'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { app } from './app.js'
import { init } from './db.js'

const dist = resolve('dist')
const server = express()
server.use(app)
if (existsSync(dist)) {
  server.use(express.static(dist))
  server.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(resolve(dist, 'index.html')))
}

const PORT = Number(process.env.PORT) || 3001
init()
  .then(() => server.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`)))
  .catch((e) => {
    console.error('Falha ao iniciar o banco:', e)
    process.exit(1)
  })
