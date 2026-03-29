import mongoose from 'mongoose'
import { env } from './env.js'

mongoose.set('strictQuery', true)

const connectionOptions = {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
}

export const connections = {
  app: mongoose.createConnection(),
}

const connectAll = async (uri) => {
  const dbName = env.mongoDbName || undefined
  await connections.app.openUri(uri, {
    ...connectionOptions,
    ...(dbName ? { dbName } : {}),
  })
}

export async function connectDatabase() {
  try {
    await connectAll(env.mongoUri)
    console.log('MongoDB connected (single database)')
  } catch (error) {
    const isSrvDnsError =
      String(error?.code || '').toUpperCase() === 'ECONNREFUSED' &&
      String(error?.hostname || '').startsWith('_mongodb._tcp.')

    if (isSrvDnsError && env.mongoDirectUri) {
      console.warn('SRV DNS lookup failed. Retrying with MONGO_DIRECT_URI...')
      await connectAll(env.mongoDirectUri)
      console.log('MongoDB connected (direct URI fallback)')
      return
    }

    if (isSrvDnsError) {
      console.error(
        [
          'MongoDB SRV lookup failed (DNS/network issue).',
          'Fix options:',
          '1) Change system DNS to 8.8.8.8 / 1.1.1.1 and retry.',
          '2) Use hotspot/another network and retry.',
          '3) Add MONGO_DIRECT_URI (non-srv mongodb://...) in backend/.env.',
        ].join('\n')
      )
    }

    throw error
  }
}
