import * as admin from 'firebase-admin'

if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!serviceAccount) throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not set')
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(serviceAccount)),
  })
}

export const db = admin.firestore()
export const auth = admin.auth()
export default admin
