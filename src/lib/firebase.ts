import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const googleAuthProvider = new GoogleAuthProvider();

export const gmailRecoveryProvider = new GoogleAuthProvider();
GMAIL_SCOPES.forEach((scope) => gmailRecoveryProvider.addScope(scope));
gmailRecoveryProvider.setCustomParameters({ prompt: 'select_account' });
