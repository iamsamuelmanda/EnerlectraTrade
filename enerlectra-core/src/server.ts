import express from 'express'
import cors from 'cors'
import clusters from './routes/clusters'
import contributions from './routes/contributions'
import ownership from './routes/ownership'
import distribution from './routes/distribution'
import suppliers from './routes/suppliers'

const app = express()

app.use(cors())          
app.use(express.json())

app.use('/clusters', clusters)
app.use('/', contributions)
app.use('/', ownership)
app.use('/', distribution)
app.use('/', suppliers)

app.listen(3000, () =>
  console.log('Enerlectra Core running on :3000')
)
