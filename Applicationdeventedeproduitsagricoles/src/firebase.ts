import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: "AIzaSyCodSttTMsLFmXPwJSZZHO8XfST8V1uBdI",
  authDomain: "app-vente-de-produit-agricole.firebaseapp.com",
  projectId: "app-vente-de-produit-agricole",
  storageBucket: "app-vente-de-produit-agricole.firebasestorage.app",
  messagingSenderId: "1052867344278",
  appId: "1:1052867344278:web:07beee7675eb1c72f98fb7",
  measurementId: "G-356NMTNPDG"
}

const app = initializeApp(firebaseConfig)

// Initialize services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const messaging = getMessaging(app)

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      const token = await getToken(messaging, { vapidKey: 'your-vapid-key' })
      console.log('FCM Token:', token)
      return token
    }
  } catch (error) {
    console.error('Error getting notification permission:', error)
  }
}

// Listen for messages
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload)
    })
  })

export default app